/*
 * Buddy Talks — THE FINAL -ED
 * Transitions 2, lição 6, página 55. Áudio: SAYING IT RIGHT A e B.
 *
 * O tópico: o -ed do passado tem TRÊS sons, /t/, /d/ e /ɪd/, e o erro clássico
 * do brasileiro é acrescentar uma sílaba ("walk-ED"). É por isso que os três
 * níveis praticam a mesma regra, mudando só o vocabulário dos verbos e a
 * complexidade dos diálogos — a dificuldade aqui é de pronúncia, não de
 * gramática, e ela não muda de nível para nível.
 */

const comum = {
  subtitulo: "Past Tense Sounds",
  titulo: "THE FINAL -ED",
  nomeDoAudio: "Buddy Talks AUDIO FILE - The final -ed sounds",
  referenciaLivro: "TRANSITIONS 2 - L 6 - pg 55",
  objetivos: [
    "Improving fluency.",
    "Practicing the -ed sounds.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "final-ed",
  topicoCatalogo: { livro: "transitions2", licao: 6 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice a very small ",
        "ending that changes your ",
        "past tense in English. It’s...",
      ],
      revelacao: {
        titulo: "…THE -ED ENDING!",
        explicacao: "It has THREE sounds. Listen to this one:",
        exemplo: "WALKED",
      },
      porQue: [
        "When we say -ed correctly, ",
        "people understand our past ",
        "better. ",
      ],
      seErrar: [
        "If we add one more syllable, ",
        "like “walk-ED”, our English ",
        "sounds strange. ",
      ],
      // 5 na coluna da esquerda, 4 na direita
      pratica: [
        "walked  /t/", "helped  /t/", "played  /d/", "cleaned  /d/", "wanted  /ɪd/",
        "watched  /t/", "lived  /d/", "needed  /ɪd/", "studied  /d/",
      ],
      dialogos: [
        ["A: What did you do yesterday?", "B: I watched TV and played games."],
        ["A: Did you study for the test?", "B: Yes, I studied a lot."],
        ["A: Why did you call me?", "B: I needed your help."],
      ],
      /* A conversa acontece dentro do TEMA DA LIÇÃO de onde veio o áudio:
         Transitions 2, lição 6, "Out of hand", sobre hábitos e vícios. Duas
         vantagens sobre perguntas soltas: o aluno conversa sobre o que está
         estudando naquela semana, e falar de hábito que começou ou parou puxa
         o passado sozinho, que é o som treinado aqui.
         No Basic o assunto entra pela porta concreta: hábitos do dia a dia e
         tempo de tela, sem falar de vício. */
      temaDaConversa: "Habits and screen time",
      conversacao: [
        ["What did you do on your phone today?", "I watched... I played... I posted..."],
        ["How many hours did you use it?", "I used it for..."],
        ["Did you try to stop for a day?", "I tried and I..."],
        ["What game or app did you play a lot?", "I played..."],
        ["Did anyone ask you to stop?", "My mom asked me to..."],
        ["What did you do before phones?", "I played... I talked..."],
        ["Did you sleep well last night?", "I stayed up and..."],
        ["What habit did you change this year?", "I changed..."],
        ["Did you enjoy a day without the phone?", "I enjoyed... / I missed..."],
      ],
      avaliacao: "Is it easy or difficult for you to say -ed?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll look at a tiny ending ",
        "that tells people you are ",
        "talking about the past. It’s...",
      ],
      revelacao: {
        titulo: "…THE -ED ENDING!",
        explicacao: "It has three different sounds, like in:",
        exemplo: "DECIDED",
      },
      porQue: [
        "Saying -ed correctly makes ",
        "your past tense clear to ",
        "everyone. ",
      ],
      seErrar: [
        "If we add one more syllable, ",
        "our English sounds heavy ",
        "and unnatural. ",
      ],
      pratica: [
        "finished  /t/", "traveled  /d/", "decided  /ɪd/", "practiced  /t/", "improved  /d/",
        "invited  /ɪd/", "shared  /d/", "watched  /t/", "started  /ɪd/",
      ],
      dialogos: [
        ["A: How was your weekend?", "B: I traveled and visited my cousins."],
        ["A: Did you finish the report?", "B: Yes, I finished it last night."],
        ["A: Why did you change your plans?", "B: I decided to save some money."],
      ],
      // TEMA ÚNICO: uma viagem de que o aluno se lembra. Todas as perguntas
      /* Mesma lição, "Out of hand" (Transitions 2, L6): hábitos que fogem do
         controle. No Intermediate já dá para falar do hábito em si e de
         tentativa de mudança, o que traz -ed em quase toda resposta. */
      temaDaConversa: "Habits out of hand",
      conversacao: [
        ["What habit have you tried to change?", "I tried to..."],
        ["When did it start to get out of hand?", "It started when I..."],
        ["Who noticed it before you did?", "My... noticed that I..."],
        ["What have you already stopped doing?", "I stopped... I quit..."],
        ["Did anything help you cut it down?", "It helped when I..."],
        ["How much time have you wasted on it?", "I wasted..."],
        ["What replaced that habit?", "I replaced it with..."],
        ["Have you ever relapsed? What happened?", "I relapsed when..."],
        ["What would you say to someone starting?", "I would say that I learned..."],
      ],
      avaliacao: "Which -ed sound is the hardest for you? Why?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll fix the ending that ",
        "gives away an accent when ",
        "you talk about the past. It’s...",
      ],
      revelacao: {
        titulo: "…THE -ED ENDING!",
        explicacao: "Three sounds hide behind these two letters:",
        exemplo: "ACHIEVED",
      },
      porQue: [
        "Getting -ed right is what ",
        "separates fluent English ",
        "from careful English. ",
      ],
      seErrar: [
        "An extra syllable in every ",
        "past verb makes fluent speech ",
        "sound heavy. ",
      ],
      pratica: [
        "achieved  /d/", "attempted  /ɪd/", "convinced  /t/", "expanded  /ɪd/", "managed  /d/",
        "developed  /t/", "recognized  /d/", "admitted  /ɪd/", "increased  /t/",
      ],
      dialogos: [
        ["A: How did the presentation go?", "B: It worked out. They accepted my ideas."],
        ["A: Have your skills improved this year?", "B: Yes, I practiced almost every day."],
        ["A: What convinced you to take the job?", "B: They offered more than I expected."],
      ],
      // TEMA ÚNICO: como a pessoa mudou nos últimos anos. Assunto que um adulto
      /* Mesma lição, "Out of hand" (Transitions 2, L6). No Advanced o assunto
         abre para dependência, autocontrole e o que a pessoa aprendeu — sem
         sair do tema do livro, e ainda com o passado em toda resposta. */
      temaDaConversa: "When habits get out of hand",
      conversacao: [
        ["What habit has gotten out of hand for you?", "It started when I..."],
        ["What convinced you to face it?", "I was convinced when..."],
        ["Have you ever underestimated a habit?", "I underestimated..."],
        ["What have you sacrificed for it?", "I sacrificed..."],
        ["Who supported you the most?", "My... supported me and I..."],
        ["What strategy has worked for you?", "I managed to... when I..."],
        ["How has your routine changed since then?", "My routine changed after I..."],
        ["What have you learned about yourself?", "I realized that I..."],
        ["What advice would you have wanted?", "I wish someone had warned me..."],
      ],
      avaliacao: "Do you notice the -ed ending when you speak?",
    },
  },
};
