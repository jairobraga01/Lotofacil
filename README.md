# Fechamento Lotofácil

App pessoal para montar fechamentos da Lotofácil, conferir resultados e ver estatísticas dos concursos. Funciona no navegador do computador e pode ser instalado no celular (Android e iPhone) como app (PWA), inclusive offline.

## O que faz

- **Fechamento:** escolha de 16 a 20 dezenas e gere jogos de 15 com garantia de 11 a 14 pontos.
- **Filtros:** pares/ímpares, repetidas do concurso anterior e outros.
- **Conferência:** confere os jogos contra os resultados dos concursos.
- **Estatísticas:** frequência das dezenas e análises do histórico.
- **Dados:** histórico embutido; concursos novos podem ser importados pela aba Dados (CSV da Lotorama ou linhas coladas).

## Estrutura

| Pasta/arquivo | Conteúdo |
|---|---|
| `src/` | Código: `app.html` (interface), `fechamento.js`, `analise.js`, `dados.js` |
| `test/` | Testes (`node --test`) |
| `dados/lotofacil.csv` | Histórico de resultados (fonte: Lotorama) |
| `pwa/` | Versão instalável: `index.html` gerado, manifesto, ícones e service worker |
| `build.mjs` | Gera `dist/index.html` (arquivo único) e `pwa/index.html` |

## Comandos

Requer Node.js 18 ou mais novo.

```sh
npm test        # roda os testes
npm run build   # gera dist/index.html e pwa/index.html
```

## Publicar e instalar

Veja [`pwa/LEIA-ME.md`](pwa/LEIA-ME.md) para publicar a pasta `pwa/` (Netlify ou GitHub Pages) e instalar no celular.

## Atualizar o histórico

Baixe o CSV novo em lotorama.com.br, salve como `dados/lotofacil.csv` e rode `npm run build`. Sem rebuild, também dá para importar o CSV direto pela aba **Dados** do app.
