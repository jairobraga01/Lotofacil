# Fechamento Lotofácil: versão instalável

Esta pasta é o app completo. Basta publicá-la num endereço https e abrir esse endereço no celular ou no computador.

Arquivos: `index.html` (app e histórico), `manifest.webmanifest`, `sw.js` (funciona offline), `icon-192.png`, `icon-512.png`, `icon.svg`.

## Publicar (escolha um)

**Netlify Drop (mais rápido):** entre em app.netlify.com/drop, arraste esta pasta `pwa` para a página e anote o endereço gerado. Crie uma conta gratuita para o site não expirar.

**GitHub Pages (automático):** no repositório, abra Settings > Pages e escolha Source: **GitHub Actions**. Cada push na `main` testa e publica esta pasta. O endereço será `https://jairobraga01.github.io/lotofacil/`. Em repositório privado, o GitHub Pages exige plano pago.

## Instalar

- **Android (Chrome):** abra o endereço, menu ⋮ > "Instalar app".
- **iPhone (Safari):** abra o endereço, botão Compartilhar > "Adicionar à Tela de Início".
- **Computador (Chrome ou Edge):** abra o endereço e clique no ícone de instalar na barra de endereço.

Depois da primeira visita o app abre sem internet.

## Atualizar o histórico

Aba **Dados** do app: cole linhas novas (`concurso,data,dezena,...`) ou escolha um CSV da Lotorama. Os concursos novos ficam guardados no aparelho.

## Atualizar o app em si

`npm run build` muda a versão do cache em `sw.js` sozinho a cada versão nova do app; os aparelhos pegam a atualização na visita seguinte.
