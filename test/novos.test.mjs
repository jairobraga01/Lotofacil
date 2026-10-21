import assert from 'assert';
import { analisarCsv, concursosFaltando, concursosPendentes } from '../src/dados.js';
import { conferirPeriodo, perfil } from '../src/analise.js';
import { passosFechamento, coberturaGarantia } from '../src/fechamento.js';

// CSV: cabeçalho, linha inválida, dezena repetida, concurso duplicado divergente, buraco na sequência
const csv = `Concurso,Data,Números
1,01/01/2026,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15
2,02/01/2026,01,02,03
4,05/01/2026,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25
4,05/01/2026,01,12,13,14,15,16,17,18,19,20,21,22,23,24,25
5,06/01/2026,01,01,03,04,05,06,07,08,09,10,11,12,13,14,15`;
const r = analisarCsv(csv);
assert.deepEqual(r.concursos.map(c => c.concurso), [1, 4]);
assert.equal(r.invalidas.length, 2);
assert.deepEqual(r.repetidos, [4]);
assert.deepEqual(concursosFaltando(r.concursos), [2, 3]);

// Pendentes: sorteios de segunda a sábado, contados depois das 21h
assert.equal(concursosPendentes({ data: '28/09/2026' }, new Date(2026, 8, 28, 23)), 0); // mesmo dia
assert.equal(concursosPendentes({ data: '26/09/2026' }, new Date(2026, 8, 28, 22)), 1); // sáb -> seg (domingo não conta)
assert.equal(concursosPendentes({ data: '26/09/2026' }, new Date(2026, 8, 28, 10)), 0); // seg antes do sorteio

// Conferência em vários concursos com prêmios
const jogo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const p = conferirPeriodo([jogo], r.concursos, 1, 4, { 11: 7, 15: 1000 });
assert.equal(p.linhas.length, 2);
assert.equal(p.faixas[15], 1);
assert.equal(p.valor, 1000);

// Fechamento com filtro: todo jogo respeita o filtro e a cobertura informada confere com a força bruta
const ds = Array.from({ length: 18 }, (_, i) => i + 1);
const filtro = j => { const q = perfil(j).pares; return q >= 7 && q <= 8; };
const it = passosFechamento(ds, 13, { filtro });
let s, passos = 0;
while (!(s = it.next()).done) passos++;
assert.ok(passos > 0);
assert.ok(s.value.jogos.every(filtro));
const cob = coberturaGarantia(ds, s.value.jogos, 13);
assert.equal(cob.total, s.value.total);
assert.equal(cob.cobertos, s.value.cobertos);
// filtro impossível: nenhum jogo, cobertura zero
const vazio = passosFechamento(ds, 13, { filtro: () => false });
let v; while (!(v = vazio.next()).done);
assert.equal(v.value.jogos.length, 0);
assert.equal(v.value.cobertos, 0);
console.log('filtro 7-8 pares:', s.value.jogos.length, 'jogos, cobertura', s.value.cobertos, '/', s.value.total);
console.log('OK');
