/* Duas famílias de bug que voltam CALADAS, e por isso têm teste:
 *
 * 1. TEXTO FIXO EM INGLÊS NUMA AULA DE ESPANHOL.
 *    Até 21/08/2026 o selo da capa, os divisores, a agenda e o fecho estavam
 *    escritos em inglês direto no slide-layouts.js. O professor de espanhol
 *    corrigia na mão toda vez. Nada quebra quando isso acontece: a aula gera,
 *    o arquivo baixa, e só quem lê o slide percebe. Basta alguém acrescentar
 *    um texto fixo novo sem o par em espanhol para o problema voltar — é
 *    exatamente isso que o primeiro bloco abaixo pega.
 *
 * 2. TEXTO ESTOURANDO A CAIXA.
 *    Caixa de tamanho fixo com conteúdo de tamanho variável. Medido antes da
 *    correção: o slide de vocabulário pedia 977px numa caixa de 793px. Também
 *    não quebra nada: sai no .pptx com a palavra pela metade fora do slide.
 *
 *     node test-espanhol-e-caixas.js
 */
const { LAYOUTS, CANVAS_W, CANVAS_H } = require("./slide-layouts");
const {
  buildDynamicValue,
  textoEstatico,
  fonteDoCampo,
  fonteDaLista,
  fonteDoBlocoQa,
  fonteDoVocabulario,
  alturaDeTexto,
} = require("./lesson-data");
const { buildUserPrompt, primeiroEmoji } = require("./lesson-generation");
const { buildSlidesHtml } = require("./render-slides-html");

const aulaEs = require("./test-render-lesson-es.js");
const aulaEn = require("./test-render-lesson.js");

let ok = 0, falhou = 0;
function t(nome, cond) {
  console.log(cond ? "✓" : "✗", nome);
  cond ? ok++ : falhou++;
}

const todosOsCampos = LAYOUTS.flatMap((l) => l.fields);
const caixaPx = (f) => ({
  largura: (f.width / 100) * CANVAS_W,
  altura: (f.height / 100) * CANVAS_H,
});

/* ── 1. todo texto fixo tem par em espanhol ────────────────────────── */

const fixos = todosOsCampos.filter((f) => f.kind === "static" || f.kind === "badge");
const semTraducao = fixos.filter((f) => !f.valueEs).map((f) => f.value);
t(`todos os ${fixos.length} textos fixos do template têm valueEs` +
  (semTraducao.length ? ` (faltam: ${semTraducao.join(", ")})` : ""),
  semTraducao.length === 0);

t("textoEstatico devolve espanhol na aula de espanhol",
  fixos.every((f) => textoEstatico(f, aulaEs) === f.valueEs));
t("textoEstatico devolve inglês na aula de inglês",
  fixos.every((f) => textoEstatico(f, aulaEn) === f.value));

/* ── 2. a aula de espanhol renderizada não tem sobra de inglês ─────── */

const htmlEs = buildSlidesHtml(aulaEs);
// Só o miolo dos slides: o <head> tem CSS e comentários em inglês que não
// aparecem para ninguém.
const textoVisivelEs = htmlEs
  .slice(htmlEs.indexOf("<body>"))
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

[
  "CONVERSATION",
  "VOCABULARY",
  "LANGUAGE GAME",
  "EVALUATION",
  "INTRODUCTION",
  "GOALS",
  "See you next class",
  "Conversation about",
  "Vocabulary & Introduction",
  "Game & Evaluation",
  "STRUCTURE OF THE ACTIVITY",
].forEach((ingles) => {
  t(`aula de espanhol não mostra "${ingles}"`, !textoVisivelEs.includes(ingles));
});

t("a capa da aula de espanhol mostra o nível em espanhol (Intermedio)",
  buildDynamicValue(aulaEs, "coverLevel") === "Intermedio");
t("o rótulo interno do nível NÃO muda (é ele que nomeia o arquivo)",
  aulaEs.coverLevel === "Intermediário");
t("a agenda do espanhol diz 'Conversación sobre'",
  buildDynamicValue(aulaEs, "agendaTopicLine").startsWith("Conversación sobre"));

/* O prompt é a outra metade do problema: os campos que ele não listava
   saíam em inglês por omissão (título da capa, introdução, dinâmica extra). */
const promptEs = buildUserPrompt({
  language: "spanish", topic: "viajar", level: "spanish_basic", ageGroup: "adults", sources: [],
});
t("o prompt do espanhol manda escrever TODO campo em espanhol",
  /write EVERY text field in SPANISH/.test(promptEs));
["coverTitle", "introText", "extraActivityTitle"].forEach((campo) => {
  t(`o prompt do espanhol cita ${campo} explicitamente`, promptEs.includes(campo));
});
t("a tradução do vocabulário continua sendo em português",
  /translation" field, which must be in BRAZILIAN PORTUGUESE/.test(promptEs));
t("aula de inglês não recebe a regra do espanhol",
  !/write EVERY text field in SPANISH/.test(
    buildUserPrompt({ language: "english", topic: "travel", level: "basic", ageGroup: "adults", sources: [] })
  ));

/* ── 3. nada estoura a caixa ───────────────────────────────────────── */

[["espanhol", aulaEs], ["inglês", aulaEn]].forEach(([idioma, aula]) => {
  // introdução: o pior caso permitido pelo prompt são 100 palavras
  const campoIntro = todosOsCampos.find((f) => f.key === "introText");
  const cxIntro = caixaPx(campoIntro);
  const tamIntro = fonteDoCampo(campoIntro, aula.introText, cxIntro.largura, cxIntro.altura);
  t(`introdução (${idioma}) cabe na caixa`,
    alturaDeTexto(aula.introText, cxIntro.largura, tamIntro, campoIntro.lineHeight) <= cxIntro.altura);
  t(`introdução (${idioma}) ficou MAIOR que os 38px antigos`, tamIntro > 38);

  // vocabulário: era aqui que transbordava
  const campoVoc = todosOsCampos.find((f) => f.key === "vocabulary");
  const cxVoc = caixaPx(campoVoc);
  const tamVoc = fonteDoVocabulario(campoVoc, aula.vocabulary, cxVoc.largura, cxVoc.altura);
  t(`vocabulário (${idioma}) fica dentro dos limites do template`,
    tamVoc <= campoVoc.fit.max && tamVoc >= campoVoc.fit.min);

  // objetivos e todos os blocos de perguntas
  const campoObj = todosOsCampos.find((f) => f.key === "objectives" && f.list);
  const cxObj = caixaPx(campoObj);
  const tamObj = fonteDaLista(campoObj, aula.objectives, cxObj.largura, cxObj.altura);
  t(`objetivos (${idioma}) dentro dos limites`,
    tamObj <= campoObj.fit.max && tamObj >= campoObj.fit.min);

  todosOsCampos.filter((f) => f.kind === "qaBlock").forEach((f, i) => {
    const itens = (aula[f.group] || []).slice(f.startIndex, f.startIndex + f.count);
    const cx = caixaPx(f);
    const tam = fonteDoBlocoQa(f, itens, cx.largura, cx.altura);
    t(`bloco ${f.group} #${i + 1} (${idioma}) dentro dos limites`,
      tam <= f.fit.max && tam >= f.fit.min);
  });
});

// A palavra grande é o ponto do slide de vocabulário; se um par comprido
// derrubasse a fonte para o piso, o slide voltaria a ficar feio.
const campoVoc = todosOsCampos.find((f) => f.key === "vocabulary");
const cxVoc = caixaPx(campoVoc);
const vocabComprido = [
  { word: "responsabilidad", translation: "responsabilidade" },
  { word: "el desplazamiento", translation: "o deslocamento" },
  { word: "muchedumbre", translation: "multidão" },
  { word: "acostumbrarse", translation: "acostumar-se" },
  { word: "entretenimiento", translation: "entretenimento" },
  { word: "electrodoméstico", translation: "eletrodoméstico" },
  { word: "estacionamiento", translation: "estacionamento" },
  { word: "acondicionamiento", translation: "condicionamento" },
];
t("vocabulário com os pares mais compridos ainda sai legível (acima de 50px)",
  fonteDoVocabulario(campoVoc, vocabComprido, cxVoc.largura, cxVoc.altura) > 50);

/* ── 4. emoji ──────────────────────────────────────────────────────── */

t("emoji: aceita um emoji simples", primeiroEmoji("🗾") === "🗾");
t("emoji: corta o texto que vem junto", primeiroEmoji("🗾 Japan") === "🗾");
t("emoji: recusa texto sem emoji na frente", primeiroEmoji("emoji: 🗾") === "");
t("emoji: recusa palavra solta", primeiroEmoji("Japan") === "");
t("emoji: mantém inteiro o emoji de dois code points", primeiroEmoji("🏙️") === "🏙️");
t("emoji: guarda só o primeiro quando vêm dois", primeiroEmoji("🎲🎯") === "🎲");

t("o título da capa sai com o emoji na frente",
  buildDynamicValue(aulaEs, "coverTitle") === "🌮 " + aulaEs.coverTitle);
t("o título da capa SEM emoji não ganha espaço perdido",
  buildDynamicValue({ ...aulaEs, coverEmoji: "" }, "coverTitle") === aulaEs.coverTitle);
t("o divisor de objetivos leva o emoji da seção",
  buildDynamicValue(aulaEs, "objectivesDividerTitle") === "🎯 OBJETIVOS");
t("sem sectionEmojis, o divisor cai no emoji da capa",
  buildDynamicValue({ ...aulaEs, sectionEmojis: {} }, "objectivesDividerTitle") === "🌮 OBJETIVOS");
t("aula antiga (sem emoji nenhum) continua renderizando",
  buildDynamicValue({ ...aulaEs, sectionEmojis: undefined, coverEmoji: undefined }, "objectivesDividerTitle") === "OBJETIVOS");

// O emoji NÃO pode entrar no coverTitle: o nome do arquivo baixado sai dele.
t("o emoji fica fora de lesson.coverTitle", !/\p{Extended_Pictographic}/u.test(aulaEs.coverTitle));

console.log(`\n${ok} ok, ${falhou} falharam`);
process.exit(falhou ? 1 : 0);
