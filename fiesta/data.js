'use strict';
// Juegos de fiesta · palabras y cartas (español latino). Para añadir contenido basta con agregar elementos a las listas.
window.FIESTA_DATA = (() => {
  const animales = ['Perro', 'Gato', 'Elefante', 'Jirafa', 'Pingüino', 'Delfín', 'Tiburón', 'Loro', 'Tortuga', 'Cuy', 'Llama', 'Cóndor', 'Mono', 'Serpiente', 'Caballo', 'Vaca', 'Gallina', 'Pulpo', 'Murciélago', 'Oso', 'León', 'Tigre', 'Abeja', 'Cangrejo', 'Canguro', 'Pavo real'];
  const peliculas = ['Titanic', 'Shrek', 'Frozen', 'Toy Story', 'Harry Potter', 'El Rey León', 'Avengers', 'Spider-Man', 'Coco', 'Los Increíbles', 'Barbie', 'Jurassic Park', 'Stranger Things', 'La Casa de Papel', 'El juego del calamar', 'Moana', 'Buscando a Nemo', 'Minions', 'Star Wars', 'Piratas del Caribe', 'El Señor de los Anillos', 'Los Simpson', 'Dragon Ball', 'Naruto', 'Rápidos y Furiosos'];
  const mezclar = cats => ({ id: 'mezcla', name: 'Mezcla', emoji: '🎲', words: [].concat(...cats.map(c => c.words)) });

  const imp = [
    { id: 'comidas', name: 'Comidas', emoji: '🍽️', words: ['Ceviche', 'Lomo saltado', 'Pizza', 'Hamburguesa', 'Tacos', 'Arroz con leche', 'Pollo a la brasa', 'Empanada', 'Sushi', 'Helado', 'Chocolate', 'Papa rellena', 'Anticucho', 'Tallarines', 'Sándwich', 'Panqueques', 'Arepa', 'Ají de gallina', 'Churros', 'Hot dog', 'Mazamorra morada', 'Causa limeña', 'Salchipapa', 'Arroz chaufa', 'Tamales', 'Chicha morada', 'Palomitas', 'Torta de chocolate'] },
    { id: 'animales', name: 'Animales', emoji: '🐾', words: animales },
    { id: 'lugares', name: 'Lugares', emoji: '📍', words: ['Playa', 'Aeropuerto', 'Cine', 'Hospital', 'Colegio', 'Supermercado', 'Discoteca', 'Estadio', 'Biblioteca', 'Gimnasio', 'Parque de diversiones', 'Machu Picchu', 'Mercado', 'Iglesia', 'Piscina', 'Restaurante', 'Zoológico', 'Avión', 'Combi', 'Ascensor', 'Farmacia', 'Banco', 'Campamento', 'Peluquería', 'Gasolinera', 'Casa de playa'] },
    { id: 'peliculas', name: 'Películas y series', emoji: '🎬', words: peliculas },
    { id: 'deportes', name: 'Deportes y juegos', emoji: '⚽', words: ['Fútbol', 'Vóley', 'Básquet', 'Natación', 'Tenis', 'Boxeo', 'Ajedrez', 'Ping pong', 'Ciclismo', 'Surf', 'Karate', 'Atletismo', 'Béisbol', 'Las escondidas', 'Trompo', 'Rayuela', 'Fortnite', 'Minecraft', 'Free Fire', 'FIFA', 'Mario Kart', 'Among Us', 'Roblox'] },
    { id: 'tiktok', name: 'TikTok y redes', emoji: '📱', words: ['Baile viral', 'Filtro', 'Reto', 'Tendencia', 'Influencer', 'Streamer', 'Selfie', 'Meme', 'Storytime', 'Tutorial de maquillaje', 'Unboxing', 'Transmisión en vivo', 'Hashtag', 'Seguidores', 'Duetos', 'Get ready with me', 'Cámara lenta', 'Audio viral', 'Doble tap', 'Videollamada'] },
    { id: 'objetos', name: 'Objetos', emoji: '🎒', words: ['Celular', 'Audífonos', 'Paraguas', 'Mochila', 'Espejo', 'Llaves', 'Reloj', 'Cámara', 'Lentes', 'Almohada', 'Cargador', 'Billetera', 'Escoba', 'Tijeras', 'Linterna', 'Bicicleta', 'Plancha', 'Control remoto', 'Peine', 'Cuchara', 'Candado', 'Globo', 'Silla', 'Despertador'] },
    { id: 'profesiones', name: 'Profesiones', emoji: '💼', words: ['Doctor', 'Profesor', 'Bombero', 'Policía', 'Chef', 'Piloto', 'Youtuber', 'Futbolista', 'Astronauta', 'Cantante', 'Mecánico', 'Abogado', 'Panadero', 'Peluquero', 'Payaso', 'Albañil', 'Dentista', 'Repartidor', 'DJ', 'Fotógrafo', 'Mago', 'Cartero'] },
  ];

  const head = [
    { id: 'famosos', name: 'Famosos', emoji: '⭐', words: ['Shakira', 'Messi', 'Cristiano Ronaldo', 'Bad Bunny', 'Karol G', 'Taylor Swift', 'Neymar', 'Will Smith', 'La Roca', 'MrBeast', 'Ibai', 'Luisito Comunica', 'Michael Jackson', 'Elvis Presley', 'Charles Chaplin', 'Selena Gomez', 'Justin Bieber', 'Ed Sheeran', 'Rihanna', 'Beyoncé', 'Maluma', 'J Balvin', 'Paolo Guerrero', 'Mbappé', 'Zendaya', 'Tom Holland', 'Ariana Grande', 'Billie Eilish', 'Dua Lipa', 'Eminem', 'Marilyn Monroe', 'Albert Einstein', 'Cantinflas'] },
    { id: 'personajes', name: 'Personajes', emoji: '🦸', words: ['Pikachu', 'Mario Bros', 'Goku', 'Shrek', 'Elsa', 'Spider-Man', 'Batman', 'Homero Simpson', 'Bob Esponja', 'Mickey Mouse', 'Harry Potter', 'Darth Vader', 'Woody', 'Dora la Exploradora', 'Peppa Pig', 'El Chavo del 8', 'Naruto', 'Sonic', 'Winnie Pooh', 'Superman', 'Barbie', 'Buzz Lightyear', 'Hello Kitty', 'Bluey', 'Stitch', 'Olaf', 'Capitán América', 'Luffy'] },
    { id: 'animales', name: 'Animales', emoji: '🐾', words: animales },
    { id: 'acciones', name: 'Mímica', emoji: '🎭', words: ['Bailar reggaetón', 'Nadar', 'Cocinar', 'Dormir', 'Correr', 'Cantar en la ducha', 'Manejar', 'Pescar', 'Llorar de risa', 'Hacer ejercicio', 'Tomarse una selfie', 'Lavarse los dientes', 'Tocar guitarra', 'Jugar fútbol', 'Estornudar', 'Caminar como robot', 'Bostezar', 'Comer ceviche', 'Hablar por teléfono', 'Pelear con un hermano', 'Tirarse en paracaídas', 'Escalar una montaña', 'Planchar', 'Pintarse las uñas', 'Cargar un bebé', 'Montar a caballo'] },
    { id: 'latam', name: 'Latinoamérica', emoji: '🌎', words: ['Machu Picchu', 'Ceviche', 'Inca Kola', 'Cuy', 'Lima', 'Cusco', 'Llama', 'Pollo a la brasa', 'Mototaxi', 'Chifa', 'Lomo saltado', 'Marinera', 'Papa', 'Combi', 'Pisco sour', 'Arepa', 'Tacos', 'Mariachi', 'Tango', 'Carnaval', 'Cumbia', 'Salsa', 'Mate', 'Empanada', 'Dulce de leche', 'Reggaetón', 'Selva amazónica'] },
    { id: 'peliculas', name: 'Películas', emoji: '🎬', words: peliculas },
    { id: 'memes', name: 'Memes y virales', emoji: '😂', words: ['Doge', 'Trollface', 'Nyan Cat', 'Gigachad', 'Baby Shark', 'Macarena', 'Gangnam Style', 'Harlem Shake', 'Ice Bucket Challenge', 'Dalgona', 'Baile de Wednesday', 'Mewing', 'Rizz', 'Sigma', 'Cringe', 'Skibidi toilet'] },
  ];

  const diez = {
    perf: ['belleza', 'humor', 'dinero', 'cocina', 'baile', 'inteligencia', 'ternura', 'fama en redes', 'estilo', 'deportes', 'cantar', 'lealtad', 'aventura', 'videojuegos'],
    flaws: [
      'se ríe como foca', 'habla de sí mismo en tercera persona', 'siempre llega una hora tarde', 'tiene 8 gatos y los trata como hijos', 'responde todo con audios de 5 minutos',
      'se come tus papas fritas sin pedirte', 'canta en el baño a las 6 a. m.', 'ronca como un motor', 'le pone ketchup a todo', 'dice "jeje" al final de cada frase',
      'te cuenta el final de las series', 'pone música a todo volumen en el bus', 'usa las mismas medias tres días', 'nunca responde los mensajes', 'cuenta el mismo chiste todos los días',
      'tarda 20 minutos en sacarle foto a la comida', 'siempre dice "yo ya lo sabía"', 'se le olvida tu nombre', 'baila en el supermercado', 'habla con la comida',
      'le tiene pánico a las palomas', 'te obliga a probar pizza con piña', 'tiene una risa que se escucha en todo el barrio', 'duerme con los ojos abiertos', 'solo habla en rimas',
      'llama "mi amor" a todo el mundo, hasta al cobrador', 'se toma selfies en los funerales', 'hace beatbox cuando se pone nervioso', 'colecciona uñas cortadas', 'cree que sabe leer la mente',
      'se duerme en todas las películas', 'tiene una mascota que odia a todos menos a él', 'cada vez que ve a un perro se pone a ladrar', 'siempre pide el último pedazo', 'abre los regalos antes de tiempo',
      'se sabe todos los chismes del barrio', 'le tiene miedo a los globos', 'habla dormido y dice secretos', 'camina como pingüino', 'se cree influencer pero tiene 12 seguidores',
    ],
    breakers: [
      'le debe plata a toda tu familia', 'es tu ex', 'es el ex de tu mejor amigo', 'te deja en visto para siempre', 'es hincha de tu equipo rival', 'te roba los cargadores',
      'nunca paga la cuenta', 'le cae mal tu mamá', 'te escribe mensajes de ex a las 3 a. m.', 'revisa tu celular cada vez que te descuidas', 'te pone un apodo vergonzoso en público',
      'dice que la Tierra es plana', 'te cancela siempre a último minuto', 'se pelea con el mozo en cada restaurante',
    ],
  };

  const cats = imp.slice();
  imp.push(mezclar(cats));
  head.push(mezclar(head));
  return { impostor: { cats: imp }, head: { cats: head }, diez };
})();
