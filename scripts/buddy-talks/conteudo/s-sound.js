/*
 * Buddy Talks — THE /s/ SOUND
 * Transitions 2, lição 8, página 71. Áudio: SAYING IT RIGHT A e B.
 * Lição "Not a tempest in a teapot" — desastres naturais e solidariedade.
 *
 * O tópico é o erro mais reconhecível do brasileiro falando inglês: o "e"
 * fantasma antes do S no começo da palavra. "Study" vira "estudy", "school"
 * vira "eschool". A causa é que o português não abre sílaba com S + consoante,
 * e a boca resolve inserindo uma vogal.
 *
 * O truque que o áudio treina: começar a palavra com o ar do S já saindo,
 * antes de a voz entrar. Daí a lista ser toda de S + consoante — é o encontro
 * que não existe em português.
 */

const comum = {
  subtitulo: "The Ghost Vowel",
  titulo: "THE /s/ SOUND",
  nomeDoAudio: "Buddy Talks AUDIO FILE - the /s/ at the start",
  objetivos: [
    "Improving fluency.",
    "Practicing initial /s/.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "s-sound",
  topicoCatalogo: { livro: "transitions2", licao: 8 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll remove one little ",
        "vowel that we add without ",
        "even noticing. It’s the...",
      ],
      revelacao: {
        titulo: "…GHOST E!",
        explicacao: "We say e-study, but the word starts with S:",
        exemplo: "study",
      },
      porQue: [
        "Start with the air of the S ",
        "first, and only then let ",
        "your voice in. ",
      ],
      seErrar: [
        "With the extra E, school ",
        "becomes eschool and the word ",
        "gains a syllable. ",
      ],
      pratica: [
        "study", "school", "stop", "small", "speak",
        "storm", "street", "start", "strong",
      ],
      dialogos: [
        ["A: Where do you study?", "B: At the school on this street."],
        ["A: Can you speak more slowly?", "B: Sure. Stop me if it’s fast."],
        ["A: Was the storm strong?", "B: Strong, but the house is safe."],
      ],
      /* Lição "Not a tempest in a teapot": desastres naturais e demonstrar
         solidariedade. No BASIC o tema entra pela porta concreta: o tempo, a
         chuva forte, o que o aluno faz quando cai um temporal — e a lista de
         palavras já traz "storm" e "strong". */
      temaDaConversa: "Storms and bad weather",
      conversacao: [
        ["Do you like storms? Why?", "I like / don’t like storms because..."],
        ["What do you do when it starts to rain?", "I stop and..."],
        ["Was there a strong storm in your city?", "Yes, the storm..."],
        ["Do you study when it rains?", "When it rains I study..."],
        ["What street floods near your house?", "The street that floods is..."],
        ["Were you scared of storms as a child?", "When I was small I..."],
        ["What do you say to a friend in trouble?", "I say..."],
        ["Do you prefer snow, sun or storms?", "I prefer... because..."],
        ["What is the strongest weather you saw?", "The strongest was..."],
      ],
      avaliacao: "Can you say STUDY without the extra E?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll delete the vowel that ",
        "Portuguese inserts at the ",
        "start of a word. It’s the...",
      ],
      revelacao: {
        titulo: "…GHOST E!",
        explicacao: "Portuguese never starts with S + consonant:",
        exemplo: "storm",
      },
      porQue: [
        "So our mouth solves the ",
        "problem by adding a vowel ",
        "that English never had. ",
      ],
      seErrar: [
        "The extra syllable is the ",
        "single most recognisable ",
        "Brazilian accent marker. ",
      ],
      pratica: [
        "structure", "stability", "spread", "scale", "sphere",
        "statement", "strategy", "specific", "stranded",
      ],
      dialogos: [
        ["A: What is the strategy?", "B: A specific plan for each stage."],
        ["A: Did the fire spread?", "B: On a scale nobody expected."],
        ["A: Was anyone stranded?", "B: The whole street, for two days."],
      ],
      // "Not a tempest in a teapot" (T2 L8): desastres naturais e solidariedade.
      temaDaConversa: "When disaster strikes",
      conversacao: [
        ["What natural disaster worries you the most?", "I worry about..."],
        ["Have you ever been stranded by the weather?", "I was stranded when..."],
        ["What do you say to someone who lost everything?", "I would say..."],
        ["Is your city prepared for a storm?", "The structure of my city..."],
        ["What small thing becomes a big problem?", "A small..."],
        ["How do people help each other in a disaster?", "People start to..."],
        ["Have you ever donated or volunteered?", "I helped when..."],
        ["Is the media too dramatic about weather?", "I think the news..."],
        ["What would you save from your house?", "I would save..."],
      ],
      avaliacao: "Which S word still gets an E from you?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll remove a vowel that ",
        "survives in almost every ",
        "advanced speaker. It’s the...",
      ],
      revelacao: {
        titulo: "…GHOST E!",
        explicacao: "It hides in the longest words you use:",
        exemplo: "strategy",
      },
      porQue: [
        "The longer the word, the ",
        "less you hear yourself add ",
        "the extra vowel. ",
      ],
      seErrar: [
        "Three-consonant clusters ",
        "(str-, spr-, scr-) are where ",
        "it always comes back. ",
      ],
      pratica: [
        "straightforward", "scrutiny", "spontaneous", "sustainability", "skeptical",
        "stereotype", "screening", "sprawling", "statistics",
      ],
      dialogos: [
        ["A: Was the response spontaneous?", "B: It escaped any real scrutiny."],
        ["A: Are the statistics reliable?", "B: I am skeptical about the screening."],
        ["A: How bad was the damage?", "B: A sprawling area, entirely flooded."],
      ],
      // "Not a tempest in a teapot" (T2 L8). No Advanced o tema abre para
      // prevenção, exagero da mídia e responsabilidade coletiva.
      temaDaConversa: "Storm in a teapot, or a real crisis",
      conversacao: [
        ["When is a crisis a storm in a teapot?", "It is exaggerated when..."],
        ["Are we skeptical about the right things?", "We are skeptical about..."],
        ["What does sustainability mean in practice?", "In practice it means..."],
        ["Who should be under scrutiny after a disaster?", "The scrutiny should fall on..."],
        ["Do statistics change how you see risk?", "Statistics make me..."],
        ["What stereotype exists about your region?", "The stereotype is..."],
        ["Has a spontaneous act of help impressed you?", "I was impressed when..."],
        ["How straightforward is prevention, really?", "Prevention is..."],
        ["What would you say to someone who lost a home?", "I would say..."],
      ],
      avaliacao: "Does the ghost E come back in long words?",
    },
  },
};
