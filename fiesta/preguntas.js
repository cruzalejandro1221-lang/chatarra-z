'use strict';
// De Menos a Más (pestaña Trend): preguntas para conocerse, de ligeras a profundas. Primero eliges qué tipos quieres.
// Todo es local: nada se guarda ni se envía, salvo los filtros elegidos (en este celular).
(() => {
  // [nivel, pregunta]: 1 ligera, 2 media, 3 profunda
  const CATS = [
    { id: 'hielo', name: 'Rompehielos', icon: '🧊', on: true, q: [
      [1, '¿Cuál es tu comida favorita para un día malo?'], [1, '¿Playa, campo o ciudad?'], [1, '¿Qué canción te sabes completita de memoria?'], [1, '¿Cuál fue la última serie que viste de un tirón?'], [1, '¿Eres más de madrugar o de trasnochar?'], [1, '¿Qué app abres primero al despertar?'],
      [2, '¿Qué es lo que la gente casi siempre adivina mal de ti?'], [2, '¿Cuál es tu pequeño placer culpable?'], [2, '¿Qué te hace perder la noción del tiempo?'], [2, '¿Qué apodo te han puesto y por qué?'],
      [3, '¿Qué te gustaría que la gente supiera de ti sin tener que decirlo?'], [3, '¿En qué momento de tu vida te has sentido más tú mismo?'] ] },
    { id: 'risa', name: 'Graciosas', icon: '😂', on: true, q: [
      [1, '¿Cuál es el peor regalo que te han dado?'], [1, '¿Qué animal serías y por qué ese?'], [1, 'Si tu vida fuera una película, ¿cómo se llamaría?'], [1, '¿Cuál es la excusa más ridícula que has inventado?'], [1, '¿Qué comida odias aunque todos la amen?'], [1, '¿Qué palabra dices demasiado?'],
      [2, '¿Cuál ha sido tu momento más vergonzoso en público?'], [2, '¿Qué es lo más raro que has buscado en internet?'], [2, '¿Alguna vez saludaste a alguien que no te saludaba a ti?'], [2, '¿Cuál es tu baile secreto cuando nadie te ve?'],
      [3, '¿De qué te ríes hoy que en su momento te hizo llorar?'], [3, '¿Cuál es la cosa más tonta por la que te has peleado con alguien?'] ] },
    { id: 'gustos', name: 'Gustos', icon: '🍕', on: true, q: [
      [1, '¿Dulce o salado?'], [1, '¿Cuál es tu lugar favorito de tu ciudad?'], [1, '¿Qué película podrías ver mil veces?'], [1, '¿Perros, gatos o ninguno?'], [1, '¿Cuál es tu antojo de medianoche?'],
      [2, '¿Qué olor te transporta a otro momento de tu vida?'], [2, '¿Qué hobby te gustaría aprender si tuvieras tiempo?'], [2, '¿Qué artista te gustaba en secreto de chico?'], [2, '¿Cuál es tu plan perfecto de domingo?'],
      [3, '¿Qué canción te hace llorar o te pone la piel de gallina?'], [3, '¿Qué cosa sencilla te hace realmente feliz?'] ] },
    { id: 'grupo', name: 'Entre nosotros', icon: '🤝', on: true, q: [
      [1, '¿Quién de aquí sobreviviría más tiempo en una isla desierta?'], [1, '¿Quién de aquí se demora más en arreglarse?'], [1, '¿Quién sería el primero en llorar en una película?'], [1, '¿Quién de aquí sería presidente?'], [1, '¿Quién tiene la risa más contagiosa?'],
      [2, '¿Cuál fue tu primera impresión de alguien de esta mesa?'], [2, '¿A quién de aquí le pedirías ayuda en una emergencia?'], [2, '¿Qué recuerdo tienes con alguien de aquí que nunca olvidarás?'], [2, '¿Quién de aquí te ha sorprendido más desde que lo conoces?'],
      [3, '¿Qué admiras de la persona que tienes a tu derecha?'], [3, '¿Qué le agradecerías a alguien de esta mesa que nunca le dijiste?'] ] },
    { id: 'recuerdos', name: 'Recuerdos', icon: '📸', on: true, q: [
      [1, '¿Cuál era tu dibujo animado favorito de niño?'], [1, '¿Qué querías ser de grande cuando eras chico?'], [1, '¿Cuál fue tu primer celular o videojuego?'], [1, '¿Qué travesura hiciste de niño que tus papás nunca supieron?'],
      [2, '¿Cuál es el mejor viaje que has hecho?'], [2, '¿Qué profesor o profesora te marcó y por qué?'], [2, '¿Cuál es tu recuerdo más feliz de la infancia?'], [2, '¿Qué es lo más loco que hiciste en el colegio?'],
      [3, '¿Qué momento cambió tu forma de ver la vida?'], [3, '¿Qué le dirías a tu yo de hace diez años?'], [3, '¿Cuál ha sido el día más difícil que superaste?'] ] },
    { id: 'si', name: '¿Qué harías si…?', icon: '🔮', on: true, q: [
      [1, 'Si pudieras tener un superpoder, ¿cuál elegirías?'], [1, 'Si ganaras la lotería mañana, ¿qué es lo primero que harías?'], [1, 'Si pudieras cenar con cualquier persona del mundo, ¿quién sería?'], [1, 'Si solo pudieras comer una comida para siempre, ¿cuál?'],
      [2, 'Si pudieras vivir en cualquier época, ¿cuál escogerías?'], [2, 'Si pudieras dominar un idioma de un día para otro, ¿cuál sería?'], [2, 'Si tuvieras que mudarte a otro país, ¿a dónde y por qué?'], [2, 'Si pudieras cambiar una regla del mundo, ¿cuál cambiarías?'],
      [3, 'Si supieras que no puedes fallar, ¿qué intentarías?'], [3, 'Si mañana fuera tu último día, ¿con quién lo pasarías?'], [3, 'Si pudieras borrar un recuerdo, ¿lo harías? ¿Cuál?'] ] },
    { id: 'personal', name: 'Personales', icon: '💭', on: true, q: [
      [1, '¿Qué es lo que más te gusta de tu forma de ser?'], [1, '¿Cómo te describiría tu mejor amigo en tres palabras?'], [1, '¿Qué te pone de buen humor al instante?'],
      [2, '¿Qué miedo tienes que te da vergüenza admitir?'], [2, '¿Qué es lo que más te cuesta pedir?'], [2, '¿Qué crítica te ha dolido más y por qué?'], [2, '¿De qué logro tuyo te sientes más orgulloso?'],
      [3, '¿Qué parte de ti estás aprendiendo a querer?'], [3, '¿Qué necesitas escuchar más seguido?'], [3, '¿Qué te quita el sueño últimamente?'], [3, '¿En qué te gustaría ser más valiente?'] ] },
    { id: 'profundas', name: 'Profundas', icon: '🌙', on: true, q: [
      [1, '¿Qué significa para ti tener un buen día?'], [1, '¿Crees más en el destino o en la suerte?'],
      [2, '¿Qué es lo más importante en una amistad?'], [2, '¿Qué te gustaría que dijeran de ti cuando no estás?'], [2, '¿Qué te hace sentir en casa?'], [2, '¿Qué aprendiste de la persona que más te ha decepcionado?'],
      [3, '¿Qué es para ti el éxito?'], [3, '¿De qué te arrepientes de no haber hecho?'], [3, '¿Qué te gustaría haber escuchado de chico?'], [3, '¿Qué cosa te gustaría perdonar o que te perdonen?'], [3, '¿Cuál es tu mayor sueño, aunque parezca imposible?'] ] },
    { id: 'atrevidas', name: 'Atrevidas', icon: '🌶️', on: false, hint: 'Para amigos de confianza o parejas', q: [
      [1, '¿Cuál ha sido tu peor cita?'], [1, '¿Qué es lo primero que te fijas en alguien que te gusta?'], [1, '¿Alguna vez te enamoraste de un amigo o amiga?'],
      [2, '¿Cuál fue tu primer amor y cómo terminó?'], [2, '¿Qué es lo más romántico que has hecho por alguien?'], [2, '¿Qué mensaje te arrepientes de haber mandado?'], [2, '¿Has stalkeado a un ex en redes? Sé sincero.'],
      [3, '¿Qué es algo que nunca le has contado a nadie de esta mesa?'], [3, '¿Qué te hace sentir querido de verdad?'], [3, '¿Cuál es tu mayor inseguridad en una relación?'] ] },
  ];
  const LEVELS = ['Ligero', 'Medio', 'Profundo'], SAVE = 'gg_preguntas';
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; } };

  // Arma el mazo: de cada nivel, en orden; dentro de cada nivel, al azar y mezclando categorías.
  function build(st) {
    const pool = CATS.filter(c => st.cats.includes(c.id)).flatMap(c => c.q.filter(q => q[0] <= st.max).map(q => ({ lvl: q[0], text: q[1], cat: c })));
    const byL = [1, 2, 3].map(l => shuffle(pool.filter(q => q.lvl === l)));
    const want = [0.4, 0.33, 0.27].slice(0, st.max), tot = want.reduce((a, b) => a + b, 0);
    let out = [];
    byL.slice(0, st.max).forEach((list, i) => { out = out.concat(list.slice(0, Math.max(1, Math.round(st.count * want[i] / tot)))); });
    const rest = shuffle(pool.filter(q => !out.includes(q)));
    while (out.length < st.count && rest.length) out.push(rest.pop());
    return { deck: out.slice(0, st.count).sort((a, b) => a.lvl - b.lvl), spare: rest };
  }

  window.FiestaPreguntas = function (api) {
    const { screen, $, fx, buzz } = api, sv = load();
    const st = { cats: Array.isArray(sv.cats) && sv.cats.length ? sv.cats.filter(id => CATS.some(c => c.id === id)) : CATS.filter(c => c.on).map(c => c.id), max: sv.max || 3, count: sv.count || 25, names: sv.names || '' };
    const keep = () => { try { localStorage.setItem(SAVE, JSON.stringify(st)); } catch (e) { /* nada */ } };

    function setup() {
      const total = CATS.filter(c => st.cats.includes(c.id)).reduce((a, c) => a + c.q.filter(q => q[0] <= st.max).length, 0);
      screen('De Menos a Más', '<div class="pt-hero dm"><span class="pt-art">💬</span><p>Preguntas para conocerse de verdad: empiezan ligeras y graciosas, y poco a poco se ponen más personales.</p></div>' +
        '<h4 class="pt-sub">¿Qué tipo de preguntas?</h4><div class="pt-chips dm-cats">' + CATS.map(c => '<button type="button" class="pt-chip' + (st.cats.includes(c.id) ? ' on' : '') + '" data-c="' + c.id + '"><span>' + c.icon + '</span><div><b>' + esc(c.name) + '</b>' + (c.hint ? '<small>' + esc(c.hint) + '</small>' : '') + '</div><i class="dm-tick">' + (st.cats.includes(c.id) ? '✓' : '') + '</i></button>').join('') + '</div>' +
        '<div class="dm-all"><button type="button" id="all">Marcar todas</button><button type="button" id="none">Quitar todas</button></div>' +
        '<section class="pt-card"><div class="pt-row"><div><b>¿Hasta qué nivel?</b><small>Siempre se empieza por lo ligero</small></div><div class="pt-seg" data-k="max">' + LEVELS.map((l, i) => '<button type="button" data-v="' + (i + 1) + '" class="' + (st.max === i + 1 ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>' +
        '<div class="pt-row"><div><b>Preguntas</b><small>' + total + ' disponibles con estos filtros</small></div><div class="pt-seg" data-k="count">' + [15, 25, 40].map(n => '<button type="button" data-v="' + n + '" class="' + (st.count === n ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div></section>' +
        '<details class="pt-names"' + (st.names ? ' open' : '') + '><summary>Nombres de los jugadores (opcional)</summary><input id="nm" class="dm-names" placeholder="Ana, Luis, Sofía…" value="' + esc(st.names) + '" autocomplete="off"></details>' +
        '<button class="pt-btn primary pt-go" id="go"' + (st.cats.length ? '' : ' disabled') + '>' + (st.cats.length ? 'Empezar' : 'Marca al menos un tipo') + '</button>', () => {
        document.querySelectorAll('.dm-cats [data-c]').forEach(b => { b.onclick = () => { const id = b.dataset.c; st.cats = st.cats.includes(id) ? st.cats.filter(x => x !== id) : st.cats.concat(id); fx('click'); keep(); setup(); }; });
        $('#all').onclick = () => { st.cats = CATS.map(c => c.id); keep(); setup(); };
        $('#none').onclick = () => { st.cats = []; keep(); setup(); };
        document.querySelectorAll('.pt-seg[data-k] button').forEach(b => { b.onclick = () => { st[b.parentNode.dataset.k] = +b.dataset.v; keep(); setup(); }; });
        $('#nm').oninput = e => { st.names = e.target.value.slice(0, 200); keep(); };
        $('#go').onclick = () => { if (!st.cats.length) return; keep(); fx('deal'); play(); };
      }, { keep: true });
    }

    function play() {
      const names = st.names.split(',').map(s => s.trim()).filter(Boolean).slice(0, 16);
      const { deck, spare } = build(st);
      let i = 0, lvlShown = 0;
      const show = dir => {
        const q = deck[i], who = names.length ? names[i % names.length] : '';
        const newLvl = q.lvl !== lvlShown; lvlShown = q.lvl;
        screen('De Menos a Más', '<div class="dm-play"><div class="dm-top"><span>' + (i + 1) + ' / ' + deck.length + '</span><span class="dm-lvl">' + [1, 2, 3].map(l => '<i class="' + (l <= q.lvl ? 'on' : '') + '"></i>').join('') + LEVELS[q.lvl - 1] + '</span></div>' +
          '<div class="dm-bar"><u style="width:' + ((i + 1) / deck.length * 100) + '%"></u></div>' +
          (newLvl && i > 0 ? '<p class="dm-up">⬆️ Subimos a nivel <b>' + LEVELS[q.lvl - 1] + '</b></p>' : '') +
          '<article class="dm-card l' + q.lvl + (dir ? ' in' : '') + '"><span class="dm-cat">' + q.cat.icon + ' ' + esc(q.cat.name) + '</span>' + (who ? '<p class="dm-who">Le toca a <b>' + esc(who) + '</b></p>' : '') + '<h2>' + esc(q.text) + '</h2></article>' +
          '<div class="dm-acts"><button class="pt-btn" id="back"' + (i ? '' : ' disabled') + '>‹</button><button class="pt-btn" id="swap">🔄 Otra</button><button class="pt-btn primary" id="next">' + (i < deck.length - 1 ? 'Siguiente ›' : 'Terminar') + '</button></div></div>', () => {
          $('#next').onclick = () => { if (i < deck.length - 1) { i++; fx('deal'); show(1); } else end(); };
          $('#back').onclick = () => { if (i) { i--; show(0); } };
          $('#swap').onclick = () => { const k = spare.findIndex(s => s.lvl === q.lvl); if (k < 0) { buzz(20); return; } deck[i] = spare.splice(k, 1)[0]; spare.unshift(q); fx('click'); show(1); };
        }, { full: false, guard: true });
        if (newLvl && i > 0) { fx('notify'); buzz([20, 40, 20]); }
      };
      show(1);
    }
    function end() {
      fx('win');
      screen('De Menos a Más', '<div class="dm-end"><div class="big">🫶</div><h2>¡Se conocen un poco más!</h2><p>Respondieron ' + st.count + ' preguntas. ¿Otra ronda?</p><button class="pt-btn primary" id="again">Otra ronda</button><button class="pt-btn" id="filters">Cambiar filtros</button></div>', () => {
        $('#again').onclick = () => play(); $('#filters').onclick = () => setup();
      });
    }
    setup();
  };
  window.FiestaPreguntas.CATS = CATS;
})();
