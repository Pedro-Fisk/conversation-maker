// Shared mock lesson used by test-render.js and qa-dump.js.
module.exports = {
  coverTitle: "Discovering Japan",
  coverLevel: "Basic",
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
  introText:
    "Japan is a country full of contrasts, ancient temples next to futuristic cities, quiet gardens next to bullet trains. Today we'll talk about what makes it such a popular place to visit.",
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
    { question: "Complete: 'I ___ to Japan next year.'", modelAnswers: ["will travel", "am going to travel"] },
    { question: "Complete: 'She ___ sushi every week.'", modelAnswers: ["eats", "is eating"] },
    { question: "Complete: 'They ___ visiting Kyoto now.'", modelAnswers: ["are", "were"] },
    { question: "Choose the correct word: temple / templo", modelAnswers: ["temple"] },
    { question: "Choose the correct word: chopsticks / talheres", modelAnswers: ["chopsticks"] },
    { question: "Fill in: 'He has never ___ Japan.'", modelAnswers: ["visited"] },
  ],
  evaluation: [
    { question: "Summarize what you learned about Japan today in 2-3 sentences.", modelAnswers: ["Japan mixes old traditions with modern life.", "Students can describe temples, food and travel plans."] },
    { question: "Use 3 new vocabulary words in a sentence about travel.", modelAnswers: ["I want to visit a temple and try sushi.", "The bullet train is faster than a car."] },
  ],
};
