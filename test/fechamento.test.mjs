import { gerarFechamento, verificarGarantia } from '../src/fechamento.js';
const casos = [[16,14],[16,13],[17,14],[18,13],[18,12],[20,13],[20,12],[20,11]];
let ok = true;
for (const [n, g] of casos) {
  const ds = Array.from({ length: n }, (_, i) => i + 1);
  const t = Date.now();
  const jogos = gerarFechamento(ds, g);
  const v = verificarGarantia(ds, jogos, g);
  ok &&= v && jogos.every(j => j.length === 15 && new Set(j).size === 15);
  console.log(`${n} dezenas, garantia ${g}: ${jogos.length} jogos, válido=${v}, ${Date.now() - t}ms`);
}
process.exit(ok ? 0 : 1);
