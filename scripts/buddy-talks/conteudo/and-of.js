/*
 * Buddy Talks — AND / OF
 * Transitions 1, lição 5, página 43. Áudio: SAYING IT RIGHT A e B.
 * Lição "Do you have any vacancies?" — hospedagem, direções e convicção.
 *
 * O tópico: "and" e "of" quase nunca são pronunciados por inteiro. "and" vira
 * /ən/ ou só /n/ ("bread'n jam"), e "of" vira /əv/ ou só /ə/ ("a cuppa tea").
 * São duas das palavras mais frequentes do inglês, e pronunciá-las inteiras a
 * cada vez é o que dá o ritmo marcado, sílaba a sílaba, do falante brasileiro.
 *
 * A lista traz as expressões escritas por extenso, como se escrevem: quem
 * ensina a redução é o áudio do livro. Ver "bread'n jam" escrito atrapalha
 * quem está lendo.
 */

const comum = {
  subtitulo: "Weak Words",
  titulo: "AND / OF",
  nomeDoAudio: "Buddy Talks AUDIO FILE - the weak and & of",
  objetivos: [
    "Improving fluency.",
    "Practicing weak words.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "and-of",
  topicoCatalogo: { livro: "transitions1", licao: 5 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice two tiny ",
        "words that we almost never ",
        "say completely. They are...",
      ],
      revelacao: {
        titulo: "…AND and OF!",
        explicacao: "Listen: they almost disappear in speech.",
        exemplo: "a cup of tea",
      },
      porQue: [
        "Saying them fast is what ",
        "gives English its rhythm ",
        "and speed. ",
      ],
      seErrar: [
        "Saying AND and OF slowly ",
        "makes every sentence sound ",
        "long and heavy. ",
      ],
      pratica: [
        "a cup of tea", "a lot of work", "out of town", "most of them", "kind of cold",
        "bread and jam", "nice and easy", "mom and dad", "black and white",
      ],
      dialogos: [
        ["A: What do you have for breakfast?", "B: Bread and jam and a cup of tea."],
        ["A: Where is the hotel?", "B: It’s out of town, in front of a park."],
        ["A: Was the room good?", "B: It was kind of small, but nice and clean."],
      ],
      /* Tema da lição de onde veio o áudio: "Do you have any vacancies?",
         sobre hospedagem e direções. No BASIC o tema entra pela porta
         concreta: a casa e a rua do aluno, e uma viagem simples — o som
         treinado é o mesmo, e o conteúdo é o que ele já sabe dizer. */
      temaDaConversa: "Your home and your street",
      conversacao: [
        ["What is in front of your house?", "In front of my house there is..."],
        ["What do you have in your room?", "I have a bed and a..."],
        ["Where do you go on Saturdays?", "I go out of town / I stay..."],
        ["What kind of house do you live in?", "I live in a kind of..."],
        ["Who do you live with?", "I live with my mom and..."],
        ["What is your street like?", "It is quiet and..."],
        ["Have you stayed in a hotel?", "The room was nice and..."],
        ["What do you take on a trip?", "I take a lot of..."],
        ["What is close to your home?", "There is a shop and a..."],
      ],
      avaliacao: "Is it easy to say and and of very fast?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice two words ",
        "that native speakers cut ",
        "down to a single sound. They are...",
      ],
      revelacao: {
        titulo: "…AND and OF!",
        explicacao: "They shrink and lean on the word before:",
        exemplo: "a lot of",
      },
      porQue: [
        "These two are among the ",
        "most frequent words, so they ",
        "shape your rhythm. ",
      ],
      seErrar: [
        "Pronouncing them fully gives ",
        "every phrase the same weight, ",
        "and nothing stands out. ",
      ],
      pratica: [
        "a piece of cake", "plenty of room", "out of order", "in front of it", "instead of that",
        "safe and sound", "back and forth", "peace and quiet", "rest and relax",
      ],
      dialogos: [
        ["A: Do you have any vacancies?", "B: Plenty of room. How many nights?"],
        ["A: How was the trip back?", "B: Long, but we arrived safe and sound."],
        ["A: Was the shower working?", "B: No, it was out of order all weekend."],
      ],
      // "Do you have any vacancies?" (T1 L5): hospedagem e direções.
      temaDaConversa: "Finding a place to stay",
      conversacao: [
        ["What kind of place do you book on a trip?", "I usually book a kind of..."],
        ["What do you check before you book?", "I check a lot of things, like..."],
        ["Have you had a problem in a hotel?", "Something was out of order and..."],
        ["Do you prefer peace and quiet or the center?", "I prefer... instead of..."],
        ["How do you find your way in a new city?", "I ask in front of the station and..."],
        ["What is worth paying more for?", "Plenty of space and..."],
        ["Tell me about the best place you stayed.", "It had a pool and..."],
        ["Would you share a room with strangers?", "I would, because of..."],
        ["What do you always pack?", "A couple of shirts and..."],
      ],
      avaliacao: "Which weak word is harder for you: and or of?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on two words that ",
        "fluent speakers reduce to ",
        "almost nothing at all. They are...",
      ],
      revelacao: {
        titulo: "…AND and OF!",
        explicacao: "Function words compress; content words don’t:",
        exemplo: "ahead of",
      },
      porQue: [
        "English rhythm depends on ",
        "compressing the small words ",
        "between the stressed ones. ",
      ],
      seErrar: [
        "Giving every word equal ",
        "weight is what makes fluent ",
        "speech sound mechanical. ",
      ],
      pratica: [
        "ahead of time", "short of time", "aware of that", "capable of it", "regardless of",
        "time and again", "trial and error", "give and take", "wear and tear",
      ],
      dialogos: [
        ["A: Did the booking go through?", "B: I confirmed it well ahead of time."],
        ["A: How did you choose the place?", "B: Trial and error, to be honest."],
        ["A: Was it worth the price?", "B: Given the wear and tear, hardly."],
      ],
      // "Do you have any vacancies?" (T1 L5). No Advanced o tema abre para
      // julgar e reclamar de uma hospedagem, mantendo o assunto do livro.
      temaDaConversa: "Judging a place to stay",
      conversacao: [
        ["What makes a place worth the money?", "Regardless of the price, I look for..."],
        ["Have you ever complained about a room?", "I complained because of..."],
        ["What are you never short of when packing?", "I always take plenty of..."],
        ["Do you plan ahead of time or improvise?", "I plan ahead of time because..."],
        ["What kind of place would you avoid?", "I would avoid a kind of..."],
        ["Is a review worth trusting?", "It depends on..."],
        ["Tell me about a place that surprised you.", "It was full of..."],
        ["What is the trade-off between price and comfort?", "It is a give and take between..."],
        ["Would you go back to the same place?", "Time and again, because..."],
      ],
      avaliacao: "Do your small words compress when you speak?",
    },
  },
};
