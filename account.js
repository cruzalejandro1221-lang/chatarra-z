'use strict';
// Cuentas Giorgio: registro, entrada, recuperación y datos del perfil con Supabase.
// Seguridad: las contraseñas las procesa Supabase Auth (hash bcrypt en el servidor, nunca se guardan en claro ni pasan por
// nuestro código más allá del envío por HTTPS). La app solo usa la clave pública "anon"; cada tabla tiene RLS y
// los resultados se registran con la función record_match del servidor, que valida y limita la frecuencia.
const GGAccount = (() => {
  const cfg = window.GG_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐯', '🐵', '🐧', '🦄', '🐙', '👾'];
  const USER_RE = /^[a-z0-9_]{3,16}$/;
  const PENDING = 'gg_pending_matches';
  const subs = new Set();
  let sb = null, user = null, profile = null;

  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const emit = () => subs.forEach(f => { try { f(state()); } catch (e) { console.error(e); } });
  const state = () => ({ enabled, user, profile });

  // Mensajes de error comprensibles (sin revelar si un correo existe o no).
  function nice(err) {
    const m = String((err && (err.message || err.error_description)) || err || '').toLowerCase();
    if (/invalid login|invalid credentials/.test(m)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/.test(m)) return 'Confirma tu correo: te enviamos un enlace al registrarte.';
    if (/rate limit|too many|security purposes/.test(m)) return 'Demasiados intentos. Espera un minuto y vuelve a probar.';
    if (/weak|pwned|leaked|password should/.test(m)) return 'Esa contraseña es muy débil o apareció en filtraciones. Elige otra.';
    if (/database error saving new user|duplicate|already/.test(m)) return 'Ese nombre de usuario ya está ocupado.';
    if (/failed to fetch|network/.test(m)) return 'Sin conexión. Revisa tu internet.';
    if (/demasiado|limite|límite/.test(m)) return 'Vas muy rápido: espera unos segundos.';
    return 'No se pudo completar. Inténtalo otra vez.';
  }

  // Fuerza de la contraseña: 0-4. Reglas mínimas: 10+ caracteres, letras y números, no común, no contiene el usuario.
  const COMMON = ['contraseña', 'password', '123456789', '1234567890', 'qwertyuiop', 'giorgio', 'giorgiogames', 'abcdefghij', 'iloveyou', 'teamo', 'futbol', 'peru', 'mexico', 'colombia', 'argentina'];
  function strength(pw, username, email) {
    const p = String(pw || ''), low = p.toLowerCase(), probs = [];
    if (p.length < 10) probs.push('mínimo 10 caracteres');
    if (!/[a-zA-ZñÑ]/.test(p) || !/\d/.test(p)) probs.push('letras y números');
    if (COMMON.some(w => low.includes(w))) probs.push('evita palabras comunes');
    const u = String(username || '').toLowerCase(), e = String(email || '').toLowerCase().split('@')[0];
    if ((u.length >= 3 && low.includes(u)) || (e.length >= 3 && low.includes(e))) probs.push('no uses tu usuario o correo');
    if (/(.)\1{3,}/.test(p)) probs.push('sin repetir el mismo carácter');
    let score = 0;
    if (p.length >= 10) score++; if (p.length >= 14) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (probs.length) score = Math.min(score, 1);
    return { ok: probs.length === 0, score, probs };
  }

  async function loadProfile() {
    if (!user) { profile = null; return; }
    const { data, error } = await sb.from('profiles').select('username, avatar, xp, created_at').eq('id', user.id).maybeSingle();
    profile = error ? null : data;
    if (profile) {
      const p = rd('gg_profile', {}); p.name = profile.username; wr('gg_profile', p);   // nombre visible en las partidas
    }
  }

  async function init() {
    if (!enabled) return;
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    });
    sb.auth.onAuthStateChange((ev, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if (ev === 'PASSWORD_RECOVERY') subs.forEach(f => f({ ...state(), recovery: true }));
      if ((user && user.id) !== was) setTimeout(async () => { await loadProfile(); emit(); flush(); }, 0);
    });
    const { data } = await sb.auth.getSession();
    user = data.session ? data.session.user : null;
    await loadProfile();
    emit(); flush();
  }
  const ready = init().catch(e => console.error('cuentas', e));

  async function usernameFree(name) {
    const { data, error } = await sb.rpc('username_available', { p_username: name });
    if (error) throw error;
    return !!data;
  }
  async function signUp({ username, email, password }) {
    username = String(username || '').trim().toLowerCase();
    if (!USER_RE.test(username)) throw new Error('Usuario: 3 a 16 letras minúsculas, números o _.');
    const st = strength(password, username, email);
    if (!st.ok) throw new Error('Contraseña: ' + st.probs.join(', ') + '.');
    if (!(await usernameFree(username))) throw new Error('Ese nombre de usuario ya está ocupado.');
    const { data, error } = await sb.auth.signUp({ email: String(email).trim(), password, options: { data: { username }, emailRedirectTo: location.origin + location.pathname } });
    if (error) throw new Error(nice(error));
    return { needsConfirm: !data.session };
  }
  async function signIn({ email, password }) {
    const { error } = await sb.auth.signInWithPassword({ email: String(email).trim(), password });
    if (error) throw new Error(nice(error));
  }
  async function signOut() { await sb.auth.signOut({ scope: 'local' }); user = null; profile = null; emit(); }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: location.origin + location.pathname + '#perfil' });
    if (error) throw new Error(nice(error));
  }
  async function updatePassword(password) {
    const st = strength(password, profile && profile.username, user && user.email);
    if (!st.ok) throw new Error('Contraseña: ' + st.probs.join(', ') + '.');
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw new Error(nice(error));
  }
  async function setAvatar(a) {
    if (!user || !AVATARS.includes(a)) return;
    const { error } = await sb.from('profiles').update({ avatar: a }).eq('id', user.id);
    if (error) throw new Error(nice(error));
    profile.avatar = a; emit();
  }
  async function deleteAccount() {
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw new Error(nice(error));
    await sb.auth.signOut({ scope: 'local' }); user = null; profile = null; emit();
  }

  // Resultados: se envían al servidor; si no hay red, quedan en cola (máx. 20) y se reintentan.
  function onMatch(game, mode, level, result) {
    if (!enabled || !user) return;
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

  async function stats() {
    if (!user) return [];
    const { data } = await sb.from('stats').select('game, mode, w, l, d');
    return data || [];
  }
  async function history(n) {
    if (!user) return [];
    const { data } = await sb.from('matches').select('game, mode, level, result, xp, created_at').order('created_at', { ascending: false }).limit(n || 10);
    return data || [];
  }
  async function leaderboard(n) {
    if (!enabled) return [];
    const { data } = await sb.rpc('leaderboard', { p_limit: n || 10 });
    return data || [];
  }
  const level = xp => { const lv = Math.floor(Math.sqrt((xp || 0) / 50)) + 1; return { lv, from: 50 * (lv - 1) ** 2, to: 50 * lv ** 2 }; };

  return { ready, get enabled() { return enabled; }, get user() { return user; }, get profile() { return profile; }, AVATARS, USER_RE,
    on: f => { subs.add(f); return () => subs.delete(f); }, strength, signUp, signIn, signOut, resetPassword, updatePassword, setAvatar, deleteAccount,
    onMatch, stats, history, leaderboard, level };
})();
window.GGAccount = GGAccount;
