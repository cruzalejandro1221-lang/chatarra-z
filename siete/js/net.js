'use strict';
// Siete Vidas: sala online de hasta 4 con PeerJS. El anfitrión guarda la partida y arbitra; a cada invitado solo le manda lo que puede ver.
(() => {
  const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', MAX = 4;
  const idOf = code => 'gg-siete-' + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const token = () => { let t = ''; try { t = sessionStorage.getItem('siete_tok'); } catch (e) { /* nada */ } if (!t) { t = Math.random().toString(36).slice(2) + Date.now().toString(36); try { sessionStorage.setItem('siete_tok', t); } catch (e) { /* nada */ } } return t; };
  const clean = s => String(s == null ? '' : s).replace(/[<>&"']/g, '').trim().slice(0, 14) || 'Gato';

  function load() { return new Promise((res, rej) => { if (window.Peer) return res(); const s = document.createElement('script'); s.src = '../clasicos/vendor/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el modo online.')); document.head.append(s); }); }

  // h: { onseats(), onact(seat, a), onchat(seat, i), onleave(seat) }
  class Host {
    constructor(name, h) { this.h = h; this.seats = [{ name: clean(name), me: true }]; this.started = false; this.code = null; this.peer = null; }
    async open() {
      await load();
      for (let i = 0; i < 6 && !this.code; i++) {
        const code = Array.from({ length: 5 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
        try { await new Promise((res, rej) => { const p = new Peer(idOf(code), { debug: 0 }); let ok = false; p.on('open', () => { ok = true; this.peer = p; res(); }); p.on('connection', c => this.attach(c)); p.on('disconnected', () => { if (!p.destroyed) try { p.reconnect(); } catch (e) { /* nada */ } }); p.on('error', e => { if (!ok) { try { p.destroy(); } catch (x) { /* nada */ } rej(e); } }); }); this.code = code; }
        catch (e) { if (e.type !== 'unavailable-id') throw new Error('No pudimos crear la sala. Revisa tu conexión.'); }
      }
      if (!this.code) throw new Error('No pudimos crear la sala. Intenta de nuevo.');
      return this.code;
    }
    attach(c) {
      c.on('data', m => {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'hello') return this.hello(c, m);
        const i = this.seats.findIndex(s => s.conn === c); if (i < 0) return;
        if (m.t === 'act') this.h.onact(i, m.a);
        else if (m.t === 'chat' && Number.isInteger(m.i)) this.h.onchat(i, m.i);
      });
      const gone = () => { const i = this.seats.findIndex(s => s.conn === c); if (i < 0) return; if (this.started) { this.seats[i].conn = null; this.seats[i].away = true; this.h.onleave(i); } else this.seats.splice(i, 1); this.h.onseats(); };
      c.on('close', gone); c.on('error', gone);
    }
    hello(c, m) {
      const tok = String(m.tok || '').slice(0, 40), back = this.seats.find(s => s.tok === tok && tok);
      if (back) { back.conn = c; back.away = false; this.h.onseats(); return; }                  // reconexión: recupera su asiento
      if (this.started) return c.send({ t: 'full', why: 'La partida ya empezó.' });
      if (this.seats.length >= MAX) return c.send({ t: 'full', why: 'La sala está llena.' });
      this.seats.push({ name: clean(m.name), tok, conn: c }); this.h.onseats();
    }
    addBot() { if (this.seats.length < MAX) { const names = ['Misifú', 'Bigotes', 'Sombra']; this.seats.push({ name: names.find(n => !this.seats.some(s => s.name === n)) || 'Michi', bot: true }); this.h.onseats(); } }
    kick(i) { const s = this.seats[i]; if (!s || s.me) return; if (s.conn) { try { s.conn.send({ t: 'full', why: 'Saliste de la sala.' }); } catch (e) { /* nada */ } } this.seats.splice(i, 1); this.h.onseats(); }
    send(i, m) { const c = this.seats[i] && this.seats[i].conn; if (c && c.open) try { c.send(m); } catch (e) { /* nada */ } }
    all(m) { this.seats.forEach((s, i) => this.send(i, m)); }
    lobby() { this.all({ t: 'lobby', code: this.code, seats: this.seats.map(s => ({ name: s.name, bot: !!s.bot })) }); }
    close() { try { this.all({ t: 'end' }); } catch (e) { /* nada */ } setTimeout(() => { try { this.peer && this.peer.destroy(); } catch (e) { /* nada */ } }, 200); }
  }

  // h: { onmsg(m), onerror(text) }
  class Guest {
    constructor(name, h) { this.name = clean(name); this.h = h; this.tok = token(); this.conn = null; this.closed = false; this.seen = false; }
    async join(code) {
      await load(); this.code = code;
      await new Promise((res, rej) => { const p = new Peer({ debug: 0 }); let ok = false; p.on('open', () => { ok = true; this.peer = p; res(); }); p.on('disconnected', () => { if (!p.destroyed && !this.closed) try { p.reconnect(); } catch (e) { /* nada */ } }); p.on('error', e => { if (!ok) rej(new Error('No pudimos conectar. Revisa tu internet.')); else if (e.type === 'peer-unavailable' && !this.seen) this.h.onerror('No encontramos esa sala. Revisa el código.'); }); });
      this.connect();
      this.t0 = setTimeout(() => { if (!this.seen && !this.closed) this.h.onerror('No logramos conectar con la sala.'); }, 15000);
    }
    connect() {
      const c = this.peer.connect(idOf(this.code), { reliable: true }); this.conn = c;
      c.on('open', () => c.send({ t: 'hello', name: this.name, tok: this.tok }));
      c.on('data', m => { this.seen = true; this.h.onmsg(m); });
      c.on('close', () => { if (this.closed) return; this.h.onmsg({ t: 'lost' }); setTimeout(() => { if (!this.closed) this.connect(); }, 2500); });
    }
    send(m) { if (this.conn && this.conn.open) try { this.conn.send(m); } catch (e) { /* nada */ } }
    close() { this.closed = true; clearTimeout(this.t0); try { this.peer && this.peer.destroy(); } catch (e) { /* nada */ } }
  }
  window.SieteNet = { Host, Guest, MAX, clean };
})();
