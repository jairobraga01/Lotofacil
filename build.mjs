// Monta dist/index.html: um único arquivo com módulos e histórico embutidos.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const r = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const modulos = ['src/dados.js', 'src/fechamento.js', 'src/analise.js', 'src/planilha.js'].map(f => r(f).replace(/^export /gm, '')).join('\n');
const csv = r('dados/lotofacil.csv').replace(/^﻿/, '').trim();
const html = r('src/app.html').replace('/*MODULES*/', () => modulos).replace('/*CSV*/', () => csv);
mkdirSync(new URL('dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('dist/index.html', import.meta.url), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');

// Versão instalável (PWA): mesma página com manifesto, ícone e service worker.
const extra = `<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#8a1f7a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Lotofácil">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="icon" href="icon.svg" type="image/svg+xml">
`;
const reg = `<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>`;
const pagina = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + html.replace(/<title>[\s\S]*?<\/style>/, m => m + '\n' + extra + '</head>\n<body>') + '\n' + reg + '\n</body>\n</html>\n';
writeFileSync(new URL('pwa/index.html', import.meta.url), pagina);
console.log('pwa/index.html');

// Versão do cache do service worker = hash do app, para os aparelhos pegarem cada versão nova sozinhos.
const { createHash } = await import('crypto');
const versao = createHash('sha256').update(pagina).digest('hex').slice(0, 10);
const sw = r('pwa/sw.js').replace(/const CACHE = '[^']*';/, `const CACHE = 'lotofacil-${versao}';`);
writeFileSync(new URL('pwa/sw.js', import.meta.url), sw);
console.log('pwa/sw.js cache', versao);
