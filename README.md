# Fechamento Lotofácil

App pessoal para montar fechamentos da Lotofácil, conferir resultados e ver estatísticas dos concursos. Funciona no navegador do computador e pode ser instalado no celular (Android e iPhone) como app (PWA), inclusive offline.

## O que faz

- **Fechamento:** escolha de 16 a 20 dezenas e gere jogos de 15 com garantia de 11 a 14 pontos. O cálculo roda em fatias, com barra de progresso e botão de cancelar, sem travar a tela.
- **Filtros:** pares/ímpares, repetidas do concurso anterior e soma. Os jogos são escolhidos já dentro dos filtros, e o app mostra a cobertura (quanto da garantia continua valendo).
- **Fechamentos salvos:** guarde com nome, compartilhe (WhatsApp ou menu do celular), baixe em CSV.
- **Conferência:** confere um fechamento num concurso ou num intervalo de concursos, com prêmios, gasto e saldo.
- **Estatísticas:** frequência das dezenas e análises do histórico.
- **Dados:** histórico embutido; concursos novos entram pela aba Dados (CSV da Lotorama ou linhas coladas). O app avisa quando os dados estão desatualizados e aponta linhas inválidas, concursos repetidos ou faltando.

## Estrutura

| Pasta/arquivo | Conteúdo |
|---|---|
| `src/` | Código: `app.html` (interface), `fechamento.js`, `analise.js`, `dados.js` |
| `test/` | Testes das funções (`node --test`) |
| `e2e/` | Testes no navegador (Playwright), no computador e no celular |
| `.github/workflows/ci.yml` | Roda os testes a cada mudança e publica `pwa/` no GitHub Pages a cada push na `main` |
| `dados/lotofacil.csv` | Histórico de resultados (fonte: Lotorama) |
| `pwa/` | Versão instalável: `index.html` gerado, manifesto, ícones e service worker |
| `build.mjs` | Gera `dist/index.html` (arquivo único) e `pwa/index.html` |

## Comandos

Requer Node.js 18 ou mais novo.

```sh
npm test           # testes das funções
npm run build      # gera dist/index.html, pwa/index.html e a versão do cache em pwa/sw.js
npm run test:e2e   # testes no navegador (precisa do build; `npx playwright install chromium` na primeira vez)
```

## Publicar e instalar

A cada push na `main`, o GitHub Actions testa e publica a pasta `pwa/` no GitHub Pages. Para ligar: Settings > Pages > Source: **GitHub Actions**. GitHub Pages em repositório privado exige plano pago do GitHub; sem ele, deixe o repositório público ou use o Netlify (veja [`pwa/LEIA-ME.md`](pwa/LEIA-ME.md), que também explica como instalar no celular).

## Atualizar o histórico

Baixe o CSV novo em lotorama.com.br, salve como `dados/lotofacil.csv` e rode `npm run build`. Sem rebuild, também dá para importar o CSV direto pela aba **Dados** do app.
