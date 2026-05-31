# App Extrator API

Backend Cloudflare Worker + Container para processar PDF, DOC/DOCX, imagens, TXT e MD.

## Deploy

Requisitos:

- Docker rodando localmente
- Conta Cloudflare com Workers Paid e Containers habilitado
- `wrangler` autenticado

```bash
npx wrangler deploy --config workers/extrator-api/wrangler.jsonc
```

Depois do deploy, configure no Cloudflare Pages:

```txt
PUBLIC_EXTRATOR_API_URL=https://app-extrator-api.<seu-subdominio>.workers.dev
```

Redeploy o Pages para o frontend passar a enviar os uploads para o container.
