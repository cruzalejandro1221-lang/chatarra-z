# SPEC: Chatarra Z, tráiler "De piedras a fuego"

GOAL:    the viewer understands how to play (drag back, release, aim for the head, ammo is scarce, weapons unlock per level) and wants to try World 1.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    ~158 s x 30 = 4740 frames; music = the game's own loop at 104 BPM (17.3 frames per beat)

LOOK:
- Two worlds alternate: (1) the game itself, full frame, real canvas render of the shipped code at 1.5x (1280x720 logical → 1920x1080), punched in up to 1.9x with GSAP on a wrapper; (2) type fields: flat soot #1a140e, hazard yellow #ffc229, rust #c8392b, with the game's diagonal hazard stripe (24 px period) as the only ornament.
- Ink: #f4ead8 on soot, #1a140e on yellow. Accent = yellow; on yellow ground the accent becomes rust. One accent word per line.
- Display: Archivo Black, 150–220 px chapter numbers, 96–120 px lines, tracking -1%. Body: Outfit 600, 44–56 px.
- Captions over gameplay sit on a solid soot band (no dimming of the game), bottom-left, 88% title-safe.

OBJECTS: survivor on the wall, stone, stick, sling, bow, fire arrow, molotov, barricade of planks, spike board, ally, materials (plank, cloth, nut), the Mamut. All drawn by the game's own art code.

MOTION:
- Enter titles: per word blur 6→0 px + opacity 0→1 in 0.13 s, 0.08 s apart, no translate. Chapter numbers: slot-roll of 3 previous numbers (0.09 s each) landing on the real one.
- Camera on gameplay: 0.5 s power2.inOut punch-ins, then hold while the game acts.
- Transitions (4 kinds): object becomes the world (a thrown stone grows to fill the frame, 0.55 s power3.in), colour flood to yellow (0.4 s power2.inOut), whip (0.25 s horizontal), dip cut (3 frames darken) before hard cuts.
- Exits 40% shorter than entries. Landed titles hold dead still.

SHOTS (seconds):
- 0–9 hook: stone in the air → headshot → second zombie; band "Solo tienes piedras".
- 9–20 the horde: wide, 10 walkers advance, survivor throws; band "Y ellos nunca dejan de llegar". Whip.
- 20–29 title: yellow flood, CHATARRA Z stamps letter by letter, line "Defiende la muralla. Gana armas. Cuida cada flecha."
- 29–54 how to throw: big hand cursor drags back on the field, trajectory dots, release, hit. Lines: "Arrastra hacia atrás", "Suelta", "A la cabeza: doble daño", "Los cascos hacen rebotar las piedras".
- 54–112 eight chapters (Nivel 2..9), each 1.6 s card + 5.6 s gameplay with its real ammo count.
- 112–126 every arrow counts: materials drop and fly up, rebuilt craft row "Fabricar +5 flechas" pressed by the cursor.
- 126–133 upgrades: aim preview grows 30% → 100% as the Puntería pips fill.
- 133–150 boss: El Mamut, fire arrows and molotov, slow-mo kill, "¡JEFE DERROTADO!".
- 150–158 claim "Empiezas con piedras. Terminas con fuego." → end card CHATARRA Z + "Mundo 1 · juega gratis en el navegador", held 3 s.

BANNED: dark void with floating elements; glow/particles as decoration (the game's own fire is diegetic); purple/blue gradients; everything fading and sliding up; titles over dimmed gameplay; three cards in a row; logo docked in a corner; text moving while read.

QA: 1.5 s (headshot visible), 24 s (title readable), 36 s (drag hand + dots), 60 s (chapter card), 100 s (molotov flames), 118 s (craft row), 146 s (boss dying), 156 s (end card).
