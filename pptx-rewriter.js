/* ============================================================
   Reescrita de um .pptx MANTENDO O DESIGN ORIGINAL.
   ------------------------------------------------------------
   A outra ponta do "subir uma atividade pronta": em vez de extrair o
   texto e montar uma aula nova no template FISK (pptx-reader.js +
   pptx-builder.js), aqui o arquivo DO PROFESSOR é devolvido com o
   design intacto e só os textos trocados.

   A decisão que faz isso funcionar é NÃO MAPEAR NADA. Não existe
   correspondência entre os slides dele e um molde nosso: cada caixa de
   texto que já está lá recebe um texto novo, no lugar onde ela já está.
   Por isso não importa quantos slides o arquivo tem, em que ordem, nem
   se a estrutura parece com a nossa. Imagens, cores, fontes, posições,
   animações e slides sem texto ficam byte a byte como estavam.

   Como: um .pptx é um ZIP de XMLs. Lemos o ZIP na mão (o Chrome tem
   DecompressionStream/CompressionStream nativos, o Node também), trocamos
   o conteúdo das marcações <a:t> dentro de ppt/slides/slideN.xml, e
   remontamos o ZIP copiando SEM RECOMPRIMIR toda entrada que não mudou.
   As imagens, que são o peso do arquivo, nem são descomprimidas.

   Por que trabalhar no texto do XML, e não num DOM: reserializar um DOM
   reescreve namespaces, atributos e espaços em branco do arquivo inteiro,
   e um .pptx do PowerPoint é exigente. Emendar só os trechos de texto
   mantém todo o resto idêntico. De quebra, sem DOMParser este arquivo
   roda igual no navegador e no Node, que é o que permite testá-lo.

   O arquivo do professor NÃO sai da máquina dele: só o texto sobe para a
   IA, e a montagem do arquivo novo acontece aqui mesmo.
   ============================================================ */

(function (raiz, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else raiz.PptxRewriter = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- CRC-32 (exigido pelo formato ZIP) ---------- */

  var TABELA_CRC = (function () {
    var tabela = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabela[i] = c >>> 0;
    }
    return tabela;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ---------- ZIP: leitura ---------- */

  var ASSINATURA_EOCD = 0x06054b50;
  var ASSINATURA_CENTRAL = 0x02014b50;
  var ASSINATURA_LOCAL = 0x04034b50;

  /**
   * Lê o diretório central e devolve todas as entradas, com o que é preciso
   * para copiá-las adiante sem recomprimir (crc, tamanhos, método, offset).
   */
  function lerEntradas(buffer) {
    var dv = new DataView(buffer);
    var bytes = new Uint8Array(buffer);

    // O EOCD fica no fim, mas um comentário final pode empurrá-lo para trás
    // (o comentário tem no máximo 65535 bytes), então varremos de trás.
    var eocd = -1;
    var minimo = Math.max(0, bytes.length - 66000);
    for (var i = bytes.length - 22; i >= minimo; i--) {
      if (dv.getUint32(i, true) === ASSINATURA_EOCD) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("este arquivo não é um .pptx válido (não achei a estrutura do ZIP)");

    var total = dv.getUint16(eocd + 10, true);
    var off = dv.getUint32(eocd + 16, true);
    if (off === 0xffffffff || total === 0xffff) {
      throw new Error("este .pptx usa ZIP64, um formato que ainda não sei reescrever");
    }

    var entradas = [];
    var dec = new TextDecoder();
    for (var n = 0; n < total; n++) {
      if (dv.getUint32(off, true) !== ASSINATURA_CENTRAL) break;
      var tamNome = dv.getUint16(off + 28, true);
      var tamExtra = dv.getUint16(off + 30, true);
      var tamComentario = dv.getUint16(off + 32, true);
      entradas.push({
        nome: dec.decode(bytes.subarray(off + 46, off + 46 + tamNome)),
        flags: dv.getUint16(off + 8, true),
        metodo: dv.getUint16(off + 10, true),
        hora: dv.getUint16(off + 12, true),
        data: dv.getUint16(off + 14, true),
        crc: dv.getUint32(off + 16, true),
        tamanhoComprimido: dv.getUint32(off + 20, true),
        tamanhoOriginal: dv.getUint32(off + 24, true),
        atributosExternos: dv.getUint32(off + 38, true),
        offsetLocal: dv.getUint32(off + 42, true),
      });
      off += 46 + tamNome + tamExtra + tamComentario;
    }
    if (!entradas.length) throw new Error("este .pptx está vazio ou corrompido");
    return entradas;
  }

  /** Bytes comprimidos crus de uma entrada, do jeito que estão no arquivo. */
  function bytesCrus(buffer, entrada) {
    var dv = new DataView(buffer);
    var bytes = new Uint8Array(buffer);
    if (dv.getUint32(entrada.offsetLocal, true) !== ASSINATURA_LOCAL) {
      throw new Error("cabeçalho danificado em " + entrada.nome);
    }
    // O cabeçalho local repete nome e extra, com tamanhos PRÓPRIOS: usar os do
    // diretório central aqui desalinha o começo dos dados em alguns arquivos.
    var tamNome = dv.getUint16(entrada.offsetLocal + 26, true);
    var tamExtra = dv.getUint16(entrada.offsetLocal + 28, true);
    var inicio = entrada.offsetLocal + 30 + tamNome + tamExtra;
    return bytes.subarray(inicio, inicio + entrada.tamanhoComprimido);
  }

  async function inflar(dados) {
    var fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  async function desinflar(dados) {
    var fluxo = new Blob([dados]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  /** Conteúdo de uma entrada como texto UTF-8. */
  async function lerTexto(buffer, entrada) {
    var dados = bytesCrus(buffer, entrada);
    if (entrada.metodo === 0) return new TextDecoder().decode(dados);
    if (entrada.metodo !== 8) throw new Error("compressão não suportada (" + entrada.metodo + ") em " + entrada.nome);
    return new TextDecoder().decode(await inflar(dados));
  }

  /* ---------- ZIP: escrita ---------- */

  function escreverUint32(destino, pos, valor) {
    destino[pos] = valor & 0xff;
    destino[pos + 1] = (valor >>> 8) & 0xff;
    destino[pos + 2] = (valor >>> 16) & 0xff;
    destino[pos + 3] = (valor >>> 24) & 0xff;
  }

  function escreverUint16(destino, pos, valor) {
    destino[pos] = valor & 0xff;
    destino[pos + 1] = (valor >>> 8) & 0xff;
  }

  /**
   * Remonta o ZIP na ordem original. `substituicoes` é um mapa
   * { nomeDaEntrada: string } com o conteúdo NOVO das entradas que mudaram;
   * todas as outras são copiadas como estão, ainda comprimidas — é o que
   * mantém as imagens intactas e a remontagem rápida.
   */
  async function remontarZip(buffer, entradas, substituicoes, novas) {
    var codificador = new TextEncoder();
    var pedacos = [];
    var registros = [];
    var posicao = 0;

    // Entradas novas (áudio, ícone) entram no fim, como qualquer arquivo que o
    // PowerPoint acrescentaria. A ordem dentro do ZIP não importa para ele; o
    // que importa é o diretório central bater com os cabeçalhos locais.
    var todas = entradas.concat(
      (novas || []).map(function (n) {
        return { nome: n.nome, nova: true, dados: n.dados, comprimir: n.comprimir !== false,
                 flags: 0, metodo: 8, hora: 0, data: 0, crc: 0,
                 tamanhoComprimido: 0, tamanhoOriginal: 0, atributosExternos: 0, offsetLocal: 0 };
      })
    );

    for (var i = 0; i < todas.length; i++) {
      var entrada = todas[i];
      var nomeBytes = codificador.encode(entrada.nome);
      var dados, crc, tamanhoOriginal, metodo;

      if (entrada.nova) {
        var bruto = entrada.dados;
        crc = crc32(bruto);
        tamanhoOriginal = bruto.length;
        // mp3 e png já são formatos comprimidos: deflacionar de novo só
        // gasta tempo e não encolhe nada, então entram como estão
        dados = entrada.comprimir ? await desinflar(bruto) : bruto;
        metodo = entrada.comprimir ? 8 : 0;
      } else if (Object.prototype.hasOwnProperty.call(substituicoes, entrada.nome)) {
        var cru = codificador.encode(substituicoes[entrada.nome]);
        crc = crc32(cru);
        tamanhoOriginal = cru.length;
        dados = await desinflar(cru);
        metodo = 8;
      } else {
        dados = bytesCrus(buffer, entrada);
        crc = entrada.crc;
        tamanhoOriginal = entrada.tamanhoOriginal;
        metodo = entrada.metodo;
      }

      // bit 3 zerado: os tamanhos vão no próprio cabeçalho, sem "data
      // descriptor" depois dos dados (que é o que alguns geradores usam)
      var flags = entrada.flags & ~0x08;

      var cabecalho = new Uint8Array(30 + nomeBytes.length);
      escreverUint32(cabecalho, 0, ASSINATURA_LOCAL);
      escreverUint16(cabecalho, 4, 20);            // versão mínima
      escreverUint16(cabecalho, 6, flags);
      escreverUint16(cabecalho, 8, metodo);
      escreverUint16(cabecalho, 10, entrada.hora);
      escreverUint16(cabecalho, 12, entrada.data);
      escreverUint32(cabecalho, 14, crc);
      escreverUint32(cabecalho, 18, dados.length);
      escreverUint32(cabecalho, 22, tamanhoOriginal);
      escreverUint16(cabecalho, 26, nomeBytes.length);
      escreverUint16(cabecalho, 28, 0);            // sem campo extra
      cabecalho.set(nomeBytes, 30);

      registros.push({
        nome: nomeBytes,
        flags: flags,
        metodo: metodo,
        hora: entrada.hora,
        data: entrada.data,
        crc: crc,
        tamanhoComprimido: dados.length,
        tamanhoOriginal: tamanhoOriginal,
        atributosExternos: entrada.atributosExternos,
        offset: posicao,
      });

      pedacos.push(cabecalho, dados);
      posicao += cabecalho.length + dados.length;
    }

    var inicioCentral = posicao;
    for (var j = 0; j < registros.length; j++) {
      var r = registros[j];
      var central = new Uint8Array(46 + r.nome.length);
      escreverUint32(central, 0, ASSINATURA_CENTRAL);
      escreverUint16(central, 4, 20);              // versão que criou
      escreverUint16(central, 6, 20);              // versão mínima
      escreverUint16(central, 8, r.flags);
      escreverUint16(central, 10, r.metodo);
      escreverUint16(central, 12, r.hora);
      escreverUint16(central, 14, r.data);
      escreverUint32(central, 16, r.crc);
      escreverUint32(central, 20, r.tamanhoComprimido);
      escreverUint32(central, 24, r.tamanhoOriginal);
      escreverUint16(central, 28, r.nome.length);
      escreverUint16(central, 30, 0);              // extra
      escreverUint16(central, 32, 0);              // comentário
      escreverUint16(central, 34, 0);              // disco
      escreverUint16(central, 36, 0);              // atributos internos
      escreverUint32(central, 38, r.atributosExternos);
      escreverUint32(central, 42, r.offset);
      central.set(r.nome, 46);
      pedacos.push(central);
      posicao += central.length;
    }

    var eocd = new Uint8Array(22);
    escreverUint32(eocd, 0, ASSINATURA_EOCD);
    escreverUint16(eocd, 4, 0);
    escreverUint16(eocd, 6, 0);
    escreverUint16(eocd, 8, registros.length);
    escreverUint16(eocd, 10, registros.length);
    escreverUint32(eocd, 12, posicao - inicioCentral);
    escreverUint32(eocd, 16, inicioCentral);
    escreverUint16(eocd, 20, 0);
    pedacos.push(eocd);

    var total = pedacos.reduce(function (soma, p) { return soma + p.length; }, 0);
    var saida = new Uint8Array(total);
    var cursor = 0;
    pedacos.forEach(function (p) { saida.set(p, cursor); cursor += p.length; });
    return saida;
  }

  /* ---------- XML: achar os textos ---------- */

  // Blocos de uma marcação que NÃO se aninha em si mesma (a:p, a:r, p:sp...).
  // Devolve as posições no texto do XML, que é o que permite emendar depois
  // sem reserializar nada.
  function acharBlocos(xml, tag, inicio, fim) {
    var abre = "<" + tag;
    var fecha = "</" + tag + ">";
    var blocos = [];
    var i = inicio || 0;
    var limite = fim == null ? xml.length : fim;
    while (i < limite) {
      var a = xml.indexOf(abre, i);
      if (a === -1 || a >= limite) break;
      // "<a:p" também casaria com "<a:pPr": o caractere seguinte tem de ser
      // fim da marcação ou espaço de atributo.
      var seguinte = xml.charAt(a + abre.length);
      if (seguinte !== ">" && seguinte !== " " && seguinte !== "/" && seguinte !== "\t" && seguinte !== "\n") {
        i = a + abre.length;
        continue;
      }
      var fimAbertura = xml.indexOf(">", a);
      if (fimAbertura === -1) break;
      if (xml.charAt(fimAbertura - 1) === "/") {   // marcação vazia <a:p/>
        i = fimAbertura + 1;
        continue;
      }
      var f = xml.indexOf(fecha, fimAbertura);
      if (f === -1 || f > limite) break;
      blocos.push({ inicio: a, conteudo: fimAbertura + 1, fim: f, fimTotal: f + fecha.length });
      i = f + fecha.length;
    }
    return blocos;
  }

  function atributo(trecho, nome) {
    var m = trecho.match(new RegExp(nome + '="([^"]*)"'));
    return m ? m[1] : "";
  }

  function desescapar(texto) {
    return String(texto)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCodePoint(+n); })
      .replace(/&amp;/g, "&");
  }

  function escapar(texto) {
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  var EMU_POR_CM = 360000;

  /**
   * Estrutura de texto de UM slide: formas (caixas de texto, tabelas) e,
   * dentro delas, parágrafos.
   *
   * O identificador de cada parágrafo carrega slide, forma e posição
   * (ex.: "s3-f1-p0"). É por ele que a resposta da IA volta a encontrar o
   * lugar exato — nada depende da ordem ou da contagem baterem.
   */
  function lerSlide(xml, numeroSlide) {
    var formas = [];
    // p:sp = caixa de texto/forma; p:graphicFrame = tabela e afins.
    // p:pic (imagem) fica de fora: o que houver de texto ali é legenda de
    // acessibilidade, não conteúdo do slide.
    ["p:sp", "p:graphicFrame"].forEach(function (tagForma) {
      acharBlocos(xml, tagForma).forEach(function (bloco) {
        var trecho = xml.slice(bloco.inicio, bloco.fimTotal);
        var cabecalho = trecho.slice(0, Math.min(trecho.length, 900));
        var nome = atributo(cabecalho, "name");
        var ext = cabecalho.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
        formas.push({
          inicioNoXml: bloco.inicio,
          nome: nome,
          // o nome da forma no PowerPoint costuma dizer o papel dela
          // ("Title 1", "Content Placeholder 2"), o que ajuda a IA a saber
          // se está reescrevendo um título ou um corpo de texto
          eTitulo: /title|titulo|título/i.test(nome),
          larguraCm: ext ? +(+ext[1] / EMU_POR_CM).toFixed(1) : null,
          alturaCm: ext ? +(+ext[2] / EMU_POR_CM).toFixed(1) : null,
          paragrafos: [],
          _inicio: bloco.conteudo,
          _fim: bloco.fim,
        });
      });
    });

    // Formas aninhadas (dentro de p:grpSp) apareceriam duas vezes; a de fora
    // engloba a de dentro, então basta descartar quem está contido em outra.
    formas = formas.filter(function (forma, i) {
      return !formas.some(function (outra, j) {
        return j !== i && outra._inicio < forma._inicio && forma._fim < outra._fim;
      });
    });
    formas.sort(function (a, b) { return a.inicioNoXml - b.inicioNoXml; });

    formas.forEach(function (forma, indiceForma) {
      acharBlocos(xml, "a:p", forma._inicio, forma._fim).forEach(function (paragrafo, indiceParagrafo) {
        // Só <a:r><a:t>: o <a:t> que vive dentro de <a:fld> é campo automático
        // (número do slide, data) e reescrevê-lo quebraria a numeração.
        var alvos = [];
        acharBlocos(xml, "a:r", paragrafo.conteudo, paragrafo.fim).forEach(function (run) {
          acharBlocos(xml, "a:t", run.conteudo, run.fim).forEach(function (t) {
            alvos.push({ inicio: t.conteudo, fim: t.fim });
          });
        });
        if (!alvos.length) return;   // parágrafo sem texto editável
        var texto = alvos.map(function (t) { return desescapar(xml.slice(t.inicio, t.fim)); }).join("");
        if (!texto.trim()) return;
        forma.paragrafos.push({
          id: "s" + numeroSlide + "-f" + indiceForma + "-p" + indiceParagrafo,
          texto: texto,
          alvos: alvos,
        });
      });
    });

    return formas.filter(function (f) { return f.paragrafos.length > 0; }).map(function (f) {
      return {
        nome: f.nome,
        eTitulo: f.eTitulo,
        larguraCm: f.larguraCm,
        alturaCm: f.alturaCm,
        paragrafos: f.paragrafos,
      };
    });
  }

  /**
   * Aplica os textos novos ao XML de um slide.
   * O parágrafo inteiro passa a viver no PRIMEIRO <a:t> dele, e os demais
   * ficam vazios: dentro de um mesmo parágrafo o PowerPoint quebra o texto em
   * vários trechos por motivos internos (correção ortográfica, um pedaço em
   * itálico, o idioma do run), e distribuir o texto novo entre eles seria
   * adivinhação. Assim a formatação preservada é a do primeiro trecho, que é
   * a que vale para a frase inteira em praticamente todo material real.
   */
  function aplicarTextos(xml, formas, novos) {
    var edicoes = [];
    formas.forEach(function (forma) {
      forma.paragrafos.forEach(function (paragrafo) {
        if (!Object.prototype.hasOwnProperty.call(novos, paragrafo.id)) return;
        var novoTexto = String(novos[paragrafo.id]);
        if (novoTexto === paragrafo.texto) return;
        paragrafo.alvos.forEach(function (alvo, i) {
          edicoes.push({ inicio: alvo.inicio, fim: alvo.fim, texto: i === 0 ? escapar(novoTexto) : "" });
        });
      });
    });
    // de trás para frente: emendar pelo começo moveria as posições seguintes
    edicoes.sort(function (a, b) { return b.inicio - a.inicio; });
    var saida = xml;
    edicoes.forEach(function (e) {
      saida = saida.slice(0, e.inicio) + e.texto + saida.slice(e.fim);
    });
    return saida;
  }

  /* ---------- ÁUDIO DENTRO DO SLIDE ----------
     Buddy Talks manda ouvir o áudio da lição do livro, e até aqui esse áudio
     era um .mp3 tocado por fora. Embutir no slide transforma a atividade num
     arquivo só.

     Não há atalho: o PowerPoint exige quatro coisas ao mesmo tempo, e faltando
     uma ele recusa o arquivo ou "repara" perdendo o som.
       1. o mp3 dentro do pacote (ppt/media/…);
       2. o tipo mp3 declarado no [Content_Types].xml;
       3. DUAS relações no slide apontando para ele: a do padrão aberto
          (relationships/audio) e a da Microsoft (2007/relationships/media),
          que é a que faz o player aparecer no PowerPoint moderno;
       4. uma forma <p:pic> com imagem de capa (o ícone), o hyperlink especial
          ppaction://media e a extensão p14:media.

     Nenhum arquivo da escola tinha áudio embutido para eu copiar o padrão,
     então isto foi escrito a partir da especificação e conferido abrindo o
     resultado no PowerPoint. */

  var EMU_POR_CM_ESCRITA = 360000;

  function proximoRelId(xmlRels) {
    var maior = 0;
    var re = /Id="rId(\d+)"/g;
    var m;
    while ((m = re.exec(xmlRels))) maior = Math.max(maior, +m[1]);
    return maior + 1;
  }

  function garantirTipoDeConteudo(xml, extensao, tipo) {
    if (new RegExp('Extension="' + extensao + '"', "i").test(xml)) return xml;
    return xml.replace("<Default", '<Default Extension="' + extensao + '" ContentType="' + tipo + '"/><Default');
  }

  /**
   * Acrescenta um áudio tocável a um slide. Devolve o que precisa ser escrito
   * no ZIP: entradas novas e XMLs alterados.
   *
   * `posicaoCm` é o canto e o tamanho do ícone no slide, em centímetros.
   */
  function montarAudioNoSlide(estrutura, opcoes) {
    var slide = estrutura.slides.filter(function (s) { return s.numero === opcoes.slide; })[0];
    if (!slide) throw new Error("slide " + opcoes.slide + " não existe neste arquivo");

    var sufixo = "buddy" + opcoes.slide;
    var nomeMp3 = "ppt/media/audio" + sufixo + ".mp3";
    var nomeIcone = "ppt/media/audioicon" + sufixo + ".png";
    var caminhoRels = "ppt/slides/_rels/slide" + opcoes.slide + ".xml.rels";

    var entradaRels = estrutura.entradas.filter(function (e) { return e.nome === caminhoRels; })[0];
    if (!entradaRels) throw new Error("não achei as relações do slide " + opcoes.slide);

    return {
      nomeMp3: nomeMp3,
      nomeIcone: nomeIcone,
      caminhoRels: caminhoRels,
      slide: slide,
      sufixo: sufixo,
    };
  }

  function aplicarRels(xmlRels, plano) {
    var base = proximoRelId(xmlRels);
    plano.idAudio = "rId" + base;
    plano.idMedia = "rId" + (base + 1);
    plano.idIcone = "rId" + (base + 2);
    var novas =
      '<Relationship Id="' + plano.idAudio + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio" Target="../media/' + plano.nomeMp3.split("/").pop() + '"/>' +
      '<Relationship Id="' + plano.idMedia + '" Type="http://schemas.microsoft.com/office/2007/relationships/media" Target="../media/' + plano.nomeMp3.split("/").pop() + '"/>' +
      '<Relationship Id="' + plano.idIcone + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/' + plano.nomeIcone.split("/").pop() + '"/>';
    return xmlRels.replace("</Relationships>", novas + "</Relationships>");
  }

  function aplicarPicDeAudio(xmlSlide, plano, posicaoCm, rotulo) {
    var x = Math.round((posicaoCm.x || 1) * EMU_POR_CM_ESCRITA);
    var y = Math.round((posicaoCm.y || 1) * EMU_POR_CM_ESCRITA);
    var cx = Math.round((posicaoCm.largura || 2.2) * EMU_POR_CM_ESCRITA);
    var cy = Math.round((posicaoCm.altura || 2.2) * EMU_POR_CM_ESCRITA);
    // id alto para não colidir com as formas que já existem no slide
    var pic =
      '<p:pic><p:nvPicPr><p:cNvPr id="9001" name="' + escapar(rotulo || "Audio") + '">' +
      '<a:hlinkClick xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="" action="ppaction://media"/>' +
      '</p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr>' +
      '<a:audioFile xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:link="' + plano.idAudio + '"/>' +
      '<p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DE7FCFB9230}">' +
      '<p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="' + plano.idMedia + '"/>' +
      '</p:ext></p:extLst></p:nvPr></p:nvPicPr>' +
      '<p:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="' + plano.idIcone + '"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>' +
      '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>';
    if (xmlSlide.indexOf("</p:spTree>") === -1) throw new Error("slide sem árvore de formas");
    return xmlSlide.replace("</p:spTree>", pic + "</p:spTree>");
  }

  /**
   * Muda o tamanho da fonte de um parágrafo, em pontos.
   *
   * Existe porque a caixa não cresce mas às vezes o texto tem de ser aquele:
   * o selo do nível do Buddy Talks foi desenhado para "ALL LEVELS" e
   * "INTERMEDIATE" quebrava em duas linhas. Trocar o texto sem poder tocar no
   * tamanho deixa a única saída ruim, que é abreviar a palavra.
   *
   * Mexe só no atributo sz dos runs daquele parágrafo; cor, fonte e todo o
   * resto continuam como estavam.
   */
  function ajustarFonteDoParagrafo(xml, formas, id, pontos) {
    var alvo = null;
    formas.forEach(function (forma) {
      forma.paragrafos.forEach(function (p) {
        if (p.id === id) alvo = p;
      });
    });
    if (!alvo) return xml;

    // limites do parágrafo: do começo do primeiro <a:t> até o fim do último
    var inicio = alvo.alvos[0].inicio;
    var fim = alvo.alvos[alvo.alvos.length - 1].fim;
    // as propriedades do run vêm ANTES do texto, então a busca começa antes
    var recuo = Math.max(0, inicio - 3000);
    var trecho = xml.slice(recuo, fim);
    var valor = Math.round(pontos * 100);

    var ajustado = trecho.replace(/<a:rPr([^>]*?)\/?>/g, function (tag, atributos) {
      // só os runs deste parágrafo (o recorte já garante isso)
      var fechamento = tag.slice(-2) === "/>" ? "/>" : ">";
      var limpos = atributos.replace(/\s*sz="\d+"/g, "");
      return "<a:rPr" + limpos + ' sz="' + valor + '"' + fechamento;
    });
    return xml.slice(0, recuo) + ajustado + xml.slice(fim);
  }

  /* Versão do acharBlocos que aguenta ANINHAMENTO. A marcação de animação
     (<p:par>) contém outras <p:par> dentro, então a busca linear pararia no
     primeiro fechamento e devolveria um pedaço pela metade. */
  function acharBlocosAninhados(xml, tag) {
    var abre = new RegExp("<" + tag.replace(":", "\\:") + "(?=[\\s/>])", "g");
    var fecha = "</" + tag + ">";
    var blocos = [];
    var pilha = [];
    var i = 0;
    while (i < xml.length) {
      abre.lastIndex = i;
      var m = abre.exec(xml);
      var proximoAbre = m ? m.index : -1;
      var proximoFecha = xml.indexOf(fecha, i);
      if (proximoAbre === -1 && proximoFecha === -1) break;

      if (proximoAbre !== -1 && (proximoFecha === -1 || proximoAbre < proximoFecha)) {
        var fimAbertura = xml.indexOf(">", proximoAbre);
        if (fimAbertura === -1) break;
        if (xml.charAt(fimAbertura - 1) === "/") { i = fimAbertura + 1; continue; }   // <p:par/>
        pilha.push(proximoAbre);
        i = fimAbertura + 1;
      } else {
        var inicio = pilha.pop();
        if (inicio != null) {
          blocos.push({ inicio: inicio, fimTotal: proximoFecha + fecha.length, profundidade: pilha.length });
        }
        i = proximoFecha + fecha.length;
      }
    }
    return blocos;
  }

  /**
   * Tira da linha do tempo os passos que animam formas que não existem mais.
   *
   * Sem isto, apagar uma forma animada deixa a animação apontando para o vazio
   * e o PowerPoint abre pedindo para "reparar a apresentação" — aconteceu no
   * primeiro Buddy Talks gerado, no slide dos diálogos.
   *
   * A animação daquele slide revela UM DIÁLOGO POR VEZ, o que é útil e tem de
   * sobreviver; só os passos dos arcos decorativos saem. Por isso a remoção é
   * cirúrgica, e não o descarte do bloco inteiro de animação.
   */
  function limparAnimacoes(xml, idsRemovidos) {
    if (!idsRemovidos.length || xml.indexOf("<p:timing>") === -1) return { xml: xml, removidos: 0 };
    var alvos = idsRemovidos.map(String);
    var removidos = 0;
    var saida = xml;

    // 1) os passos mais internos que apontam para uma forma apagada
    for (var volta = 0; volta < 40; volta++) {
      var blocos = acharBlocosAninhados(saida, "p:par");
      var alvo = null;
      for (var i = 0; i < blocos.length; i++) {
        var trecho = saida.slice(blocos[i].inicio, blocos[i].fimTotal);
        if (acharBlocosAninhados(trecho, "p:par").length > 1) continue;   // não é o mais interno
        var ids = (trecho.match(/spid="(\d+)"/g) || []).map(function (x) { return x.match(/\d+/)[0]; });
        if (ids.length && ids.every(function (id) { return alvos.indexOf(id) !== -1; })) {
          alvo = blocos[i];
          break;
        }
      }
      if (!alvo) break;
      saida = saida.slice(0, alvo.inicio) + saida.slice(alvo.fimTotal);
      removidos++;
    }

    /* 2) a LISTA DE CONSTRUÇÃO (<p:bldLst>), que é uma segunda lista de
       formas animadas, separada da linha do tempo. Foi ela que continuou
       apontando para os arcos apagados depois de eu limpar os passos — e
       um <p:bldP> órfão basta para o PowerPoint pedir reparo. */
    saida = saida.replace(/<p:bld(?:P|Graphic|OleChart|Dgm)\b[^>]*spid="(\d+)"[^>]*(?:\/>|>[\s\S]*?<\/p:bld(?:P|Graphic|OleChart|Dgm)>)/g,
      function (bloco, id) {
        return alvos.indexOf(String(id)) !== -1 ? "" : bloco;
      });
    saida = saida.replace(/<p:bldLst>\s*<\/p:bldLst>/g, "");

    // 3) os invólucros que ficaram sem nenhum passo dentro
    for (var v2 = 0; v2 < 40; v2++) {
      var vazios = acharBlocosAninhados(saida, "p:par").filter(function (b) {
        var t = saida.slice(b.inicio, b.fimTotal);
        return /<p:childTnLst\s*\/>|<p:childTnLst>\s*<\/p:childTnLst>/.test(t) && t.indexOf("spid=") === -1;
      });
      if (!vazios.length) break;
      var alvo2 = vazios[0];
      saida = saida.slice(0, alvo2.inicio) + saida.slice(alvo2.fimTotal);
    }

    return { xml: saida, removidos: removidos };
  }

  /**
   * Remove formas do slide segundo um critério.
   *
   * Necessário porque um molde herda a DECORAÇÃO do assunto original, não só o
   * texto. No Buddy Talks que virou molde havia 25 arcos azuis marcando a
   * ligação entre palavras — perfeitos para o tema "linking", sem sentido
   * nenhum embaixo de uma lista de verbos no passado. Isso não é texto e
   * portanto passa incólume pela reescrita: some só se for removido.
   *
   * `criterio({ tag, nome, geometria })` devolve true para o que deve sair.
   */
  function removerFormas(xml, criterio) {
    var cortes = [];
    var ids = [];
    ["p:sp", "p:cxnSp", "p:pic", "p:graphicFrame"].forEach(function (tag) {
      acharBlocos(xml, tag).forEach(function (bloco) {
        var trecho = xml.slice(bloco.inicio, bloco.fimTotal);
        var cabecalho = trecho.slice(0, 600);
        var nome = atributo(cabecalho, "name");
        var geometria = (trecho.match(/<a:prstGeom prst="([^"]+)"/) || [])[1] || "";
        if (criterio({ tag: tag, nome: nome, geometria: geometria })) {
          cortes.push({ inicio: bloco.inicio, fim: bloco.fimTotal });
          var id = (cabecalho.match(/<p:cNvPr id="(\d+)"/) || [])[1];
          if (id) ids.push(id);
        }
      });
    });
    // de trás para frente, senão o primeiro corte move as posições seguintes
    cortes.sort(function (a, b) { return b.inicio - a.inicio; });
    var saida = xml;
    cortes.forEach(function (c) { saida = saida.slice(0, c.inicio) + saida.slice(c.fim); });

    // a animação da forma apagada não pode ficar apontando para o vazio
    var limpeza = limparAnimacoes(saida, ids);
    return { xml: limpeza.xml, removidas: cortes.length, animacoesRemovidas: limpeza.removidos };
  }

  /**
   * Acrescenta uma LINHA nova numa caixa de texto que já existe, copiando a
   * formatação de uma linha que já está lá.
   *
   * Trocar texto é uma coisa; acrescentar é outra, e sem isto a única saída
   * seria roubar uma linha existente para escrever o que falta. O parágrafo
   * modelo é clonado inteiro (fonte, cor, alinhamento, espaçamento) e só o
   * texto muda — é o que faz a linha nova parecer que sempre esteve ali.
   */
  function acrescentarParagrafo(xml, formas, idModelo, texto) {
    var modelo = null;
    var caixa = null;
    formas.forEach(function (forma) {
      forma.paragrafos.forEach(function (p) {
        if (p.id === idModelo) { modelo = p; caixa = forma; }
      });
    });
    if (!modelo) return xml;

    // o bloco <a:p> inteiro que contém o texto do modelo
    var blocos = acharBlocos(xml, "a:p");
    var blocoModelo = null;
    var ultimoDaCaixa = null;
    blocos.forEach(function (b) {
      if (b.inicio <= modelo.alvos[0].inicio && modelo.alvos[0].fim <= b.fim) blocoModelo = b;
    });
    if (!blocoModelo) return xml;

    // a linha nova entra DEPOIS do último parágrafo da mesma caixa
    var ultimo = caixa.paragrafos[caixa.paragrafos.length - 1];
    blocos.forEach(function (b) {
      if (b.inicio <= ultimo.alvos[0].inicio && ultimo.alvos[0].fim <= b.fim) ultimoDaCaixa = b;
    });
    if (!ultimoDaCaixa) return xml;

    var clone = xml.slice(blocoModelo.inicio, blocoModelo.fimTotal);
    // um <a:t> só no clone, com o texto novo; os demais ficam vazios
    var primeiro = true;
    clone = clone.replace(/(<a:t>)([\s\S]*?)(<\/a:t>)/g, function (bloco, abre, conteudo, fecha) {
      if (primeiro) { primeiro = false; return abre + escapar(texto) + fecha; }
      return abre + fecha;
    });

    return xml.slice(0, ultimoDaCaixa.fimTotal) + clone + xml.slice(ultimoDaCaixa.fimTotal);
  }

  /* ---------- ACRESCENTAR SLIDES ----------
     Duplicar um slide que já existe é o jeito de crescer uma atividade sem
     desenhar nada: a cópia herda fundo, caixas, posições, fontes e até a
     animação que revela um item por vez. Só o texto é trocado depois.

     São cinco lugares que precisam concordar, e faltando um o PowerPoint
     recusa o arquivo:
       1. ppt/slides/slideN.xml            — o slide em si;
       2. ppt/slides/_rels/slideN.xml.rels — as relações dele (o layout);
       3. [Content_Types].xml              — o tipo da parte nova;
       4. ppt/_rels/presentation.xml.rels  — a relação apresentação → slide;
       5. <p:sldIdLst> em presentation.xml — a ORDEM em que o slide aparece.

     O número do ARQUIVO e a POSIÇÃO no deck são coisas diferentes: quem manda
     na ordem é o sldIdLst. As cópias entram logo depois do original, mesmo
     tendo número de arquivo maior. */

  function proximoNumeroDeSlide(entradas) {
    var maior = 0;
    entradas.forEach(function (e) {
      var m = e.nome.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
      if (m) maior = Math.max(maior, +m[1]);
    });
    return maior + 1;
  }

  /**
   * Duplica um slide N vezes, logo depois dele. Devolve os bytes de um .pptx
   * novo, pronto para ser lido de novo e ter os textos trocados.
   */
  async function duplicarSlide(buffer, opcoes) {
    var entradas = lerEntradas(buffer);
    var origem = opcoes.origem;
    var quantidade = opcoes.quantidade || 1;

    var nomeOrigem = "ppt/slides/slide" + origem + ".xml";
    var relsOrigem = "ppt/slides/_rels/slide" + origem + ".xml.rels";
    var achar = function (nome) {
      return entradas.filter(function (e) { return e.nome === nome; })[0];
    };
    if (!achar(nomeOrigem)) throw new Error("slide " + origem + " não existe");

    var xmlSlide = await lerTexto(buffer, achar(nomeOrigem));
    var xmlRels = achar(relsOrigem) ? await lerTexto(buffer, achar(relsOrigem)) : null;
    var xmlApresentacao = await lerTexto(buffer, achar("ppt/presentation.xml"));
    var xmlRelsApresentacao = await lerTexto(buffer, achar("ppt/_rels/presentation.xml.rels"));
    var xmlTipos = await lerTexto(buffer, achar("[Content_Types].xml"));

    // o rId com que a apresentação chama o slide de origem
    var relOrigem = xmlRelsApresentacao.match(
      new RegExp('<Relationship Id="(rId\\d+)"[^>]*Target="slides/slide' + origem + '\\.xml"[^>]*/>')
    );
    if (!relOrigem) throw new Error("não achei a relação da apresentação com o slide " + origem);

    var proximoNumero = proximoNumeroDeSlide(entradas);
    var proximoRel = proximoRelId(xmlRelsApresentacao);
    var idsSlide = (xmlApresentacao.match(/<p:sldId id="(\d+)"/g) || []).map(function (x) {
      return +x.match(/\d+/)[0];
    });
    var proximoIdSlide = Math.max.apply(null, idsSlide.concat([255])) + 1;

    var novasEntradas = [];
    var codificador = new TextEncoder();
    var insercao = "";

    for (var i = 0; i < quantidade; i++) {
      var numero = proximoNumero + i;
      var relId = "rId" + (proximoRel + i);
      var idSlide = proximoIdSlide + i;

      novasEntradas.push({ nome: "ppt/slides/slide" + numero + ".xml", dados: codificador.encode(xmlSlide) });
      if (xmlRels) {
        novasEntradas.push({
          nome: "ppt/slides/_rels/slide" + numero + ".xml.rels",
          dados: codificador.encode(xmlRels),
        });
      }
      xmlTipos = xmlTipos.replace(
        "</Types>",
        '<Override PartName="/ppt/slides/slide' + numero + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'
      );
      xmlRelsApresentacao = xmlRelsApresentacao.replace(
        "</Relationships>",
        '<Relationship Id="' + relId + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + numero + '.xml"/></Relationships>'
      );
      insercao += '<p:sldId id="' + idSlide + '" r:id="' + relId + '"/>';
    }

    // as cópias entram logo DEPOIS do slide de origem, na ordem do deck
    var entradaOrigemNaLista = xmlApresentacao.match(
      new RegExp('<p:sldId id="\\d+" r:id="' + relOrigem[1] + '"/>')
    );
    if (!entradaOrigemNaLista) throw new Error("o slide " + origem + " não está na lista de exibição");
    xmlApresentacao = xmlApresentacao.replace(entradaOrigemNaLista[0], entradaOrigemNaLista[0] + insercao);

    var substituicoes = {
      "[Content_Types].xml": xmlTipos,
      "ppt/_rels/presentation.xml.rels": xmlRelsApresentacao,
      "ppt/presentation.xml": xmlApresentacao,
    };

    var bytes = await remontarZip(buffer, entradas, substituicoes, novasEntradas);
    return {
      bytes: bytes,
      numeros: Array.from({ length: quantidade }, function (_, i) { return proximoNumero + i; }),
    };
  }

  /* ---------- API de alto nível ---------- */

  function numeroDoSlide(nome) {
    var m = nome.match(/slide(\d+)\.xml$/i);
    return m ? +m[1] : 0;
  }

  /**
   * Lê o arquivo e devolve o mapa de textos por slide, pronto para virar
   * prompt, mais o que for preciso para remontar depois.
   */
  async function lerPptx(buffer) {
    var entradas = lerEntradas(buffer);
    var entradasDeSlide = entradas
      .filter(function (e) { return /^ppt\/slides\/slide\d+\.xml$/i.test(e.nome); })
      .sort(function (a, b) { return numeroDoSlide(a.nome) - numeroDoSlide(b.nome); });

    if (!entradasDeSlide.length) throw new Error("não encontrei slides neste arquivo. Ele é um .pptx mesmo?");

    var slides = [];
    for (var i = 0; i < entradasDeSlide.length; i++) {
      var entrada = entradasDeSlide[i];
      var xml = await lerTexto(buffer, entrada);
      var numero = numeroDoSlide(entrada.nome);
      slides.push({ numero: numero, entrada: entrada.nome, xml: xml, formas: lerSlide(xml, numero) });
    }

    // Tamanho do slide: sem ele não dá para posicionar nada com segurança —
    // 16:9 e 4:3 convivem no acervo da escola (medido: 25,4 x 14,29 cm nos
    // Buddy Talks, mas os mais antigos são 4:3).
    var tamanho = { larguraCm: 25.4, alturaCm: 14.29 };
    var entradaApresentacao = entradas.filter(function (e) { return e.nome === "ppt/presentation.xml"; })[0];
    if (entradaApresentacao) {
      var xmlApresentacao = await lerTexto(buffer, entradaApresentacao);
      var m = xmlApresentacao.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
      if (m) {
        tamanho = {
          larguraCm: +(+m[1] / EMU_POR_CM).toFixed(2),
          alturaCm: +(+m[2] / EMU_POR_CM).toFixed(2),
        };
      }
    }

    return { buffer: buffer, entradas: entradas, slides: slides, tamanho: tamanho };
  }

  /* Uma caixa com várias linhas quase sempre é UMA frase quebrada à mão para
     caber no espaço — descoberto num Buddy Talks real, onde a fala do
     personagem vinha assim:
        "Hey guys! I'm BUDDY! Today, "
        "we'll learn about one of the "
        "most important parts of a "
        "conversation in English. It's..."
     Tratar cada linha como texto independente faria a IA reescrever quatro
     pedaços soltos, e o resultado seria uma frase picada. Por isso a caixa
     também viaja com o texto EMENDADO: a IA reescreve a frase inteira e
     devolve repartida no mesmo número de linhas.
     A heurística é conservadora: só emenda quando a linha não termina em
     pontuação de fim de frase, que é a marca da quebra manual. */
  function pareceFraseQuebrada(paragrafos) {
    if (paragrafos.length < 2) return false;
    return paragrafos.slice(0, -1).some(function (p) {
      return !/[.!?:;…]["')\]]?\s*$/.test(p.texto.trim());
    });
  }

  /** Versão enxuta da estrutura, que é o que sobe para a IA. */
  function paraPrompt(estrutura) {
    return estrutura.slides.map(function (slide) {
      return {
        slide: slide.numero,
        caixas: slide.formas.map(function (forma) {
          const emendado = pareceFraseQuebrada(forma.paragrafos);
          return {
            nome: forma.nome || undefined,
            titulo: forma.eTitulo || undefined,
            cm: forma.larguraCm ? forma.larguraCm + "x" + forma.alturaCm : undefined,
            // texto corrido da caixa, quando as linhas formam uma frase só
            frase: emendado
              ? forma.paragrafos.map(function (p) { return p.texto.trim(); }).join(" ").replace(/\s+/g, " ")
              : undefined,
            textos: forma.paragrafos.map(function (p) {
              return { id: p.id, texto: p.texto };
            }),
          };
        }),
      };
    }).filter(function (s) { return s.caixas.length > 0; });
  }

  /** Quantos parágrafos e caracteres o arquivo tem (para avisos e limites). */
  function medir(estrutura) {
    var paragrafos = 0;
    var chars = 0;
    estrutura.slides.forEach(function (slide) {
      slide.formas.forEach(function (forma) {
        forma.paragrafos.forEach(function (p) {
          paragrafos++;
          chars += p.texto.length;
        });
      });
    });
    return { slides: estrutura.slides.length, paragrafos: paragrafos, chars: chars };
  }

  /**
   * Devolve os bytes do .pptx novo, com os textos trocados e, se pedido, um
   * áudio tocável dentro de um slide.
   *
   * `audio` = { slide, mp3, icone, posicaoCm: {x,y,largura,altura}, rotulo }
   */
  async function reescreverPptx(estrutura, novos, audio, fontes, removerCriterio, linhasNovas) {
    var substituicoes = {};
    var trocados = 0;
    var formasRemovidas = 0;
    estrutura.slides.forEach(function (slide) {
      /* Cada operação REMEDE o slide antes de agir.
         Todas elas trabalham por posição dentro do texto do XML, e a posição
         de tudo que vem adiante muda assim que a anterior mexe em alguma
         coisa. Reaproveitar o mapa calculado no XML original funciona
         enquanto há uma operação só — e falha em silêncio quando há duas: foi
         o que aconteceu ao acrescentar uma linha na capa, que empurrou o selo
         do nível e fez o ajuste de fonte cair no lugar errado, com o selo
         voltando a quebrar em duas linhas.

         A ORDEM também importa, e é esta:
           1. fonte    — antes de o texto mudar de tamanho;
           2. textos   — o grosso do trabalho;
           3. linhas novas — acrescentar não invalida id de ninguém;
           4. remover formas — POR ÚLTIMO, porque tirar uma forma renumera as
              seguintes e mudaria o endereço de todo mundo. */
      var xmlNovo = slide.xml;

      Object.keys(fontes || {}).forEach(function (id) {
        if (id.indexOf("s" + slide.numero + "-") === 0) {
          xmlNovo = ajustarFonteDoParagrafo(xmlNovo, lerSlide(xmlNovo, slide.numero), id, fontes[id]);
        }
      });

      xmlNovo = aplicarTextos(xmlNovo, lerSlide(xmlNovo, slide.numero), novos);

      (linhasNovas || []).forEach(function (linha) {
        if (linha.modelo.indexOf("s" + slide.numero + "-") !== 0) return;
        xmlNovo = acrescentarParagrafo(xmlNovo, lerSlide(xmlNovo, slide.numero), linha.modelo, linha.texto);
      });

      if (removerCriterio) {
        var limpeza = removerFormas(xmlNovo, removerCriterio);
        xmlNovo = limpeza.xml;
        formasRemovidas += limpeza.removidas;
      }
      if (xmlNovo !== slide.xml) {
        substituicoes[slide.entrada] = xmlNovo;
        slide.formas.forEach(function (forma) {
          forma.paragrafos.forEach(function (p) {
            if (Object.prototype.hasOwnProperty.call(novos, p.id) && novos[p.id] !== p.texto) trocados++;
          });
        });
      }
    });

    var novasEntradas = [];
    if (audio && audio.mp3) {
      var plano = montarAudioNoSlide(estrutura, audio);

      /* Sem posição escolhida, o ícone vai para o canto superior direito.
         Não é gosto: é o canto que sobra em praticamente todo slide de
         atividade (o texto desce a partir do título, e a marca da escola
         costuma ficar embaixo). Na primeira tentativa eu fixei valores em
         centímetros e o ícone caiu em cima da frase "(2x) Listen and
         repeat." — daí a conta sair do tamanho real do slide. */
      var lado = 2.2;
      var margem = 0.5;
      var posicaoPadrao = {
        x: (estrutura.tamanho ? estrutura.tamanho.larguraCm : 25.4) - lado - margem,
        y: margem,
        largura: lado,
        altura: lado,
      };

      // as relações do slide: sempre a partir do conteúdo ATUAL do arquivo
      var entradaRels = estrutura.entradas.filter(function (e) { return e.nome === plano.caminhoRels; })[0];
      var xmlRels = await lerTexto(estrutura.buffer, entradaRels);
      substituicoes[plano.caminhoRels] = aplicarRels(xmlRels, plano);

      // o XML do slide pode já ter sido alterado pelos textos: parte-se dele
      var xmlSlide = substituicoes[plano.slide.entrada] || plano.slide.xml;
      substituicoes[plano.slide.entrada] = aplicarPicDeAudio(xmlSlide, plano, audio.posicaoCm || posicaoPadrao, audio.rotulo);

      // tipos de conteúdo
      var entradaTipos = estrutura.entradas.filter(function (e) { return e.nome === "[Content_Types].xml"; })[0];
      if (!entradaTipos) throw new Error("arquivo sem [Content_Types].xml");
      var xmlTipos = await lerTexto(estrutura.buffer, entradaTipos);
      xmlTipos = garantirTipoDeConteudo(xmlTipos, "mp3", "audio/mpeg");
      xmlTipos = garantirTipoDeConteudo(xmlTipos, "png", "image/png");
      substituicoes["[Content_Types].xml"] = xmlTipos;

      // mp3 e png entram sem recomprimir: já são formatos comprimidos
      novasEntradas.push({ nome: plano.nomeMp3, dados: audio.mp3, comprimir: false });
      novasEntradas.push({ nome: plano.nomeIcone, dados: audio.icone, comprimir: false });
    }

    var bytes = await remontarZip(estrutura.buffer, estrutura.entradas, substituicoes, novasEntradas);
    return {
      bytes: bytes,
      trocados: trocados,
      slidesAlterados: Object.keys(substituicoes).length,
      comAudio: novasEntradas.length > 0,
      formasRemovidas: formasRemovidas,
    };
  }

  return {
    lerEntradas: lerEntradas,
    lerTexto: lerTexto,
    remontarZip: remontarZip,
    acharBlocos: acharBlocos,
    lerSlide: lerSlide,
    aplicarTextos: aplicarTextos,
    lerPptx: lerPptx,
    paraPrompt: paraPrompt,
    pareceFraseQuebrada: pareceFraseQuebrada,
    medir: medir,
    reescreverPptx: reescreverPptx,
    duplicarSlide: duplicarSlide,
    acrescentarParagrafo: acrescentarParagrafo,
    montarAudioNoSlide: montarAudioNoSlide,
    ajustarFonteDoParagrafo: ajustarFonteDoParagrafo,
    removerFormas: removerFormas,
    limparAnimacoes: limparAnimacoes,
    acharBlocosAninhados: acharBlocosAninhados,
    escapar: escapar,
    desescapar: desescapar,
    crc32: crc32,
  };
});
