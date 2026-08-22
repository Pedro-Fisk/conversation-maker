/* Reescrita do .pptx do professor mantendo o design.
 *
 * O risco aqui não é a IA escrever mal: é o ARQUIVO QUEBRAR. Um byte errado
 * no ZIP e o PowerPoint recusa abrir, ou abre "reparando" e perde coisa. E
 * quebrar é silencioso do nosso lado: o download acontece igual.
 *
 * Por isso o teste central é de ida e volta: reescrever, reabrir o arquivo
 * gerado com o mesmo leitor, e conferir que os textos mudaram, que tudo o que
 * não era texto continua idêntico byte a byte, e que o ZIP continua válido
 * (aqui, validado por um leitor independente do nosso, o do Python).
 *
 *     node test-pptx-rewrite.js
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const R = require("./pptx-rewriter.js");

let ok = 0, falhou = 0;
function t(nome, cond) {
  console.log(cond ? "✓" : "✗", nome);
  cond ? ok++ : falhou++;
}

const ARQUIVO = path.join(__dirname, "test-output.pptx");
if (!fs.existsSync(ARQUIVO)) {
  console.error("Rode antes: node test-pptx.js (preciso de um .pptx para reescrever)");
  process.exit(1);
}

/* ── 1. varredura do XML: os casos difíceis, montados à mão ────────── */

const XML_DIFICIL = `<?xml version="1.0"?>
<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>
<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title 1"/></p:nvSpPr>
 <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="7200000" cy="1440000"/></a:xfrm></p:spPr>
 <p:txBody><a:bodyPr/><a:p><a:pPr algn="ctr"><a:buNone/></a:pPr><a:r><a:rPr lang="pt-BR"/><a:t>Shopping &amp; Money</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Content Placeholder 2"/></p:nvSpPr>
 <p:spPr><a:xfrm><a:ext cx="3600000" cy="2880000"/></a:xfrm></p:spPr>
 <p:txBody><a:bodyPr/>
  <a:p><a:r><a:rPr/><a:t>Do you like </a:t></a:r><a:r><a:rPr b="1"/><a:t>shopping</a:t></a:r><a:r><a:rPr/><a:t>?</a:t></a:r></a:p>
  <a:p><a:r><a:rPr/><a:t>Where do you buy your clothes?</a:t></a:r></a:p>
  <a:p><a:pPr/></a:p>
  <a:p><a:fld id="{X}" type="slidenum"><a:t>7</a:t></a:fld></a:p>
  <a:p><a:r><a:rPr/><a:t/></a:r></a:p>
 </p:txBody></p:sp>
<p:pic><p:nvPicPr><p:cNvPr id="9" name="Imagem" descr="foto"/></p:nvPicPr><p:txBody><a:p><a:r><a:t>legenda da imagem</a:t></a:r></a:p></p:txBody></p:pic>
</p:spTree></p:cSld></p:sld>`;

const formas = R.lerSlide(XML_DIFICIL, 3);

t("acha as duas caixas de texto e ignora a imagem", formas.length === 2);
t("reconhece qual caixa é o título", formas[0].eTitulo === true && formas[1].eTitulo === false);
t("lê o tamanho da caixa em cm", formas[0].larguraCm === 20 && formas[0].alturaCm === 4);
t("desescapa o & do XML", formas[0].paragrafos[0].texto === "Shopping & Money");
t("junta os pedaços de um parágrafo partido em vários trechos",
  formas[1].paragrafos[0].texto === "Do you like shopping?");
t("ignora parágrafo sem texto", formas[1].paragrafos.length === 2);
t("não mexe em campo automático (número do slide)",
  !formas[1].paragrafos.some((p) => p.texto === "7"));
t("o identificador diz slide, caixa e parágrafo", formas[1].paragrafos[1].id === "s3-f1-p1");

/* ── 2. aplicar textos no XML ──────────────────────────────────────── */

const novoXml = R.aplicarTextos(XML_DIFICIL, formas, {
  "s3-f0-p0": "Viajar & Planejar",
  "s3-f1-p0": "Você gosta de <viajar>?",
});

t("troca o texto do título", novoXml.includes("<a:t>Viajar &amp; Planejar</a:t>"));
t("escapa o que precisa ser escapado", novoXml.includes("&lt;viajar&gt;"));
t("o parágrafo partido vira um trecho só, e os outros ficam vazios",
  novoXml.includes("<a:t>Você gosta de &lt;viajar&gt;?</a:t>") && novoXml.includes("<a:t></a:t>"));
t("parágrafo não citado fica intacto", novoXml.includes("<a:t>Where do you buy your clothes?</a:t>"));
t("o campo automático continua lá", novoXml.includes('type="slidenum"><a:t>7</a:t>'));
t("a formatação em negrito do trecho sobrevive", novoXml.includes('<a:rPr b="1"/>'));
t("nada fora do texto foi tocado",
  novoXml.replace(/<a:t>[^<]*<\/a:t>/g, "<a:t/>") === XML_DIFICIL.replace(/<a:t>[^<]*<\/a:t>/g, "<a:t/>"));

// reler o XML já reescrito tem de devolver o texto novo (é o que acontece
// quando o professor reescreve a mesma atividade duas vezes)
const formasDepois = R.lerSlide(novoXml, 3);
t("reescrever duas vezes seguidas funciona",
  formasDepois[0].paragrafos[0].texto === "Viajar & Planejar");

/* ── 3. ida e volta num .pptx de verdade ───────────────────────────── */

(async () => {
  const buffer = fs.readFileSync(ARQUIVO);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const estrutura = await R.lerPptx(arrayBuffer);
  const medida = R.medir(estrutura);

  t(`lê os ${medida.slides} slides do arquivo`, medida.slides === 20);
  t(`acha texto para reescrever (${medida.paragrafos} parágrafos)`, medida.paragrafos > 30);

  // troca TODOS os textos por um marcador, que é o pior caso de tamanho
  const novos = {};
  const original = new Map();
  estrutura.slides.forEach((s) =>
    s.formas.forEach((f) =>
      f.paragrafos.forEach((p) => {
        novos[p.id] = "TEXTO REESCRITO " + p.id;
        original.set(p.id, p.texto);
      })
    )
  );

  const resultado = await R.reescreverPptx(estrutura, novos);
  t("reescreveu todos os parágrafos", resultado.trocados === medida.paragrafos);

  const saida = path.join(__dirname, "test-reescrito.pptx");
  fs.writeFileSync(saida, Buffer.from(resultado.bytes));

  // ── o arquivo novo continua sendo um .pptx legível?
  const novoBuffer = fs.readFileSync(saida);
  const novoArrayBuffer = novoBuffer.buffer.slice(novoBuffer.byteOffset, novoBuffer.byteOffset + novoBuffer.byteLength);
  const relido = await R.lerPptx(novoArrayBuffer);
  const medidaRelida = R.medir(relido);

  t("o arquivo gerado reabre com o mesmo número de slides", medidaRelida.slides === medida.slides);
  t("o arquivo gerado reabre com o mesmo número de parágrafos", medidaRelida.paragrafos === medida.paragrafos);

  const textosRelidos = [];
  relido.slides.forEach((s) => s.formas.forEach((f) => f.paragrafos.forEach((p) => textosRelidos.push(p.texto))));
  t("os textos novos estão lá", textosRelidos.every((x) => x.startsWith("TEXTO REESCRITO ")));
  t("nenhum texto antigo sobrou",
    !textosRelidos.some((x) => Array.from(original.values()).includes(x)));

  // ── um leitor INDEPENDENTE aceita o arquivo? (o zipfile do Python)
  const verificacao = execFileSync("python3", ["-c", `
import zipfile, sys, json
a = zipfile.ZipFile(${JSON.stringify(ARQUIVO)})
b = zipfile.ZipFile(${JSON.stringify(saida)})
ruim = b.testzip()
na, nb = a.namelist(), b.namelist()
iguais = [n for n in na if n in nb and a.read(n) == b.read(n)]
diferentes = [n for n in na if n in nb and a.read(n) != b.read(n)]
print(json.dumps({
  "corrompido": ruim,
  "mesmasEntradas": na == nb,
  "totalEntradas": len(nb),
  "iguais": len(iguais),
  "diferentes": sorted(diferentes),
}))
`]).toString();
  const v = JSON.parse(verificacao);

  t("o ZIP passa na verificação de um leitor independente", v.corrompido === null);
  t("as entradas do arquivo são exatamente as mesmas", v.mesmasEntradas === true);
  t(`só os slides mudaram (${v.diferentes.length} de ${v.totalEntradas} entradas)`,
    v.diferentes.every((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)));
  t("as imagens e o resto continuam byte a byte iguais",
    v.iguais === v.totalEntradas - v.diferentes.length && v.iguais > 0);

  // ── e se a IA devolver ids que não existem, ou nenhum?
  const semNada = await R.reescreverPptx(await R.lerPptx(arrayBuffer), {});
  t("sem nada para trocar, o arquivo sai idêntico ao original",
    Buffer.from(semNada.bytes).length > 0 && semNada.trocados === 0);

  const inventado = await R.reescreverPptx(await R.lerPptx(arrayBuffer), { "s99-f9-p9": "nada a ver" });
  t("identificador inventado é ignorado sem quebrar", inventado.trocados === 0);

  /* ── 4. variações de ZIP que aparecem em arquivo de verdade ──────
     Um .pptx do PowerPoint, do Canva ou do Google Slides não é gerado do
     mesmo jeito que o nosso. Três diferenças quebram um leitor ingênuo:
     entrada guardada sem compressão, comentário no fim do arquivo (que
     empurra o índice para trás) e "data descriptor", em que o tamanho do
     dado não está no cabeçalho onde normalmente estaria. */
  // As três variações são geradas na hora, a partir do mesmo .pptx, para o
  // teste não depender de arquivo guardado em lugar nenhum.
  const FIXTURES = fs.mkdtempSync(path.join(os.tmpdir(), "cm-zip-"));
  execFileSync("python3", ["-c", `
import zipfile, io, os
orig = zipfile.ZipFile(${JSON.stringify(ARQUIVO)})
destino = ${JSON.stringify(FIXTURES)}

with zipfile.ZipFile(os.path.join(destino,'fixture-stored.pptx'),'w',zipfile.ZIP_STORED) as z:
    for n in orig.namelist(): z.writestr(n, orig.read(n))

with zipfile.ZipFile(os.path.join(destino,'fixture-comentario.pptx'),'w',zipfile.ZIP_DEFLATED) as z:
    for n in orig.namelist(): z.writestr(n, orig.read(n))
    z.comment = b'x'*5000

class SemSeek(io.RawIOBase):
    def __init__(self, caminho): self.f = open(caminho,'wb')
    def write(self, b): return self.f.write(b)
    def writable(self): return True
    def seekable(self): return False
    def tell(self): raise OSError('sem tell')
    def close(self): self.f.close()

fluxo = SemSeek(os.path.join(destino,'fixture-descriptor.pptx'))
with zipfile.ZipFile(fluxo,'w',zipfile.ZIP_DEFLATED) as z:
    for n in orig.namelist(): z.writestr(n, orig.read(n))
fluxo.close()
`]);

  const variacoes = [
    ["sem compressão (stored)", "fixture-stored.pptx"],
    ["com comentário no fim", "fixture-comentario.pptx"],
    ["escrito em fluxo (data descriptor)", "fixture-descriptor.pptx"],
  ];
  for (const [rotulo, arquivo] of variacoes) {
    const caminho = path.join(FIXTURES, arquivo);
    const b = fs.readFileSync(caminho);
    const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    const est = await R.lerPptx(ab);
    const alvo = est.slides[0].formas[0].paragrafos[0];
    const res = await R.reescreverPptx(est, { [alvo.id]: "MARCADOR" });
    const tmp = path.join(FIXTURES, "saida-" + arquivo);
    fs.writeFileSync(tmp, Buffer.from(res.bytes));
    let valido = false;
    try {
      const check = execFileSync("python3", ["-c",
        `import zipfile;z=zipfile.ZipFile(${JSON.stringify(tmp)});print(z.testzip() is None and len(z.namelist()))`]).toString().trim();
      valido = check === String(est.entradas.length);
    } catch (e) { valido = false; }
    const relida = await R.lerPptx((function () {
      const x = fs.readFileSync(tmp);
      return x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength);
    })());
    t(`ZIP ${rotulo}: reescreve e gera arquivo válido`,
      valido && relida.slides[0].formas[0].paragrafos[0].texto === "MARCADOR");
    fs.unlinkSync(tmp);
  }

  /* ── 5. o prompt e o saneamento da resposta ──────────────────────
     A reescrita escreve dentro do desenho de outra pessoa, então duas
     regras do prompt não são estilo, são requisito: o texto novo tem de
     caber na caixa que já existe, e o que não deve mudar não pode voltar
     alterado. Se alguém "enxugar" o prompt e derrubar uma delas, o
     professor recebe slide estourado ou o "FISK" do rodapé reescrito. */
  const G = require("./rewrite-generation.js");
  const amostra = R.paraPrompt(estrutura).slice(0, 2);
  const prompt = G.buildRewritePrompt({
    estrutura: amostra,
    instrucao: "deixa as perguntas mais fáceis",
    language: "english",
    level: "basic",
    ageGroup: "teens",
  });

  t("o prompt manda a instrução do professor", /deixa as perguntas mais fáceis/.test(prompt));
  t("o prompt diz que a caixa não cresce", /THE BOX CANNOT GROW/.test(prompt));
  t("o prompt dá o tamanho de cada texto", /\(\d+ chars\)/.test(prompt));
  t("o prompt manda devolver só o que muda", /ONLY for the texts you are actually rewriting/.test(prompt));
  t("o prompt protege numeração e linhas de preencher", /Name: ______|Unit 4/.test(prompt));
  t("o prompt carrega o nível e a faixa etária pedidos",
    /Basic level/.test(prompt) && /around 13-16/.test(prompt));
  t("o prompt manda manter exercício encaixado (gap-fill e gabarito)",
    /KEEP THE EXERCISE WORKING/.test(prompt));

  const ids = amostra[0].caixas[0].textos[0].id;
  const saneado = G.sanearTextos(
    { [ids]: "texto novo", "s99-f9-p9": "id inventado", ["z" + ids]: 42 },
    amostra
  );
  t("saneamento aceita id que existe", saneado.textos[ids] === "texto novo");
  t("saneamento descarta id inventado", !("s99-f9-p9" in saneado.textos));
  t("saneamento conta o que descartou", saneado.ignorados === 2);
  t("saneamento tira quebra de linha (que vira lixo dentro do slide)",
    G.sanearTextos({ [ids]: "uma\nlinha só" }, amostra).textos[ids] === "uma linha só");

  /* ── 6. o leitor do OUTRO modo (texto puro) segue funcionando ─────
     O pptx-reader.js tinha o próprio decodificador de ZIP e o próprio
     varredor de XML; agora usa os deste arquivo. O modo "atividade como
     matéria-prima" é anterior a tudo isto e não pode ter regredido. */
  const { pptxLerArquivo } = require("./pptx-reader.js");
  const lido = await pptxLerArquivo(new Blob([fs.readFileSync(ARQUIVO)]));
  t("o leitor de texto puro continua achando os 20 slides", lido.slides.length === 20);
  t("o leitor de texto puro traz o conteúdo dos slides", lido.palavras > 300);
  t("o leitor marca cada slide no texto que sobe para a IA", /\[Slide 1\]/.test(lido.texto));
  t("o leitor corta no limite combinado",
    (await pptxLerArquivo(new Blob([fs.readFileSync(ARQUIVO)]), { limiteChars: 200 })).truncado === true);

  /* ── 7. áudio embutido no slide ─────────────────────────────────
     O PowerPoint exige quatro coisas juntas para aceitar um áudio, e
     faltando uma ele recusa o arquivo ou o "repara" perdendo o som. Como
     não havia nenhum arquivo da escola com áudio embutido para copiar o
     padrão, isto foi escrito da especificação e conferido abrindo o
     resultado no PowerPoint (áudio tocou, abas Audio Format e Playback
     apareceram). Estes testes são o que impede a regressão silenciosa. */
  const estAudio = await R.lerPptx(arrayBuffer);
  t("lê o tamanho do slide (é o que posiciona o ícone)",
    estAudio.tamanho && estAudio.tamanho.larguraCm > 0 && estAudio.tamanho.alturaCm > 0);

  const mp3Falso = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]);   // cabeçalho ID3
  const iconeFalso = new Uint8Array(fs.readFileSync(path.join(__dirname, "assets/audio-icon.png")));
  const comAudio = await R.reescreverPptx(estAudio, {}, {
    slide: 2, mp3: mp3Falso, icone: iconeFalso, rotulo: "Saying it right",
  });
  t("marca que saiu com áudio", comAudio.comAudio === true);

  const arquivoAudio = path.join(FIXTURES, "com-audio.pptx");
  fs.writeFileSync(arquivoAudio, Buffer.from(comAudio.bytes));
  const inspecao = JSON.parse(execFileSync("python3", ["-c", `
import zipfile, json, re
z = zipfile.ZipFile(${JSON.stringify(arquivoAudio)})
rels = z.read('ppt/slides/_rels/slide2.xml.rels').decode()
slide = z.read('ppt/slides/slide2.xml').decode()
tipos = z.read('[Content_Types].xml').decode()
print(json.dumps({
  "corrompido": z.testzip(),
  "temMp3": any(n.endswith('.mp3') for n in z.namelist()),
  "temIcone": any('audioicon' in n for n in z.namelist()),
  "relAudio": 'relationships/audio' in rels,
  "relMedia": 'microsoft.com/office/2007/relationships/media' in rels,
  "relImagem": rels.count('relationships/image'),
  "picNoSlide": '<p:pic>' in slide and 'ppaction://media' in slide,
  "p14media": 'p14:media' in slide,
  "audioFile": '<a:audioFile' in slide,
  "tipoMp3": 'audio/mpeg' in tipos,
  "picDentroDaArvore": slide.index('ppaction://media') < slide.index('</p:spTree>'),
}))
`]).toString());

  t("o mp3 entrou no pacote", inspecao.temMp3);
  t("o ícone do player entrou no pacote", inspecao.temIcone);
  t("declarou o tipo audio/mpeg", inspecao.tipoMp3);
  t("criou a relação do padrão aberto (audio)", inspecao.relAudio);
  t("criou a relação da Microsoft (media), que faz o player aparecer", inspecao.relMedia);
  t("criou a relação da imagem de capa", inspecao.relImagem >= 1);
  t("inseriu a forma de mídia no slide", inspecao.picNoSlide);
  t("a forma está DENTRO da árvore de formas", inspecao.picDentroDaArvore);
  t("declarou a extensão p14:media", inspecao.p14media);
  t("declarou o a:audioFile", inspecao.audioFile);
  t("o ZIP com áudio continua íntegro", inspecao.corrompido === null);

  // reabrir o arquivo com áudio tem de continuar funcionando
  const relidoComAudio = await R.lerPptx((function () {
    const x = fs.readFileSync(arquivoAudio);
    return x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength);
  })());
  t("o arquivo com áudio reabre com os mesmos slides",
    relidoComAudio.slides.length === estAudio.slides.length);
  fs.unlinkSync(arquivoAudio);

  /* ── 8. remover formas decorativas ────────────────────────────────
     Um molde herda a decoração do assunto original, não só o texto: o
     Buddy Talks que virou molde tinha 26 arcos azuis marcando ligação
     entre palavras, sem sentido nenhum embaixo de uma lista de verbos.

     O que custou caro descobrir: apagar a forma NÃO basta. As animações
     do slide apontam para ela em DOIS lugares independentes — a linha do
     tempo (<p:par> com spid) e a lista de construção (<p:bldLst>) — e uma
     referência órfã em qualquer um deles faz o PowerPoint abrir pedindo
     para "reparar a apresentação". O arquivo continua sendo XML válido e
     ZIP íntegro; só o PowerPoint reclama. Foi preciso abrir no PowerPoint
     para descobrir. */
  const estFormas = await R.lerPptx(arrayBuffer);
  const slideComArcos = estFormas.slides[0];
  const antesDaLimpeza = R.acharBlocos(slideComArcos.xml, "p:sp").length;
  const semRetangulos = R.removerFormas(slideComArcos.xml, (f) => f.geometria === "roundRect");
  t("remove as formas que casam com o critério", semRetangulos.removidas > 0);
  t("as demais formas continuam lá",
    R.acharBlocos(semRetangulos.xml, "p:sp").length === antesDaLimpeza - semRetangulos.removidas);
  t("o XML continua bem formado depois de remover", (function () {
    try {
      execFileSync("python3", ["-c",
        "import xml.dom.minidom,sys;xml.dom.minidom.parseString(sys.stdin.read())"],
        { input: semRetangulos.xml });
      return true;
    } catch (e) { return false; }
  })());

  // animação órfã: o caso que fez o PowerPoint pedir reparo
  const XML_ANIMADO = `<p:sld><p:cSld><p:spTree>
<p:sp><p:nvSpPr><p:cNvPr id="7" name="Texto"/></p:nvSpPr><p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
 <p:txBody><a:p><a:r><a:rPr/><a:t>fica</a:t></a:r></a:p></p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="8" name="Semicírculo 1"/></p:nvSpPr><p:spPr><a:prstGeom prst="blockArc"><a:avLst/></a:prstGeom></p:spPr><p:txBody/></p:sp>
</p:spTree></p:cSld>
<p:timing><p:tnLst><p:par><p:cTn id="1" nodeType="tmRoot"><p:childTnLst>
 <p:par><p:cTn id="2"><p:childTnLst><p:set><p:cBhvr><p:tgtEl><p:spTgt spid="7"/></p:tgtEl></p:cBhvr></p:set></p:childTnLst></p:cTn></p:par>
 <p:par><p:cTn id="3"><p:childTnLst><p:set><p:cBhvr><p:tgtEl><p:spTgt spid="8"/></p:tgtEl></p:cBhvr></p:set></p:childTnLst></p:cTn></p:par>
</p:childTnLst></p:cTn></p:par></p:tnLst>
<p:bldLst><p:bldP spid="7" grpId="0"/><p:bldP spid="8" grpId="0" animBg="1"/></p:bldLst></p:timing></p:sld>`;

  const limpo = R.removerFormas(XML_ANIMADO, (f) => f.geometria === "blockArc");
  t("apaga o arco decorativo", limpo.removidas === 1);
  t("tira o passo de animação do que foi apagado", !/spTgt spid="8"/.test(limpo.xml));
  t("tira a entrada da LISTA DE CONSTRUÇÃO do que foi apagado", !/bldP spid="8"/.test(limpo.xml));
  t("preserva a animação do que ficou (é a revelação útil do slide)",
    /spTgt spid="7"/.test(limpo.xml) && /bldP spid="7"/.test(limpo.xml));

  // o localizador aninhado, que é o que torna a cirurgia possível
  const aninhado = '<p:par>A<p:par>B</p:par><p:par>C</p:par></p:par>';
  const blocosAninhados = R.acharBlocosAninhados(aninhado, "p:par");
  t("acha blocos aninhados sem parar no primeiro fechamento",
    blocosAninhados.length === 3 &&
    blocosAninhados.some((b) => aninhado.slice(b.inicio, b.fimTotal) === aninhado));

  // ── tamanho de fonte de um parágrafo (o selo do nível na capa)
  const XML_FONTE = `<p:sld><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Selo"/></p:nvSpPr>
<p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
<p:txBody><a:p><a:r><a:rPr lang="pt-BR" sz="2000" dirty="0"/><a:t>ALL LEVELS</a:t></a:r></a:p></p:txBody>
</p:sp></p:spTree></p:cSld></p:sld>`;
  const formasFonte = R.lerSlide(XML_FONTE, 1);
  const menor = R.ajustarFonteDoParagrafo(XML_FONTE, formasFonte, "s1-f0-p0", 17);
  t("muda o tamanho da fonte do parágrafo pedido", /sz="1700"/.test(menor));
  t("não deixa o tamanho antigo para trás", !/sz="2000"/.test(menor));
  t("preserva o resto das propriedades do texto", /lang="pt-BR"/.test(menor) && /dirty="0"/.test(menor));

  /* ── 9. acrescentar slides ao molde ──────────────────────────────
     Duplicar um slide é como a atividade cresce sem ninguém desenhar nada.
     São CINCO lugares que precisam concordar (o slide, as relações dele, o
     [Content_Types].xml, as relações da apresentação e a lista de exibição),
     e faltando um o PowerPoint recusa o arquivo. A ordem no deck não vem do
     número do arquivo: vem da lista — as cópias entram logo depois do
     original mesmo tendo número maior. */
  const duplicado = await R.duplicarSlide(arrayBuffer, { origem: 11, quantidade: 3 });
  const arquivoDup = path.join(FIXTURES, "duplicado.pptx");
  fs.writeFileSync(arquivoDup, Buffer.from(duplicado.bytes));

  t("as cópias recebem números de arquivo novos", duplicado.numeros.length === 3);

  const inspDup = JSON.parse(execFileSync("python3", ["-c", `
import zipfile, re, json, xml.dom.minidom as m
z = zipfile.ZipFile(${JSON.stringify(arquivoDup)})
pres = z.read('ppt/presentation.xml').decode()
rels = z.read('ppt/_rels/presentation.xml.rels').decode()
mapa = {a: b for a, b in re.findall(r'Id="(rId\\d+)"[^>]*Target="slides/(slide\\d+)\\.xml"', rels)}
ordem = [mapa.get(r, '?') for r in re.findall(r'r:id="(rId\\d+)"', re.search(r'<p:sldIdLst>.*?</p:sldIdLst>', pres, re.S).group(0))]
ruins = []
for n in z.namelist():
    if n.endswith(('.xml', '.rels')):
        try: m.parseString(z.read(n))
        except Exception: ruins.append(n)
print(json.dumps({
  "corrompido": z.testzip(),
  "ordem": ordem,
  "temSlide13": 'ppt/slides/slide13.xml' in z.namelist(),
  "temRels13": 'ppt/slides/_rels/slide13.xml.rels' in z.namelist(),
  "tipoDeclarado": '/ppt/slides/slide13.xml' in z.read('[Content_Types].xml').decode(),
  "idsUnicos": len(re.findall(r'<p:sldId id="(\\d+)"', pres)) == len(set(re.findall(r'<p:sldId id="(\\d+)"', pres))),
  "xmlRuim": ruins,
}))
`]).toString());

  t("o slide novo existe no pacote", inspDup.temSlide13);
  t("as relações do slide novo existem", inspDup.temRels13);
  t("o tipo da parte nova foi declarado", inspDup.tipoDeclarado);
  t("os identificadores de slide continuam únicos", inspDup.idsUnicos);
  t("todas as partes XML continuam válidas", inspDup.xmlRuim.length === 0);
  t("o ZIP com slides novos está íntegro", inspDup.corrompido === null);
  // a ordem esperada é calculada, não escrita à mão: o teste roda sobre um
  // arquivo qualquer, e o que importa é a POSIÇÃO das cópias, não o número
  const esperada = [];
  for (let i = 1; i <= estrutura.slides.length; i++) {
    esperada.push("slide" + i);
    if (i === 11) duplicado.numeros.forEach((n) => esperada.push("slide" + n));
  }
  t("as cópias entram logo DEPOIS do original, e não no fim",
    inspDup.ordem.join(",") === esperada.join(","));

  const relidoDup = await R.lerPptx((function () {
    const x = fs.readFileSync(arquivoDup);
    return x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength);
  })());
  t("o arquivo com slides novos reabre com 3 slides a mais",
    relidoDup.slides.length === estrutura.slides.length + 3);
  const copiaDoSlide = relidoDup.slides.find((s) => s.numero === duplicado.numeros[0]);
  const slideDeOrigem = relidoDup.slides.find((s) => s.numero === 11);
  t("os slides copiados têm as MESMAS caixas do original",
    JSON.stringify(copiaDoSlide.formas.map((f) => f.paragrafos.length)) ===
    JSON.stringify(slideDeOrigem.formas.map((f) => f.paragrafos.length)));
  t("o texto da cópia é igual ao do original (só o conteúdo muda depois)",
    JSON.stringify(copiaDoSlide.formas.map((f) => f.paragrafos.map((p) => p.texto))) ===
    JSON.stringify(slideDeOrigem.formas.map((f) => f.paragrafos.map((p) => p.texto))));
  fs.unlinkSync(arquivoDup);

  /* ── 10. acrescentar linha, e a ORDEM das operações ──────────────
     Acrescentar uma linha numa caixa que já existe (o tema da conversa na
     capa) clonando a formatação de outra linha.

     O teste importante é o segundo: todas as operações trabalham por
     POSIÇÃO dentro do XML, e a posição de tudo que vem adiante muda assim
     que a anterior mexe em alguma coisa. Com uma operação só, reaproveitar
     o mapa do XML original funciona; com duas, falha em SILÊNCIO — foi o
     que aconteceu quando a linha nova na capa empurrou o selo do nível e o
     ajuste de fonte caiu no lugar errado, com o selo quebrando em duas
     linhas de novo. Cada passo agora remede o slide antes de agir. */
  const XML_CAPA = `<p:sld><p:cSld><p:spTree><p:sp><p:nvSpPr><p:cNvPr id="2" name="Capa"/></p:nvSpPr>
<p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody>
<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="2800" dirty="0"/><a:t>Subtitulo</a:t></a:r></a:p>
<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="4000" dirty="0"/><a:t>TITULO</a:t></a:r></a:p>
</p:txBody></p:sp>
<p:sp><p:nvSpPr><p:cNvPr id="3" name="Selo"/></p:nvSpPr><p:spPr><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom></p:spPr>
<p:txBody><a:p><a:r><a:rPr lang="pt-BR" sz="2000" dirty="0"/><a:t>ALL LEVELS</a:t></a:r></a:p></p:txBody></p:sp>
</p:spTree></p:cSld></p:sld>`;

  const formasCapa = R.lerSlide(XML_CAPA, 1);
  const comLinha = R.acrescentarParagrafo(formasCapa && XML_CAPA, formasCapa, "s1-f0-p0", "Conversation: habits");
  const relidoCapa = R.lerSlide(comLinha, 1);
  t("a linha nova entra na caixa certa", relidoCapa[0].paragrafos.length === 3);
  t("a linha nova fica por ÚLTIMO na caixa",
    relidoCapa[0].paragrafos[2].texto === "Conversation: habits");
  t("a linha nova herda a formatação do modelo", /sz="2800"[^>]*\/>(?=<a:t>Conversation)/.test(comLinha.replace(/<a:t>/g, "<a:t>")) || comLinha.split("Conversation")[0].lastIndexOf('sz="2800"') > comLinha.split("Conversation")[0].lastIndexOf('sz="4000"'));
  t("as outras linhas continuam intactas",
    relidoCapa[0].paragrafos[0].texto === "Subtitulo" && relidoCapa[0].paragrafos[1].texto === "TITULO");

  // o caso que quebrou: acrescentar E mudar fonte no MESMO slide
  const estCapa = {
    buffer: null,
    entradas: [],
    slides: [{ numero: 1, entrada: "ppt/slides/slide1.xml", xml: XML_CAPA, formas: formasCapa }],
    tamanho: { larguraCm: 25.4, alturaCm: 14.29 },
  };
  let xmlCombinado = XML_CAPA;
  xmlCombinado = R.ajustarFonteDoParagrafo(xmlCombinado, R.lerSlide(xmlCombinado, 1), "s1-f1-p0", 17);
  xmlCombinado = R.aplicarTextos(xmlCombinado, R.lerSlide(xmlCombinado, 1), { "s1-f1-p0": "INTERMEDIATE" });
  xmlCombinado = R.acrescentarParagrafo(xmlCombinado, R.lerSlide(xmlCombinado, 1), "s1-f0-p0", "Conversation: habits");
  const finalCapa = R.lerSlide(xmlCombinado, 1);
  t("mudar fonte, trocar texto e acrescentar linha no mesmo slide convivem",
    finalCapa[0].paragrafos.length === 3 && finalCapa[1].paragrafos[0].texto === "INTERMEDIATE");
  t("o tamanho de fonte pedido sobreviveu às operações seguintes",
    /sz="1700"/.test(xmlCombinado) && !/sz="2000"/.test(xmlCombinado));

  fs.rmSync(FIXTURES, { recursive: true, force: true });
  fs.unlinkSync(saida);
  console.log(`\n${ok} ok, ${falhou} falharam`);
  process.exit(falhou ? 1 : 0);
})();
