// Abre arquivos de resultados sem biblioteca externa: texto (CSV, TXT, UTF-8/Latin-1/UTF-16),
// tabela HTML, Excel (.xlsx e o antigo .xls) e LibreOffice Calc (.ods).
// Devolve as linhas de todas as abas como texto "célula;célula;...", prontas para analisarLinhas().
// O formato é reconhecido pelo conteúdo do arquivo, não pela extensão.
export async function linhasDoArquivo(dados) {
  const b = new Uint8Array(dados);
  if (b[0] === 0x50 && b[1] === 0x4b) return lerZipPlanilha(b);
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return lerXls(b);
  const texto = decodificarTexto(b);
  if (/<t[dh][\s>]/i.test(texto)) return linhasHtml(texto);
  return texto.split(/\r?\n|\r/);
}

const u16 = (a, o) => a[o] | a[o + 1] << 8;
const u32 = (a, o) => (a[o] | a[o + 1] << 8 | a[o + 2] << 16 | a[o + 3] << 24) >>> 0;
const f64 = (a, o) => new DataView(a.buffer, a.byteOffset + o, 8).getFloat64(0, true);

function decodificarTexto(b) {
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  catch (e) { return new TextDecoder('windows-1252').decode(b); }
}

const entidades = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: ' ' };
const desescapar = t => t.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : entidades[e] ?? m);
const semTags = t => desescapar(t.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const atributo = (attrs, nome) => (new RegExp(`\\b${nome}="([^"]*)"`).exec(attrs) || [])[1];

function linhasHtml(texto) {
  return (texto.match(/<tr[\s>][\s\S]*?<\/tr>/gi) || [])
    .map(tr => (tr.match(/<t[dh][\s>][\s\S]*?<\/t[dh]>/gi) || []).map(semTags).join(';'));
}

// Número de série do Excel (dias desde 30/12/1899, ou 01/01/1904) para dd/mm/aaaa.
function serialParaData(n, de1904) {
  const d = new Date(Date.UTC(de1904 ? 1904 : 1899, de1904 ? 0 : 11, de1904 ? 1 : 30) + Math.round(n * 864e5));
  return [d.getUTCDate(), d.getUTCMonth() + 1].map(x => String(x).padStart(2, '0')).join('/') + '/' + d.getUTCFullYear();
}
// Formatos de número que são datas: os embutidos 14–22 e 45–47, ou códigos com dia/ano.
const ehFormatoData = (id, codigo) => (id >= 14 && id <= 22) || (id >= 45 && id <= 47)
  || (codigo != null && /[dy]/i.test(codigo.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')));

// ZIP (xlsx e ods): só o diretório central e descompressão "deflate" do próprio navegador.
async function lerZip(b) {
  let fim = -1;
  for (let o = b.length - 22; o >= Math.max(0, b.length - 65557); o--) if (u32(b, o) === 0x06054b50) { fim = o; break; }
  if (fim < 0) throw new Error('arquivo compactado danificado');
  const arquivos = new Map();
  for (let i = 0, o = u32(b, fim + 16); i < u16(b, fim + 10); i++) {
    const metodo = u16(b, o + 10), tam = u32(b, o + 20), n = u16(b, o + 28), local = u32(b, o + 42);
    const nome = new TextDecoder().decode(b.subarray(o + 46, o + 46 + n));
    arquivos.set(nome, { metodo, ini: local + 30 + u16(b, local + 26) + u16(b, local + 28), tam });
    o += 46 + n + u16(b, o + 30) + u16(b, o + 32);
  }
  return async nome => {
    const a = arquivos.get(nome); if (!a) return null;
    let d = b.subarray(a.ini, a.ini + a.tam);
    if (a.metodo === 8) {
      if (typeof DecompressionStream === 'undefined') throw new Error('este navegador não abre planilhas; atualize-o ou salve como CSV');
      d = new Uint8Array(await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    } else if (a.metodo !== 0) throw new Error('compressão de planilha não suportada');
    return new TextDecoder().decode(d);
  };
}

async function lerZipPlanilha(b) {
  const abrir = await lerZip(b);
  const ods = await abrir('content.xml');
  if (ods != null) return linhasOds(ods);
  const livro = await abrir('xl/workbook.xml');
  if (livro == null) throw new Error('não é uma planilha do Excel nem do LibreOffice');
  return linhasXlsx(abrir, livro);
}

async function linhasXlsx(abrir, livro) {
  const de1904 = /date1904="(1|true)"/.test(livro);
  const comp = await abrir('xl/sharedStrings.xml') || '';
  const textos = (comp.match(/<si>[\s\S]*?<\/si>/g) || []).map(si =>
    desescapar((si.replace(/<rPh[\s\S]*?<\/rPh>/g, '').match(/<t[^>]*>[^<]*<\/t>/g) || []).map(t => t.replace(/<[^>]*>/g, '')).join('')));
  const estilos = await abrir('xl/styles.xml') || '';
  const codigos = new Map((estilos.match(/<numFmt [^>]*>/g) || []).map(f => [+atributo(f, 'numFmtId'), desescapar(atributo(f, 'formatCode') || '')]));
  const xfs = ((/<cellXfs[\s\S]*?<\/cellXfs>/.exec(estilos) || [''])[0].match(/<xf [^>]*>/g) || [])
    .map(x => { const id = +(atributo(x, 'numFmtId') || 0); return ehFormatoData(id, codigos.get(id)); });
  // Abas na ordem do livro, pelo mapa de relações; se faltar, todas as worksheets.
  const rels = await abrir('xl/_rels/workbook.xml.rels') || '';
  const alvo = new Map((rels.match(/<Relationship [^>]*>/g) || []).map(r => [atributo(r, 'Id'), atributo(r, 'Target')]));
  let caminhos = (livro.match(/<sheet [^>]*>/g) || []).map(s => alvo.get(atributo(s, 'r:id')))
    .filter(Boolean).map(t => t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''));
  if (!caminhos.length) caminhos = ['xl/worksheets/sheet1.xml'];
  const linhas = [];
  for (const caminho of caminhos) {
    const xml = await abrir(caminho); if (!xml) continue;
    for (const [, corpo = ''] of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const celulas = [];
      for (const [, attrs, dentro = ''] of corpo.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tipo = atributo(attrs, 't'), v = desescapar((/<v>([\s\S]*?)<\/v>/.exec(dentro) || [])[1] ?? '');
        let valor;
        if (tipo === 's') valor = textos[+v] ?? '';
        else if (tipo === 'inlineStr') valor = semTags(dentro);
        else if (tipo === 'n' || tipo == null) valor = v !== '' && xfs[+(atributo(attrs, 's') || 0)] ? serialParaData(+v, de1904) : v;
        else valor = v;                                   // str, b, e, d (data em texto ISO)
        celulas.push(valor);
      }
      linhas.push(celulas.join(';'));
    }
  }
  return linhas;
}

function linhasOds(xml) {
  const linhas = [];
  for (const [, corpo = ''] of xml.matchAll(/<table:table-row\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
    const celulas = [];
    for (const [, attrs, dentro = ''] of corpo.matchAll(/<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g)) {
      const tipo = atributo(attrs, 'office:value-type');
      let valor;
      if (tipo === 'date') valor = (atributo(attrs, 'office:date-value') || '').slice(0, 10);
      else if (tipo === 'float' || tipo === 'percentage' || tipo === 'currency') valor = atributo(attrs, 'office:value') || '';
      else valor = (dentro.match(/<text:p\b[^>]*?(?:\/>|>[\s\S]*?<\/text:p>)/g) || [])
        .map(p => semTags(p.replace(/<text:(s|tab|line-break)\b[^>]*\/>/g, ' '))).join(' ');
      const vezes = valor ? Math.min(+(atributo(attrs, 'table:number-columns-repeated') || 1), 100) : 1;
      for (let i = 0; i < vezes; i++) celulas.push(valor);
    }
    linhas.push(celulas.join(';'));
  }
  return linhas;
}

// Excel 97–2003 (.xls): arquivo composto (CFB) com o fluxo "Workbook" em registros BIFF8.
function lerXls(b) {
  const tam = 1 << u16(b, 30), tamMini = 1 << u16(b, 32), FIM = 0xfffffffa;
  const setor = n => b.subarray((n + 1) * tam, (n + 2) * tam);
  const difat = [];
  for (let i = 0; i < 109; i++) { const v = u32(b, 76 + i * 4); if (v < FIM) difat.push(v); }
  for (let s = u32(b, 68), n = u32(b, 72); n > 0 && s < FIM; n--) {
    const d = setor(s);
    for (let i = 0; i < tam / 4 - 1; i++) { const v = u32(d, i * 4); if (v < FIM) difat.push(v); }
    s = u32(d, tam - 4);
  }
  const fat = [];
  for (const s of difat) { const d = setor(s); for (let i = 0; i < tam / 4; i++) fat.push(u32(d, i * 4)); }
  const juntar = (partes, t) => { const r = new Uint8Array(partes.length * t); partes.forEach((p, i) => r.set(p, i * t)); return r; };
  const cadeia = (ini, tabela, ler, t) => {
    const partes = [];
    for (let s = ini; s < FIM && partes.length <= tabela.length; s = tabela[s]) partes.push(ler(s));
    return juntar(partes, t);
  };
  const dir = cadeia(u32(b, 48), fat, setor, tam), entradas = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) {
    const n = Math.max(0, u16(dir, o + 64) - 2);
    entradas.push({ nome: String.fromCharCode(...new Uint16Array(dir.slice(o, o + n).buffer)), tipo: dir[o + 66], ini: u32(dir, o + 116), tam: u32(dir, o + 120) });
  }
  const fluxo = entradas.find(e => e.tipo === 2 && /^(workbook|book)$/i.test(e.nome));
  if (!fluxo) throw new Error('planilha do Excel sem dados');
  let dados;
  if (fluxo.tam < u32(b, 56)) {                         // fluxo pequeno: fica no "mini stream"
    const mini = cadeia(entradas[0].ini, fat, setor, tam), mfBytes = cadeia(u32(b, 60), fat, setor, tam);
    const minifat = Array.from({ length: mfBytes.length / 4 }, (_, i) => u32(mfBytes, i * 4));
    dados = cadeia(fluxo.ini, minifat, s => mini.subarray(s * tamMini, (s + 1) * tamMini), tamMini);
  } else dados = cadeia(fluxo.ini, fat, setor, tam);
  return linhasBiff(dados.subarray(0, fluxo.tam));
}

// Texto BIFF8: quantidade, opções (bit 0 = 2 bytes por letra, 4 = fonética, 8 = formatação) e letras.
function textoBiff(d, o, quantidade = u16(d, o), ini = o + 2) {
  const op = d[ini]; let p = ini + 1;
  if (op & 8) p += 2; if (op & 4) p += 4;
  let s = '';
  for (let i = 0; i < quantidade && p < d.length; i++) s += String.fromCharCode(op & 1 ? u16(d, (p += 2) - 2) : d[p++]);
  return s;
}

// Tabela de textos compartilhados, que pode continuar em registros CONTINUE (cada um recomeça
// com um byte de opções quando corta um texto no meio).
function tabelaTextos(partes) {
  let p = 0, o = 8; const fora = () => { while (p < partes.length && o >= partes[p].length) { o -= partes[p].length; p++; } return p >= partes.length; };
  const byte = () => fora() ? 0 : partes[p][o++];
  const total = u32(partes[0], 4), r = [];
  for (let k = 0; k < total && !fora(); k++) {
    const n = byte() | byte() << 8; let op = byte(), extra = 0;
    if (op & 8) extra += 4 * (byte() | byte() << 8);
    if (op & 4) extra += (byte() | byte() << 8 | byte() << 16 | byte() << 24) >>> 0;
    let s = '';
    while (s.length < n) {
      if (o >= partes[p].length) { p++; o = 0; if (p >= partes.length) break; op = partes[p][o++]; }
      s += String.fromCharCode(op & 1 ? (o += 2, u16(partes[p], o - 2)) : partes[p][o++]);
    }
    o += extra; r.push(s);
  }
  return r;
}

function rk(v) {
  let n;
  if (v & 2) n = (v | 0) >> 2;
  else { const dv = new DataView(new ArrayBuffer(8)); dv.setUint32(4, v & 0xfffffffc, true); n = dv.getFloat64(0, true); }
  return v & 1 ? n / 100 : n;
}

function linhasBiff(b) {
  const regs = [];
  for (let o = 0; o + 4 <= b.length; o += 4 + u16(b, o + 2)) regs.push([u16(b, o), b.subarray(o + 4, o + 4 + u16(b, o + 2))]);
  let textos = [], de1904 = false, aba = null;
  const formatoXf = [], codigos = new Map(), abas = [];
  const por = (r, c, v) => { (aba.get(r) || aba.set(r, []).get(r))[c] = v; };
  const numero = (r, c, xf, n) => por(r, c, ehFormatoData(formatoXf[xf], codigos.get(formatoXf[xf])) ? serialParaData(n, de1904) : String(n));
  regs.forEach(([t, d], i) => {
    if (t === 0x0809) { aba = u16(d, 2) === 0x10 ? new Map() : null; if (aba) abas.push(aba); return; }
    if (t === 0x002f) throw new Error('planilha protegida por senha');
    if (t === 0x0022) de1904 = u16(d, 0) === 1;
    else if (t === 0x041e) codigos.set(u16(d, 0), textoBiff(d, 2));
    else if (t === 0x00e0) formatoXf.push(u16(d, 2));
    else if (t === 0x00fc) { const partes = [d]; for (let j = i + 1; j < regs.length && regs[j][0] === 0x003c; j++) partes.push(regs[j][1]); textos = tabelaTextos(partes); }
    if (!aba || d.length < 6) return;
    const r = u16(d, 0), c = u16(d, 2), xf = u16(d, 4);
    if (t === 0x00fd) por(r, c, textos[u32(d, 6)] ?? '');
    else if (t === 0x0204) por(r, c, textoBiff(d, 6));
    else if (t === 0x0203) numero(r, c, xf, f64(d, 6));
    else if (t === 0x027e) numero(r, c, xf, rk(u32(d, 6)));
    else if (t === 0x00bd) for (let k = 0; 4 + k * 6 + 6 <= d.length - 2; k++) numero(r, c + k, u16(d, 4 + k * 6), rk(u32(d, 6 + k * 6)));
    else if (t === 0x0006) {
      if (u16(d, 12) !== 0xffff) numero(r, c, xf, f64(d, 6));
      else if (d[6] === 0) { const s = regs.slice(i + 1, i + 4).find(([tt]) => tt === 0x0207); if (s) por(r, c, textoBiff(s[1], 0)); }
    }
  });
  return abas.flatMap(a => [...a.keys()].sort((x, y) => x - y).map(r => Array.from(a.get(r), v => v ?? '').join(';')));
}
