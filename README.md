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
npm install
```

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

## Estrutura

- `src/config/apps.ts` — IDs webOS e deep links (validar na TV)
- `src/services/webos.ts` — launch/listApps (mock no browser)
- `src/services/tmdb.ts` — catálogo + cache 24h
- `src/store/history.ts` — histórico em IndexedDB
- `src/domain/recommend.ts` — recomendações pelos últimos 5 títulos

Plano: `PLANO_LAUNCHER_WEBOS.md`.
