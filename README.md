# App Extrator

Aplicação Astro focada no fluxo `extrator` e nas integrações com Google Drive/OAuth.

## O que este repositório contém

- interface web para extração e organização de documentos
- rota pública `app-extrator/doc-md` para o fluxo do extrator
- OAuth Google para autenticação e acesso ao Drive
- salvamento local em `drive/` e sessão em `.data/`

## Requisitos

- Node.js 22.12 ou superior
- Python 3 com `pdfinfo`, `pdftotext`, `pdfimages`, `pdftoppm` e `tesseract`
- `libreoffice` para conversão de `.doc` e `.docx`

## Configuração

Copie `.env.example` para `.env` e preencha as credenciais reais.

Variáveis principais:

- `PUBLIC_GOOGLE_OAUTH_CLIENT_ID` — ID do cliente OAuth (público)
- `GOOGLE_OAUTH_CLIENT_ID` — ID do cliente OAuth (servidor)
- `GOOGLE_OAUTH_CLIENT_SECRET` — Chave secreta OAuth
- `GOOGLE_OAUTH_REDIRECT_URI` — Deve ser `http://localhost:3001/app-extrator/auth/google/callback` para desenvolvimento
- `GOOGLE_SESSION_SECRET` — Qualquer string secreta para assinar sessões

O redirect URI no `.env` precisa bater com o URI autorizado no Google Cloud Console. Para desenvolvimento local, use `http://localhost:3001/app-extrator/auth/google/callback`. Para produção, use `https://madrinhadosono.online/app-extrator/auth/google/callback`.

## Rodar localmente

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Estrutura principal

- `src/pages/` rotas da aplicação
- `src/lib/` integração com Google e caminhos locais
- `scripts/pdf_to_md_hybrid.py` conversor híbrido PDF -> Markdown
- `drive/` saída local espelhada

## Cloudflare Tunnel

Há um guia dedicado em `cloudflared/README.md` com os passos de criação e execução do tunnel.

Este repositório é específico da app e não depende do workspace pai. O tunnel aponta para o servidor local em `localhost:3001`.

O `cloudflared/config.yml` está preparado para publicar este app em `https://madrinhadosono.online/app-extrator`, apontando para o servidor local em `localhost:3001`. Não salve credenciais no repositório.

Para criar um tunnel nomeado:

```sh
cloudflared tunnel login
cloudflared tunnel create app-extrator
cloudflared tunnel route dns app-extrator madrinhadosono.online
```

Para rodar a aplicação e o tunnel em terminais separados:

```sh
npm install
npm run dev:local
cloudflared tunnel --config cloudflared/config.yml run app-extrator
```

Ou rode ambos pelo script:

```sh
npm run dev:tunnel
```

## Observação sobre Drive

O app usa OAuth para listar e enviar arquivos no Drive. Sem login válido, não há acesso ao conteúdo da conta.
