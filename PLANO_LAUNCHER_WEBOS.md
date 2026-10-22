# Plano: Launcher para LG QNED82ASG (webOS)

> Cole a seção **"Prompt para o Cursor"** no chat do Cursor (Agent mode).
> Salve este arquivo na raiz do projeto como `PLAN.md` e peça ao Cursor para segui-lo fase por fase.

---

## 1. Prompt para o Cursor

```
Você é um engenheiro front-end sênior especialista em apps para smart TV (LG webOS).
Leia o arquivo PLAN.md na raiz do projeto e implemente o launcher fase por fase.

Regras:
- Execute UMA fase por vez e pare ao final de cada uma para eu validar.
- Antes de codar cada fase, liste os arquivos que vai criar ou alterar.
- TypeScript estrito, sem `any`.
- Nunca coloque chaves de API no código; use variáveis de ambiente (.env, no .gitignore).
- Performance é requisito: animações só com transform/opacity, sem blur pesado, listas virtualizadas.
- Toda navegação deve funcionar apenas com D-pad (setas + Enter + Back), sem mouse.
- Se algo depender do aparelho (IDs dos apps, deep links), isole em um arquivo de configuração
  e deixe um TODO claro para eu validar na TV.

Comece pela Fase 0.
```

---

## 2. Contexto

- **TV:** LG QNED82ASG (webOS). Apps webOS são web apps (HTML/CSS/JS) empacotados como `.ipk`.
- **Apps a integrar:** Netflix, HBO Max, Globoplay, YouTube.
- **Objetivo:** launcher com interface escura, organizada e fluida, inspirada em um dashboard de streaming (sidebar fina, hero grande, fileiras de cards).
- **Funcionalidades centrais:**
  1. Abrir os apps de streaming (e, quando possível, direto em um título via deep link).
  2. Seção **"Continuar de onde parei"**.
  3. **Recomendações** baseadas nos últimos 5 títulos/gêneros assistidos.

## 3. Limitações conhecidas (importante para o design)

- Nenhuma das plataformas expõe API pública de histórico ou "continuar assistindo", e um app não lê dados de outro app na TV.
- Solução adotada: o histórico vive **no próprio launcher**:
  - registro automático ao abrir um título pelo launcher (com marcação de episódio/temporada);
  - importação do CSV de "Atividade de visualização" da Netflix;
  - edição manual (marcar como assistido, remover, ajustar episódio).
- Deep links variam por app e precisam de teste no aparelho. Manter tudo em `src/config/apps.ts`.

## 4. Stack

| Camada | Escolha |
|---|---|
| Build | Vite + React 18 + TypeScript |
| Estado | Zustand (com persist) |
| Navegação por foco | `@noriginmedia/norigin-spatial-navigation` |
| Dados de catálogo | TMDB API v3 (+ `watch/providers` para o Brasil, `region=BR`) |
| Persistência local | IndexedDB (via `idb-keyval`) |
| Estilo | CSS Modules ou Tailwind (sem libs de UI pesadas) |
| Virtualização | `@tanstack/react-virtual` (fileiras horizontais) |
| Empacotamento | `@webos-tools/cli` (`ares-package`, `ares-install`, `ares-launch`) |
| Qualidade | ESLint + Prettier + Vitest |

## 5. Estrutura de pastas

```
launcher-webos/
├─ PLAN.md
├─ .env.example              # VITE_TMDB_API_KEY=
├─ webos/
│  ├─ appinfo.json
│  ├─ icon.png               # 80x80
│  └─ largeIcon.png          # 130x130
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ config/
│  │  └─ apps.ts             # ids dos apps webOS + templates de deep link
│  ├─ services/
│  │  ├─ webos.ts            # launch/listApps via webOS.service.request (com mock no navegador)
│  │  ├─ tmdb.ts             # cliente TMDB + cache
│  │  └─ importers/
│  │     └─ netflixCsv.ts
│  ├─ domain/
│  │  ├─ types.ts
│  │  └─ recommend.ts        # algoritmo de recomendação
│  ├─ store/
│  │  ├─ history.ts
│  │  └─ settings.ts
│  ├─ ui/
│  │  ├─ layout/ (Sidebar, TopBar, Shell)
│  │  ├─ Hero/
│  │  ├─ Row/
│  │  ├─ Card/
│  │  └─ focus/ (Focusable.tsx, useFocusRing.ts)
│  └─ styles/ (tokens.css, global.css)
└─ scripts/
   └─ deploy.sh              # build + package + install + launch
```

## 6. Modelo de dados

```ts
type Platform = 'netflix' | 'hbomax' | 'globoplay' | 'youtube';

interface WatchEntry {
  id: string;                 // uuid
  tmdbId?: number;
  mediaType: 'movie' | 'tv';
  title: string;
  platform: Platform;
  genreIds: number[];
  season?: number;
  episode?: number;
  progressPct?: number;       // 0-100, opcional (manual)
  lastWatchedAt: string;      // ISO
  finished: boolean;
}

interface AppConfig {
  platform: Platform;
  label: string;
  webosAppId: string;         // validar com listApps na TV
  deepLink?: (e: { tmdbId?: number; title: string }) => Record<string, unknown> | null;
}
```

## 7. Fases

### Fase 0 — Setup
- Projeto Vite + React + TS, ESLint, Prettier, Vitest.
- `.env.example`, `.gitignore` (inclui `.env`, `*.ipk`, `dist`).
- `webos/appinfo.json` e script `npm run deploy`.
- **Aceite:** `npm run dev` abre no navegador; `npm run build` gera `dist` com `appinfo.json` copiado.

### Fase 1 — Shell e design system
- Tokens: fundo `#000`/`#0B0B0F`, superfície `#14141A`, destaque (verde-água ou azul), raio 16px.
- Layout: Sidebar fina (ícones das 4 plataformas + histórico + configurações), TopBar (relógio, busca), área principal.
- Resolução alvo **1920×1080** (escala fixa; usar `rem` com base proporcional).
- **Aceite:** layout fiel à referência, sem scroll da página (só das fileiras).

### Fase 2 — Navegação por D-pad
- `Focusable` com anel de foco (scale 1.06 + borda), sem layout shift.
- Setas navegam entre sidebar ↔ hero ↔ fileiras; Enter ativa; Back (tecla 461 no webOS) volta/fecha.
- Fileiras lembram o último item focado.
- **Aceite:** 100% navegável sem mouse; foco nunca se perde.

### Fase 3 — Serviço webOS
- `services/webos.ts`: `launchApp(platform, params?)` e `listInstalledApps()` via `webOS.service.request('luna://com.webos.applicationManager', ...)`.
- Fora da TV (navegador), usar mock que apenas loga no console.
- Tela de diagnóstico (Configurações → "Apps instalados") listando ids reais para eu preencher `apps.ts`.
- **Aceite:** abrir cada plataforma a partir do launcher na TV.

### Fase 4 — Histórico ("Continuar de onde parei")
- Store persistida em IndexedDB.
- Ao abrir um título pelo launcher, registrar `WatchEntry` (com pergunta rápida de episódio quando for série).
- Hero com o item mais recente não finalizado; fileira "Continuar assistindo" ordenada por `lastWatchedAt`.
- Ações: marcar como concluído, remover, editar episódio.
- Importador de CSV da Netflix (arquivo carregado via tela de configurações ou colado em texto).
- **Aceite:** reiniciar o app mantém o histórico; hero reflete o último item.

### Fase 5 — TMDB
- `tmdb.ts`: busca, detalhes, gêneros, `recommendations`, `discover`, `watch/providers` (BR).
- Cache em memória + IndexedDB (TTL de 24h); imagens `w342` nos cards e `w780` no hero.
- Resolver `tmdbId` por título + ano quando faltar.
- **Aceite:** cards com pôster, nota e plataforma disponível.

### Fase 6 — Recomendação
Algoritmo em `domain/recommend.ts`:

1. Pegar os **5 últimos** `WatchEntry` distintos.
2. Calcular peso por recência: `[1.0, 0.8, 0.6, 0.45, 0.3]`.
3. Agregar gêneros (e keywords, se disponíveis) em um mapa `gênero → score`.
4. Buscar candidatos: `discover` pelos 2–3 gêneros top + `recommendations` dos 5 títulos.
5. Pontuar cada candidato: afinidade de gênero + popularidade normalizada + bônus se disponível nas **suas** plataformas.
6. Remover já assistidos; limitar a 20 itens; embaralhar levemente empates.
7. Fileiras: "Porque você assistiu {título}", "Em alta no {plataforma}", "Novidades nas suas plataformas".
- Testes unitários com casos de exemplo.
- **Aceite:** mudar o histórico muda as recomendações de forma coerente.

### Fase 7 — Performance e polimento
- Medir FPS no `ares-inspect`; meta ≥ 50 fps na navegação.
- Lazy load de fileiras fora da tela; pré-carregar só o backdrop do item focado.
- Skeletons em vez de spinners; estados vazios e de erro (sem internet / TMDB fora).
- Respeitar `prefers-reduced-motion`.
- **Aceite:** navegação sem engasgos; tempo de abertura < 3 s.

### Fase 8 — Deploy
- `scripts/deploy.sh`: `npm run build` → copiar `webos/*` para `dist` → `ares-package dist` → `ares-install` → `ares-launch`.
- README com o passo a passo de Developer Mode.

## 8. `appinfo.json` base

```json
{
  "id": "br.jonis.launcher",
  "version": "1.0.0",
  "vendor": "Jonis",
  "type": "web",
  "main": "index.html",
  "title": "Meu Launcher",
  "icon": "icon.png",
  "largeIcon": "largeIcon.png",
  "resolution": "1920x1080",
  "disableBackHistoryAPI": true
}
```

## 9. Regras de performance (resumo para o Cursor)

- Apenas `transform` e `opacity` em animações; `will-change` só em itens focados.
- Evitar `backdrop-filter`, sombras grandes e gradientes animados.
- Listas horizontais virtualizadas; no máximo ~8 cards renderizados por fileira.
- Imagens com `loading="lazy"`, tamanhos fixos e `decoding="async"`.
- Sem bibliotecas grandes (moment, lodash completo, UI kits).
- Bundle alvo: < 400 KB gzip.

## 10. Passo a passo de instalação na TV

1. Conta gratuita em `webostv.developer.lge.com`.
2. Na TV: instalar o app **Developer Mode**, entrar com a conta, ativar **Dev Mode Status** e **Key Server**, anotar o IP.
3. No PC: `npm install -g @webos-tools/cli`.
4. Registrar a TV:
   ```
   ares-setup-device --add minhatv --info "{'host':'IP_DA_TV','port':'9922','username':'prisoner'}"
   ares-novacom --device minhatv --getkey
   ```
5. `npm run build`, depois:
   ```
   ares-package dist
   ares-install --device minhatv br.jonis.launcher_1.0.0_all.ipk
   ares-launch --device minhatv br.jonis.launcher
   ```
6. Depurar: `ares-inspect --device minhatv --app br.jonis.launcher --open`.
7. Renovar a sessão de desenvolvedor periodicamente pelo app Developer Mode.

## 11. Checklist final

- [ ] IDs dos apps validados com `listApps` na TV
- [ ] Deep links testados (YouTube, Netflix, HBO Max, Globoplay)
- [ ] Navegação 100% por controle remoto
- [ ] Histórico persiste após reiniciar
- [ ] Recomendação coerente com os últimos 5 títulos
- [ ] Sem chave de API no repositório
- [ ] FPS e tempo de abertura dentro da meta

## 12. Regras para `.cursor/rules` (opcional)

```
- TypeScript estrito; sem `any`.
- Componentes pequenos e focáveis via <Focusable>.
- Nada de mouse/hover: toda interação deve ter estado de foco.
- Animar apenas transform/opacity.
- Serviços (webos, tmdb) isolados em /services e mockáveis.
- Nunca commitar .env ou chaves.
```
