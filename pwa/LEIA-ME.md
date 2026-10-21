# Fechamento Lotofácil: versão instalável

Esta pasta é o app completo. Basta publicá-la num endereço https e abrir esse endereço no celular ou no computador.

Arquivos: `index.html` (app e histórico), `manifest.webmanifest`, `sw.js` (funciona offline), `icon-192.png`, `icon-512.png`, `icon.svg`.

## Publicar (escolha um)

**Netlify Drop (mais rápido):** entre em app.netlify.com/drop, arraste esta pasta `pwa` para a página e anote o endereço gerado. Crie uma conta gratuita para o site não expirar.

**GitHub Pages:** crie um repositório, envie o conteúdo desta pasta para a raiz, abra Settings > Pages, escolha a branch principal e a pasta `/ (root)`. O endereço será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Instalar

- **Android (Chrome):** abra o endereço, menu ⋮ > "Instalar app".
- **iPhone (Safari):** abra o endereço, botão Compartilhar > "Adicionar à Tela de Início".
- **Computador (Chrome ou Edge):** abra o endereço e clique no ícone de instalar na barra de endereço.

Depois da primeira visita o app abre sem internet.

## Atualizar o histórico

Aba **Dados** do app: cole linhas novas (`concurso,data,dezena,...`) ou escolha um CSV da Lotorama. Os concursos novos ficam guardados no aparelho.

## Atualizar o app em si

Ao publicar uma versão nova, mude `CACHE = 'lotofacil-v1'` em `sw.js` para `v2` (e assim por diante) para os aparelhos pegarem a versão nova.
