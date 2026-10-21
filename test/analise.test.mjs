import { readFileSync } from 'fs';
import assert from 'assert';
import { lerCsvLotorama } from '../src/dados.js';
import { conferir, conferirJogos, estatisticasDezenas, distribuicoes, filtrarJogos, perfil } from '../src/analise.js';
import { gerarFechamento } from '../src/fechamento.js';

const cs = lerCsvLotorama(readFileSync(new URL('../dados/lotofacil.csv', import.meta.url), 'utf8'));
const ultimo = cs.at(-1), penultimo = cs.at(-2);

// conferir: o próprio resultado do último concurso deve dar 15 pontos nele
assert.equal(conferir(ultimo.dezenas, cs, 15).at(-1).concurso, ultimo.concurso);
// estatísticas: soma das frequências = 15 * nº de concursos
const est = estatisticasDezenas(cs);
assert.equal(est.reduce((s, e) => s + e.frequencia, 0), 15 * cs.length);
assert.ok(est.some(e => e.atraso === 0));
// fechamento com 18 dezenas do último concurso + 3: garantia vale contra o concurso real
const pool = [...ultimo.dezenas, ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25].filter(d => !ultimo.dezenas.includes(d))].slice(0, 18);
const jogos = gerarFechamento(pool, 13);
const r = conferirJogos(jogos, ultimo);
assert.ok(r.detalhe.some(x => x.pontos >= 13));
// filtros
const filtrados = filtrarJogos(jogos, { pares: [6, 8] }, penultimo.dezenas);
assert.ok(filtrados.every(j => { const p = perfil(j).pares; return p >= 6 && p <= 8; }));
const d = distribuicoes(cs);
console.log('concursos', cs.length, '| último', ultimo.concurso, ultimo.data);
console.log('pares (hist.)', d.pares, '| repetidas', d.repetidas, '| soma', d.somaMin, d.somaMediana, d.somaMax);
console.log('mais atrasadas', est.sort((a, b) => b.atraso - a.atraso).slice(0, 3).map(e => `${e.dezena}(${e.atraso})`).join(' '));
console.log('OK');
