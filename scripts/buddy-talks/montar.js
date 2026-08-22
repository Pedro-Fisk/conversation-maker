/*
 * montar.js — produz os arquivos .pptx de um Buddy Talks, um por nível.
 *
 *     node scripts/buddy-talks/montar.js final-ed [pasta-de-saida]
 *     node scripts/buddy-talks/montar.js todos    [pasta-de-saida]
 *
 * Isto NÃO é uma ferramenta para o professor: é produção. O Pedro decidiu em
 * 21/08/2026 que os Buddy Talks são feitos uma vez só, numa leva, e depois a
 * série está fechada — então não há interface, login nem crédito no caminho.
 * Roda aqui, lê o molde e os áudios do Drive, e escreve os arquivos prontos.
 *
 * Cada arquivo sai com o áudio da lição JÁ EMBUTIDO e tocável no slide do
 * "LET'S PRACTICE! (1)" (ver pptx-rewriter.js).
 */

const fs = require("fs");
const path = require("path");
const R = require("../../pptx-rewriter.js");
const C = require("../../buddy-catalog.js");
const {
  MOLDE_ORIGINAL, SLIDE_DO_AUDIO, SLIDE_DOS_DIALOGOS, SLIDES_DE_CONVERSA, PERGUNTAS_POR_SLIDE,
  mapearConteudo, conferirTamanhos, linhaDoTemaNaCapa,
} = require("./molde.js");

const DRIVE_RECURSOS =
  "/Users/pedroluz/Library/CloudStorage/GoogleDrive-pedro.diretor@fiskpersonalizado.com/Shared drives/" +
  C.RAIZ_AUDIO + "/";

const ICONE = path.join(__dirname, "../../assets/audio-icon.png");

const ORDEM_NIVEIS = ["BASIC", "INTERMEDIATE", "ADVANCED"];

/* O molde é o Buddy Talks de "consonant + vowel linking", e ele traz 25 arcos
   azuis desenhados por baixo das palavras para mostrar a ligação entre elas.
   São perfeitos ali e sem sentido em qualquer outro tópico: embaixo de uma
   lista de verbos no passado viram rabisco. Não são texto, então a reescrita
   não os tocaria — some só removendo. */
function formaDecorativaDoLinking(f) {
  return f.geometria === "blockArc";
}

function paraArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/* O título da atividade vira nome de arquivo, e alguns têm barra ("AND / OF"),
   que o sistema de arquivos lê como pasta. Some também o que o Windows recusa,
   já que estes arquivos vão para o Drive e são abertos em qualquer máquina. */
function limparNome(texto) {
  return String(texto)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nomeDoArquivo(conteudo, nivel, topico) {
  const numero = String(topico.licao).padStart(2, "0");
  const livro = C.LIVROS[topico.livro].label.replace(/\s/g, "");
  const titulo = limparNome(conteudo.niveis[nivel].titulo);
  return `Buddy Talks - ${titulo} - ${livro} L${numero} - ${nivel}.pptx`;
}

async function montarUm(conteudo, nivel, opcoes) {
  const topico = C.TOPICOS.find(
    (t) => t.livro === conteudo.topicoCatalogo.livro && t.licao === conteudo.topicoCatalogo.licao
  );
  if (!topico) throw new Error("tópico não está no catálogo: " + conteudo.chave);

  const dados = conteudo.niveis[nivel];
  if (!dados) throw new Error(`${conteudo.chave} não tem conteúdo para ${nivel}`);

  // A referência do livro sai do catálogo, não do texto escrito à mão: é o
  // ponto em que um erro de digitação mandaria o professor à página errada.
  const textos = mapearConteudo({ ...dados, referenciaLivro: C.referenciaDoLivro(topico) });

  const avisos = conferirTamanhos(textos);
  avisos.forEach((a) => console.warn("   ⚠️  " + a));

  const caminhoAudio = DRIVE_RECURSOS + C.caminhoDoAudio(topico, 0);
  if (!fs.existsSync(caminhoAudio)) throw new Error("áudio não encontrado: " + caminhoAudio);

  /* O selo do nível na capa foi desenhado para "ALL LEVELS" (10 letras) e é
     uma faixa vertical estreita: "INTERMEDIATE" quebrava em duas linhas, o
     que se via na capa. Em vez de abreviar a palavra, o selo encolhe a fonte
     na proporção do que sobra. Medido no arquivo: 20pt para 10 letras. */
  const fontes = {};
  const letras = String(dados.nivel || "").length;
  if (letras > 10) fontes["s1-f8-p0"] = Math.max(12, Math.round(20 * (10 / letras)));

  /* Duas passadas, e a ordem importa: primeiro o arquivo CRESCE (as cópias do
     slide de diálogos viram os slides de conversação), depois ele é lido de
     novo e os textos entram. Fazer o contrário escreveria nos slides antes de
     eles existirem. */
  const copias = await R.duplicarSlide(paraArrayBuffer(fs.readFileSync(MOLDE_ORIGINAL)), {
    origem: SLIDE_DOS_DIALOGOS,
    quantidade: SLIDES_DE_CONVERSA.length,
  });
  const esperados = SLIDES_DE_CONVERSA.join(",");
  if (copias.numeros.join(",") !== esperados) {
    throw new Error(`as cópias saíram como ${copias.numeros.join(",")} e o molde espera ${esperados}`);
  }

  const molde = await R.lerPptx(copias.bytes.buffer.slice(copias.bytes.byteOffset, copias.bytes.byteOffset + copias.bytes.byteLength));
  const resultado = await R.reescreverPptx(molde, textos, {
    slide: SLIDE_DO_AUDIO,
    mp3: new Uint8Array(fs.readFileSync(caminhoAudio)),
    icone: new Uint8Array(fs.readFileSync(ICONE)),
    rotulo: `Saying it right — ${topico.topico}`,
  }, fontes, formaDecorativaDoLinking, linhaDoTemaNaCapa(dados));

  const saida = path.join(opcoes.pasta, nomeDoArquivo(conteudo, nivel, topico));
  fs.writeFileSync(saida, Buffer.from(resultado.bytes));
  return {
    arquivo: saida,
    trocados: resultado.trocados,
    mb: (resultado.bytes.length / 1024 / 1024).toFixed(1),
    avisos: avisos.length,
    removidas: resultado.formasRemovidas,
  };
}

async function main() {
  const alvo = process.argv[2];
  const pasta = process.argv[3] || path.join(__dirname, "saida");
  if (!alvo) {
    console.error("uso: node scripts/buddy-talks/montar.js <chave-do-conteudo|todos> [pasta]");
    process.exit(1);
  }
  fs.mkdirSync(pasta, { recursive: true });

  const chaves = alvo === "todos"
    ? fs.readdirSync(path.join(__dirname, "conteudo")).filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, ""))
    : [alvo];

  for (const chave of chaves) {
    const conteudo = require(path.join(__dirname, "conteudo", chave + ".js"));
    console.log(`\n▶ ${chave}`);
    for (const nivel of ORDEM_NIVEIS) {
      const r = await montarUm(conteudo, nivel, { pasta });
      console.log(`   ✓ ${path.basename(r.arquivo)}  (${r.trocados} textos, ${r.removidas} arcos removidos, ${r.mb} MB${r.avisos ? ", " + r.avisos + " aviso(s)" : ""})`);
    }
  }
  console.log("\npasta:", pasta);
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
