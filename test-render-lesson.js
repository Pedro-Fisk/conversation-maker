// Shared mock lesson used by test-render.js and qa-dump.js.
module.exports = {
  coverTitle: "Discovering Japan",
  // emoji do tema (21/08/2026): campo próprio, nunca embutido no título — é
  // o que mantém o nome do arquivo baixado limpo
  coverEmoji: "🗾",
  sectionEmojis: {
    objectives: "🎯",
    vocabulary: "📚",
    intro: "⛩️",
    conversation: "💬",
    languageGame: "🎲",
    evaluation: "✅",
  },
  coverLevel: "Basic",
  language: "english",
  topic: "Japan",
  objectives: [
    "Learn 8 new words related to Japanese culture and travel.",
    "Practice describing places using simple present tense.",
    "Build confidence talking about a country you'd like to visit.",
  ],
  vocabulary: [
    { word: "temple", translation: "templo" },
    { word: "shrine", translation: "santuário" },
    { word: "bullet train", translation: "trem-bala" },
    { word: "cherry blossom", translation: "flor de cerejeira" },
    { word: "chopsticks", translation: "hashi" },
    { word: "kimono", translation: "quimono" },
    { word: "sushi", translation: "sushi" },
    { word: "capital city", translation: "capital" },
  ],
  // 100 palavras: é o teto que o prompt permite, ou seja, o pior caso que o
  // slide da introdução precisa aguentar sem estourar
  introText:
    "Japan is a country full of contrasts, where ancient temples stand quietly beside futuristic cities and neon streets. In the same afternoon you can walk through a peaceful garden, ride a bullet train at three hundred kilometres an hour, and eat sushi prepared by a chef who has practised the same recipe for thirty years. People bow when they greet each other, take their shoes off indoors, and turn small daily gestures into something close to art. Today we are going to talk about what makes this country such a popular place to visit, and what you would like to see there.",
  conversation: [
    { question: "Have you ever visited Japan or another Asian country?", modelAnswers: ["Yes, I visited Japan last year.", "No, but I'd love to go someday."] },
    { question: "What Japanese food would you like to try?", modelAnswers: ["I'd like to try real sushi.", "I want to try ramen."] },
    { question: "What do you know about Japanese culture?", modelAnswers: ["I know they value respect a lot.", "I know about the tea ceremony."] },
    { question: "Would you rather visit Tokyo or a small village?", modelAnswers: ["I'd rather visit Tokyo.", "I'd prefer a quiet village."] },
    { question: "What season would you choose to visit Japan?", modelAnswers: ["I'd go during cherry blossom season.", "I'd go in autumn for the colors."] },
    { question: "Have you tried using chopsticks before?", modelAnswers: ["Yes, but I'm not very good at it.", "No, never."] },
    { question: "What's one Japanese word you already know?", modelAnswers: ["I know 'arigato'.", "I know 'konnichiwa'."] },
    { question: "Would you like to ride the bullet train?", modelAnswers: ["Yes, it sounds amazing.", "It sounds a bit scary!"] },
    { question: "What souvenir would you bring back from Japan?", modelAnswers: ["I'd bring a kimono.", "I'd bring some tea."] },
  ],
  languageGame: [
    { question: "Complete: 'I ___ to Japan next year.'", options: ["will travel", "will travelling", "will to travel"], correctIndex: 0, source: "Essentials 1 · L12" },
    { question: "Complete: 'She ___ sushi every week.'", options: ["eat", "eats", "is eat"], correctIndex: 1, source: "Essentials 1 · L4" },
    { question: "Complete: 'They ___ visiting Kyoto right now with their cousins.'", options: ["are", "were", "have"], correctIndex: 0, source: "Essentials 2 · L7" },
    { question: "Which sentence is correct about a trip that already happened?", options: ["I go to Tokyo last year.", "I went to Tokyo last year.", "I have go to Tokyo last year."], correctIndex: 1, source: "Essentials 2 · L9" },
    { question: "Choose the correct preposition: 'We arrived ___ Osaka on Sunday morning.'", options: ["in", "at", "to"], correctIndex: 0, source: "Essentials 2 · L11" },
    { question: "Fill in: 'He has never ___ Japan, but he wants to go.'", options: ["visit", "visited", "visiting"], correctIndex: 1, source: "Essentials 2 · L14" },
  ],
  evaluation: [
    { question: "Summarize what you learned about Japan today in 2-3 sentences.", modelAnswers: ["Japan mixes old traditions with modern life.", "Students can describe temples, food and travel plans."] },
    { question: "Use 3 new vocabulary words in a sentence about travel.", modelAnswers: ["I want to visit a temple and try sushi.", "The bullet train is faster than a car."] },
  ],
};
