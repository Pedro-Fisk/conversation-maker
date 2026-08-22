/*
 * Buddy Talks — WORD ENDINGS
 * Transitions 2, lição 1, página 11. Áudio: SAYING IT RIGHT A e B.
 * Lição "On the crest of a wave" — popularidade e dar sugestões.
 *
 * O tópico: terminações que não soam como se escrevem, e que ainda puxam a
 * sílaba tônica para perto delas. -tion e -sion viram /ʃən/ e /ʒən/, -ture
 * vira /tʃər/, -ous vira /əs/. O aluno brasileiro tende a pronunciar "-ção"
 * com força e a acentuar a última sílaba, quando em inglês ela é FRACA.
 *
 * O ponto pedagógico que o áudio ensina: a terminação é átona. É o que faz
 * "attention" soar a-TEN-shun, e não a-ten-SHON.
 */

const comum = {
  subtitulo: "Weak Endings",
  titulo: "WORD ENDINGS",
  nomeDoAudio: "Buddy Talks AUDIO FILE - word endings",
  objetivos: [
    "Improving fluency.",
    "Practicing word endings.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "word-endings",
  topicoCatalogo: { livro: "transitions2", licao: 1 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice the last part ",
        "of long words, which is ",
        "always weak in English. It’s...",
      ],
      revelacao: {
        titulo: "…WORD ENDINGS!",
        explicacao: "The ending is quiet. The strong part is before:",
        exemplo: "-tion",
      },
      porQue: [
        "In English the ending is ",
        "short and weak, never the ",
        "loud part. ",
      ],
      seErrar: [
        "If we push the ending, the ",
        "word sounds Portuguese and ",
        "hard to understand. ",
      ],
      pratica: [
        "attention", "question", "future", "famous", "nature",
        "action", "nervous", "picture", "station",
      ],
      dialogos: [
        ["A: Can I ask you a question?", "B: Sure, you have my attention."],
        ["A: Is he famous?", "B: He is famous for action movies."],
        ["A: Where is the picture?", "B: Near the station, in nature."],
      ],
      /* Lição "On the crest of a wave": popularidade e dar sugestões. No BASIC
         o tema entra pela porta concreta: quem é famoso, o que faz sucesso na
         escola, e sugerir algo a um amigo. */
      temaDaConversa: "Who is famous now",
      conversacao: [
        ["Who is famous in your country now?", "The famous person is..."],
        ["What song gets a lot of attention?", "The song is..."],
        ["What is your favorite action movie?", "My favorite action movie is..."],
        ["Do you want to be famous in the future?", "In the future I want..."],
        ["What picture did you post last?", "The picture was of..."],
        ["What makes a person popular at school?", "A popular person is..."],
        ["What suggestion do you have for a friend?", "My suggestion is..."],
        ["Are you nervous in front of people?", "I am nervous when..."],
        ["What question would you ask a famous person?", "I would ask..."],
      ],
      avaliacao: "Is it easy to keep the ending weak?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice endings that ",
        "decide where the strong ",
        "syllable of a word goes. They’re...",
      ],
      revelacao: {
        titulo: "…WORD ENDINGS!",
        explicacao: "The syllable before the ending is the strong one:",
        exemplo: "decision",
      },
      porQue: [
        "-tion, -sion, -ture and -ous ",
        "are always weak, and they ",
        "pull the stress back. ",
      ],
      seErrar: [
        "Stressing the ending is the ",
        "single most Brazilian-sounding ",
        "habit in long words. ",
      ],
      pratica: [
        "decision", "position", "pressure", "creature", "dangerous",
        "reaction", "adventure", "curious", "occasion",
      ],
      dialogos: [
        ["A: Was it a hard decision?", "B: There was a lot of pressure."],
        ["A: What was their reaction?", "B: Curious, and a bit dangerous."],
        ["A: Was the trip good?", "B: It was a real adventure."],
      ],
      // "On the crest of a wave" (T2 L1): popularidade e dar sugestões.
      temaDaConversa: "Riding the wave of popularity",
      conversacao: [
        ["What is getting a lot of attention right now?", "The thing is..."],
        ["What was the reaction to it?", "The reaction was..."],
        ["What decision made someone famous?", "The decision was..."],
        ["Is popularity dangerous? Why?", "Popularity is dangerous when..."],
        ["What suggestion would you give to be noticed?", "My suggestion is..."],
        ["What position would you like in your field?", "The position I want is..."],
        ["What adventure would you love to try?", "The adventure is..."],
        ["Are you curious about fame?", "I am curious about..."],
        ["What creates pressure on famous people?", "The pressure comes from..."],
      ],
      avaliacao: "Which ending pulls your stress to the wrong place?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on endings that ",
        "move the stress and change ",
        "the whole word’s shape. They’re...",
      ],
      revelacao: {
        titulo: "…WORD ENDINGS!",
        explicacao: "Add the ending and the stress moves with it:",
        exemplo: "-sion",
      },
      porQue: [
        "Compare: PHOtograph, ",
        "phoTOgrapher, photoGRAPHic. ",
        "The ending decides. ",
      ],
      seErrar: [
        "Keeping the stress of the ",
        "root word is what makes a ",
        "long word sound wrong. ",
      ],
      pratica: [
        "conclusion", "acquisition", "infrastructure", "ambitious", "supervision",
        "expectation", "manufacture", "prestigious", "transition",
      ],
      dialogos: [
        ["A: What was the conclusion?", "B: The acquisition was too ambitious."],
        ["A: How is the transition going?", "B: It needs closer supervision."],
        ["A: Did they meet expectations?", "B: Beyond any prestigious standard."],
      ],
      // "On the crest of a wave" (T2 L1). No Advanced o tema abre para o que
      // sustenta ou derruba a popularidade de alguém.
      temaDaConversa: "The shape of popularity",
      conversacao: [
        ["What creates a wave of popularity today?", "The creation of..."],
        ["What is your conclusion about viral fame?", "My conclusion is..."],
        ["Is ambition necessary to stay relevant?", "Ambition is..."],
        ["What expectation is unfair on public people?", "The expectation that..."],
        ["What transition have you seen in your field?", "The transition was..."],
        ["What suggestion would you give a rising star?", "My suggestion is..."],
        ["Does prestige still mean anything?", "Prestige means..."],
        ["What decision would you not make for fame?", "I would never..."],
        ["What is the reaction you fear the most?", "The reaction I fear is..."],
      ],
      avaliacao: "Does your stress move when the ending changes?",
    },
  },
};
