'use strict';
// Guerra Zombie: cuenta y guardado. Se juega solo con cuenta Giorgio Games (la del marco de la app).
// La partida se guarda en el celular siempre y, si hay conexión, también en la nube (Supabase, función gz_save).
(() => {
  const VERSION = 2;
  const acct = () => { try { return window.parent !== window && window.parent.GGAccount ? window.parent.GGAccount : null; } catch (e) { return null; } };
  const user = () => { const A = acct(); return A && A.user && A.profile ? A : null; };
  const localKey = () => { const A = user(); return 'gz_save_' + (A ? A.user.id : 'x'); };
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(localKey())); } catch (e) { return null; } };
  let cloudOk = null;                                      // null = sin probar; false = la tabla aún no existe o no hay red

  async function load() {
    const local = readLocal();
    const A = user(); let cloud = null;
    if (A && A.gzLoad) { try { cloud = await A.gzLoad(); cloudOk = true; } catch (e) { cloudOk = false; } }
    const pick = cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0)) ? cloud : local;
    return pick && pick.v === VERSION ? pick : null;
  }
  let pending = null, timer = 0;
  function save(S, now) {
    S.v = VERSION; S.savedAt = Date.now();
    try { localStorage.setItem(localKey(), JSON.stringify(S)); } catch (e) { /* lleno */ }
    pending = S; clearTimeout(timer);
    timer = setTimeout(flush, now ? 0 : 1500);
  }
  async function flush() {
    const S = pending; pending = null; const A = user();
    if (!S || !A || !A.gzSave) return;
    try { await A.gzSave(S); cloudOk = true; } catch (e) { cloudOk = false; }
    GZ.ui && GZ.ui.cloud(cloudOk);
  }
  function wipe() { try { localStorage.removeItem(localKey()); } catch (e) { /* nada */ } }
  addEventListener('pagehide', () => { if (pending) flush(); });

  GZ.store = { load, save, wipe, user, acct, get cloudOk() { return cloudOk; }, VERSION };
})();
