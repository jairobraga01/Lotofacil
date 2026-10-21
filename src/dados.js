// Lê o CSV da Lotorama: "Concurso,Data,Números" com as 15 dezenas após a data.
export function lerCsvLotorama(texto) {
  return texto.replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    .map(l => {
      const [concurso, data, ...nums] = l.split(',');
      const dezenas = nums.map(Number);
      return { concurso: Number(concurso), data, dezenas };
    })
    .filter(r => r.dezenas.length === 15 && r.dezenas.every(d => d >= 1 && d <= 25))
    .sort((a, b) => a.concurso - b.concurso);
}
