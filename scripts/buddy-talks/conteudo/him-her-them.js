/*
 * Buddy Talks — HIM / HER / THEM
 * Transitions 1, lição 4, página 35. Áudio: SAYING IT RIGHT A e B.
 * Lição "Why is networking important?" — como as pessoas se conectam.
 *
 * O tópico: na fala corrente o H de him e her SOME, e them vira 'em, tudo
 * colado no verbo anterior — "tell him" sai "tellim", "call her" sai "caller",
 * "meet them" sai "meedem". O aluno brasileiro pronuncia as três palavras
 * inteiras e separadas, e a frase fica soletrada.
 *
 * A lista de repetição mostra a frase ESCRITA como ela se escreve, não como
 * soa: o áudio do livro é que ensina a redução, e ver a forma reduzida escrita
 * ("tell'im") confunde mais do que ajuda a quem está lendo.
 */

const comum = {
  subtitulo: "Linking Pronouns",
  titulo: "HIM / HER / THEM",
  nomeDoAudio: "Buddy Talks AUDIO FILE - him, her and them",
  objetivos: [
    "Improving fluency.",
    "Practicing weak pronouns.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "him-her-them",
  topicoCatalogo: { livro: "transitions1", licao: 4 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice three little ",
        "words that almost disappear ",
        "when people speak fast. They’re...",
      ],
      revelacao: {
        titulo: "…HIM, HER, THEM!",
        explicacao: "Native speakers glue them to the verb:",
        exemplo: "tell him",
      },
      porQue: [
        "The H of him and her is ",
        "very weak, and them often ",
        "sounds like ’em. ",
      ],
      seErrar: [
        "If we say every word slowly, ",
        "our English sounds like ",
        "reading, not talking. ",
      ],
      pratica: [
        "tell him", "call her", "meet them", "ask him", "help her",
        "text them", "give him", "show her", "join them",
      ],
      dialogos: [
        ["A: Do you know that new student?", "B: Yes, I met him last week."],
        ["A: Where is your sister?", "B: I called her, but she is busy."],
        ["A: Are your friends coming?", "B: I invited them yesterday."],
      ],
      /* Tema da lição de onde veio o áudio: "Why is networking important?",
         sobre como as pessoas se conectam. O tema é perfeito para este som:
         falar de outras pessoas obriga him, her e them em quase toda resposta. */
      temaDaConversa: "How you keep in touch",
      conversacao: [
        ["Who do you call every week?", "I call him... I call her..."],
        ["How do you talk to your friends?", "I text them on..."],
        ["Who helps you with homework?", "My... helps me and I help her..."],
        ["Do you meet your cousins often?", "I meet them..."],
        ["Who do you send photos to?", "I send them to..."],
        ["Do you know your neighbors?", "I know him / her, but..."],
        ["Who did you visit last month?", "I visited him / her in..."],
        ["Do you follow your friends online?", "I follow them and they..."],
        ["Who would you like to see soon?", "I would like to see them..."],
      ],
      avaliacao: "Is it hard to say him and her quickly?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice three words ",
        "native speakers swallow ",
        "in almost every sentence. They’re...",
      ],
      revelacao: {
        titulo: "…HIM, HER, THEM!",
        explicacao: "They lean on the verb and lose their H:",
        exemplo: "call her",
      },
      porQue: [
        "Weak pronouns are what make ",
        "a sentence flow instead of ",
        "sounding chopped. ",
      ],
      seErrar: [
        "Stressing him, her or them ",
        "changes the meaning: it ",
        "sounds like a correction. ",
      ],
      pratica: [
        "tell him", "call her", "meet them", "trust him", "convince her",
        "remind them", "introduce him", "recommend her", "contact them",
      ],
      dialogos: [
        ["A: Did you speak to the manager?", "B: I contacted him this morning."],
        ["A: How did you find that job?", "B: A friend recommended me for it."],
        ["A: What about your old classmates?", "B: I still keep in touch with them."],
      ],
      // "Why is networking important?" (T1 L4): como as pessoas se conectam e
      // os problemas de comunicação.
      temaDaConversa: "How you build your network",
      conversacao: [
        ["Who introduced you to your best friend?", "My... introduced me to him / her."],
        ["How often do you contact old friends?", "I contact them..."],
        ["Who would you ask for a recommendation?", "I would ask him / her because..."],
        ["Do you find it easy to meet new people?", "When I meet them, I usually..."],
        ["Who taught you something important?", "My... taught me and I thank him / her..."],
        ["How do you keep a friendship alive?", "I call them when..."],
        ["Have you ever lost touch with someone?", "I lost touch with her when..."],
        ["Who do people ask for help at work?", "They ask him / her because..."],
        ["What makes you trust a new contact?", "I trust them when..."],
      ],
      avaliacao: "Which pronoun disappears the most for you?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on three words ",
        "that fluent speakers reduce ",
        "almost to nothing. They’re...",
      ],
      revelacao: {
        titulo: "…HIM, HER, THEM!",
        explicacao: "Fluent speech attaches them to the verb:",
        exemplo: "meet them",
      },
      porQue: [
        "Reducing them is not lazy ",
        "speech: it is what puts the ",
        "stress on the right word. ",
      ],
      seErrar: [
        "Pronouncing them in full ",
        "sounds emphatic, as if you ",
        "were correcting someone. ",
      ],
      pratica: [
        "persuade him", "brief her", "involve them", "approach him", "reassure her",
        "update them", "consult him", "nominate her", "engage them",
      ],
      dialogos: [
        ["A: How did you get that partnership?", "B: I approached him at a conference."],
        ["A: Did the team accept the change?", "B: I briefed them before announcing it."],
        ["A: Who recommended you for the role?", "B: A former manager nominated me."],
      ],
      // "Why is networking important?" (T1 L4). No Advanced entra o lado
      // profissional da rede de contatos, sem sair do tema da lição.
      temaDaConversa: "The network that opened doors",
      conversacao: [
        ["Who opened a door for you professionally?", "I met him / her when..."],
        ["How do you approach someone you admire?", "I approach them by..."],
        ["Have you ever recommended someone?", "I recommended him / her because..."],
        ["What makes a contact worth keeping?", "I keep them close when..."],
        ["Who challenged your way of thinking?", "My... challenged me and I..."],
        ["How do you reconnect after years?", "I message them and..."],
        ["Have you ever disappointed a contact?", "I disappointed him / her when..."],
        ["Who would you consult before a big decision?", "I would consult them because..."],
        ["What do people come to you for?", "They ask me because I..."],
      ],
      avaliacao: "Do your pronouns disappear when you speak fast?",
    },
  },
};
