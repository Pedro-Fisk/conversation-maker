/*
 * molde.js
 *
 * O molde padrão do Buddy Talks: onde cada pedaço de conteúdo entra dentro do
 * arquivo que serve de base.
 *
 * O molde É o Buddy Talks 03 (Consonant + Vowel Linking). Decisão do Pedro em
 * 21/08/2026: padronizar UM formato médio, com prática 1, prática 2, diálogos
 * e avaliação — que é exatamente a forma dele, 12 slides. Aproveitar o arquivo
 * preserva a arte do Buddy e a identidade da série, em vez de imitá-las.
 *
 * O mapa abaixo é o endereço de cada texto dentro daquele arquivo (slide,
 * caixa, parágrafo). Ele foi lido do próprio .pptx, não digitado à mão. O que
 * NÃO aparece aqui é o que fica intacto de propósito: MATERIAL NEEDED,
 * Powerpoint Activity, LENGHT : 10 MINUTES, OBJECTIVE OF THE ACTIVITY, LET'S
 * PRACTICE, LISTEN TO THE AUDIO FILE, (2x) Listen and repeat e ACTIVITY
 * EVALUATION — são a moldura da atividade, não o conteúdo dela.
 *
 * Os números entre parênteses são o tamanho do texto original. A caixa não
 * cresce e a fonte é fixa (40pt na lista de palavras, 24pt nos diálogos), então
 * eles são o limite prático de cada campo.
 */

// Arquivo que serve de base. Fica no Drive da coordenação, que é onde ele vive.
const MOLDE_ORIGINAL =
  "/Users/pedroluz/Library/CloudStorage/GoogleDrive-pedro.diretor@fiskpersonalizado.com/" +
  "Shared drives/Arquivos Coordenação/Pedagógico Coordenação/" +
  "Atividades Comunicativas Master Coordenação/English/Buddy talks 🐻/" +
  "03 - Buddy Talks - Consonant + Vowel Linking ALL LEVELS.pptx";

// slide 8 é o "LET'S PRACTICE! (1)", que é onde o áudio da lição é ouvido
const SLIDE_DO_AUDIO = 8;

/* PRÁTICA 2, ampliada em 21/08/2026 a pedido do Pedro.
   O molde tinha um único slide de diálogos prontos, e a atividade acabava ali.
   A ideia dele: a prática 1 é a formal, repetição em grupo com o áudio; a
   prática 2 tem de virar CONVERSAÇÃO EM PARES de verdade, como nas atividades
   do Conversation Maker. Então o slide 11 (os três diálogos-modelo) é
   duplicado três vezes, e as cópias viram perguntas de conversação escolhidas
   para PUXAR a pronúncia treinada: perguntar "o que você fez no fim de
   semana?" obriga o aluno a usar verbos no passado, que é o assunto da aula.

   As cópias herdam o desenho e a animação que revela um item por vez, e
   entram logo depois do slide de origem, antes da avaliação. O número do
   ARQUIVO delas (13, 14, 15) é maior que o da avaliação (12), mas a ordem de
   exibição é outra coisa — quem manda é a lista do presentation.xml. */
const SLIDE_DOS_DIALOGOS = 11;
const SLIDES_DE_CONVERSA = [13, 14, 15];
const PERGUNTAS_POR_SLIDE = 3;

/**
 * Traduz um objeto de conteúdo no mapa { idDoParagrafo: texto } que o
 * pptx-rewriter.js espera.
 */
function mapearConteudo(c) {
  const textos = {
    // capa
    "s1-f7-p0": c.subtitulo,               // (16) "Connected Speech"
    "s1-f7-p1": c.titulo,                  // (25) "CONSONANT + VOWEL LINKING"
    "s1-f8-p0": c.nivel,                   // (10) "ALL LEVELS"

    // material necessário: só a linha do arquivo de áudio muda
    "s2-f3-p1": c.nomeDoAudio,             // (54)

    // objetivos
    "s3-f3-p0": c.objetivos[0],            // (18)
    "s3-f3-p1": c.objetivos[1],            // (25)
    "s3-f3-p2": c.objetivos[2],            // (25)

    // o Buddy apresentando o assunto (uma frase em 4 linhas)
    "s4-f5-p0": c.buddy[0],                // (28)
    "s4-f5-p1": c.buddy[1],                // (29)
    "s4-f5-p2": c.buddy[2],                // (26)
    "s4-f5-p3": c.buddy[3],                // (33)

    // a revelação do tema
    "s5-f5-p0": c.revelacao.titulo,        // (18) "…CONNECTED SPEECH!"
    "s5-f5-p1": c.revelacao.explicacao,    // (45)
    "s5-f5-p2": c.revelacao.exemplo,       // (8)  destaque grande

    // por que vale a pena (uma frase em 3 linhas)
    "s6-f5-p0": c.porQue[0],               // (31)
    "s6-f5-p1": c.porQue[1],               // (28)
    "s6-f5-p2": c.porQue[2],               // (8)

    // o que acontece quando erra (uma frase em 3 linhas)
    "s7-f5-p0": c.seErrar[0],              // (27)
    "s7-f5-p1": c.seErrar[1],              // (31)
    "s7-f5-p2": c.seErrar[2],              // (24)

    // referência do livro, no slide do áudio
    "s8-f5-p0": c.referenciaLivro,         // (27) "TRANSITIONS 1 - L 8 - pg 71"

    // lista do listen and repeat: 5 itens na coluna da esquerda, 4 na direita
    "s9-f4-p0": c.pratica[0],              // (17)
    "s9-f4-p1": c.pratica[1],              // (12)
    "s9-f4-p2": c.pratica[2],              // (14)
    "s9-f4-p3": c.pratica[3],              // (13)
    "s9-f4-p4": c.pratica[4],              // (10)
    "s9-f5-p0": c.pratica[5],              // (5)
    "s9-f5-p1": c.pratica[6],              // (15)
    "s9-f5-p2": c.pratica[7],              // (7)
    "s9-f5-p3": c.pratica[8],              // (8)

    // três diálogos A/B
    "s11-f3-p0": c.dialogos[0][0],         // (36)
    "s11-f3-p1": c.dialogos[0][1],         // (35)
    "s11-f4-p0": c.dialogos[1][0],         // (24)
    "s11-f4-p1": c.dialogos[1][1],         // (23)
    "s11-f5-p0": c.dialogos[2][0],         // (29)
    "s11-f5-p1": c.dialogos[2][1],         // (38)

    // pergunta de avaliação
    "s12-f3-p0": c.avaliacao,              // (46)
  };

  /* As perguntas de conversação, três por slide copiado. Cada caixa recebe a
     pergunta na primeira linha e um começo de resposta na segunda — o mesmo
     par pergunta/resposta-modelo das atividades do Conversation Maker. */
  (c.conversacao || []).forEach((par, i) => {
    const slide = SLIDES_DE_CONVERSA[Math.floor(i / PERGUNTAS_POR_SLIDE)];
    const caixa = ["f3", "f4", "f5"][i % PERGUNTAS_POR_SLIDE];
    if (!slide) return;
    textos[`s${slide}-${caixa}-p0`] = par[0];
    textos[`s${slide}-${caixa}-p1`] = par[1];
  });

  return textos;
}

/** Tamanhos originais, para conferir o que estourou antes de gerar. */
const LIMITES = {
  "s1-f7-p0": 16, "s1-f7-p1": 25, "s1-f8-p0": 10,
  "s2-f3-p1": 54,
  "s3-f3-p0": 18, "s3-f3-p1": 25, "s3-f3-p2": 25,
  "s4-f5-p0": 28, "s4-f5-p1": 29, "s4-f5-p2": 26, "s4-f5-p3": 33,
  "s5-f5-p0": 18, "s5-f5-p1": 45, "s5-f5-p2": 8,
  "s6-f5-p0": 31, "s6-f5-p1": 28, "s6-f5-p2": 8,
  "s7-f5-p0": 27, "s7-f5-p1": 31, "s7-f5-p2": 24,
  "s8-f5-p0": 27,
  "s9-f4-p0": 17, "s9-f4-p1": 12, "s9-f4-p2": 14, "s9-f4-p3": 13, "s9-f4-p4": 10,
  "s9-f5-p0": 5, "s9-f5-p1": 15, "s9-f5-p2": 7, "s9-f5-p3": 8,
  "s11-f3-p0": 36, "s11-f3-p1": 35,
  "s11-f4-p0": 24, "s11-f4-p1": 23,
  "s11-f5-p0": 29, "s11-f5-p1": 38,
  "s12-f3-p0": 46,
};

// as caixas dos slides copiados são as MESMAS do slide 11 (é uma cópia dele)
SLIDES_DE_CONVERSA.forEach((n) => {
  LIMITES[`s${n}-f3-p0`] = 36; LIMITES[`s${n}-f3-p1`] = 35;
  LIMITES[`s${n}-f4-p0`] = 24; LIMITES[`s${n}-f4-p1`] = 23;
  LIMITES[`s${n}-f5-p0`] = 29; LIMITES[`s${n}-f5-p1`] = 38;
});

/* A caixa das palavras usa 40pt numa coluna de 10,4 cm, e a dos diálogos 24pt
   numa faixa de 23,3 cm. Daí os tetos: acima disso o texto sai do slide.
   O limite do campo original é referência, não regra — o que manda é a linha
   caber. */
const TETO_POR_LINHA = {
  pratica: 15,     // 10,4 cm a 40pt
  dialogo: 50,     // 23,3 cm a 24pt
};

/* O que estoura uma caixa é a LINHA MAIS COMPRIDA, não a soma nem a
   comparação linha a linha com o original. Numa caixa de quatro linhas, a
   quarta pode crescer à vontade desde que não passe da mais longa que já
   coube ali — foi o que aconteceu no primeiro Buddy Talks gerado, onde a
   conferência ingênua acusou uma linha de 22 caracteres numa caixa que já
   segurava 31. */
function larguraDaCaixa(id) {
  const prefixo = id.replace(/-p\d+$/, "");
  return Math.max(
    ...Object.keys(LIMITES)
      .filter((k) => k.replace(/-p\d+$/, "") === prefixo)
      .map((k) => LIMITES[k])
  );
}

function conferirTamanhos(textos) {
  const avisos = [];
  Object.keys(textos).forEach((id) => {
    const valor = String(textos[id] || "");
    if (/^s9-/.test(id)) {
      if (valor.length > TETO_POR_LINHA.pratica) {
        avisos.push(`${id}: ${valor.length} caracteres na lista de palavras (teto ${TETO_POR_LINHA.pratica}) — "${valor}"`);
      }
      return;
    }
    if (/^s(11|13|14|15)-/.test(id)) {
      if (valor.length > TETO_POR_LINHA.dialogo) {
        avisos.push(`${id}: ${valor.length} caracteres no diálogo (teto ${TETO_POR_LINHA.dialogo}) — "${valor}"`);
      }
      return;
    }
    const largura = larguraDaCaixa(id);
    if (largura && valor.length > largura * 1.1) {
      avisos.push(`${id}: linha de ${valor.length} caracteres numa caixa que comportava ${largura} — "${valor}"`);
    }
  });
  return avisos;
}

/* ─────────────────────────────────────────────────────────────────────
   O BASIC E O TEMA DA LIÇÃO  (21/08/2026)

   Pergunta do Pedro, e ela é boa: o áudio vem dos Transitions, e o tema da
   lição costuma ser conteúdo que o aluno de Basic ainda não viu — "networking"
   está no Transitions justamente por não ser assunto de Basic. Pular o tópico
   para o Basic? Não.

   O que separa os níveis aqui não é o SOM, é o ASSUNTO. A pronúncia é a mesma
   para todo mundo, e o Basic é quem mais precisa dela, porque é onde o vício
   se instala. Quem desce de nível é o enquadramento: o tema da lição entra
   pela PORTA CONCRETA, com o núcleo humano dele e sem a abstração.

     "Why is networking important?" (rede de contatos profissional)
        → Basic: as pessoas com quem você fala, quem você liga, quem te ajuda
     "Do you have any vacancies?" (hospedagem, direções, convicção)
        → Basic: a sua casa e a sua rua, uma viagem simples
     "Out of hand" (vícios)
        → Basic: hábitos e tempo de tela

   É a mesma regra que já governa a faixa etária no Conversation Maker: o tema
   não é trocado nem suavizado, ele ganha outro ponto de entrada.

   Duas consequências práticas para escrever o conteúdo do Basic:
     • a gramática das PERGUNTAS fica em A1/A2 (presente e passado simples),
       mesmo quando o tópico de pronúncia é de um livro mais adiantado;
     • quando a própria estrutura é de nível mais alto (as tag questions, por
       exemplo), ela vem PRONTA na pergunta. O aluno de Basic repete e usa a
       estrutura; não é ele quem a monta.
   ──────────────────────────────────────────────────────────────────── */

/* O TEMA DA CONVERSA NA CAPA (21/08/2026, pedido do Pedro: "pro prof saber").
   A capa tinha duas linhas — o subtítulo e o título — e ganha uma terceira,
   clonada do subtítulo para herdar fonte, cor e alinhamento. É a informação
   que o professor precisa antes de dar a aula: sobre o que a turma vai
   conversar depois da parte de pronúncia. */
function linhaDoTemaNaCapa(conteudo) {
  if (!conteudo.temaDaConversa) return [];
  return [{ modelo: "s1-f7-p0", texto: "Conversation: " + conteudo.temaDaConversa }];
}

module.exports = {
  MOLDE_ORIGINAL, SLIDE_DO_AUDIO, SLIDE_DOS_DIALOGOS, SLIDES_DE_CONVERSA, PERGUNTAS_POR_SLIDE,
  mapearConteudo, conferirTamanhos, linhaDoTemaNaCapa, LIMITES, TETO_POR_LINHA,
};
