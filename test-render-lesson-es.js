/* Aula de ESPANHOL para conferência visual.
 *
 * Existe por um motivo específico: até 21/08/2026 os textos fixos do template
 * (selo da capa, divisores, agenda, fecho) saíam em INGLÊS numa aula de
 * espanhol, e o professor corrigia na mão toda vez. Renderizar esta aula é o
 * jeito de ver, num relance, se sobrou alguma palavra em inglês no slide.
 *
 *     node test-render.js      (gera preview.html e preview-es.html)
 *
 * O espanhol também é o pior caso de LARGURA: as palavras são mais compridas
 * que as inglesas (medido na Poppins: 0,52 contra 0,50 do tamanho da fonte),
 * então é aqui que o ajuste automático de fonte é mais exigido.
 */
module.exports = {
  coverTitle: "Descubriendo la Ciudad de México",
  coverEmoji: "🌮",
  sectionEmojis: {
    objectives: "🎯",
    vocabulary: "📚",
    intro: "🏙️",
    conversation: "💬",
    languageGame: "🎲",
    evaluation: "✅",
  },
  coverLevel: "Intermediário",   // rótulo interno; a capa deve mostrar "Intermedio"
  language: "spanish",
  topic: "la Ciudad de México",
  objectives: [
    "Aprender ocho palabras nuevas sobre la vida en una ciudad grande.",
    "Practicar cómo describir lugares usando el presente de indicativo.",
    "Ganar confianza al hablar de una ciudad que te gustaría conocer.",
  ],
  vocabulary: [
    { word: "el barrio", translation: "o bairro" },
    { word: "el mercado", translation: "o mercado" },
    { word: "la avenida", translation: "a avenida" },
    { word: "el rascacielos", translation: "o arranha-céu" },
    { word: "la muchedumbre", translation: "a multidão" },
    { word: "el atardecer", translation: "o entardecer" },
    { word: "la temporada", translation: "a temporada" },
    { word: "el desplazamiento", translation: "o deslocamento" },
  ],
  introText:
    "La Ciudad de México es una de las ciudades más grandes del mundo, y también una de las más antiguas del continente americano. En un mismo barrio puedes encontrar una pirámide, una iglesia colonial y un edificio de vidrio con oficinas modernas. La gente desayuna tamales en la calle, se mueve en metro por avenidas enormes y se reúne en las plazas cuando cae la tarde. Hoy vamos a hablar de cómo es vivir en una ciudad así, qué te gustaría visitar y qué crees que sería lo más difícil de acostumbrarse.",
  conversation: [
    { question: "¿Has visitado alguna vez una ciudad muy grande?", modelAnswers: ["Sí, visité...", "No, pero me gustaría conocer..."] },
    { question: "¿Qué comida mexicana te gustaría probar?", modelAnswers: ["Me gustaría probar..."] },
    { question: "¿Qué sabes sobre la cultura mexicana?", modelAnswers: [] },
    { question: "¿Prefieres vivir en el centro o en un barrio tranquilo? ¿Por qué?", modelAnswers: ["Prefiero... porque..."] },
    { question: "¿En qué temporada del año te gustaría viajar?", modelAnswers: [] },
    { question: "¿Cómo te desplazas normalmente en tu ciudad?", modelAnswers: ["Normalmente me desplazo en..."] },
    { question: "¿Qué es lo que más te llama la atención de una ciudad nueva?", modelAnswers: [] },
    { question: "¿Te gusta caminar por los mercados cuando viajas?", modelAnswers: ["Sí, me gusta porque...", "No, prefiero..."] },
    { question: "¿Qué recuerdo te gustaría traer de un viaje a México?", modelAnswers: [] },
  ],
  languageGame: [
    { question: "Completa: 'Yo ___ en un barrio muy tranquilo.'", options: ["vivo", "vives", "vive"], correctIndex: 0, source: "" },
    { question: "Completa: 'Nosotros ___ al mercado los sábados por la mañana.'", options: ["vamos", "vais", "van"], correctIndex: 0, source: "" },
    { question: "Elige la preposición correcta: 'Llegamos ___ la ciudad el domingo.'", options: ["a", "en", "de"], correctIndex: 0, source: "" },
    { question: "Completa: 'Ayer ___ un paseo por el centro histórico.'", options: ["doy", "di", "daré"], correctIndex: 1, source: "" },
    { question: "¿Cuál es la forma correcta del verbo gustar?", options: ["Me gusta los mercados", "Me gustan los mercados", "Me gustar los mercados"], correctIndex: 1, source: "" },
    { question: "Completa: 'Si tuviera tiempo, ___ más museos.'", options: ["visitaría", "visitaba", "visitaré"], correctIndex: 0, source: "" },
  ],
  evaluation: [
    { question: "¿Qué es lo que más te gustaría conocer de la Ciudad de México y por qué?", modelAnswers: [] },
    { question: "¿Qué palabra nueva de hoy quieres recordar, y cómo la usarías en una frase tuya?", modelAnswers: [] },
  ],
};
