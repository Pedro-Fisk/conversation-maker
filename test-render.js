/* Gera as prévias HTML locais (sem gastar crédito de API).
 *
 *     node test-render.js
 *
 * Sai um arquivo por idioma, porque os dois precisam ser olhados: o inglês
 * cobre o caso comum, e o espanhol cobre os textos fixos do template (que
 * saíam em inglês até 21/08/2026) e o pior caso de largura de palavra.
 */
const fs = require("fs");
const path = require("path");
const { buildSlidesHtml, usarFundosPorUrl } = require("./render-slides-html");

// node test-render.js --leve  → arquivos pequenos, fundos por URL, para
// conferir na tela pelo servidor local (o padrão é autocontido)
const leve = process.argv.includes("--leve");
usarFundosPorUrl(leve);

[
  { arquivo: leve ? "preview-leve.html" : "preview.html", aula: require("./test-render-lesson.js") },
  { arquivo: leve ? "preview-es-leve.html" : "preview-es.html", aula: require("./test-render-lesson-es.js") },
].forEach(({ arquivo, aula }) => {
  const html = buildSlidesHtml(aula);
  const outPath = path.join(__dirname, arquivo);
  fs.writeFileSync(outPath, html);
  console.log("Written to", outPath, html.length, "bytes");
});
