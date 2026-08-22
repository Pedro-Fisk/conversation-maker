/*
 * Buddy Talks — TAG QUESTIONS: the melody
 * Transitions 1, lição 1, página 11. Áudio: SAYING IT RIGHT A e B.
 * Lição "What's trending now?" — hábitos online.
 *
 * O tópico é o único da série que não é um SOM, e sim uma MELODIA: a mesma
 * tag question quer dizer duas coisas conforme a voz sobe ou desce. Sobe = eu
 * não sei e estou perguntando de verdade; desce = eu já sei e só quero que
 * você confirme. O brasileiro tende a subir sempre, e sai perguntando o que
 * não queria perguntar.
 *
 * Por isso a lista de repetição traz só a TAG, e não a frase inteira: o que se
 * treina aqui é a curva da voz, e a tag isolada é o pedaço que a carrega. As
 * frases completas ficam nos diálogos e na conversação.
 */

const comum = {
  subtitulo: "Question Melody",
  titulo: "TAG QUESTIONS",
  nomeDoAudio: "Buddy Talks AUDIO FILE - Tag question intonation",
  objetivos: [
    "Improving fluency.",
    "Practicing tag questions.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "tag-questions",
  topicoCatalogo: { livro: "transitions1", licao: 1 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll learn a little melody ",
        "that changes the meaning ",
        "of a question in English. It’s...",
      ],
      revelacao: {
        titulo: "…TAG QUESTIONS!",
        explicacao: "Listen to the music at the end of these:",
        exemplo: "isn’t it?",
      },
      porQue: [
        "When our voice goes DOWN, ",
        "we already know it and we ",
        "just confirm. ",
      ],
      seErrar: [
        "When our voice goes UP, we ",
        "really don’t know, and we ",
        "want an answer. ",
      ],
      pratica: [
        "isn’t it? ↓", "aren’t you? ↑", "don’t you? ↑", "doesn’t he? ↑", "didn’t they? ↓",
        "can’t she? ↓", "won’t they? ↑", "haven’t you? ↓", "wasn’t it? ↑",
      ],
      dialogos: [
        ["A: You’re on TikTok, aren’t you? ↑", "B: Yes, I post videos every week."],
        ["A: This song is a hit, isn’t it? ↓", "B: Everybody is listening to it."],
        ["A: You didn’t see the video, did you? ↑", "B: No. Send me the link!"],
      ],
      /* Tema da lição de onde veio o áudio: "What's trending now?", sobre
         hábitos online. Aqui as perguntas são feitas PELO ALUNO ao colega, com
         a tag no fim — ou seja, a conversa é o próprio exercício de melodia. */
      temaDaConversa: "What’s trending now",
      conversacao: [
        ["You use your phone a lot, don’t you? ↑", "I use it..."],
        ["You have Instagram, don’t you? ↑", "Yes, I do. / No, I don’t."],
        ["That video was funny, wasn’t it? ↓", "I thought it was..."],
        ["You watch short videos, don’t you? ↑", "I watch them when..."],
        ["Everybody posts photos, don’t they? ↓", "My friends post..."],
        ["You don’t watch TV much, do you? ↑", "I still watch..."],
        ["Games are more fun online, aren’t they? ↓", "For me, games are..."],
        ["You follow a singer, don’t you? ↑", "I follow..."],
        ["This app is popular now, isn’t it? ↓", "I think it is popular because..."],
      ],
      avaliacao: "Is it easy to hear the melody of a tag?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice a melody that ",
        "decides whether you are ",
        "asking or confirming. It’s...",
      ],
      revelacao: {
        titulo: "…TAG QUESTIONS!",
        explicacao: "The same tag means two different things:",
        exemplo: "aren’t you?",
      },
      porQue: [
        "A falling tag says: I know ",
        "this and I only want you to ",
        "agree. ",
      ],
      seErrar: [
        "A rising tag says: I’m not ",
        "sure at all, so please tell ",
        "me the answer. ",
      ],
      pratica: [
        "isn’t it? ↓", "aren’t they? ↑", "haven’t you? ↓", "doesn’t she? ↑", "didn’t we? ↓",
        "shouldn’t we? ↑", "wouldn’t it? ↓", "can’t they? ↑", "hasn’t he? ↓",
      ],
      dialogos: [
        ["A: You follow that channel, don’t you? ↑", "B: I do, but I skip half of it."],
        ["A: That trend got old fast, didn’t it? ↓", "B: It lasted about two weeks."],
        ["A: You wouldn’t pay for that app, would you? ↑", "B: Only if it were really useful."],
      ],
      // "What's trending now?" (T1 L1): hábitos online e explicar por que se
      // gosta de algo. As perguntas já saem com a tag pronta para o par usar.
      temaDaConversa: "What’s trending now",
      conversacao: [
        ["You spend hours online, don’t you? ↑", "Actually, I spend..."],
        ["You follow a lot of people, don’t you? ↑", "I follow..."],
        ["That trend was silly, wasn’t it? ↓", "I thought it was..."],
        ["You’ve seen that video, haven’t you? ↑", "Yes, I have. / Not yet."],
        ["People post too much, don’t they? ↓", "I think people post..."],
        ["You don’t watch TV anymore, do you? ↑", "I still watch..."],
        ["Short videos are addictive, aren’t they? ↓", "They are, because..."],
        ["You’d rather scroll than read, wouldn’t you? ↑", "Actually, I prefer..."],
        ["This app will disappear, won’t it? ↓", "I doubt it, because..."],
      ],
      avaliacao: "Which tag melody is harder for you? Why?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll fix the melody that ",
        "tells people whether you ",
        "are asking or stating. It’s...",
      ],
      revelacao: {
        titulo: "…TAG QUESTIONS!",
        explicacao: "The words are the same. The music is not:",
        exemplo: "haven’t you?",
      },
      porQue: [
        "Falling: you are stating ",
        "something and inviting the ",
        "other person to agree. ",
      ],
      seErrar: [
        "Rising: you are genuinely ",
        "asking, and you are handing ",
        "the turn to the other person. ",
      ],
      /* Só tags que o aluno vai mesmo ouvir e usar. A primeira versão trazia
         "mightn't it?", "needn't we?", "oughtn't we?" e "shan't we?" — todas
         gramaticalmente corretas e praticamente extintas na fala. Numa
         atividade de pronúncia isso é pior do que inútil: o aluno decora a
         melodia numa forma que nunca vai precisar. */
      pratica: [
        "hasn’t he? ↓", "wouldn’t you? ↑", "weren’t they? ↓", "isn’t she? ↑", "haven’t we? ↓",
        "couldn’t she? ↑", "won’t they? ↓", "didn’t it? ↑", "aren’t we? ↓",
      ],
      dialogos: [
        ["A: You’ve noticed that trend, haven’t you? ↑", "B: I have, and I still don’t get it."],
        ["A: It was overrated, wasn’t it? ↓", "B: Completely. It faded in a month."],
        ["A: You wouldn’t call that popular, would you? ↑", "B: Not by any serious measure."],
      ],
      // "What's trending now?" (T1 L1). No Advanced o assunto abre para o que
      // faz algo viralizar, sem sair do tema da lição.
      temaDaConversa: "What’s trending now",
      conversacao: [
        ["Trends fade quickly now, don’t they? ↓", "They do, because..."],
        ["You’ve dropped an app recently, haven’t you? ↑", "I dropped..."],
        ["Popularity isn’t quality, is it? ↓", "In my opinion..."],
        ["You wouldn’t follow a trend blindly, would you? ↑", "I would only if..."],
        ["Algorithms decide what we see, don’t they? ↓", "They decide because..."],
        ["You’ve been influenced by one, haven’t you? ↑", "Once I was influenced by..."],
        ["Nobody reads long posts anymore, do they? ↓", "Some people still..."],
        ["You could live without it, couldn’t you? ↑", "I could, but..."],
        ["This will look silly in ten years, won’t it? ↓", "I imagine that..."],
      ],
      avaliacao: "Do you control the melody of your questions?",
    },
  },
};
