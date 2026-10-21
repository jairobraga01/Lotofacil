// Lê resultados de qualquer arquivo de texto ou planilha já convertido em linhas.
// Cada linha precisa ter o número do concurso, a data e as 15 dezenas, nessa ordem; separadores
// (vírgula, ponto e vírgula, tabulação, espaço, |, dezenas com hífen), aspas, rótulos como "Data:", cabeçalhos e colunas extras depois das
// dezenas (ganhadores, prêmios, cidades) não atrapalham. Data pode vir antes do concurso.
// Devolve os concursos válidos e o que ficou de fora, para o app avisar.
const DATA_TXT = /^(?:(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})|(\d{4})-(\d{1,2})-(\d{1,2}))(?:T[\d:.]+Z?)?$/;
const HORA_TXT = /^\d{1,2}:\d{2}(:\d{2})?$/;
const doisDig = n => String(n).padStart(2, '0');
export function normalizarData(t) {
  const m = DATA_TXT.exec(t); if (!m) return null;
  const [d, mes, a] = m[1] ? [+m[1], +m[2], m[3]] : [+m[6], +m[5], m[4]];
  return d >= 1 && d <= 31 && mes >= 1 && mes <= 12 ? `${doisDig(d)}/${doisDig(mes)}/${a}` : null;
}

export function analisarLinhas(linhas) {
  const concursos = [], invalidas = [], porNumero = new Map(), repetidos = [];
  const inteiro = t => /^\d+$/.test(t);
  linhas.forEach(bruta => {
    const l = String(bruta).replace(/^\uFEFF/, '').trim();
    const t = l.replace(/"/g, '').replace(/[^\s\d;,|:]+:/g, ' ')        // rótulos "Concurso:", "Números:"
      .split(/[;,\t|\s]+/).flatMap(x => /^\d{1,2}(-\d{1,2})+$/.test(x) ? x.split('-') : x).filter(Boolean);
    const di = t.findIndex(x => normalizarData(x));
    if (di < 0) {                                          // cabeçalho, título ou linha sem data
      if (t.filter(inteiro).length >= 10) invalidas.push(l);
      return;
    }
    let ci = -1, ini = di + 1;
    for (let i = di - 1; i >= 0 && ci < 0; i--) if (inteiro(t[i])) ci = i;
    if (ci < 0 && inteiro(t[di + 1] ?? '')) { ci = di + 1; ini = di + 2; }   // data antes do concurso
    const concurso = ci < 0 ? NaN : Number(t[ci]), data = normalizarData(t[di]);
    const dezenas = t.slice(ini).filter(x => !HORA_TXT.test(x)).slice(0, 15).map(x => inteiro(x) ? Number(x) : NaN);
    const ok = Number.isInteger(concurso) && concurso > 0
      && dezenas.length === 15 && dezenas.every(d => Number.isInteger(d) && d >= 1 && d <= 25)
      && new Set(dezenas).size === 15;
    if (!ok) { invalidas.push(l); return; }
    const c = { concurso, data, dezenas: dezenas.sort((a, b) => a - b) };
    const antes = porNumero.get(concurso);
    if (antes) { if (antes.dezenas.join() !== c.dezenas.join()) repetidos.push(concurso); return; }
    porNumero.set(concurso, c); concursos.push(c);
  });
  concursos.sort((a, b) => a.concurso - b.concurso);
  return { concursos, invalidas, repetidos };
}

export const analisarCsv = texto => analisarLinhas(texto.split(/\r?\n/));

export const lerCsvLotorama = texto => analisarCsv(texto).concursos;

/** Números de concurso que faltam entre o primeiro e o último da lista ordenada. */
export function concursosFaltando(concursos) {
  const falta = [];
  for (let i = 1; i < concursos.length; i++)
    for (let n = concursos[i - 1].concurso + 1; n < concursos[i].concurso; n++) falta.push(n);
  return falta;
}

const lerData = s => { const [d, m, a] = s.split('/').map(Number); return new Date(a, m - 1, d); };

/**
 * Estimativa de quantos sorteios já aconteceram depois do último concurso.
 * A Lotofácil sorteia de segunda a sábado, por volta das 20h; feriados deixam o número aproximado.
 */
export function concursosPendentes(ultimo, agora = new Date()) {
  const dia = lerData(ultimo.data);
  let n = 0;
  for (dia.setDate(dia.getDate() + 1); ; dia.setDate(dia.getDate() + 1)) {
    const sorteio = new Date(dia); sorteio.setHours(21, 0, 0, 0);   // resultado costuma sair até 21h
    if (sorteio > agora) break;
    if (dia.getDay() !== 0) n++;
  }
  return n;
}
