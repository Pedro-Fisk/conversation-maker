/*
 * Buddy Talks — WORDS FREQUENTLY MISPRONOUNCED
 * Transitions 1, lição 10, página 87. Áudio: SAYING IT RIGHT A e B.
 * Lição "How are the two of you getting along?" — tipos de amigo e manias.
 *
 * O tópico não é um som, é uma ARMADILHA: palavras cuja escrita engana. Quase
 * todas perdem uma sílaba na fala ("comfortable" tem três, não quatro) ou têm
 * letra muda ("salmon", "iron"). O aluno pronuncia o que vê escrito, e a
 * palavra sai com sílaba a mais.
 *
 * A lista traz as palavras sozinhas, sem marca fonética: a graça do exercício
 * é ouvir o áudio e descobrir que a palavra é mais curta do que parece.
 */

const comum = {
  subtitulo: "Spelling Traps",
  titulo: "TRICKY WORDS",
  nomeDoAudio: "Buddy Talks AUDIO FILE - words we say wrong",
  objetivos: [
    "Improving fluency.",
    "Practicing tricky words.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "mispronounced",
  topicoCatalogo: { livro: "transitions1", licao: 10 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice words that ",
        "are shorter than they look ",
        "when we say them. They’re...",
      ],
      revelacao: {
        titulo: "…TRICKY WORDS!",
        explicacao: "We don’t say every letter we can see:",
        exemplo: "chocolate",
      },
      porQue: [
        "Chocolate has three sounds, ",
        "not four: cho-co-late is ",
        "wrong. ",
      ],
      seErrar: [
        "If we say every letter, the ",
        "word gets one syllable too ",
        "many. ",
      ],
      pratica: [
        "chocolate", "vegetable", "clothes", "business", "Wednesday",
        "comfortable", "favorite", "different", "interesting",
      ],
      dialogos: [
        ["A: What is your favorite food?", "B: Chocolate! And vegetables too."],
        ["A: What day is the test?", "B: On Wednesday, after the class."],
        ["A: Is your chair comfortable?", "B: Yes, but the room is different."],
      ],
      /* Lição "How are the two of you getting along?": tipos de amigo e as
         manias que irritam. No BASIC o tema entra pela porta concreta: os
         amigos do aluno e o que ele gosta e não gosta neles. */
      temaDaConversa: "Your friends",
      conversacao: [
        ["Who is your favorite friend? Why?", "My favorite friend is..."],
        ["What is different about your best friend?", "He / she is different because..."],
        ["What do you do together on Wednesday?", "On Wednesday we..."],
        ["Is your friend comfortable talking to you?", "Yes, because we..."],
        ["What food do your friends like?", "They like chocolate and..."],
        ["What is interesting about your group?", "The interesting thing is..."],
        ["What clothes do you and your friends wear?", "We wear..."],
        ["What annoys you in a friend?", "It annoys me when..."],
        ["What makes a friendship good?", "A good friendship is..."],
      ],
      avaliacao: "Which word surprised you the most today?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll fix words that almost ",
        "everybody says with one ",
        "syllable too many. They’re...",
      ],
      revelacao: {
        titulo: "…TRICKY WORDS!",
        explicacao: "The spelling promises more than it gives:",
        exemplo: "recipe",
      },
      porQue: [
        "Some words lose a syllable ",
        "and some hide a silent ",
        "letter completely. ",
      ],
      seErrar: [
        "Reading them out loud from ",
        "the spelling is exactly how ",
        "the mistake happens. ",
      ],
      pratica: [
        "recipe", "salmon", "iron", "receipt", "colonel",
        "temperature", "vegetable", "restaurant", "jewelry",
      ],
      dialogos: [
        ["A: Do you have the recipe?", "B: It’s salmon with vegetables."],
        ["A: Did you keep the receipt?", "B: I left it at the restaurant."],
        ["A: What is the temperature today?", "B: Cold enough for a jacket."],
      ],
      // "How are the two of you getting along?" (T1 L10): tipos de amigo,
      // manias que irritam e mudar de assunto.
      temaDaConversa: "Types of friends and pet peeves",
      conversacao: [
        ["What type of friend are you?", "I am the type who..."],
        ["What is the pet peeve that annoys you the most?", "It annoys me when people..."],
        ["Do you have a friend who is always late?", "I have a friend who..."],
        ["How do you change the subject politely?", "I usually say..."],
        ["What habit of yours annoys other people?", "People say I..."],
        ["Who is the friend you can call at 3 a.m.?", "The friend is..."],
        ["Have you ever ended a friendship?", "I ended it because..."],
        ["What do you and your friends argue about?", "We argue about..."],
        ["What makes a friendship last?", "A friendship lasts when..."],
      ],
      avaliacao: "Which word will you have to practice at home?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on words that ",
        "give away a learner even ",
        "at an advanced level. They’re...",
      ],
      revelacao: {
        titulo: "…TRICKY WORDS!",
        explicacao: "Fluent speakers still get these wrong:",
        exemplo: "colonel",
      },
      porQue: [
        "These words rarely appear in ",
        "class, so nobody ever hears ",
        "them corrected. ",
      ],
      seErrar: [
        "The higher your level, the ",
        "more one mispronounced word ",
        "stands out. ",
      ],
      pratica: [
        "colonel", "epitome", "hyperbole", "mischievous", "anonymous",
        "entrepreneur", "questionnaire", "infamous", "suite",
      ],
      dialogos: [
        ["A: Was the survey long?", "B: The questionnaire took an hour."],
        ["A: Is she the entrepreneur you mentioned?", "B: She is the epitome of persistence."],
        ["A: Did he stay in a room?", "B: In a suite, of course."],
      ],
      // "How are the two of you getting along?" (T1 L10). No Advanced o tema
      // abre para o que sustenta ou desgasta uma relação longa.
      temaDaConversa: "What keeps people getting along",
      conversacao: [
        ["What quality do you look for in a close friend?", "I look for..."],
        ["What is the pet peeve you cannot forgive?", "I cannot stand it when..."],
        ["Have you ever been the difficult friend?", "I admit that I..."],
        ["How do you handle an awkward subject?", "I change the subject by..."],
        ["Do friendships survive distance?", "In my experience, they..."],
        ["What ended a friendship of yours?", "It ended when..."],
        ["Is honesty always the best policy with friends?", "I believe that..."],
        ["Who has known you the longest?", "The person who..."],
        ["What would you apologize for today?", "I would apologize for..."],
      ],
      avaliacao: "Which of these words have you been saying wrong?",
    },
  },
};
