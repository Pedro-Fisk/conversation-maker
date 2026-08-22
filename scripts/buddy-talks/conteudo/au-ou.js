/*
 * Buddy Talks — /aʊ/ vs. /oʊ/
 * Transitions 2, lição 10, página 87. Áudio: SAYING IT RIGHT A e B.
 * Lição "Cross your fingers" — superstições e generalizações.
 *
 * O tópico: o ditongo de "now" contra o de "no". Os dois começam parecido e
 * terminam em lugares opostos — /aʊ/ abre a boca e vai para o U; /oʊ/ já
 * começa arredondado. Em português os dois encostam no nosso "au" e no nosso
 * "ô", e o resultado é que "don't" e "down" viram a mesma palavra.
 *
 * O par mínimo é o exercício: isolada, cada palavra passa; lado a lado, o
 * aluno ouve que estava dizendo outra coisa.
 */

const comum = {
  subtitulo: "Now or No",
  titulo: "/aʊ/ vs. /oʊ/",
  nomeDoAudio: "Buddy Talks AUDIO FILE - now and no",
  objetivos: [
    "Improving fluency.",
    "Practicing two diphthongs.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "au-ou",
  topicoCatalogo: { livro: "transitions2", licao: 10 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice two sounds ",
        "that are almost opposite, ",
        "but we mix them up. They’re...",
      ],
      revelacao: {
        titulo: "…NOW and NO!",
        explicacao: "Two vowels in one sound, going different ways:",
        exemplo: "now x no",
      },
      porQue: [
        "In now, house and down the ",
        "mouth opens wide first, ",
        "then closes. ",
      ],
      seErrar: [
        "In no, home and don’t the ",
        "lips are round from the ",
        "very beginning. ",
      ],
      /* Todo item é par MÍNIMO de verdade: muda só a vogal. Na primeira
         versão entraram "cow x go", "round x road" e "down x don't", que
         mudam também a consoante e portanto não treinam nada. */
      pratica: [
        "now x no", "town x tone", "loud x load", "out x oat", "house x hose",
        "how x hoe", "clown x clone", "noun x known", "found x phoned",
      ],
      dialogos: [
        ["A: Do you live in this town?", "B: No, my house is down the road."],
        ["A: Is the music too loud?", "B: Now it’s fine, thank you."],
        ["A: Did you go out?", "B: No, I stayed home all day."],
      ],
      /* Lição "Cross your fingers": superstições e generalizações. No BASIC o
         tema entra pela porta concreta: sorte, azar e o que a família diz que
         dá azar — e as duas vogais aparecem em now, no, don't, know. */
      temaDaConversa: "Luck and bad luck",
      conversacao: [
        ["Do you believe in luck? Why?", "I believe / don’t believe because..."],
        ["What brings bad luck in your family?", "My family says that..."],
        ["Do you have a lucky number?", "My lucky number is..."],
        ["What do you do before a test?", "Before a test I..."],
        ["Is a black cat bad luck for you?", "For me, a black cat is..."],
        ["Do you know a superstition from your town?", "In my town people say..."],
        ["What would you never do on Friday the 13th?", "I would never..."],
        ["Do you cross your fingers? When?", "I cross my fingers when..."],
        ["Was there a day when you had good luck?", "One day I found..."],
      ],
      avaliacao: "Can you say NOW and NO differently?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll separate two sounds ",
        "that turn one word into ",
        "its opposite. They’re...",
      ],
      revelacao: {
        titulo: "…NOW and NO!",
        explicacao: "Down and don’t are not the same word:",
        exemplo: "down",
      },
      porQue: [
        "Both are diphthongs: two ",
        "vowels glued together, ",
        "moving in one breath. ",
      ],
      seErrar: [
        "Portuguese pulls both to ",
        "the nearest sound we have, ",
        "and they collapse into one. ",
      ],
      /* Aqui os pares mínimos comuns acabam, e a primeira versão saiu cheia
         de par falso ("mouse x most", "proud x probe") e de palavra que o
         aluno nunca viu ("aloe", "foal", "crowed"). Melhor marcar a vogal
         dentro de palavras que ele usa todo dia. */
      pratica: [
        "allow /aʊ/", "although /oʊ/", "account /aʊ/", "approach /oʊ/", "amount /aʊ/",
        "alone /oʊ/", "around /aʊ/", "own /oʊ/", "doubt /aʊ/",
      ],
      dialogos: [
        ["A: Was there a big crowd?", "B: The whole town showed up."],
        ["A: Are you proud of the result?", "B: I know I sounded doubtful."],
        ["A: How did you count them?", "B: One row at a time, out loud."],
      ],
      // "Cross your fingers" (T2 L10): superstições e generalizações.
      temaDaConversa: "Superstitions around us",
      conversacao: [
        ["What superstition did you grow up with?", "I grew up hearing that..."],
        ["Do you know anyone who is very superstitious?", "I know someone who..."],
        ["Is there a superstition in sports?", "Athletes usually..."],
        ["Have you ever avoided doing something out of fear?", "I avoided..."],
        ["Do superstitions make people feel safer?", "They allow people to..."],
        ["What do people say about breaking a mirror?", "People say that..."],
        ["Is it wrong to generalize about luck?", "I think generalising..."],
        ["What ritual do you have before a big day?", "Before it, I..."],
        ["Would you bet on a lucky number?", "I would / wouldn’t because..."],
      ],
      avaliacao: "Which diphthong collapses in your speech?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on two diphthongs ",
        "that keep collapsing even ",
        "at a high level. They’re...",
      ],
      revelacao: {
        titulo: "…NOW and NO!",
        explicacao: "The glide is where fluent speakers cut corners:",
        exemplo: "profound",
      },
      porQue: [
        "A diphthong needs the full ",
        "movement. Cutting it short ",
        "flattens the word. ",
      ],
      seErrar: [
        "Flattened, the two collapse, ",
        "and now starts to sound ",
        "exactly like no. ",
      ],
      pratica: [
        "profound /aʊ/", "propose /oʊ/", "announce /aʊ/", "promote /oʊ/", "encounter /aʊ/",
        "overcome /oʊ/", "renounce /aʊ/", "suppose /oʊ/", "surround /aʊ/",
      ],
      dialogos: [
        ["A: Did the idea arouse any doubt?", "B: It proposed a profound change."],
        ["A: Are they devout believers?", "B: They devote every Sunday to it."],
        ["A: Did he renounce the claim?", "B: The evidence eroded his position."],
      ],
      // "Cross your fingers" (T2 L10). No Advanced o tema abre para crença,
      // ritual e o limite entre superstição e cultura.
      temaDaConversa: "Belief, ritual and superstition",
      conversacao: [
        ["Where does culture end and superstition begin?", "The line is drawn when..."],
        ["Why do rituals survive in rational people?", "They survive because..."],
        ["Have you ever renounced a belief?", "I renounced it when..."],
        ["Is superstition harmless?", "It is harmless unless..."],
        ["What ritual do you keep without believing in it?", "I keep..."],
        ["Do institutions rely on ritual too?", "Institutions use ritual to..."],
        ["What superstition surrounds your profession?", "In my field people..."],
        ["Is it fair to generalize about believers?", "Generalising is..."],
        ["What would it take to change your mind?", "I would change my mind if..."],
      ],
      avaliacao: "Do your diphthongs keep their full movement?",
    },
  },
};
