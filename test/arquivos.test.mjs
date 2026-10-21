import assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import { linhasDoArquivo } from '../src/planilha.js';
import { analisarCsv, analisarLinhas } from '../src/dados.js';

// Os arquivos de teste foram salvos pelo LibreOffice a partir dos últimos concursos do histórico,
// no layout da planilha da Caixa (Concurso, Data Sorteio, Bola1..Bola15, ganhadores, cidades, rateio).
const historico = new Map(analisarCsv(readFileSync(new URL('../dados/lotofacil.csv', import.meta.url), 'utf8')).concursos.map(c => [c.concurso, c]));
const pasta = new URL('arquivos/', import.meta.url);
for (const nome of readdirSync(pasta)) {
  const r = analisarLinhas(await linhasDoArquivo(readFileSync(new URL(nome, pasta))));
  assert.ok(r.concursos.length >= 40, nome);
  assert.deepEqual(r.invalidas, [], nome);
  for (const c of r.concursos) assert.deepEqual(c, historico.get(c.concurso), `${nome} ${c.concurso}`);
  console.log(nome, r.concursos.length, 'concursos');
}

// Texto em formatos variados: aspas, data ISO com hora, data antes do concurso, espaços, colunas extras
const r = analisarLinhas([
  'Resultados da Lotofácil',
  '"Concurso";"Data";"Bola1"',
  '"3792";"2026-09-29T00:00:00";1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;2;"São Paulo/SP";"R$ 1.234,56"',
  '30/09/2026 3793 01 02 03 04 05 06 07 08 09 10 11 12 13 14 16',
  '3794 | 1/10/2026 00:00 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 17',
  '3795;02/10/2026;1;2;3;4;5;6;7;8;9;10;11;12;13;14;26',
  '3796;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15',
]);
assert.deepEqual(r.concursos.map(c => [c.concurso, c.data, c.dezenas.at(-1)]), [[3792, '29/09/2026', 15], [3793, '30/09/2026', 16], [3794, '01/10/2026', 17]]);
assert.equal(r.invalidas.length, 2);       // dezena 26 e linha sem data

await assert.rejects(linhasDoArquivo(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0])), /danificado/);
console.log('OK');
