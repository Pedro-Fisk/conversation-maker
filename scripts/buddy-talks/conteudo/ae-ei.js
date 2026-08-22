/*
 * Buddy Talks — /æ/ vs. /eɪ/
 * Transitions 2, lição 9, página 79. Áudio: SAYING IT RIGHT A e B.
 * Lição "Food for thought" — comida saudável, dietas e reagir ao inesperado.
 *
 * O tópico: a vogal de "cat" contra o ditongo de "cake". O /æ/ não existe em
 * português — é um A com a boca bem aberta e os cantos puxados — e acaba
 * saindo como "é" ou como o ditongo de "cake". O resultado são pares reais
 * trocados: man vira main, fat vira fate.
 *
 * A lista é toda de PARES, e não de palavras soltas: aqui o exercício só
 * funciona por contraste, porque isolada cada palavra parece aceitável.
 */

const comum = {
  subtitulo: "Cat or Cake",
  titulo: "/æ/ vs. /eɪ/",
  nomeDoAudio: "Buddy Talks AUDIO FILE - cat and cake",
  objetivos: [
    "Improving fluency.",
    "Practicing minimal pairs.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "ae-ei",
  topicoCatalogo: { livro: "transitions2", licao: 9 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice two vowels ",
        "that change the word ",
        "completely. They are in...",
      ],
      revelacao: {
        titulo: "…CAT and CAKE!",
        explicacao: "One vowel is open. The other is a glide:",
        exemplo: "cat",
      },
      porQue: [
        "In cat, man and hat the ",
        "mouth opens wide. It’s a ",
        "short, flat sound. ",
      ],
      seErrar: [
        "In cake, main and hate the ",
        "sound slides, like ei. Two ",
        "sounds in one. ",
      ],
      pratica: [
        "man x main", "fat x fate", "hat x hate", "tap x tape", "can x cane",
        "mad x made", "pan x pain", "back x bake", "at x ate",
      ],
      dialogos: [
        ["A: Do you want a cake?", "B: I can’t. I ate a lot today."],
        ["A: Is that man your uncle?", "B: Yes! He made the cake."],
        ["A: Where is the pan?", "B: On the table, at the back."],
      ],
      /* Lição "Food for thought": comida saudável e dietas. No BASIC o tema
         entra pela porta concreta: o que o aluno come e do que gosta — e as
         duas vogais estão em cake, ate, snack, salad, plate. */
      temaDaConversa: "What you eat",
      conversacao: [
        ["What did you eat today?", "Today I ate..."],
        ["Do you like cake or fruit?", "I like... because..."],
        ["What snack do you have at school?", "My snack is..."],
        ["Can you cook? What do you make?", "I can make..."],
        ["What food is bad for you but you love?", "I love... but it is bad."],
        ["Do you eat salad at home?", "I eat salad when..."],
        ["What is on your plate at lunch?", "On my plate there is..."],
        ["Who makes the best food in your family?", "My... makes the best..."],
        ["What food do you hate?", "I hate..."],
      ],
      avaliacao: "Can you hear the difference: man or main?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll separate two vowels ",
        "that turn one word into ",
        "a completely different one. ",
      ],
      revelacao: {
        titulo: "…CAT and CAKE!",
        explicacao: "The /æ/ of cat does not exist in Portuguese:",
        exemplo: "snack",
      },
      porQue: [
        "So we borrow the nearest ",
        "sound we have, and the word ",
        "turns into another one. ",
      ],
      seErrar: [
        "Then fat becomes fate, and ",
        "the sentence means something ",
        "you never said. ",
      ],
      /* Todos os pares aqui são reais e mínimos: mesma consoante, só a vogal
         muda. Chutei alguns na primeira escrita ("pake", "baitch") e um par
         falso ("cash x cache", que têm a MESMA vogal) — num exercício de par
         mínimo isso não é detalhe, é o exercício inteiro. */
      pratica: [
        "bat x bait", "rat x rate", "mat x mate", "cap x cape", "van x vain",
        "sack x sake", "lack x lake", "snack x snake", "gram x grain",
      ],
      dialogos: [
        ["A: Is this a healthy snack?", "B: Less fat, but it tastes great."],
        ["A: How many grams of sugar?", "B: The label says it’s fine."],
        ["A: Did you pack lunch?", "B: A sandwich and a salad, as always."],
      ],
      // "Food for thought" (T2 L9): comida saudável, dietas e reagir ao
      // inesperado.
      temaDaConversa: "Food and diets",
      conversacao: [
        ["Have you ever been on a diet?", "I went on a diet when..."],
        ["What food do you refuse to give up?", "I could never give up..."],
        ["Do you read labels before buying?", "I check the label for..."],
        ["What is a healthy meal for you?", "A healthy meal has..."],
        ["What surprised you about a food you tried?", "I was amazed when..."],
        ["Is fast food always bad?", "Fast food is..."],
        ["What did your family eat when you were a kid?", "We always ate..."],
        ["Would you pay more for organic food?", "I would pay more because..."],
        ["What would you cook to impress someone?", "I would make..."],
      ],
      avaliacao: "Which pair is hardest for you to separate?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on two vowels ",
        "that stay blurred long after ",
        "fluency arrives. They are...",
      ],
      revelacao: {
        titulo: "…CAT and CAKE!",
        explicacao: "The contrast survives in real minimal pairs:",
        exemplo: "vanish",
      },
      porQue: [
        "Isolated, each word sounds ",
        "acceptable. Side by side, ",
        "the difference is obvious. ",
      ],
      seErrar: [
        "That is why the pair, and ",
        "not the single word, is the ",
        "only useful exercise here. ",
      ],
      /* No Advanced os pares mínimos verdadeiros acabam, então em vez de
         inventar par ("gamble x gambol" tem a mesma vogal) a lista marca a
         vogal dentro de palavras longas, que é onde ela escapa de quem já
         fala bem. A exceção é ratio x ration, que é par de verdade. */
      pratica: [
        "ratio x ration", "apparatus /æ/", "vacancy /eɪ/", "adequate /æ/", "stagnant /æ/",
        "capacity /æ/", "patience /eɪ/", "sacred /eɪ/", "vacant /eɪ/",
      ],
      dialogos: [
        ["A: Was the evidence valid?", "B: Or was it veiled as evidence?"],
        ["A: What is the ratio of sugar?", "B: They ration it carefully now."],
        ["A: Did the appetite vanish?", "B: Mainly after the diagnosis."],
      ],
      // "Food for thought" (T2 L9). No Advanced o tema abre para escolhas
      // alimentares, indústria e o que comer diz sobre a pessoa.
      temaDaConversa: "What our food says about us",
      conversacao: [
        ["What does your diet say about your life?", "My diet says that..."],
        ["Is the food industry to blame for our habits?", "The industry..."],
        ["Have you ever changed your diet radically?", "I changed when..."],
        ["Is eating well a matter of money or knowledge?", "In my view..."],
        ["What food trend do you find absurd?", "The trend that..."],
        ["Would you give up meat? Why?", "I would / wouldn’t because..."],
        ["What surprised you about eating abroad?", "I was amazed that..."],
        ["Does cooking matter to you?", "Cooking matters because..."],
        ["What meal would you never forget?", "The meal I remember is..."],
      ],
      avaliacao: "Do your minimal pairs survive fast speech?",
    },
  },
};
