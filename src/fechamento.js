// Motor de fechamento da Lotofácil (cobertura por heurística gulosa).
// Garantia: se os 15 sorteados estiverem todos dentro das dezenas escolhidas,
// pelo menos um jogo gerado fará >= `garantia` pontos.
// Com filtro, só entram jogos que passam no filtro; os sorteios que nenhum jogo
// permitido cobre ficam de fora e a cobertura informa quanto da garantia sobrou.

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

function validar(dezenas, garantia) {
  const ds = [...new Set(dezenas)].sort((a, b) => a - b);
  if (ds.length < 16 || ds.length > 20) throw new Error('Escolha de 16 a 20 dezenas distintas.');
  if (ds.some(d => !Number.isInteger(d) || d < 1 || d > 25)) throw new Error('Dezenas devem estar entre 1 e 25.');
  if (garantia < 11 || garantia > 14) throw new Error('Garantia deve ser de 11 a 14 pontos.');
  return ds;
}

/**
 * Gera o fechamento passo a passo: cada `yield` informa o progresso depois de um jogo novo,
 * para a interface poder atualizar a tela e cancelar. O retorno é o resultado final.
 * @param {number[]} dezenas  16 a 20 dezenas (1..25)
 * @param {number} garantia   11..14
 * @param {{ seed?: number, amostra?: number, filtro?: (jogo: number[]) => boolean }} opcoes
 * @returns {Generator<{jogos: number, cobertos: number, total: number}, {jogos: number[][], cobertos: number, total: number}>}
 */
export function* passosFechamento(dezenas, garantia, { seed = 1, amostra = 400, filtro } = {}) {
  const ds = validar(dezenas, garantia);
  const todos = combMasks(ds.length, 15);
  const permitidos = filtro ? todos.filter(m => filtro(maskParaDezenas(m, ds))) : todos;
  const total = todos.length;
  let sorteios = todos.slice();            // sorteios possíveis ainda descobertos
  let impossiveis = 0;                     // sorteios que nenhum jogo permitido cobre
  const rand = mulberry32(seed);
  const jogos = [];
  const cobre = (j, s) => popcount(j & s) >= garantia;

  while (sorteios.length) {
    // um sorteio descoberto ao acaso: algum jogo escolhido tem de cobri-lo, o que garante progresso
    const alvo = sorteios[(rand() * sorteios.length) | 0];
    const vizinhos = [];
    const ini = (rand() * permitidos.length) | 0;
    for (let k = 0; k < permitidos.length && vizinhos.length < 50; k++) {
      const j = permitidos[(ini + k) % permitidos.length];
      if (cobre(j, alvo)) vizinhos.push(j);
    }
    if (!vizinhos.length) {
      impossiveis++;
      sorteios = sorteios.filter(s => s !== alvo);
      continue;
    }
    const cand = permitidos.length <= amostra ? permitidos.slice()
      : Array.from({ length: amostra }, () => permitidos[(rand() * permitidos.length) | 0]);
    cand.push(...vizinhos);
    let melhor = -1, melhorCob = -1;
    for (const j of cand) {
      let c = 0;
      for (let i = 0; i < sorteios.length; i++) if (cobre(j, sorteios[i])) c++;
      if (c > melhorCob) { melhorCob = c; melhor = j; }
    }
    jogos.push(melhor);
    sorteios = sorteios.filter(s => !cobre(melhor, s));
    yield { jogos: jogos.length, cobertos: total - sorteios.length - impossiveis, total };
  }
  return { jogos: jogos.map(m => maskParaDezenas(m, ds)), cobertos: total - impossiveis, total };
}

/** Versão direta (sem pausas). Com filtro, use `passosFechamento` para saber a cobertura. */
export function gerarFechamento(dezenas, garantia, opcoes) {
  const it = passosFechamento(dezenas, garantia, opcoes);
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value.jogos;
}

/** Quantos dos sorteios possíveis dentro das dezenas os jogos cobrem com `garantia` pontos. */
export function coberturaGarantia(dezenas, jogos, garantia) {
  const ds = [...new Set(dezenas)].sort((a, b) => a - b);
  const idx = new Map(ds.map((d, i) => [d, i]));
  const jm = jogos.map(j => j.reduce((m, d) => m | (1 << idx.get(d)), 0));
  const todos = combMasks(ds.length, 15);
  const cobertos = todos.filter(s => jm.some(j => popcount(j & s) >= garantia)).length;
  return { cobertos, total: todos.length };
}

/** Verifica por força bruta se o conjunto de jogos cumpre a garantia. */
export function verificarGarantia(dezenas, jogos, garantia) {
  const { cobertos, total } = coberturaGarantia(dezenas, jogos, garantia);
  return cobertos === total;
}
