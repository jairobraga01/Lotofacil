// Lê o CSV da Lotorama: "Concurso,Data,Números" com as 15 dezenas após a data.
// Devolve os concursos válidos e o que ficou de fora, para o app avisar.
export function analisarCsv(texto) {
  const concursos = [], invalidas = [], porNumero = new Map(), repetidos = [];
  texto.replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((l, i) => {
    const [n, data, ...nums] = l.split(',').map(s => s.trim());
    if (i === 0 && !/^\d+$/.test(n)) return;              // cabeçalho
    const concurso = Number(n), dezenas = nums.filter(Boolean).map(Number);
    const ok = Number.isInteger(concurso) && concurso > 0 && /^\d{2}\/\d{2}\/\d{4}$/.test(data ?? '')
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
