# Genera compositions/captions.html y compositions/chapters.html (HTML estático, editable en Studio).
import re, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "compositions")

CAPS = [
    (2.2, 6.4, "Solo tienes <em>piedras</em>"),
    (11.4, 16.6, "Y ellos nunca dejan de <em>llegar</em>"),
    (29.5, 33.0, "<em>Arrastra</em> hacia atrás"),
    (33.0, 35.6, "<em>Suelta</em>"),
    (35.6, 39.4, "Más arrastre, más <em>fuerza</em>"),
    (39.6, 44.4, "A la cabeza: <em>doble</em> daño"),
    (44.6, 49.4, "Los cascos hacen <em>rebotar</em> las piedras"),
    (49.6, 53.7, "Apunta al cuerpo… o consigue algo <em>mejor</em>"),
]
CH = [  # número, nombre, icono, frase en juego
    (2, "Barricada", "tablas", "Frena a la horda mientras <em>apuntas</em>"),
    (3, "Palos", "palo", "Lentos, pero <em>empujan</em>"),
    (4, "Honda", "honda", "Más lejos, más <em>rápido</em>"),
    (5, "Púas", "puas", "Hieren a todo el que las <em>pisa</em>"),
    (6, "Arco", "arco", "<em>15</em> flechas por nivel. Ni una más"),
    (7, "Aliado", "aliado", "Lanza piedras por su <em>cuenta</em>"),
    (8, "Flechas de fuego", "fuego", "Solo <em>3.</em> Úsalas en grupos"),
    (9, "Molotov", "molotov", "Solo <em>2.</em> Que crucen el <em>fuego</em>"),
]
CH0, CHL, CARD = 54, 7.25, 1.6
for i, c in enumerate(CH):
    t0 = CH0 + i * CHL + CARD
    CAPS.append((round(t0 + 0.45, 2), round(CH0 + (i + 1) * CHL - 0.35, 2), c[3]))
CAPS += [
    (112.3, 116.7, "Los zombis sueltan <em>materiales</em>"),
    (126.3, 132.6, "Mejora tu <em>puntería</em> y verás más tiro"),
    (137.2, 141.8, "Guarda lo <em>mejor</em> para él"),
]

def words(html):
    # envuelve cada palabra en <span class="w">, respetando <em>
    out, inem = [], False
    for tok in re.findall(r"<em>|</em>|[^\s<]+", html):
        if tok == "<em>": inem = True; continue
        if tok == "</em>": inem = False; continue
        out.append(f'<span class="w{" a" if inem else ""}">{tok}</span>')
    return " ".join(out)

cap_html, cap_js = [], []
for k, (a, b, t) in enumerate(CAPS):
    cid = f"cap{k+1}"
    cap_html.append(f'    <div id="{cid}" class="clip cap" data-start="{a}" data-duration="{round(b-a,2)}" data-track-index="{2 + k % 2}"><div class="band" id="{cid}-b"><span class="txt">{words(t)}</span></div></div>')
    n = len(re.findall(r"[^\s<]+", re.sub(r"</?em>", "", t)))
    cap_js.append(f'    capIn("#{cid}", {a}, {round(b-a,2)});')

captions = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cap {{ position: absolute; left: 192px; bottom: 132px; }}
    .band {{ display: inline-block; background: #1a140e; padding: 20px 34px 24px; border-left: 14px solid #ffc229; transform-origin: 0 50%; }}
    .txt {{ font-family: 'Archivo Black', sans-serif; font-size: 66px; line-height: 1.05; color: #f4ead8; letter-spacing: -0.5px; white-space: nowrap; }}
    .w {{ display: inline-block; }}
    .w.a {{ color: #ffc229; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
{chr(10).join(cap_html)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    function capIn(sel, start, dur) {{
      const band = document.querySelector(sel + ' .band'), ws = document.querySelectorAll(sel + ' .w');
      tl.fromTo(band, {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.22, ease: 'expo.out' }}, start);
      tl.fromTo(ws, {{ opacity: 0, filter: 'blur(6px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.08, ease: 'power2.out' }}, start + 0.12);
      tl.to(ws, {{ opacity: 0, filter: 'blur(6px)', duration: 0.16, stagger: 0.02, ease: 'power2.in' }}, start + dur - 0.3);
      tl.to(band, {{ scaleX: 0, duration: 0.16, ease: 'power3.in' }}, start + dur - 0.18);
    }}
{chr(10).join(cap_js)}
    window.__timelines["captions"] = tl;
  </script>
</template>
'''
open(os.path.join(ROOT, "captions.html"), "w", encoding="utf8").write(captions)

cards_html, cards_js = [], []
for i, (num, name, icon, _) in enumerate(CH):
    st = round(i * CHL, 2)
    yel = i % 2 == 1
    cid = f"card{num}"
    rolls = [num - 3, num - 2, num - 1, num]
    roll_spans = "".join(f'<span>{max(1, r)}</span>' for r in rolls)
    cards_html.append(f'''    <div id="{cid}" class="clip card{' y' if yel else ''}" data-start="{st}" data-duration="{CARD + 0.05}" data-track-index="{1 + i % 2}">
      <div class="inner" id="{cid}-in">
        <div class="flood"></div>
        <div class="stripe"></div>
        <div class="lvl"><b>NIVEL</b><div class="roll" data-layout-allow-overflow><div class="reel" id="{cid}-reel">{roll_spans}</div></div></div>
        <div class="item"><canvas class="ico" data-icon="{icon}" width="288" height="240"></canvas><div class="nm">{words(name)}</div><div class="nuevo">NUEVO</div></div>
      </div>
    </div>''')
    cards_js.append(f'    cardIn("#{cid}", {st});')

chapters = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .card {{ position: absolute; inset: 0; overflow: hidden; }}
    .inner {{ position: absolute; inset: 0; }}
    .flood {{ position: absolute; inset: 0; background: #1a140e; transform-origin: 100% 50%; }}
    .card.y .flood {{ background: #ffc229; }}
    .stripe {{ position: absolute; left: 0; right: 0; top: 0; height: 34px; background: repeating-linear-gradient(-45deg, #ffc229 0 24px, #1a140e 24px 48px); }}
    .card.y .stripe {{ background: repeating-linear-gradient(-45deg, #1a140e 0 24px, #ffc229 24px 48px); }}
    .lvl {{ position: absolute; left: 230px; top: 250px; }}
    .lvl b {{ display: block; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 54px; letter-spacing: 8px; color: #a7977f; }}
    .card.y .lvl b {{ color: #6b4a10; }}
    .roll {{ height: 400px; overflow: hidden; }}
    .reel span {{ display: block; height: 400px; font-family: 'Archivo Black', sans-serif; font-size: 400px; line-height: 400px; color: #ffc229; }}
    .card.y .reel span {{ color: #1a140e; }}
    .item {{ position: absolute; left: 900px; top: 300px; width: 820px; }}
    .ico {{ width: 432px; height: 360px; display: block; margin-left: -40px; }}
    .nm {{ font-family: 'Archivo Black', sans-serif; font-size: 108px; line-height: 1; color: #f4ead8; letter-spacing: -1px; }}
    .card.y .nm {{ color: #1a140e; }}
    .w {{ display: inline-block; }}
    .nuevo {{ position: absolute; left: 330px; top: 30px; font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 34px; letter-spacing: 6px; color: #1a140e; background: #ffc229; padding: 6px 18px; border-radius: 6px; }}
    .card.y .nuevo {{ background: #c8392b; color: #fff; }}
  </style>
  <div id="root" data-composition-id="chapters" data-width="1920" data-height="1080">
{chr(10).join(cards_html)}
  </div>
  <script>
    document.querySelectorAll('#root .ico').forEach(cv => {{
      const g = cv.getContext('2d'), src = makeItemIcon(cv.dataset.icon);
      g.drawImage(src, 0, 0, cv.width, cv.height);
    }});
    const tl = gsap.timeline({{ paused: true }});
    function cardIn(sel, s) {{
      tl.fromTo(sel + ' .flood', {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.3, ease: 'power2.inOut' }}, s);
      tl.fromTo(sel + ' .stripe', {{ xPercent: 100 }}, {{ xPercent: 0, duration: 0.3, ease: 'power2.inOut' }}, s);
      tl.fromTo(sel + ' .lvl', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, s + 0.22);
      tl.fromTo(sel + ' .reel', {{ yPercent: 0 }}, {{ yPercent: -75, duration: 0.36, ease: 'power3.out' }}, s + 0.24);
      tl.fromTo(sel + ' .ico', {{ opacity: 0, scale: 0.6 }}, {{ opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }}, s + 0.4);
      tl.fromTo(sel + ' .nm .w', {{ opacity: 0, filter: 'blur(6px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.13, stagger: 0.08 }}, s + 0.5);
      tl.fromTo(sel + ' .nuevo', {{ opacity: 0, scale: 1.6 }}, {{ opacity: 1, scale: 1, duration: 0.2, ease: 'expo.out' }}, s + 0.7);
      tl.fromTo(sel + ' .inner', {{ x: 0, filter: 'blur(0px)' }}, {{ x: -1920, filter: 'blur(16px)', duration: 0.26, ease: 'power3.in' }}, s + 1.36);
    }}
{chr(10).join(cards_js)}
    window.__timelines["chapters"] = tl;
  </script>
</template>
'''
open(os.path.join(ROOT, "chapters.html"), "w", encoding="utf8").write(chapters)
print(len(CAPS), "captions;", len(CH), "cards")
