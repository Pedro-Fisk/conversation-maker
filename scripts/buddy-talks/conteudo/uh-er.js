/*
 * Buddy Talks — /ʌ/ vs. /ɝ/
 * Transitions 2, lição 7, página 63. Áudio: SAYING IT RIGHT A e B.
 * Lição "The sky is the limit" — sucesso, concordar e discordar.
 *
 * O tópico: a vogal de "cup" contra a de "bird". Em português as duas caem no
 * mesmo lugar, e "work" acaba saindo como "uôrk" com a vogal de "cup". O /ɝ/
 * não existe no português: é a vogal com a língua puxada para trás, sem
 * encostar em lugar nenhum, e ela dura mais.
 *
 * A marca fonética vai ao lado de cada palavra porque, sem ela, a lista seria
 * só um punhado de palavras soltas — o par é que ensina.
 */

const comum = {
  subtitulo: "Two Vowels",
  titulo: "/ʌ/ vs. /ɝ/",
  nomeDoAudio: "Buddy Talks AUDIO FILE - cup and bird",
  objetivos: [
    "Improving fluency.",
    "Practicing two vowels.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "uh-er",
  topicoCatalogo: { livro: "transitions2", licao: 7 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice two vowels ",
        "that sound the same to us, ",
        "but not to a native. They’re...",
      ],
      revelacao: {
        titulo: "…/ʌ/ and /ɝ/!",
        explicacao: "Listen: cup is short, bird is long:",
        exemplo: "bird",
      },
      porQue: [
        "In cup, much and sunny the ",
        "sound is short and open. ",
        "It’s /ʌ/. ",
      ],
      seErrar: [
        "In bird, work and learn the ",
        "sound is longer, with the ",
        "tongue pulled back. ",
      ],
      pratica: [
        "cup /ʌ/", "much /ʌ/", "sunny /ʌ/", "money /ʌ/", "lunch /ʌ/",
        "bird /ɝ/", "work /ɝ/", "learn /ɝ/", "girl /ɝ/",
      ],
      dialogos: [
        ["A: Do you work on Sunday?", "B: No, I study and learn at home."],
        ["A: What do you want for lunch?", "B: Just a cup of soup, thanks."],
        ["A: Is it sunny today?", "B: Yes! Perfect to see the birds."],
      ],
      /* Lição "The sky is the limit": sucesso, concordar e discordar. No BASIC
         o tema entra pela porta concreta: o que o aluno quer ser, o que já
         conseguiu, o que estuda — e as duas vogais aparecem em "work",
         "learn", "study", "much". */
      temaDaConversa: "What you want to be",
      conversacao: [
        ["What do you want to be in the future?", "I want to work as a..."],
        ["What do you learn at school that you like?", "I like to learn..."],
        ["Do you work hard or study hard?", "I work hard when..."],
        ["What is something you did well?", "I did... very well."],
        ["Do you earn money? How?", "I earn money by..."],
        ["What is worth the effort for you?", "It is worth it when..."],
        ["Who works a lot in your family?", "My... works a lot."],
        ["What do you want to learn this year?", "I want to learn..."],
        ["What makes you happy on a sunny day?", "On a sunny day I..."],
      ],
      avaliacao: "Can you hear the difference: cup or bird?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll separate two vowels ",
        "that Portuguese puts in the ",
        "very same place. They’re...",
      ],
      revelacao: {
        titulo: "…/ʌ/ and /ɝ/!",
        explicacao: "One is short and open. The other is long:",
        exemplo: "work",
      },
      porQue: [
        "/ɝ/ does not exist in ",
        "Portuguese, so we replace ",
        "it with the closest vowel. ",
      ],
      seErrar: [
        "Then work sounds like walk, ",
        "and the listener has to ",
        "guess from context. ",
      ],
      pratica: [
        "budget /ʌ/", "result /ʌ/", "success /ʌ/", "struggle /ʌ/", "public /ʌ/",
        "purpose /ɝ/", "worth /ɝ/", "certain /ɝ/", "deserve /ɝ/",
      ],
      dialogos: [
        ["A: Was the result worth the struggle?", "B: Certainly. It had a purpose."],
        ["A: Did the budget work out?", "B: Not much, but it was a success."],
        ["A: Do you deserve a break?", "B: I certainly worked for one."],
      ],
      // "The sky is the limit" (T2 L7): sucesso, concordar e discordar.
      temaDaConversa: "What success is worth",
      conversacao: [
        ["What does success mean to you?", "Success means..."],
        ["What did you struggle with recently?", "I struggled with..."],
        ["Is hard work enough to succeed?", "I think hard work..."],
        ["What is worth sacrificing for a goal?", "It is worth..."],
        ["Who deserves the credit for your progress?", "The person who deserves it is..."],
        ["Do you prefer money or purpose in a job?", "I prefer... because..."],
        ["What result are you proud of?", "The result I am proud of is..."],
        ["Do you agree that the sky is the limit?", "I agree / disagree because..."],
        ["What would you do with a month off work?", "I would..."],
      ],
      avaliacao: "Which vowel disappears in your English?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on two vowels ",
        "that stay merged even in ",
        "advanced speakers. They’re...",
      ],
      revelacao: {
        titulo: "…/ʌ/ and /ɝ/!",
        explicacao: "Merging them costs you real minimal pairs:",
        exemplo: "hurt",
      },
      porQue: [
        "Compare: bud and bird, ",
        "cut and curt, hut and hurt. ",
        "Same consonants. ",
      ],
      seErrar: [
        "Without the contrast, the ",
        "listener rebuilds the word ",
        "from context, every time. ",
      ],
      /* "duck x dirt" não é par mínimo (muda a consoante final também), e
         "gull" e "fern" são palavras que o aluno não usa. Trocadas por pares
         verdadeiros de palavras correntes. */
      pratica: [
        "bud x bird", "cut x curt", "hut x hurt", "bun x burn", "ton x turn",
        "shut x shirt", "cub x curb", "luck x lurk", "hull x hurl",
      ],
      dialogos: [
        ["A: Did the deal hurt the company?", "B: It curtailed our growth, yes."],
        ["A: What turned it around?", "B: A burn rate we finally controlled."],
        ["A: Was the meeting curt?", "B: Short, but nobody got hurt."],
      ],
      // "The sky is the limit" (T2 L7). No Advanced o tema abre para o preço
      // do sucesso e para discordar com elegância.
      temaDaConversa: "The price of success",
      conversacao: [
        ["What does the sky is the limit mean to you?", "To me it means..."],
        ["What has success cost you?", "It cost me..."],
        ["Do you disagree with how success is measured?", "I disagree because..."],
        ["When did persistence turn into stubbornness?", "It turned when..."],
        ["What is worth more: recognition or freedom?", "I would choose... because..."],
        ["Who deserves credit that never gets it?", "The person who deserves it is..."],
        ["Have you ever burned out?", "I burned out when..."],
        ["What would you tell your younger self about work?", "I would tell myself..."],
        ["Is there a limit you have accepted?", "I accepted that..."],
      ],
      avaliacao: "Do you keep bud and bird apart when you speak?",
    },
  },
};
