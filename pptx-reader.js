/* ============================================================
   Leitor de .pptx NO NAVEGADOR — extrai só o TEXTO dos slides.
   ------------------------------------------------------------
   Usado pelo modo em que a atividade subida vira MATÉRIA-PRIMA: a IA lê o
   texto e escreve uma aula nova no template FISK. Quando o professor
   prefere manter o design do arquivo dele, quem trabalha é o
   pptx-rewriter.js, que reescreve dentro do próprio arquivo.

   Por que no navegador e não no servidor: um .pptx com imagens passa
   fácil dos 4,5 MB que as funções da Vercel aceitam no corpo da
   requisição. Extraindo aqui, sobe só o texto (alguns KB) — e o arquivo
   do professor nunca sai da máquina dele.

   O ZIP e a varredura do XML vivem no pptx-rewriter.js, que é carregado
   antes deste arquivo. Já existiram DUAS implementações de leitura de ZIP
   aqui dentro, uma em cada arquivo, o que é o começo conhecido de toda
   dessincronização: uma ganha um conserto (ZIP64, "data descriptor",
   comentário no fim) e a outra não. Agora existe uma só.

   O que se PERDE neste modo: imagens, layout, formatação, animações. Só o
   texto é aproveitado — o que basta, porque a aula é reescrita pela IA e
   renderizada no template FISK pelo pptx-builder.js.
   ============================================================ */

(function (raiz, fabrica) {
  var R = typeof module === "object" && module.exports
    ? require("./pptx-rewriter.js")
    : raiz.PptxRewriter;
  var api = fabrica(R);
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.pptxLerArquivo = api.pptxLerArquivo;
})(typeof self !== "undefined" ? self : this, function (R) {
  "use strict";

  /**
   * Lê um File/Blob .pptx e devolve { slides:[{numero,texto}], texto, palavras }.
   * `texto` já vem com marcação de slide, que é o que vai para o prompt.
   * Lança Error com mensagem em português se o arquivo não servir.
   */
  async function pptxLerArquivo(file, opts) {
    opts = opts || {};
    var limiteChars = opts.limiteChars || 12000;

    var buffer = await file.arrayBuffer();
    var estrutura = await R.lerPptx(buffer);

    // Um parágrafo por linha, para o texto não virar sopa de palavras. Vem
    // de graça a exclusão do que não é conteúdo: número de slide (campo
    // automático) e legenda de imagem ficam de fora, porque a varredura do
    // pptx-rewriter.js já não os considera texto do slide.
    var out = [];
    estrutura.slides.forEach(function (slide) {
      var linhas = [];
      slide.formas.forEach(function (forma) {
        forma.paragrafos.forEach(function (p) {
          var linha = p.texto.replace(/\s+/g, " ").trim();
          if (linha) linhas.push(linha);
        });
      });
      if (linhas.length) out.push({ numero: slide.numero, texto: linhas.join("\n") });
    });

    if (!out.length) throw new Error("os slides deste arquivo não têm texto. Só imagens não dá para aproveitar");

    var texto = out.map(function (s) { return "[Slide " + s.numero + "]\n" + s.texto; }).join("\n\n");
    var truncado = false;
    if (texto.length > limiteChars) { texto = texto.slice(0, limiteChars); truncado = true; }

    return {
      slides: out,
      texto: texto,
      truncado: truncado,
      palavras: texto.split(/\s+/).filter(Boolean).length,
    };
  }

  return { pptxLerArquivo: pptxLerArquivo };
});
