# Cloudflare Tunnel

Este diretório contém a configuração do Cloudflare Tunnel para o app `app-extrator`.

## Objetivo

O tunnel expõe o servidor local `http://localhost:3001` em `https://madrinhadosono.online/app-extrator`.

## Arquivo de configuração

- `cloudflared/config.yml` contém o hostname público `madrinhadosono.online`, a rota `/app-extrator.*` e o serviço local.
- O `service` deve ficar apontando para `http://localhost:3001` enquanto a aplicação rodar localmente.

Exemplo:

```yaml
ingress:
  - hostname: madrinhadosono.online
    path: /app-extrator.*
    service: http://localhost:3001
  - service: http_status:404
```

## Passos de configuração

1. Faça login no Cloudflare:

```sh
cloudflared tunnel login
```

2. Crie um tunnel nomeado:

```sh
cloudflared tunnel create app-extrator
```

3. Crie a rota DNS para o hostname público desejado:

```sh
cloudflared tunnel route dns app-extrator madrinhadosono.online
```

4. Confirme que `cloudflared/config.yml` está com `hostname: madrinhadosono.online` e `path: /app-extrator.*`.

## Executando localmente

- Rode a aplicação local:

```sh
npm install
npm run dev:local
```

- Em outro terminal, rode o tunnel:

```sh
cloudflared tunnel --config cloudflared/config.yml run app-extrator
```

## Comando integrado

O projeto também inclui um script para rodar a aplicação local junto com o tunnel:

```sh
npm run dev:tunnel
```

## Segurança

Não salve credenciais ou certificados Cloudflare no repositório.

O `.gitignore` já bloqueia os arquivos gerados:

- `cloudflared/*.json`
- `cloudflared/cert.pem`
- `cloudflared/*.pem`
- `.env`

## Observação

Se o tunnel não abrir, verifique se o app está disponível em `http://localhost:3001` e se o hostname no Cloudflare está configurado corretamente.
