# NCS Studio App

Aplicação Astro focada no fluxo `extrator` e nas integrações com Google Drive/OAuth.

## O que este repositório contém

- interface web para extração e organização de documentos
- rotas `doc-md` e `extrator`
- OAuth Google para autenticação e acesso ao Drive
- salvamento local em `drive/` e sessão em `.data/`

## Requisitos

- Node.js 22.12 ou superior
- Python 3 com `pdfinfo`, `pdftotext`, `pdfimages`, `pdftoppm` e `tesseract`
- `libreoffice` para conversão de `.doc` e `.docx`

## Configuração

Copie `.env.example` para `.env` e preencha as credenciais reais.

Variáveis principais:

- `PUBLIC_GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_SESSION_SECRET`

O redirect OAuth precisa bater exatamente com o URI autorizado no Google Cloud Console. Google aceita `localhost` como exceção para a regra de HTTPS, mas em produção o URI precisa coincidir de forma literal.

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

## Observação sobre Drive

O app usa OAuth para listar e enviar arquivos no Drive. Sem login válido, não há acesso ao conteúdo da conta.
