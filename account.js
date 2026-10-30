'use strict';
// Cuentas Giorgio: registro (correo + código, Google, Facebook), entrada, perfil de juego y amigos con Supabase.
// Seguridad: las contraseñas las procesa Supabase Auth (hash bcrypt en el servidor; la app nunca las guarda).
// La app solo usa la clave pública "anon"; cada tabla tiene RLS y todo lo que escribe pasa por funciones del servidor
// (record_match, heartbeat, friend_*, set_username) que validan, limitan y usan la identidad del token, no la del cliente.
const GGAccount = (() => {
  const cfg = window.GG_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const providers = (cfg.oauth || []).filter(p => ['google', 'facebook', 'apple', 'discord'].includes(p));
  const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐯', '🐵', '🐧', '🦄', '🐙', '👾'];
  const USER_RE = /^[a-z0-9_]{3,16}$/;
  const PENDING = 'gg_pending_matches';
  const subs = new Set();
  let sb = null, user = null, profile = null;

  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const state = () => ({ enabled, user, profile });
  const emit = extra => subs.forEach(f => { try { f(Object.assign(state(), extra || {})); } catch (e) { console.error(e); } });

  // Mensajes de error comprensibles (sin revelar si un correo existe o no).
  function nice(err) {
    const m = String((err && (err.message || err.error_description || err.msg)) || err || '').toLowerCase();
    if (/invalid login|invalid credentials/.test(m)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/.test(m)) return 'Primero confirma tu correo con el código o el enlace que te enviamos.';
    if (/token has expired|otp.*(expired|invalid)|invalid.*otp|token.*invalid/.test(m)) return 'Ese código no es válido o ya venció. Pide uno nuevo.';
    if (/rate limit|too many|security purposes|over_email_send_rate/.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
    if (/weak|pwned|leaked|password should/.test(m)) return 'Esa contraseña es muy débil. Usa 10 o más caracteres con letras y números.';
    if (/username taken|duplicate|already registered|23505/.test(m)) return 'Ese nombre de usuario ya está ocupado.';
    if (/usuario no encontrado/.test(m)) return 'No existe ningún jugador con ese usuario.';
    if (/eres tú/.test(m)) return 'Ese eres tú 😄';
    if (/demasiadas solicitudes/.test(m)) return 'Tienes muchas solicitudes pendientes. Espera a que respondan.';
    if (/límite de amigos/.test(m)) return 'Llegaste al máximo de amigos.';
    if (/provider is not enabled|unsupported provider/.test(m)) return 'Ese método de entrada aún no está activado.';
    if (/failed to fetch|network/.test(m)) return 'Sin conexión. Revisa tu internet.';
    if (/demasiado rápido|límite diario/.test(m)) return 'Vas muy rápido: espera unos segundos.';
    return 'No se pudo completar. Inténtalo otra vez.';
  }
  const fail = e => { throw new Error(nice(e)); };

  // Fuerza de la contraseña. Mínimo: 10 caracteres, letras y números, no común, sin el usuario o el correo.
  const COMMON = ['contraseña', 'password', '123456789', '1234567890', 'qwertyuiop', 'giorgio', 'abcdefghij', 'iloveyou', 'teamo', 'futbol'];
  function strength(pw, username, email) {
    const p = String(pw || ''), low = p.toLowerCase(), probs = [];
    if (p.length < 10) probs.push('mínimo 10 caracteres');
    if (!/[a-zA-ZñÑ]/.test(p) || !/\d/.test(p)) probs.push('letras y números');
    if (COMMON.some(w => low.includes(w))) probs.push('evita palabras comunes');
    const u = String(username || '').toLowerCase(), e = String(email || '').toLowerCase().split('@')[0];
    if ((u.length >= 3 && low.includes(u)) || (e.length >= 3 && low.includes(e))) probs.push('no uses tu usuario o correo');
    let score = 0;
    if (p.length >= 10) score++;
    if (p.length >= 14) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (probs.length) score = Math.min(score, 1);
    return { ok: probs.length === 0, score, probs };
  }

  async function loadProfile() {
    if (!user) { profile = null; return; }
    const { data, error } = await sb.from('profiles').select('username, avatar, xp, created_at, username_set').eq('id', user.id).maybeSingle();
    profile = error ? null : data;
  }

  async function init() {
    if (!enabled) return;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
    sb.auth.onAuthStateChange((ev, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if (ev === 'PASSWORD_RECOVERY') setTimeout(() => emit({ recovery: true }), 0);
      if ((user && user.id) !== was) setTimeout(async () => { await loadProfile(); emit(); flush(); }, 0);
    });
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    await loadProfile();
    emit(); flush();
  }
  const ready = init().catch(e => console.error('cuentas', e));
  const here = () => location.origin + location.pathname;

  // ------------------------------------------------------------------ entrar y crear cuenta
  async function usernameFree(name) {
    const { data, error } = await sb.rpc('username_available', { p_username: name });
    if (error) fail(error);
    return !!data;
  }
  async function signUp({ username, email, password }) {
    username = String(username || '').trim().toLowerCase();
    if (!USER_RE.test(username)) throw new Error('Usuario: 3 a 16 letras minúsculas, números o _.');
    const st = strength(password, username, email);
    if (!st.ok) throw new Error('Contraseña: ' + st.probs.join(', ') + '.');
    if (!(await usernameFree(username))) throw new Error('Ese nombre de usuario ya está ocupado.');
    const { data, error } = await sb.auth.signUp({ email: String(email).trim(), password, options: { data: { username }, emailRedirectTo: here() } });
    if (error) fail(error);
    return { needsConfirm: !data.session };
  }
  async function verifyCode(email, code, type) {
    const { error } = await sb.auth.verifyOtp({ email: String(email).trim(), token: String(code).trim(), type: type || 'signup' });
    if (error) fail(error);
  }
  async function resend(email) {
    const { error } = await sb.auth.resend({ type: 'signup', email: String(email).trim(), options: { emailRedirectTo: here() } });
    if (error) fail(error);
  }
  async function signIn({ email, password }) {
    const { error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) fail(error);
  }
  async function signInWith(provider) {
    if (!providers.includes(provider)) throw new Error('Ese método de entrada aún no está activado.');
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: here() } });
    if (error) fail(error);
  }
  async function signOut() { await sb.auth.signOut({ scope: 'local' }); user = null; profile = null; emit(); }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: here() + '#perfil' });
    if (error) fail(error);
  }
  async function updatePassword(password) {
    const st = strength(password, profile && profile.username, user && user.email);
    if (!st.ok) throw new Error('Contraseña: ' + st.probs.join(', ') + '.');
    const { error } = await sb.auth.updateUser({ password });
    if (error) fail(error);
  }
  async function setUsername(name) {
    name = String(name || '').trim().toLowerCase();
    if (!USER_RE.test(name)) throw new Error('Usuario: 3 a 16 letras minúsculas, números o _.');
    const { error } = await sb.rpc('set_username', { p_username: name });
    if (error) fail(error);
    profile.username = name; profile.username_set = true; emit();
  }
  async function setAvatar(a) {
    if (!user || !AVATARS.includes(a)) return;
    const { error } = await sb.from('profiles').update({ avatar: a }).eq('id', user.id);
    if (error) fail(error);
    profile.avatar = a; emit();
  }
  async function deleteAccount() {
    const { error } = await sb.rpc('delete_my_account');
    if (error) fail(error);
    await sb.auth.signOut({ scope: 'local' }); user = null; profile = null; emit();
  }

  // ------------------------------------------------------------------ partidas, tiempo y presencia
  function onMatch(game, mode, level, result) {
    if (!enabled || !user) return;                       // invitados: no se guarda nada
    const q = rd(PENDING, []); q.push({ game, mode, level, result }); wr(PENDING, q.slice(-20));
    flush();
  }
  let flushing = false;
  async function flush() {
    if (!enabled || !user || flushing) return;
    flushing = true;
    try {
      let q = rd(PENDING, []);
      while (q.length) {
        const m = q[0];
        const { data, error } = await sb.rpc('record_match', { p_game: m.game, p_mode: m.mode, p_level: m.level, p_result: m.result });
        if (error && /failed to fetch|network/i.test(error.message)) break;          // sin red: reintentar luego
        q = q.slice(1); wr(PENDING, q);
        if (!error && data && profile) profile.xp = data.xp;
      }
      emit();
    } finally { flushing = false; }
  }
  addEventListener('online', () => flush());
  async function heartbeat(game) {
    if (!enabled || !user) return;
    try { await sb.rpc('heartbeat', { p_game: game || null }); } catch (e) { /* sin red */ }
  }

  // ------------------------------------------------------------------ lecturas
  const rows = async q => { const { data, error } = await q; if (error) fail(error); return data || []; };
  const stats = () => user ? rows(sb.from('stats').select('game, mode, w, l, d')) : [];
  const playtime = () => user ? rows(sb.from('playtime').select('game, seconds')) : [];
  const history = n => user ? rows(sb.from('matches').select('game, mode, level, result, xp, created_at').order('created_at', { ascending: false }).limit(n || 10)) : [];
  const leaderboard = n => enabled ? rows(sb.rpc('leaderboard', { p_limit: n || 10 })).catch(() => []) : [];
  const friends = () => user ? rows(sb.rpc('my_friends')) : [];
  async function getProfile(username) {
    const { data, error } = await sb.rpc('get_profile', { p_username: username });
    if (error) fail(error);
    return data;
  }
  async function friendRequest(username) {
    const { data, error } = await sb.rpc('friend_request', { p_username: String(username || '').trim().toLowerCase().replace(/^@/, '') });
    if (error) fail(error);
    return data;
  }
  async function friendRespond(username, accept) { const { error } = await sb.rpc('friend_respond', { p_username: username, p_accept: !!accept }); if (error) fail(error); }
  async function friendRemove(username) { const { error } = await sb.rpc('friend_remove', { p_username: username }); if (error) fail(error); }
  const level = xp => { const lv = Math.floor(Math.sqrt((xp || 0) / 50)) + 1; return { lv, from: 50 * (lv - 1) ** 2, to: 50 * lv ** 2 }; };

  return { ready, providers, AVATARS, USER_RE, strength, level,
    get enabled() { return enabled; }, get user() { return user; }, get profile() { return profile; },
    on: f => { subs.add(f); return () => subs.delete(f); },
    signUp, verifyCode, resend, signIn, signInWith, signOut, resetPassword, updatePassword, setUsername, setAvatar, deleteAccount,
    onMatch, heartbeat, stats, playtime, history, leaderboard, friends, getProfile, friendRequest, friendRespond, friendRemove };
})();
window.GGAccount = GGAccount;
