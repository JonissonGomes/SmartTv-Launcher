# SmartTv Launcher (webOS)

Launcher para LG webOS (QNED82ASG / Simulator 26) com histórico local, recomendações TMDB e abertura das plataformas Netflix, HBO Max, Globoplay e YouTube.

## Pré-requisitos

- Node.js 20+
- [webOS CLI](https://www.npmjs.com/package/@webos-tools/cli) (já em `devDependencies`)
- Simulator: `Documents/webOS_TV_26_Simulator_1.5.0`
- Chave TMDB em `.env` (opcional para UI; necessária para pôsteres/recomendações)

```bash
cp .env.example .env
# Preferível: VITE_TMDB_TOKEN=seu_read_access_token (Bearer)
# Fallback:   VITE_TMDB_API_KEY=sua_api_key
# Opcional (só no PC, npm run dev): TYPESAFE_API_KEY=...  (Jev / TypeSafe)
npm install
```

### Jev (TypeSafe)

Curadoria tipada de destaques/fileiras via `@typesafe-ai/sdk`.
A chave `TYPESAFE_API_KEY` fica **só no servidor Vite** (`/api/jev/curate`).
No Simulator/TV empacotado, o app usa ranking local equivalente.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Dev no navegador (mock webOS) |
| `npm run build` | Gera `dist` + copia `webos/*` |
| `npm run test` | Vitest |
| `make sim` | Build + abre no **webOS TV 26 Simulator** |
| `npm run sim` | Mesmo fluxo via npm (Windows) |
| `.\scripts\sim.ps1` | Alternativa PowerShell |
| `make package` | Gera `.ipk` |
| `make deploy` | Instala/lança na TV (`DEVICE=minhatv`) |

### Testar no Simulator

```bash
make sim
```

Equivale a:

```bash
npm run build
npx ares-launch -s 26 -sp "%USERPROFILE%/Documents/webOS_TV_26_Simulator_1.5.0" dist
```

No Simulator use o D-pad virtual / teclado (setas + Enter + Esc/Back).

### Instalar na TV (Developer Mode)

1. Conta em [webostv.developer.lge.com](https://webostv.developer.lge.com)
2. Na TV: app **Developer Mode** → Dev Mode Status + Key Server → anotar IP
3. Registrar:

```bash
npx ares-setup-device --add minhatv --info "{'host':'IP_DA_TV','port':'9922','username':'prisoner'}"
npx ares-novacom --device minhatv --getkey
```

4. Deploy: `make deploy` (ou `npm run deploy`)

## Conta / login Google (launcher)

Sessão **do SmartTv Launcher**. Fluxo OAuth Device Code + API em `auth-server/` (Render).

```bash
# Terminal 1 — API
cp auth-server/.env.example auth-server/.env
# AUTH_DEV_BYPASS=1 e JWT_SECRET=... para testar sem Google
npm run auth:install
npm run auth:dev

# Terminal 2 — launcher
npm run dev
# Menu Conta → Entrar com Google
```

Produção: publique `auth-server` no Render e defina `VITE_AUTH_API_URL=https://seu-servico.onrender.com` antes do `npm run build`. Detalhes em [auth-server/README.md](auth-server/README.md).

## Estrutura

- `src/config/apps.ts` — IDs webOS e deep links (validar na TV)
- `src/services/webos.ts` — launch/listApps (mock no browser)
- `src/services/tmdb.ts` — catálogo + cache 24h
- `src/store/history.ts` — histórico em IndexedDB
- `src/store/auth.ts` — sessão Google do launcher
- `src/ui/screens/AccountScreen.tsx` — Device Code + QR
- `auth-server/` — API JWT + Google Device Code (Render)
- `src/domain/recommend.ts` — recomendações pelos últimos 5 títulos

Plano: `PLANO_LAUNCHER_WEBOS.md`.
