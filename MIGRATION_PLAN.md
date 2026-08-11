# 📋 Plano de Migração Brentor.ai → Next.js + Lovable

**Data**: 2026-08-03  
**Status**: Em preparação  
**Objetivo**: Conversão Express → Next.js mantendo 100% funcionalidade

---

## 📊 AUDITORIA COMPLETA DO PROJETO

### Backend (server.js - 97KB)

#### 10 Endpoints Express a Converter:
1. `GET /api/health` — Health check + status de APIs
2. `POST /api/health/recheck` — Força verificação de status
3. `POST /api/analyze` — Análise (com upload de arquivos)
4. `POST /api/compare` — Comparação de empresas (com upload)
5. `POST /api/chat` — Chat com Claude
6. `POST /api/mynews` — My News (notícias customizadas)
7. `POST /api/readnews` — Leitura de notícia individual
8. `POST /api/focus` — Focus (priorização com upload)
9. `POST /api/display` — Display (apresentações/dashboards com upload)
10. `POST /api/solve` — Solve (resolução de problemas)

#### Dependências Backend (manter exatamente):
- `@anthropic-ai/sdk`: ^0.39.0 → Claude API
- `dotenv`: ^16.4.5 → Variáveis de ambiente
- `multer`: ^1.4.5-lts.1 → Upload (converter para Next.js native)
- `pdf-parse`: ^1.1.1 → Parsing de PDFs
- `mammoth`: ^1.8.0 → Parsing de DOCX
- `cheerio`: ^1.0.0 → Parsing de HTML
- `express`: ^4.19.2 → ❌ Remover (Next.js substitui)

#### Funções Helper Críticas (extrair do server.js):
- `searchWeb()` — Tavily search wrapper
- `extractFileText()` — Parser de arquivos (PDF/DOCX/TXT)
- `fetchOgImage()` — Busca og:image de URL
- `buildSlides()` — Gerador de slides
- `buildContextPrompt()` — Construção de contexto
- Prompts do Claude (bem grandes — linhas 1408-1700+)

#### Variáveis de Ambiente (preservar):
- `ANTHROPIC_API_KEY` ✅
- `TAVILY_API_KEY` ✅
- `MODEL_FAST` = `claude-haiku-4-5-20251001`
- `MODEL_STANDARD` = `claude-sonnet-4-6`
- `MODEL_ADVANCED` = `claude-sonnet-4-6`
- `PORT` = `4173` (Next.js dev default)
- `NODE_ENV` = production/development

---

### Frontend (6.3KB JS + 1.1KB CSS)

#### Arquivos JavaScript (ordem de dependência):
1. `config.js` (311 linhas) — Ícones, cores, constantes
2. `store.js` (266 linhas) — State management (localStorage)
3. `engine.js` (219 linhas) — Lógica core (build slides, comparação)
4. `api.js` (148 linhas) — Wrapper HTTP para endpoints
5. `ui.js` (537 linhas) — Components (toast, modals, export PDF)
6. `views4.js` (206 linhas) — Views menores
7. `views3.js` (489 linhas) — Views (Focus, etc)
8. `views2.js` (1027 linhas) — Settings + Context
9. `views.js` (1622 linhas) — Views principais (Analysis, Compare, Display)
10. `app.js` (403 linhas) — App principal, routing, inicialização

#### Arquivo HTML:
- `index.html` (41 linhas) — Bootstrap puro, sem build

#### Estilos:
- `styles.css` (1113 linhas) — Todos os estilos (manter 100%)

#### Dependências Frontend (todas CDN/vanilla):
- **Nenhuma dependência NPM** — tudo é vanilla JS
- ICONs via SVG inline (em config.js)
- PptxGenJS (CDN para PPTX export)
- PDF via browser native (window.print)

---

## 🔄 ESTRUTURA NEXT.JS (ALVO)

```
brentor-ai-nextjs/
├── app/
│   ├── layout.tsx              ← HTML wrapper
│   ├── page.tsx                ← Frontend React (views)
│   ├── api/
│   │   ├── health/route.ts
│   │   ├── health/recheck/route.ts
│   │   ├── analyze/route.ts    ← com multer
│   │   ├── compare/route.ts
│   │   ├── chat/route.ts
│   │   ├── mynews/route.ts
│   │   ├── readnews/route.ts
│   │   ├── focus/route.ts
│   │   ├── display/route.ts
│   │   └── solve/route.ts
│   └── globals.css             ← styles.css copiado
├── lib/
│   ├── api-helpers.ts          ← searchWeb, extractFileText, etc
│   ├── prompts.ts              ← All Claude prompts
│   └── types.ts                ← TypeScript types
├── public/
│   └── assets/
│       └── img/
│           └── *.png           ← imagens do projeto
├── .env.local                   ← variáveis de ambiente
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

### Fase 1: Estrutura Next.js
- [ ] Criar projeto Next.js (App Router)
- [ ] Instalar dependências
- [ ] Configurar .env.local com as 3 chaves
- [ ] Configurar next.config.js para upload de arquivos
- [ ] Copiar assets (images, logo)

### Fase 2: Funções Helper (Backend Shared)
- [ ] Converter `searchWeb()` → `lib/api-helpers.ts`
- [ ] Converter `extractFileText()` + helpers → `lib/api-helpers.ts`
- [ ] Converter `fetchOgImage()` → `lib/api-helpers.ts`
- [ ] Extrair TODOS os prompts Claude → `lib/prompts.ts`
- [ ] Converter `buildSlides()` → `lib/engine.ts`
- [ ] Testar cada função isoladamente

### Fase 3: API Routes (1:1 com Express endpoints)
- [ ] `GET /api/health` + status check
- [ ] `POST /api/health/recheck`
- [ ] `POST /api/analyze` (com upload → FormData)
- [ ] `POST /api/compare` (com upload)
- [ ] `POST /api/chat`
- [ ] `POST /api/mynews`
- [ ] `POST /api/readnews`
- [ ] `POST /api/focus` (com upload)
- [ ] `POST /api/display` (com upload)
- [ ] `POST /api/solve`
- [ ] **Testar cada endpoint isoladamente** ← crítico

### Fase 4: Frontend React
- [ ] Converter `config.js` → `lib/config.ts` (ou context)
- [ ] Converter `store.js` → React Context + localStorage
- [ ] Converter `engine.js` lógica → hooks/utils
- [ ] Converter `ui.js` components → React components
- [ ] Converter `views*.js` → React components/pages
- [ ] Converter `app.js` routing → Next.js routing
- [ ] Colar `styles.css` em `globals.css`
- [ ] **Testar cada view** ← crítico

### Fase 5: Integração + Testes
- [ ] Testar Analysis (busca web + análise)
- [ ] Testar Compare (upload + comparação)
- [ ] Testar Display (gera slides)
- [ ] Testar Chat
- [ ] Testar My News
- [ ] Testar Focus
- [ ] Testar Solve
- [ ] Testar Settings/Context
- [ ] Testar exports (PDF, PPTX)
- [ ] Verificar localStorage sync
- [ ] Verificar variáveis de ambiente

### Fase 6: Deploy + Lovable
- [ ] Fazer push para GitHub
- [ ] Testar em staging
- [ ] Importar em Lovable
- [ ] Fazer deploy final

---

## 🚨 PONTOS CRÍTICOS (ZERO TOLERÂNCIA A PERDA)

### Backend
- [ ] Nenhum endpoint pode retornar resposta diferente
- [ ] Nenhuma lógica de Claude prompt pode ser alterada
- [ ] Upload de arquivos (multer) deve funcionar igual em FormData
- [ ] Tratamento de erro deve ser idêntico
- [ ] Rate limiting / status de APIs deve estar presente

### Frontend
- [ ] Nenhum visual deve mudar (CSS copiado 100%)
- [ ] Todos os atalhos de teclado devem funcionar
- [ ] LocalStorage sync deve ser igual
- [ ] Exports (PDF/PPTX) devem gerar o mesmo resultado
- [ ] Animações/transições devem ser preservadas

### Integração
- [ ] API → Frontend communication exatamente igual
- [ ] Formulários submitam os mesmos dados
- [ ] Responses são parseados da mesma forma
- [ ] Error handling é idêntico
- [ ] Variáveis de ambiente lidas corretamente

---

## 📝 NOTAS IMPORTANTES

1. **Multer → FormData**: Next.js API Routes usam FormData nativa. Precisamos adaptar, mas o resultado deve ser idêntico.

2. **Prompts do Claude**: São ENORMES (>20KB). Precisam estar em `lib/prompts.ts` ou similar para não poluir as routes.

3. **Views.js é GRANDE**: 1622 linhas. Será necessário quebrar em múltiplos arquivos React.

4. **localStorage**: Brentor usa localStorage para store. React Context + localStorage hook vai manter o mesmo comportamento.

5. **SSR vs Client**: Componentes de frontend precisam ser `'use client'` no Next.js App Router.

6. **PptxGenJS**: Carregado via CDN. Precisa estar em `next.config.js` para permitir script externo.

---

## 🎯 PRÓXIMOS PASSOS

1. Confirmação: você quer que eu comece?
2. Fase 1 (estrutura): ~20 min
3. Fase 2 (helpers): ~40 min
4. Fase 3 (API routes): ~60 min
5. Fase 4 (frontend React): ~90 min
6. Fase 5 (testes): ~30 min
7. **Total estimado**: ~4-5 horas

Vou com cuidado total para zero perdas. Cada fase será testada.
