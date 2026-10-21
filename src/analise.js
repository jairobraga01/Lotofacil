// Conferência, estatísticas e filtros sobre o histórico de concursos.
// Um concurso é { concurso, data, dezenas: number[15] }.

const acertos = (jogo, dezenas) => jogo.filter(d => dezenas.includes(d)).length;

/** Pontos de um jogo em cada concurso (só 11+ por padrão). */
export function conferir(jogo, concursos, minimo = 11) {
  return concursos
    .map(c => ({ concurso: c.concurso, data: c.data, pontos: acertos(jogo, c.dezenas) }))
    .filter(r => r.pontos >= minimo);
}

/** Resumo de um conjunto de jogos contra um concurso: quantos jogos fizeram 11..15. */
export function conferirJogos(jogos, concurso) {
  const faixas = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  const detalhe = jogos.map(j => {
    const p = acertos(j, concurso.dezenas);
    if (p >= 11) faixas[p]++;
    return { jogo: j, pontos: p };
  });
  return { faixas, detalhe };
}

/** Frequência e atraso (concursos desde a última aparição) de cada dezena 1..25. */
export function estatisticasDezenas(concursos) {
  const ordenados = [...concursos].sort((a, b) => a.concurso - b.concurso);
  const freq = Array(26).fill(0), atraso = Array(26).fill(null);
  ordenados.forEach((c, i) => c.dezenas.forEach(d => { freq[d]++; atraso[d] = ordenados.length - 1 - i; }));
  return Array.from({ length: 25 }, (_, k) => ({
    dezena: k + 1,
    frequencia: freq[k + 1],
    percentual: ordenados.length ? freq[k + 1] / ordenados.length : 0,
    atraso: atraso[k + 1] ?? ordenados.length,
  }));
}

/** Características de um jogo; se `anterior` for dado, calcula as repetidas. */
export function perfil(jogo, anterior) {
  const pares = jogo.filter(d => d % 2 === 0).length;
  return {
    pares, impares: jogo.length - pares,
    soma: jogo.reduce((s, d) => s + d, 0),
    repetidas: anterior ? acertos(jogo, anterior) : null,
  };
}

/** Distribuição histórica de pares, repetidas e soma, para orientar os filtros. */
export function distribuicoes(concursos) {
  const ord = [...concursos].sort((a, b) => a.concurso - b.concurso);
  const pares = {}, repetidas = {}, somas = [];
  ord.forEach((c, i) => {
    const p = perfil(c.dezenas, i ? ord[i - 1].dezenas : null);
    pares[p.pares] = (pares[p.pares] || 0) + 1;
    if (i) repetidas[p.repetidas] = (repetidas[p.repetidas] || 0) + 1;
    somas.push(p.soma);
  });
  somas.sort((a, b) => a - b);
  return { pares, repetidas, somaMin: somas[0], somaMax: somas.at(-1), somaMediana: somas[somas.length >> 1] };
}

/**
 * Filtra jogos. Todos os critérios são opcionais:
 * { pares: [min,max], repetidas: [min,max] (exige `anterior`), soma: [min,max] }
 */
export function filtrarJogos(jogos, { pares, repetidas, soma } = {}, anterior) {
  const dentro = (v, r) => !r || (v >= r[0] && v <= r[1]);
  return jogos.filter(j => {
    const p = perfil(j, anterior);
    return dentro(p.pares, pares) && dentro(p.soma, soma) && (!repetidas || !anterior || dentro(p.repetidas, repetidas));
  });
}

/**
 * Confere os jogos em todos os concursos de `de` a `ate`.
 * `premios` dá o valor de cada faixa ({ 11: 7, ... }); faixa sem valor conta só a quantidade.
 */
export function conferirPeriodo(jogos, concursos, de, ate, premios = {}) {
  const linhas = concursos.filter(c => c.concurso >= de && c.concurso <= ate).map(c => {
    const { faixas } = conferirJogos(jogos, c);
    const valor = Object.entries(faixas).reduce((s, [p, q]) => s + q * (premios[p] || 0), 0);
    return { concurso: c.concurso, data: c.data, faixas, valor };
  });
  const faixas = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
  linhas.forEach(l => Object.keys(faixas).forEach(p => faixas[p] += l.faixas[p]));
  return { linhas, faixas, valor: linhas.reduce((s, l) => s + l.valor, 0) };
}
