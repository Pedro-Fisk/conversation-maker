/* ============================================================
   Leitor de .pptx NO NAVEGADOR — extrai só o TEXTO dos slides.
   ------------------------------------------------------------
   Por que no navegador e não no servidor: um .pptx com imagens passa
   fácil dos 4,5 MB que as funções da Vercel aceitam no corpo da
   requisição. Extraindo aqui, sobe só o texto (alguns KB) — e o
   arquivo do professor nunca sai da máquina dele.

   Por que sem biblioteca: um .pptx é um ZIP de XMLs, e o Chrome tem
   DecompressionStream('deflate-raw') nativo. Então dá para ler o ZIP
   na mão e inflar os slides sem adicionar dependência nenhuma.

   O que se PERDE: imagens, layout, formatação, animações. Só o texto
   é recuperável — o que basta, porque a aula é reescrita pela IA e
   renderizada no template FISK pelo pptx-builder.
   ============================================================ */

/* ---- ZIP: lê o diretório central e extrai uma entrada por nome ---- */

function pptxLerUint32(dv, off) { return dv.getUint32(off, true); }
function pptxLerUint16(dv, off) { return dv.getUint16(off, true); }

/**
 * Lista as entradas do ZIP a partir do End Of Central Directory.
 * Devolve [{ nome, metodo, tamanhoComprimido, offsetLocal }].
 */
function pptxListarEntradas(buffer) {
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // EOCD (assinatura 0x06054b50) fica no fim; o comentário final pode
  // empurrá-lo para trás, então varremos de trás para frente.
  let eocd = -1;
  const minimo = Math.max(0, bytes.length - 66000);
  for (let i = bytes.length - 22; i >= minimo; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("arquivo não parece ser um .pptx (ZIP inválido)");

  const total = pptxLerUint16(dv, eocd + 10);
  let off = pptxLerUint32(dv, eocd + 16);   // início do diretório central
  const entradas = [];
  const dec = new TextDecoder();

  for (let i = 0; i < total; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;   // assinatura de entrada
    const metodo = pptxLerUint16(dv, off + 10);
    const tamanhoComprimido = pptxLerUint32(dv, off + 20);
    const tamNome = pptxLerUint16(dv, off + 28);
    const tamExtra = pptxLerUint16(dv, off + 30);
    const tamComentario = pptxLerUint16(dv, off + 32);
    const offsetLocal = pptxLerUint32(dv, off + 42);
    const nome = dec.decode(bytes.subarray(off + 46, off + 46 + tamNome));
    entradas.push({ nome, metodo, tamanhoComprimido, offsetLocal });
    off += 46 + tamNome + tamExtra + tamComentario;
  }
  return entradas;
}

/** Extrai UMA entrada do ZIP como texto (inflando se preciso). */
async function pptxExtrairTexto(buffer, entrada) {
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const lh = entrada.offsetLocal;
  if (dv.getUint32(lh, true) !== 0x04034b50) throw new Error("cabeçalho local inválido em " + entrada.nome);
  // o cabeçalho local repete nome e extra, com tamanhos próprios
  const tamNome = pptxLerUint16(dv, lh + 26);
  const tamExtra = pptxLerUint16(dv, lh + 28);
  const inicio = lh + 30 + tamNome + tamExtra;
  const dados = bytes.subarray(inicio, inicio + entrada.tamanhoComprimido);

  if (entrada.metodo === 0) return new TextDecoder().decode(dados);   // sem compressão
  if (entrada.metodo !== 8) throw new Error("compressão não suportada (" + entrada.metodo + ") em " + entrada.nome);

  const stream = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

/* ---- PPTX: texto dos slides, na ordem ---- */

/** slide12.xml → 12, para ordenar numericamente (e não "slide10" antes de "slide2"). */
function pptxNumeroDoSlide(nome) {
  const m = nome.match(/slide(\d+)\.xml$/i);
  return m ? +m[1] : 0;
}

/**
 * Junta o texto de um slide. Os runs de texto do OOXML são <a:t>; cada
 * parágrafo é <a:p>, então quebramos linha por parágrafo para o texto
 * não virar uma sopa de palavras.
 */
function pptxTextoDoSlideXml(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return "";
  const paragrafos = doc.getElementsByTagName("a:p");
  const linhas = [];
  for (let i = 0; i < paragrafos.length; i++) {
    const runs = paragrafos[i].getElementsByTagName("a:t");
    let linha = "";
    for (let j = 0; j < runs.length; j++) linha += runs[j].textContent || "";
    linha = linha.replace(/\s+/g, " ").trim();
    if (linha) linhas.push(linha);
  }
  return linhas.join("\n");
}

/**
 * Lê um File/Blob .pptx e devolve { slides:[{numero,texto}], texto, palavras }.
 * `texto` já vem com marcação de slide, que é o que vai para o prompt.
 * Lança Error com mensagem em português se o arquivo não servir.
 */
async function pptxLerArquivo(file, opts) {
  opts = opts || {};
  const limiteChars = opts.limiteChars || 12000;

  const buffer = await file.arrayBuffer();
  const entradas = pptxListarEntradas(buffer);
  const slides = entradas
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.nome))
    .sort((a, b) => pptxNumeroDoSlide(a.nome) - pptxNumeroDoSlide(b.nome));

  if (!slides.length) throw new Error("não encontrei slides neste arquivo. Ele é um.pptx mesmo?");

  const out = [];
  for (const entrada of slides) {
    const xml = await pptxExtrairTexto(buffer, entrada);
    const texto = pptxTextoDoSlideXml(xml);
    if (texto) out.push({ numero: pptxNumeroDoSlide(entrada.nome), texto });
  }

  if (!out.length) throw new Error("os slides deste arquivo não têm texto. Só imagens não dá para aproveitar");

  let texto = out.map((s) => "[Slide " + s.numero + "]\n" + s.texto).join("\n\n");
  let truncado = false;
  if (texto.length > limiteChars) { texto = texto.slice(0, limiteChars); truncado = true; }

  return {
    slides: out,
    texto,
    truncado,
    palavras: texto.split(/\s+/).filter(Boolean).length,
  };
}
