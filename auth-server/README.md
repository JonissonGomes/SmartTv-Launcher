# SmartTv Auth Server

API de login Google (OAuth **Device Code**) para o launcher webOS.
Deploy no [Render](https://render.com) como Web Service.

## Rotas

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | Healthcheck |
| POST | `/auth/device/start` | Inicia Device Code |
| POST | `/auth/device/poll` | Body `{ "device_code" }` → pending / ready + JWT |
| POST | `/auth/refresh` | Body `{ "refresh_token" }` |
| GET | `/me` | Header `Authorization: Bearer …` |
| POST | `/auth/logout` | No-op (cliente descarta tokens) |

Prefixo `/api/auth/*` também é aceito (proxy Vite).

## Local

```bash
cd auth-server
cp .env.example .env
# Preencha JWT_SECRET (32+ chars). Para Simulator sem Google:
# AUTH_DEV_BYPASS=1
npm install
npm run dev
```

No launcher (raiz): `VITE_AUTH_API_URL=` (vazio) usa o proxy `/api/auth` → `http://127.0.0.1:8787`.

## Google Cloud

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials → Create credentials → OAuth client ID
3. Tipo: **TVs and Limited Input devices**
4. Copie Client ID e Client Secret para o `.env` / Render

## Render

1. New → Web Service → este diretório `auth-server` (ou root com root dir `auth-server`)
2. Build: `npm install`
3. Start: `npm start`
4. Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `CORS_ORIGIN=*`
5. No launcher: `VITE_AUTH_API_URL=https://seu-servico.onrender.com`

**Não** ative `AUTH_DEV_BYPASS` em produção.
