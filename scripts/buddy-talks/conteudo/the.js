/*
 * Buddy Talks — THE
 * Transitions 1, lição 6, página 55. Áudio: SAYING IT RIGHT A e B.
 * Lição "Are you a geek?" — objetos de geek e encorajar alguém.
 *
 * O tópico: "the" tem DUAS pronúncias, e quem decide é o som seguinte. Antes
 * de som de consoante é /ðə/ ("the game"); antes de som de vogal é /ði/ ("the
 * app"). Repare que quem manda é o SOM, não a letra: "the hour" leva /ði/
 * porque o H é mudo, e "the university" leva /ðə/ porque o U soa /ju/.
 *
 * A lista traz a marca fonética ao lado, porque aqui a palavra escrita é
 * sempre a mesma e sem a marca não haveria o que repetir.
 */

const comum = {
  subtitulo: "Two Little Sounds",
  titulo: "THE",
  nomeDoAudio: "Buddy Talks AUDIO FILE - the two sounds of THE",
  objetivos: [
    "Improving fluency.",
    "Practicing the article THE.",
    "Developing pronunciation.",
  ],
};

module.exports = {
  chave: "the",
  topicoCatalogo: { livro: "transitions1", licao: 6 },

  niveis: {
    BASIC: {
      ...comum,
      nivel: "BASIC",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice the smallest ",
        "word in English, and it has ",
        "two different sounds. It’s...",
      ],
      revelacao: {
        titulo: "…THE!",
        explicacao: "The next sound decides how we say it:",
        exemplo: "the app",
      },
      porQue: [
        "Before a consonant sound ",
        "we say /ðə/, like in ",
        "the game. ",
      ],
      seErrar: [
        "Before a vowel sound we say ",
        "/ði/, like in the app and ",
        "the end. ",
      ],
      pratica: [
        "the app /ði/", "the game /ðə/", "the end /ði/", "the box /ðə/", "the hour /ði/",
        "the phone /ðə/", "the icon /ði/", "the code /ðə/", "the email /ði/",
      ],
      dialogos: [
        ["A: Where is the game?", "B: It’s on the app, in the store."],
        ["A: Do you like the new phone?", "B: I love the camera and the screen."],
        ["A: What time is the party?", "B: At the end of the afternoon."],
      ],
      /* Lição "Are you a geek?": objetos de geek e encorajar alguém. No BASIC
         o tema entra pela porta concreta: as coisas favoritas do aluno, os
         jogos e o celular — e "the" aparece em toda resposta sozinho. */
      temaDaConversa: "Your favorite things",
      conversacao: [
        ["What is the best game you play?", "The best game is..."],
        ["What is the app you open first?", "The app I open is..."],
        ["What is the object you always carry?", "I always carry the..."],
        ["Who is the person you play with?", "The person is my..."],
        ["What is the coolest thing in your room?", "The coolest thing is the..."],
        ["What is the hardest level for you?", "The hardest level is..."],
        ["What is the last thing you bought?", "The last thing was the..."],
        ["What is the video you watch again?", "The video is about..."],
        ["What is the thing you want the most?", "The thing I want is the..."],
      ],
      avaliacao: "Can you hear the two sounds of THE?",
    },

    INTERMEDIATE: {
      ...comum,
      nivel: "INTERMEDIATE",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll practice a word you ",
        "say a hundred times a day, ",
        "and it has two sounds. It’s...",
      ],
      revelacao: {
        titulo: "…THE!",
        explicacao: "The SOUND after it decides, not the letter:",
        exemplo: "the hour",
      },
      porQue: [
        "The hour takes /ði/ because ",
        "the H is silent and a vowel ",
        "sound comes next. ",
      ],
      seErrar: [
        "The university takes /ðə/ ",
        "because the U sounds like ",
        "a Y, not like a vowel. ",
      ],
      pratica: [
        "the hour /ði/", "the user /ðə/", "the idea /ði/", "the engine /ði/", "the update /ði/",
        "the device /ðə/", "the answer /ði/", "the screen /ðə/", "the option /ði/",
      ],
      dialogos: [
        ["A: Did you read the update?", "B: The engineer explained the change."],
        ["A: Is the device working?", "B: The user manual is useless."],
        ["A: What was the idea behind it?", "B: The answer is in the first page."],
      ],
      // "Are you a geek?" (T1 L6): objetos de geek e encorajar alguém.
      temaDaConversa: "The geek in you",
      conversacao: [
        ["What is the gadget you could not live without?", "The gadget is..."],
        ["What is the hobby people find strange?", "The hobby is..."],
        ["Who is the geek in your family?", "The geek is my..."],
        ["What is the collection you keep?", "The collection I keep is..."],
        ["What is the subject you can talk about for hours?", "The subject is..."],
        ["What is the best advice for a beginner?", "The best advice is..."],
        ["What is the app you recommend the most?", "The app is..."],
        ["What would you encourage a friend to try?", "I would encourage..."],
        ["What is the technology that changed your routine?", "The technology is..."],
      ],
      avaliacao: "Which sound of THE do you forget more?",
    },

    ADVANCED: {
      ...comum,
      nivel: "ADVANCED",
      buddy: [
        "Hey guys! I’m BUDDY! Today, ",
        "we’ll work on the word you ",
        "repeat most often, and most ",
        "often say the same way. It’s...",
      ],
      revelacao: {
        titulo: "…THE!",
        explicacao: "Two forms, decided by the following sound:",
        exemplo: "the end",
      },
      porQue: [
        "Getting it right is invisible ",
        "when correct and audible ",
        "the moment it is wrong. ",
      ],
      seErrar: [
        "There is a third use: stressed ",
        "/ðiː/, when you mean THE one ",
        "and only. ",
      ],
      pratica: [
        "the issue /ði/", "the offer /ði/", "the honor /ði/", "the union /ðə/", "the effort /ði/",
        "the impact /ði/", "the plan /ðə/", "the origin /ði/", "the client /ðə/",
      ],
      dialogos: [
        ["A: What was the outcome of the meeting?", "B: The impact was bigger than expected."],
        ["A: Did they explain the concept?", "B: The origin of the idea is unclear."],
        ["A: Was it worth the effort?", "B: It was the effort of a lifetime."],
      ],
      // "Are you a geek?" (T1 L6). No Advanced o tema abre para obsessão,
      // especialização e tecnologia, sem sair do assunto da lição.
      temaDaConversa: "The thing you are obsessive about",
      conversacao: [
        ["What is the subject you know in depth?", "The subject is..."],
        ["What is the detail only you notice?", "The detail is..."],
        ["Is the label geek an insult or a compliment?", "In my opinion, the label..."],
        ["What is the obsession that paid off?", "The obsession was..."],
        ["What is the technology you refuse to adopt?", "The technology I refuse is..."],
        ["What is the hardest part of explaining it?", "The hardest part is..."],
        ["Who is the person who got you into it?", "The person was..."],
        ["What is the advice you would give a beginner?", "The advice is..."],
        ["What is the future of that field?", "The future is..."],
      ],
      avaliacao: "Do you switch between the two forms of THE?",
    },
  },
};
