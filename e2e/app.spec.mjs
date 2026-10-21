import { test, expect } from '@playwright/test';
const url = new URL('../pwa/index.html', import.meta.url).href;

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(url);
});

test('abre com o histórico e avisa quando está desatualizado', async ({ page }) => {
  await expect(page.locator('#base')).toContainText('concursos, até o');
  await page.clock.setFixedTime(new Date(2030, 0, 1));
  await page.reload();
  await expect(page.locator('#alerta')).toContainText('desatualizados');
  await page.locator('#irDados').click();
  await expect(page.locator('#p-dados')).toBeVisible();
});

test('gera, salva e confere um fechamento em vários concursos', async ({ page }) => {
  await page.getByRole('button', { name: /18 mais frequentes/ }).click();
  await page.getByRole('button', { name: 'Gerar jogos' }).click();
  await expect(page.locator('#resumo')).toContainText('Garantia completa', { timeout: 20_000 });
  const jogos = await page.locator('#lista .game').count();
  expect(jogos).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.locator('#nomeFech').fill('Teste 18');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.locator('#acaoMsg')).toContainText('Teste 18');

  await page.getByRole('tab', { name: 'Conferir' }).click();
  await expect(page.locator('#salvosLista')).toContainText('Teste 18');
  await page.locator('#fonte').selectOption({ label: `Teste 18 (${jogos} jogos)` });
  const ultimo = +(await page.locator('#concAte').inputValue());
  await page.locator('#concDe').fill(String(ultimo - 9));
  await page.locator('#conferirBtn').click();
  await expect(page.locator('#confRes tbody tr')).toHaveCount(10);
  await expect(page.locator('#confRes')).toContainText('saldo');

  await page.reload();       // continua salvo
  await page.getByRole('tab', { name: 'Conferir' }).click();
  await expect(page.locator('#salvosLista')).toContainText('Teste 18');
});

test('filtros entram na geração e a cobertura aparece', async ({ page }) => {
  for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) await page.locator('#grid button').nth(d - 1).click();
  await page.locator('#parMin').fill('7'); await page.locator('#parMax').fill('7');
  await page.getByRole('button', { name: 'Gerar jogos' }).click();
  await expect(page.locator('#resumo')).toContainText('cobertura', { timeout: 20_000 });
  const metas = await page.locator('#lista .meta').allTextContents();
  expect(metas.length).toBeGreaterThan(0);
  expect(metas.every(m => m.startsWith('7p'))).toBe(true);
});

test('cálculo grande não trava a tela e pode ser cancelado', async ({ page }) => {
  for (let d = 1; d <= 20; d++) await page.locator('#grid button').nth(d - 1).click();
  await page.locator('#garantia').selectOption('14');
  await page.getByRole('button', { name: 'Gerar jogos' }).click();
  await expect(page.locator('#progTxt')).toContainText('jogos até agora', { timeout: 20_000 });
  const t0 = Date.now();
  await page.getByRole('tab', { name: 'Estatísticas' }).click();     // a tela responde durante o cálculo
  await expect(page.locator('#p-stats')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(2000);
  await page.getByRole('tab', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('#progTxt')).toHaveText('Cálculo cancelado.');
  await expect(page.getByRole('button', { name: 'Gerar jogos' })).toBeEnabled();
});

test('importação mostra concursos novos e linhas com problema', async ({ page }) => {
  await page.getByRole('tab', { name: 'Dados' }).click();
  const ultimo = +(await page.locator('#situacao .tile b').nth(1).textContent());
  await page.getByText('Colar resultados em texto').click();
  await page.locator('#colar').fill(`${ultimo + 1},01/10/2026,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15\n${ultimo + 2},02/10/2026,01,01,02`);
  await page.getByRole('button', { name: 'Importar texto' }).click();
  await expect(page.locator('#impMsg')).toContainText('1 novos');
  await expect(page.locator('#impMsg')).toContainText('1 linha ignorada');
  await expect(page.locator('#base')).toContainText(`até o ${ultimo + 1}`);
});

test('importa planilhas do Excel e do LibreOffice e arquivos de texto', async ({ page }) => {
  await page.getByRole('tab', { name: 'Dados' }).click();
  for (const nome of ['pequena.xlsx', 'pequena.xls', 'pequena.ods']) {
    await page.locator('#arquivo').setInputFiles(new URL(`../test/arquivos/${nome}`, import.meta.url).pathname);
    await expect(page.locator('#impMsg')).toContainText(`${nome}: 40 concursos lidos, 0 novos`);
    await expect(page.locator('#impMsg')).toContainText('Nada novo');
  }
  const ultimo = +(await page.locator('#situacao .tile b').nth(1).textContent());
  const txt = `Concurso;Data;Bolas\n${ultimo + 1};2026-10-01;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;"Cidade"`;
  await page.locator('#arquivo').setInputFiles({ name: 'novos.txt', mimeType: 'text/plain', buffer: Buffer.from(txt) });
  await expect(page.locator('#impMsg')).toContainText('novos.txt: 1 concursos lidos, 1 novos');
  await expect(page.locator('#base')).toContainText(`até o ${ultimo + 1} (01/10/2026)`);
  await page.locator('#arquivo').setInputFiles({ name: 'ruim.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('PK\x03\x04 quebrado') });
  await expect(page.locator('#impMsg')).toContainText('Não consegui abrir ruim.xlsx');
});

test('cabe na largura da tela sem rolagem lateral', async ({ page }) => {
  for (const aba of ['Fechar', 'Conferir', 'Estatísticas', 'Dados']) {
    await page.getByRole('tab', { name: aba }).click();
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, aba).toBeLessThanOrEqual(0);
  }
});
