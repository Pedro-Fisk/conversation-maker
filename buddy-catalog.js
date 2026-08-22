/*
 * buddy-catalog.js
 *
 * O currículo de pronúncia dos Transitions, que é a espinha dos Buddy Talks.
 *
 * A descoberta que originou este arquivo (21/08/2026): a série Buddy Talks não
 * foi inventada tópico a tópico — ela segue a coluna "Pronunciation" da tabela
 * de conteúdos dos livros Transitions 1 e 2, e cada tópico já tem áudio pronto
 * na pasta Class Audio do estágio, na seção "SAYING IT RIGHT" da lição. O
 * Buddy Talks 03 cita "TRANSITIONS 1 - L 8 - pg 71", e é exatamente a lição 8,
 * cujo tópico de pronúncia é consonant+vowel linking, cujo áudio está em
 * "LESSON 8/11 L8 P71 SAYING IT RIGHT A.mp3". Bate item a item nos 20 tópicos.
 *
 * Portanto: para criar um Buddy Talks novo não é preciso escolher assunto. O
 * assunto já está definido pelo livro, e o áudio já existe. O que falta é o
 * conteúdo da atividade, que é o que a IA escreve.
 *
 * `paginaAudio` é a página do livro onde fica o exercício de pronúncia, e é o
 * que aparece no slide do "LET'S PRACTICE" ("TRANSITIONS 1 - L 8 - pg 71").
 * `pagina` é onde a lição começa; serve só para referência.
 *
 * `licaoTitulo` e `temaDaLicao` vêm da tabela de conteúdos do livro. Servem
 * para a CONVERSAÇÃO da atividade: em vez de perguntas soltas escolhidas só
 * por conterem o som treinado, a conversa acontece dentro do assunto da lição
 * que o aluno está estudando naquele momento — ideia do Pedro em 21/08/2026.
 * O áudio do -ed, por exemplo, é da lição "Out of hand", sobre vícios e
 * hábitos; então a conversa é sobre hábitos, e o passado aparece sozinho.
 *
 * `buddyTalk` é o número da atividade que JÁ existe para aquele tópico (null =
 * ainda não foi feita). Foi conferido contra os arquivos da pasta
 * "Atividades Comunicativas Master Coordenação/English/Buddy talks 🐻" e
 * contra a aba "Buddytalks IE" do Guia de Atividades Comunicativas.
 */

const RAIZ_AUDIO = "Recursos do Aluno Fisk - Estágios";

const LIVROS = {
  transitions1: {
    label: "Transitions 1",
    pastaDrive: "03 - Transitions 1/Class Audio",
    nivel: "intermediate",
  },
  transitions2: {
    label: "Transitions 2",
    pastaDrive: "04 - Transitions 2/Class Audio",
    nivel: "intermediate",
  },
};

const TOPICOS = [
  // ── Transitions 1 ────────────────────────────────────────────────────
  {
    livro: "transitions1", licao: 1, pagina: 6, paginaAudio: 11,
    licaoTitulo: "What's trending now?",
    temaDaLicao: "hábitos online: o que as pessoas seguem, postam e assistem",
    topico: "Rising and falling intonation in tag questions",
    resumo: "A entonação sobe quando a tag question é pergunta de verdade e desce quando é só confirmação.",
    pastaAudio: "LESSON 1",
    audios: ["11 L1 P11 SAYING IT RIGHT A.mp3", "12 L1 P11 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions1", licao: 2, pagina: 14, paginaAudio: 19,
    licaoTitulo: "What's out there?",
    temaDaLicao: "descrever lugares e adivinhar o que há neles",
    topico: "Final /m/ and /n/",
    resumo: "Não acrescentar som de vogal depois do m e do n no fim da palavra (come, name, sun).",
    pastaAudio: "LESSON 2",
    audios: ["14 L2 P19 SAYING IT RIGHT A.mp3", "15 L2 P19 SAYING IT RIGHT B.mp3"],
    buddyTalk: "08",
  },
  {
    livro: "transitions1", licao: 3, pagina: 22, paginaAudio: 27,
    licaoTitulo: "What are you like?",
    temaDaLicao: "personalidade e sentimentos, e discordar de uma opinião",
    topico: "Contractions: you're / we're / they're",
    resumo: "Reduzir as formas contraídas do verbo be sem separar em duas sílabas.",
    pastaAudio: "LESSON 3",
    audios: ["12 L3 P27 SAYING IT RIGHT A.mp3", "13 L3 P27 SAYING IT RIGHT B.mp3"],
    buddyTalk: "12",
  },
  {
    livro: "transitions1", licao: 4, pagina: 30, paginaAudio: 35,
    licaoTitulo: "Why is networking important?",
    temaDaLicao: "como as pessoas se conectam, e os problemas de comunicação",
    topico: "Pronouns: him / her / them",
    resumo: "Na fala corrente o h de him/her some e them vira 'em, ligando-se ao verbo anterior.",
    pastaAudio: "LESSON 4",
    audios: ["11 L4 P35 SAYING IT RIGHT A.mp3", "12 L4 P35 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions1", licao: 5, pagina: 38, paginaAudio: 43,
    licaoTitulo: "Do you have any vacancies?",
    temaDaLicao: "tipos de hospedagem, dar direções e demonstrar convicção",
    topico: "And / Of",
    resumo: "As duas palavras são reduzidas na fala: and vira 'n' e of vira 'uh' (rock 'n' roll, a cup of tea).",
    pastaAudio: "LESSON 5",
    audios: ["10 L5 P43 SAYING IT RIGHT A.mp3", "11 L5 P43 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions1", licao: 6, pagina: 50, paginaAudio: 55,
    licaoTitulo: "Are you a geek?",
    temaDaLicao: "objetos de geek e encorajar alguém",
    topico: "The",
    resumo: "'The' muda de som conforme a palavra seguinte comece por consoante ou vogal.",
    pastaAudio: "LESSON 6",
    audios: ["09 L6 P55 SAYING IT RIGHT A.mp3", "10 L6 P55 SAYING IT RIGHT B.mp3"],
    // A planilha registra um Buddy Talks 13 "The 'THE'", mas o arquivo não
    // está na pasta — tratar como inexistente até alguém achar.
    buddyTalk: null,
  },
  {
    livro: "transitions1", licao: 7, pagina: 58, paginaAudio: 63,
    licaoTitulo: "What do you do?",
    temaDaLicao: "profissões, vida de escritório e dar parabéns",
    topico: "Gonna / wanna",
    resumo: "Formas reduzidas de going to e want to na fala informal.",
    pastaAudio: "LESSON 7",
    audios: ["11 L7 P63 SAYING IT RIGHT A.mp3", "12 L7 P63 SAYING IT RIGHT B.mp3"],
    buddyTalk: "04",
  },
  {
    livro: "transitions1", licao: 8, pagina: 66, paginaAudio: 71,
    licaoTitulo: "Are you ready to move out?",
    temaDaLicao: "tipos de moradia, cômodos e móveis",
    topico: "Consonant + vowel linking",
    resumo: "Consoante final se liga à vogal seguinte, emendando as palavras (wait a minute, take a look at).",
    pastaAudio: "LESSON 8",
    audios: ["11 L8 P71 SAYING IT RIGHT A.mp3", "12 L8 P71 SAYING IT RIGHT B.mp3"],
    buddyTalk: "03",
  },
  {
    livro: "transitions1", licao: 9, pagina: 74, paginaAudio: 79,
    licaoTitulo: "How skillful are you?",
    temaDaLicao: "trabalhos manuais e a ordem das ações",
    topico: "Contractions: will / would / have / has",
    resumo: "Contrações reduzidas a um único som colado ao pronome (I'll, I'd, I've, he's).",
    pastaAudio: "LESSON 9",
    audios: ["10 L9 P79 SAYING IT RIGHT.mp3"],
    buddyTalk: "12",
  },
  {
    livro: "transitions1", licao: 10, pagina: 82, paginaAudio: 87,
    licaoTitulo: "How are the two of you getting along?",
    temaDaLicao: "tipos de amigo, manias que irritam e mudar de assunto",
    topico: "Words frequently mispronounced",
    resumo: "Palavras cuja escrita engana o falante de português (comfortable, vegetable, chocolate).",
    pastaAudio: "LESSON 10",
    audios: ["09 L10 P87 SAYING IT RIGHT A.mp3", "10 L10 P87 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },

  // ── Transitions 2 ────────────────────────────────────────────────────
  {
    livro: "transitions2", licao: 1, pagina: 6, paginaAudio: 11,
    licaoTitulo: "On the crest of a wave",
    temaDaLicao: "popularidade e dar sugestões",
    topico: "Word endings",
    resumo: "Terminações de palavra que mudam o som e o acento (-tion, -sion, -ture, -ous).",
    pastaAudio: "LESSON 01",
    audios: ["10 L1 P11 SAYING IT RIGHT A.mp3", "11 L1 P11 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions2", licao: 2, pagina: 14, paginaAudio: 19,
    licaoTitulo: "To watch out for",
    temaDaLicao: "programas de TV e reagir a uma informação surpreendente",
    topico: "/ʃ/ vs. /tʃ/",
    resumo: "A diferença entre o som de 'sh' e o de 'ch' (ship x chip, wash x watch).",
    pastaAudio: "LESSON 02",
    audios: ["13 L2 P19 SAYING IT RIGHT A.mp3", "14 L2 P19 SAYING IT RIGHT B.mp3"],
    buddyTalk: "05",
  },
  {
    livro: "transitions2", licao: 3, pagina: 22, paginaAudio: 27,
    licaoTitulo: "Live and let live",
    temaDaLicao: "estilos de vida, concordar e discordar",
    topico: "/h/ vs. /r/",
    resumo: "O h inglês é aspirado e o r não soa como o r do português (hat x rat, home x Rome).",
    pastaAudio: "LESSON 03",
    audios: ["11 L3 P27 SAYING IT RIGHT A.mp3", "12 L3 P27 SAYING IT RIGHT B.mp3"],
    buddyTalk: "02",
  },
  {
    livro: "transitions2", licao: 4, pagina: 30, paginaAudio: 35,
    licaoTitulo: "Green, yellow or red?",
    temaDaLicao: "trânsito e dizer se alguém mereceu o que aconteceu",
    topico: "/ʒ/ vs. /dʒ/",
    resumo: "O som de 'measure' contra o de 'judge'.",
    pastaAudio: "LESSON 04",
    audios: ["11 L4 P35 SAYING IT RIGHT A.mp3", "12 L4 P35 SAYING IT RIGHT B.mp3"],
    buddyTalk: "07",
  },
  {
    livro: "transitions2", licao: 5, pagina: 38, paginaAudio: 43,
    licaoTitulo: "Through thick and thin",
    temaDaLicao: "amizade e graus de certeza",
    topico: "/θ/ vs. /f/, /s/, /t/",
    resumo: "O TH não é f, nem s, nem t (thin x fin x sin x tin).",
    pastaAudio: "LESSON 05",
    audios: ["09 L5 P43 SAYING IT RIGHT A.mp3", "10 L5 P43 SAYING IT RIGHT B.mp3"],
    buddyTalk: "10",
  },
  {
    livro: "transitions2", licao: 6, pagina: 50, paginaAudio: 55,
    licaoTitulo: "Out of hand",
    temaDaLicao: "vícios e hábitos que fogem do controle, e admitir que não se sabe",
    topico: "Final -ed",
    resumo: "As três pronúncias do -ed do passado: /t/, /d/ e /ɪd/.",
    pastaAudio: "LESSON 06",
    audios: ["10 L6 P55 SAYING IT RIGHT A.mp3", "11 L6 P55 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions2", licao: 7, pagina: 58, paginaAudio: 63,
    licaoTitulo: "The sky is the limit",
    temaDaLicao: "sucesso, concordar e discordar de alguém",
    topico: "/ʌ/ vs. /ɝ/",
    resumo: "A vogal de 'cup' contra a de 'bird'.",
    pastaAudio: "LESSON 07",
    audios: ["14 L7 P63 SAYING IT RIGHT A.mp3", "15 L7 P63 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions2", licao: 8, pagina: 66, paginaAudio: 71,
    licaoTitulo: "Not a tempest in a teapot",
    temaDaLicao: "desastres naturais e demonstrar solidariedade",
    topico: "/s/",
    resumo: "O s inicial e final, sem o apoio de vogal que o português insere.",
    pastaAudio: "LESSON 08",
    audios: ["12 L8 P71 SAYING IT RIGHT A.mp3", "13 L8 P71 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions2", licao: 9, pagina: 74, paginaAudio: 79,
    licaoTitulo: "Food for thought",
    temaDaLicao: "comida saudável, dietas e reagir ao inesperado",
    topico: "/æ/ vs. /eɪ/",
    resumo: "A vogal de 'cat' contra o ditongo de 'cake' (man x main, tap x tape).",
    pastaAudio: "LESSON 09",
    audios: ["11 L9 P79 SAYING IT RIGHT A.mp3", "12 L9 P79 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
  {
    livro: "transitions2", licao: 10, pagina: 82, paginaAudio: 87,
    licaoTitulo: "Cross your fingers",
    temaDaLicao: "superstições e generalizações",
    topico: "/aʊ/ vs. /oʊ/",
    resumo: "O ditongo de 'now' contra o de 'no' (town x tone, loud x load).",
    pastaAudio: "LESSON 10",
    audios: ["10 L10 P87 SAYING IT RIGHT A.mp3", "11 L10 P87 SAYING IT RIGHT B.mp3"],
    buddyTalk: null,
  },
];

/** Como o tópico é citado no slide do LET'S PRACTICE. */
function referenciaDoLivro(topico) {
  const livro = LIVROS[topico.livro];
  return `${livro.label.toUpperCase()} - L ${topico.licao} - pg ${topico.paginaAudio}`;
}

/** Caminho do áudio dentro do drive "Recursos do Aluno Fisk - Estágios". */
function caminhoDoAudio(topico, indice) {
  const livro = LIVROS[topico.livro];
  const arquivo = topico.audios[indice || 0];
  if (!arquivo) return null;
  return `${livro.pastaDrive}/${topico.pastaAudio}/${arquivo}`;
}

/** Chave estável de um tópico, usada na interface e nos registros. */
function chaveDoTopico(topico) {
  return `${topico.livro}-L${topico.licao}`;
}

/** Os que ainda não viraram Buddy Talks — a fila de trabalho. */
function topicosSemAtividade() {
  return TOPICOS.filter((t) => !t.buddyTalk);
}

module.exports = {
  RAIZ_AUDIO,
  LIVROS,
  TOPICOS,
  referenciaDoLivro,
  caminhoDoAudio,
  chaveDoTopico,
  topicosSemAtividade,
};
