// Motor de fechamento da Lotofácil (cobertura por heurística gulosa).
// Garantia: se os 15 sorteados estiverem todos dentro das dezenas escolhidas,
// pelo menos um jogo gerado fará >= `garantia` pontos.

export function popcount(x) {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Todas as combinações de k posições entre n, como máscaras de n bits.
function combMasks(n, k) {
  const out = [];
  const rec = (start, left, mask) => {
    if (left === 0) { out.push(mask); return; }
    for (let i = start; i <= n - left; i++) rec(i + 1, left - 1, mask | (1 << i));
  };
  rec(0, k, 0);
  return out;
}

const maskParaDezenas = (mask, dezenas) => dezenas.filter((_, i) => mask & (1 << i));

/**
 * @param {number[]} dezenas  16 a 20 dezenas (1..25)
 * @param {number} garantia   11..14
 * @returns {number[][]} jogos de 15 dezenas, ordenados
 */
export function gerarFechamento(dezenas, garantia, { seed = 1, amostra = 400 } = {}) {
  const ds = [...new Set(dezenas)].sort((a, b) => a - b);
  const n = ds.length;
  if (n < 16 || n > 20) throw new Error('Escolha de 16 a 20 dezenas distintas.');
  if (ds.some(d => !Number.isInteger(d) || d < 1 || d > 25)) throw new Error('Dezenas devem estar entre 1 e 25.');
  if (garantia < 11 || garantia > 14) throw new Error('Garantia deve ser de 11 a 14 pontos.');

  const todos = combMasks(n, 15);
  let sorteios = todos.slice();            // sorteios possíveis dentro do conjunto
  const rand = mulberry32(seed);
  const jogos = [];
  const cobre = (j, s) => popcount(j & s) >= garantia;

  while (sorteios.length) {
    let melhor = -1, melhorCob = -1;
    const cand = todos.length <= amostra ? todos : Array.from({ length: amostra }, () => todos[(rand() * todos.length) | 0]);
    // sempre inclui um sorteio ainda descoberto: garante progresso
    cand.push(sorteios[(rand() * sorteios.length) | 0]);
    for (const j of cand) {
      let c = 0;
      for (let i = 0; i < sorteios.length; i++) if (cobre(j, sorteios[i])) c++;
      if (c > melhorCob) { melhorCob = c; melhor = j; }
    }
    jogos.push(melhor);
    sorteios = sorteios.filter(s => !cobre(melhor, s));
  }
  return jogos.map(m => maskParaDezenas(m, ds));
}

/** Verifica por força bruta se o conjunto de jogos cumpre a garantia. */
export function verificarGarantia(dezenas, jogos, garantia) {
  const ds = [...new Set(dezenas)].sort((a, b) => a - b);
  const idx = new Map(ds.map((d, i) => [d, i]));
  const jm = jogos.map(j => j.reduce((m, d) => m | (1 << idx.get(d)), 0));
  return combMasks(ds.length, 15).every(s => jm.some(j => popcount(j & s) >= garantia));
}
