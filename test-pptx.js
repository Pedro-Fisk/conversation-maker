// Local test: build a .pptx from a realistic lesson object, exercising
// every layout type (including Grammar Point, which is optional).
global.window = {};
require("./logic.js");
const { buildSlidePlan } = global.window.ConversationMaker;
const { buildPptxBuffer } = require("./pptx-builder.js");
const fs = require("fs");

const lesson = {
  language: "english",
  topic: "Japan",
  level: "basic",
  coverTitle: "Discovering Japan",
  coverSubtitle: "A Basic English Conversation Lesson on Culture, Food, and Travel",
  material: { activity: "Conversation Class with Vocabulary and Grammar Practice", durationMinutes: 45 },
  objectives: [
    "Students will learn and use vocabulary related to Japan's culture, food, and travel.",
    "Students will practice using the simple present tense to describe facts and habits.",
    "Students will engage in guided conversation about Japanese traditions and daily life.",
  ],
  vocabulary: [
    { word: "temple", translation: "templo", contrastWith: null },
    { word: "sushi", translation: "sushi", contrastWith: null },
    { word: "kimono", translation: "quimono", contrastWith: null },
    { word: "bow", translation: "curvar-se / reverência", contrastWith: null },
    { word: "cherry blossom", translation: "flor de cerejeira", contrastWith: null },
    { word: "train station", translation: "estação de trem", contrastWith: null },
    { word: "tradition", translation: "tradição", contrastWith: null },
  ],
  grammarAside: {
    teacherInstruction: "Write 3 example sentences on the board using the simple present tense.",
    explanation: "We use the simple present to talk about facts, habits and routines. Add -s/-es for he/she/it.",
    example: "Japanese people bow when they greet each other.",
  },
  introTitle: "Let's explore Japan!",
  introText: "Today we'll talk about Japanese culture, food, and travel, and practice the simple present tense.",
  videoTitle: null,
  conversationGroups: [
    {
      subtopic: "Food",
      questions: [
        { number: 1, question: "Do you like sushi?", answerScaffold: "Yes, I do. / No, I don't." },
        { number: 2, question: "What Japanese food do you want to try?", answerScaffold: "I want to try ..." },
      ],
    },
    {
      subtopic: "Travel",
      questions: [
        { number: 3, question: "Would you like to visit Japan?", answerScaffold: "Yes, I would. / No, I wouldn't." },
        { number: 4, question: "What city do you want to visit?", answerScaffold: "I want to visit ..." },
      ],
    },
    {
      subtopic: "Culture",
      questions: [
        { number: 5, question: "Do you know any Japanese traditions?", answerScaffold: "Yes, I know ..." },
        { number: 6, question: "What do people wear during festivals?", answerScaffold: "They wear ..." },
      ],
    },
  ],
  languageGame: [
    { prompt: "What do you call a Japanese sword fighter?", options: ["Samurai", "Ninja", "Shogun"], correctAnswer: "Samurai" },
    { prompt: "What is 'arigato'?", options: ["Hello", "Thank you", "Goodbye"], correctAnswer: "Thank you" },
    { prompt: "What is Mount Fuji?", options: ["A river", "A mountain", "A city"], correctAnswer: "A mountain" },
  ],
  evaluation: ["Did you enjoy learning about Japan?", "What was the most interesting fact you learned today?"],
};

const slidePlan = buildSlidePlan(lesson);
console.log(`slidePlan: ${slidePlan.length} slides ->`, slidePlan.map((s) => s.layout).join(", "));

buildPptxBuffer(lesson, slidePlan).then((buffer) => {
  fs.writeFileSync("/tmp/pptxtest2/web/test-output.pptx", buffer);
  console.log(`Wrote test-output.pptx (${buffer.length} bytes)`);
});
