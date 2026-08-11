/* ============================================================
   Brentor.ai — server.js
   Backend Node.js com Claude API + Tavily.
   Requer Node 18+, rodando em: http://localhost:4173
   ============================================================ */
'use strict';
// Carrega .env manualmente (compatível com Node 24 + dotenv 16)
(function loadEnv() {
  const fs = require('fs'), p = require('path').join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
})();

const express  = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 4173;

/* Evita que um erro isolado (ex.: falha de rede, JSON malformado de uma API externa)
   derrube o processo inteiro e tire o servidor do ar para todos os usuários.
   Sem isso, uma exceção não tratada em qualquer rota mata o Node — e o frontend,
   ao perder a conexão, cai silenciosamente no modo demo (mascarando o problema real). */
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

/* ── Validação de chaves ─────────────────────────────────── */
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-api03-SUA')) {
  console.error('\n❌  Chave Anthropic não configurada.');
  console.error('   1. Copie .env.example para .env');
  console.error('   2. Adicione sua chave ANTHROPIC_API_KEY');
  console.error('   3. Reinicie com: npm start\n');
  process.exit(1);
}
const hasTavily = !!(process.env.TAVILY_API_KEY && !process.env.TAVILY_API_KEY.includes('SUA_CHAVE'));

/* ── Modelos ─────────────────────────────────────────────── */
const M = {
  fast:     process.env.MODEL_FAST     || 'claude-3-5-haiku-20241022',
  standard: process.env.MODEL_STANDARD || 'claude-3-5-sonnet-20241022',
  advanced: process.env.MODEL_ADVANCED || 'claude-3-5-sonnet-20241022',
};

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Monitoramento de saúde das APIs (Anthropic / Tavily) ───────────────
   Detecta chave inválida ou créditos esgotados ANTES que isso vire um
   relatório quebrado pro usuário final. Alimentado por: (1) um teste real
   na inicialização, (2) toda chamada de produção (askClaude/searchWeb) que
   falhar por auth/crédito, (3) uma revalidação periódica em background. */
const apiHealth = {
  anthropic: { ok: null, lastError: null, lastCheckedAt: null },
  tavily:    { ok: hasTavily ? null : false, lastError: hasTavily ? null : 'TAVILY_API_KEY não configurada', lastCheckedAt: null },
};
function isAuthOrCreditError(e) {
  const status = e?.status || e?.response?.status;
  const msg = (e?.message || '').toLowerCase();
  return status === 401 || status === 403 || status === 429 ||
    msg.includes('credit balance') || msg.includes('invalid api key') ||
    msg.includes('authentication') || msg.includes('insufficient');
}
function alertApiProblem(provider, detail, howToFix) {
  console.error(`\n🚨🚨🚨 [BRENTOR-ALERT] Problema com ${provider} — ferramentas vão falhar para os usuários 🚨🚨🚨`);
  console.error(`   ${detail}`);
  console.error(`   ${howToFix}\n`);
}
async function checkAnthropicHealth() {
  try {
    await claude.messages.create({ model: M.fast, max_tokens: 5, messages: [{ role: 'user', content: 'oi' }] });
    if (apiHealth.anthropic.ok === false) console.log('✅ [Brentor] Anthropic voltou a funcionar normalmente.');
    apiHealth.anthropic = { ok: true, lastError: null, lastCheckedAt: new Date().toISOString() };
  } catch (e) {
    apiHealth.anthropic = { ok: false, lastError: e.message, lastCheckedAt: new Date().toISOString() };
    alertApiProblem('a chave/créditos da Anthropic', e.message, 'Verifique o saldo em https://console.anthropic.com/settings/billing');
  }
}
async function checkTavilyHealth() {
  if (!hasTavily) return;
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: 'teste', max_results: 1 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    if (apiHealth.tavily.ok === false) console.log('✅ [Brentor] Tavily voltou a funcionar normalmente.');
    apiHealth.tavily = { ok: true, lastError: null, lastCheckedAt: new Date().toISOString() };
  } catch (e) {
    apiHealth.tavily = { ok: false, lastError: e.message, lastCheckedAt: new Date().toISOString() };
    alertApiProblem('a chave/créditos da Tavily', e.message, 'Verifique o saldo em https://app.tavily.com/');
  }
}
// Teste real na subida do servidor — não espera o primeiro usuário quebrar pra descobrir.
Promise.all([checkAnthropicHealth(), checkTavilyHealth()]).then(() => {
  const a = apiHealth.anthropic.ok, t = apiHealth.tavily.ok;
  console.log(`🔑 [Brentor] Checagem de chaves na subida — Anthropic: ${a ? '✅ ok' : '❌ PROBLEMA'} · Tavily: ${t ? '✅ ok' : (hasTavily ? '❌ PROBLEMA' : '⚪ não configurada')}`);
});
// Revalida a cada 6h em background, pra pegar créditos que se esgotaram com o servidor no ar.
setInterval(checkAnthropicHealth, 6 * 60 * 60 * 1000);
setInterval(checkTavilyHealth, 6 * 60 * 60 * 1000);

/* Proteção de marca: o usuário final só deve enxergar "Brentor".
   Injetada em todo prompt de sistema para que o modelo nunca cite ferramentas,
   APIs, modelos de IA ou provedores usados nos bastidores. */
const BRAND_GUARD = `

REGRA DE MARCA (OBRIGATÓRIA): Você é o motor do Brentor. NUNCA mencione nomes de ferramentas, APIs, modelos de IA, mecanismos de busca ou provedores de tecnologia usados internamente (ex.: Tavily, Claude, Anthropic, OpenAI, GPT). Não use rótulos como "Resumo Tavily", "segundo o Claude", "fonte: Tavily" ou similares. Refira-se a qualquer dado obtido apenas como "pesquisa Brentor", "pesquisa web", "fontes consultadas" ou "análise Brentor". Para o usuário, tudo é Brentor.`;

/* ── Middlewares ─────────────────────────────────────────── */
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname)));   // serve o frontend

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* ────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────── */

/* Busca web via Tavily — suporta múltiplas queries em paralelo */
async function searchWeb(queries, maxResults = 6, opts = {}) {
  if (!hasTavily) { const empty = []; empty.images = []; return empty; }
  const results = [];
  const images = [];
  const maxQueries = Math.min(queries.length, opts.maxQueries || 8);
  const fetches = await Promise.allSettled(queries.slice(0, maxQueries).map(async q => {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: q, max_results: maxResults,
        // 'basic' é ~2-3x mais rápido que 'advanced' e já traz o resumo + resultados.
        // Só usamos 'advanced' quando a rota pede explicitamente (ex.: Deep Analysis).
        search_depth: opts.depth === 'advanced' ? 'advanced' : 'basic',
        include_answer: true,
        include_raw_content: false,
        include_images: !!opts.includeImages,
      }),
    });
    if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 432 || res.status === 433) && apiHealth.tavily.ok !== false) {
      const detail = `HTTP ${res.status}: ${(await res.text().catch(()=> '')).slice(0, 200)}`;
      apiHealth.tavily = { ok: false, lastError: detail, lastCheckedAt: new Date().toISOString() };
      alertApiProblem('a chave/créditos da Tavily', detail, 'Verifique o saldo em https://app.tavily.com/');
      return {};
    }
    if (res.ok && apiHealth.tavily.ok === false) { apiHealth.tavily = { ok: true, lastError: null, lastCheckedAt: new Date().toISOString() }; console.log('✅ [Brentor] Tavily voltou a funcionar normalmente.'); }
    return res.json();
  }));
  const seen = new Set();
  const seenImg = new Set();
  fetches.forEach(r => {
    if (r.status === 'fulfilled' && r.value.results) {
      r.value.results.forEach(item => {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          results.push(`[${item.title}]\n${item.content}\nFonte: ${item.url}`);
        }
      });
      if (r.value.answer) results.unshift(`[Resumo da pesquisa web]\n${r.value.answer}`);
      (r.value.images || []).forEach(img => {
        const url = typeof img === 'string' ? img : img.url;
        if (url && !seenImg.has(url)) { seenImg.add(url); images.push(url); }
      });
    }
  });
  results.images = images;
  return results;
}

/* Consulta cadastro oficial de CNPJ (BrasilAPI / Receita Federal) */
async function fetchCNPJ(cnpj) {
  const digits = (cnpj || '').replace(/\D/g, '');
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const socios = (d.qsa || []).map(s => `${s.nome_socio} (${s.qualificacao_socio})`).join('; ');
    return [
      `[CADASTRO OFICIAL — Receita Federal via BrasilAPI]`,
      `Razão Social: ${d.razao_social || 'N/A'}`,
      `Nome Fantasia: ${d.nome_fantasia || 'N/A'}`,
      `CNPJ: ${d.cnpj || digits}`,
      `Situação Cadastral: ${d.descricao_situacao_cadastral || 'N/A'} (desde ${d.data_situacao_cadastral || 'N/A'})`,
      `Data de Abertura: ${d.data_inicio_atividade || 'N/A'}`,
      `Natureza Jurídica: ${d.natureza_juridica || 'N/A'}`,
      `Porte: ${d.porte || 'N/A'}`,
      `Capital Social: R$ ${Number(d.capital_social || 0).toLocaleString('pt-BR')}`,
      `Atividade Principal (CNAE): ${d.cnae_fiscal_descricao || 'N/A'}`,
      `Endereço: ${[d.logradouro, d.numero, d.bairro, d.municipio, d.uf, d.cep].filter(Boolean).join(', ')}`,
      `Telefone: ${d.ddd_telefone_1 || 'N/A'}`,
      `Email: ${d.email || 'N/A'}`,
      socios ? `Quadro Societário (QSA): ${socios}` : '',
      `Fonte: https://brasilapi.com.br/api/cnpj/v1/${digits}`,
    ].filter(Boolean).join('\n');
  } catch { return null; }
}

/* Extrai um CNPJ de um texto livre ou de resultados de busca */
function findCNPJ(...texts) {
  for (const t of texts) {
    const m = (t || '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (m) return m[0];
  }
  return null;
}

/* Busca conteúdo de uma URL (para Focus) */
async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Brentor.ai/1.0 (business intelligence bot)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const { load } = require('cheerio');
    const $ = load(html);
    $('script,style,nav,footer,header,aside').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
    return { url, text, title: $('title').text().trim() };
  } catch (e) {
    return { url, text: '', error: e.message };
  }
}

/* Extrai texto de arquivo em buffer */
async function extractFileText(buffer, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  try {
    if (['.txt','.csv','.json','.md','.xml'].includes(ext)) {
      return buffer.toString('utf-8').slice(0, 30000);
    }
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text.slice(0, 30000);
    }
    if (['.doc','.docx'].includes(ext)) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value.slice(0, 30000);
    }
    if (['.png','.jpg','.jpeg','.gif','.webp'].includes(ext)) {
      return `[IMAGEM: ${originalname}]`; // Claude vision trata abaixo
    }
    return `[Formato ${ext} não suportado para extração de texto]`;
  } catch (e) {
    return `[Erro ao ler ${originalname}: ${e.message}]`;
  }
}

/* Contexto do usuário formatado para os prompts */
function ctxBlock(context) {
  if (!context || !context.filled) return '';
  const lines = [];
  if (context.companyName) lines.push(`Empresa do usuário: ${context.companyName}`);
  if (context.sector)      lines.push(`Setor: ${context.sector}`);
  if (context.size)        lines.push(`Porte: ${context.size}`);
  if (context.region)      lines.push(`Região: ${context.region}`);
  if (context.role)        lines.push(`Cargo: ${context.role}`);
  if (context.area)        lines.push(`Área: ${context.area}`);
  if (context.challenges)  lines.push(`Desafios atuais: ${context.challenges}`);
  if (context.differentials) lines.push(`Diferenciais: ${context.differentials}`);
  return lines.length ? '\n--- CONTEXTO DO USUÁRIO ---\n' + lines.join('\n') + '\n---\n' : '';
}

/* Chama Claude e devolve o texto da resposta.
   opts.effort ('low'|'medium'|'high') controla profundidade × velocidade nos
   modelos Sonnet/Opus. O padrão da API é 'high'; usamos 'medium' (equilíbrio
   recomendado qualidade × custo) para acelerar a resposta das ferramentas.
   ATENÇÃO: o Haiku NÃO aceita o parâmetro effort (retorna 400) — por isso ele
   só é enviado para modelos Sonnet/Opus. */
async function askClaude(system, userMsg, model, maxTokens = 4096, opts = {}) {
  try {
    const body = {
      model,
      max_tokens: maxTokens,
      system: (system || '') + BRAND_GUARD,
      messages: [{ role: 'user', content: userMsg }],
    };
    if (/sonnet|opus/i.test(model)) {
      body.output_config = { effort: opts.effort || 'medium' };
    }
    const msg = await claude.messages.create(body);
    if (apiHealth.anthropic.ok === false) { apiHealth.anthropic = { ok: true, lastError: null, lastCheckedAt: new Date().toISOString() }; console.log('✅ [Brentor] Anthropic voltou a funcionar normalmente.'); }
    return msg.content[0]?.text || '';
  } catch (e) {
    if (isAuthOrCreditError(e) && apiHealth.anthropic.ok !== false) {
      apiHealth.anthropic = { ok: false, lastError: e.message, lastCheckedAt: new Date().toISOString() };
      alertApiProblem('a chave/créditos da Anthropic', e.message, 'Verifique o saldo em https://console.anthropic.com/settings/billing');
    }
    throw e;
  }
}

/* Tenta reparar um JSON truncado (resposta cortada por limite de tokens):
   fecha strings/colchetes/chaves em aberto e remove vírgula/dois-pontos finais. */
function repairTruncatedJSON(s) {
  const start = s.indexOf('{');
  if (start < 0) return null;
  s = s.slice(start);
  const direct = (str) => { try { return JSON.parse(str); } catch { return undefined; } };
  let d = direct(s);
  if (d !== undefined) return d;
  // varre rastreando string/escape e profundidade; marca último ponto "fechável"
  let inStr = false, esc = false, lastGood = -1;
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') { inStr = false; lastGood = i + 1; }
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') { stack.pop(); lastGood = i + 1; }
    else if (ch === ',') lastGood = i;                 // corta ANTES da vírgula pendente
    else if (/[\d.eE+\-]/.test(ch) || /[a-z]/.test(ch)) lastGood = i + 1; // primitivo (número/true/false/null)
  }
  let body = s.slice(0, lastGood > 0 ? lastGood : s.length).replace(/[\s,:]+$/, '');
  // recalcula fechamentos pendentes a partir do corpo final
  const closers = []; inStr = false; esc = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') closers.push('}');
    else if (ch === '[') closers.push(']');
    else if (ch === '}' || ch === ']') closers.pop();
  }
  if (inStr) body += '"';
  // se terminar logo após uma chave sem valor (ou "chave":), remove a chave pendente
  body = body.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:?\s*$/, '');
  for (let i = closers.length - 1; i >= 0; i--) body += closers[i];
  const repaired = direct(body);
  if (repaired !== undefined) { repaired._truncated = true; return repaired; }
  return null;
}

/* Extrai JSON de uma resposta Claude (tolerante a markdown e a truncamento) */
function extractJSON(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (match) {
    try { return JSON.parse(match[1]); } catch { /* tenta parse direto / reparo */ }
  }
  try { return JSON.parse(text); } catch { /* tenta reparo abaixo */ }
  const repaired = repairTruncatedJSON((match && match[1]) || text);
  if (repaired) return repaired;
  return { error: 'Formato de resposta inesperado', raw: text.slice(0, 300) };
}

/* Aplica um patch de revisão (anular campos / remover itens de listas) ao resultado. */
function applyReviewPatch(obj, patch) {
  const getPath = (root, path) => {
    let cur = root;
    for (const p of String(path).split('.')) { if (cur == null) return undefined; cur = cur[p]; }
    return cur;
  };
  const setPath = (root, path, val) => {
    const parts = String(path).split('.'); let cur = root;
    for (let i = 0; i < parts.length - 1; i++) { if (cur == null) return; cur = cur[parts[i]]; }
    if (cur && typeof cur === 'object' && parts[parts.length-1] in cur) cur[parts[parts.length-1]] = val;
  };
  (patch.null_fields || []).forEach(p => { if (typeof p === 'string') setPath(obj, p, null); });
  (patch.drop_items || []).forEach(d => {
    if (!d || !d.path) return;
    const arr = getPath(obj, d.path);
    if (!Array.isArray(arr)) return;
    const bad = (d.contains || []).map(s => String(s || '').toLowerCase()).filter(Boolean);
    if (!bad.length) return;
    const filtered = arr.filter(item => {
      const s = (typeof item === 'string' ? item : JSON.stringify(item)).toLowerCase();
      return !bad.some(b => s.includes(b));
    });
    setPath(obj, d.path, filtered);
  });
}

/* Agente revisor (enxuto): confere o resultado e devolve apenas um PATCH compacto
   com o que remover (fora de escopo, placeholders, alucinações). A saída pequena
   torna a chamada muito mais rápida que reescrever o JSON inteiro.
   Nunca adiciona informação nova. Em caso de falha, devolve o original intacto. */
async function reviewResult(result, requestDesc, _maxTokens) {
  if (!result || result.error) return result;
  try {
    const raw = await askClaude(
      `Você é o agente revisor de qualidade da Brentor.ai. Outro agente gerou um JSON para entrega ao usuário. NÃO reescreva o conteúdo — apenas APONTE problemas.

Identifique somente o que for CLARAMENTE problemático:
1. Campos com conteúdo fora do escopo da solicitação, alucinações, placeholders ("Métrica A", "item 1", "exemplo", "lorem ipsum") ou instruções internas vazadas → anular.
2. Itens de listas genéricos/placeholder/irrelevantes → remover.
Seja CONSERVADOR: na dúvida, NÃO marque. Conteúdo plausível e específico deve ser mantido.

Responda SOMENTE com um JSON compacto, sem comentários:
{
  "null_fields": ["caminho.do.campo", ...],
  "drop_items": [ { "path": "caminho.da.lista", "contains": ["trecho do item ruim", ...] } ]
}
Use ponto para aninhamento (ex: "reputation.highlights"). Se estiver tudo certo, devolva {"null_fields":[],"drop_items":[]}.`,
      `SOLICITAÇÃO ORIGINAL DO USUÁRIO: ${requestDesc}\n\nJSON A REVISAR:\n${JSON.stringify(result)}`,
      M.fast, 1200);
    const patch = extractJSON(raw);
    if (patch && !patch.error && typeof patch === 'object') {
      applyReviewPatch(result, patch);
      result._reviewed = true;
    }
  } catch (e) { console.error('[review]', e.message); }
  return result;
}

/* ────────────────────────────────────────────────────────────
   HEALTH CHECK
   ──────────────────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true, ai: true,
    tavily: hasTavily,
    models: M,
    version: '1.0',
    apiHealth, // { anthropic:{ok,lastError,lastCheckedAt}, tavily:{...} } — usado pelo painel de Administração
  });
});

// Checagem em tempo real, sob demanda — dispara chamadas reais e devolve o resultado atualizado.
// Usado pelo botão "Verificar agora" no painel de Administração.
app.post('/api/health/recheck', async (req, res) => {
  try {
    await Promise.all([checkAnthropicHealth(), checkTavilyHealth()]);
    res.json({ ok: true, apiHealth });
  } catch (e) {
    res.json({ ok: false, error: e.message, apiHealth });
  }
});

/* ────────────────────────────────────────────────────────────
   ANALYSIS — pesquisa e relatório de empresa
   ──────────────────────────────────────────────────────────── */
app.post('/api/analyze', upload.array('files', 5), async (req, res) => {
  const { name, info, relation } = req.body;
  const deep = req.body.deep === '1' || req.body.deep === 'true' || req.body.deep === true;
  const links = req.body.links ? (typeof req.body.links === 'string' ? JSON.parse(req.body.links) : req.body.links) : [];
  let context = req.body.context;
  if (typeof context === 'string') { try { context = JSON.parse(context); } catch { context = null; } }
  if (!name) return res.status(400).json({ ok:false, error:'Nome da empresa obrigatório' });

  try {
    const yr = new Date().getFullYear();

    // Extrai texto dos arquivos anexados pelo usuário (contrato, apresentação, planilha etc.)
    // — antes esses arquivos eram descartados silenciosamente e a análise saía genérica.
    const files = req.files || [];
    const fileTexts = [];
    for (const f of files) {
      const text = await extractFileText(f.buffer, f.mimetype, f.originalname);
      if (text) fileTexts.push(`[Arquivo anexado pelo usuário: ${f.originalname}]\n${text}`);
    }

    // --- QUERIES DE BUSCA: padrão (6) ou Deep (9) ---
    const baseQueries = [
      `"${name}" site oficial sobre empresa história fundação CNPJ razão social`,
      `"${name}" sócios diretoria quadro societário administração`,
      `"${name}" ${info||''} mercado clientes produtos serviços endereço`,
      `"${name}" reclame aqui reclamações nota avaliação reputação clientes`,
      `"${name}" avaliações google comentários opiniões satisfação clientes`,
      `"${name}" instagram linkedin facebook redes sociais seguidores presença digital`,
    ];
    const deepQueries = deep ? [
      `"${name}" receita faturamento lucro balanço resultados financeiros ${yr}`,
      `"${name}" processos judiciais trabalhistas sanções multas`,
      `"${name}" ESG sustentabilidade compliance governança práticas ambientais`,
    ] : [];

    // Query adicional para localizar CNPJ em fontes públicas (cnpj.biz, empresas.net, etc.)
    const cnpjQuery = `"${name}" CNPJ cadastro empresa`;
    const searchResults = await searchWeb(
      [...baseQueries, ...deepQueries, cnpjQuery],
      deep ? 8 : 6,
      { maxQueries: deep ? 10 : 7, depth: deep ? 'advanced' : 'basic' }
    );

    // Consulta cadastro oficial na Receita Federal (BrasilAPI) se houver CNPJ
    const cnpjFound = findCNPJ(info, name, ...searchResults.slice(0, 15));
    const cnpjData = cnpjFound ? await fetchCNPJ(cnpjFound) : null;
    if (cnpjData) searchResults.unshift(cnpjData);

    // Busca conteúdo dos links fornecidos pelo usuário
    const linkResults = [];
    if (links && links.length) {
      const fetches = await Promise.allSettled(links.slice(0, 5).map(u => fetchUrl(u)));
      fetches.forEach(r => {
        if (r.status === 'fulfilled' && r.value.text) {
          linkResults.push(`[Link fornecido: ${r.value.title || r.value.url}]\n${r.value.text}\nFonte: ${r.value.url}`);
        }
      });
    }

    const fileBlock = fileTexts.length
      ? '\n--- ARQUIVO(S) ANEXADO(S) PELO USUÁRIO (fonte primária — prioridade sobre a web) ---\n' + fileTexts.join('\n\n') + '\n---\n'
      : '';
    const allResults = [...linkResults, ...searchResults];
    const webBlock = allResults.length
      ? '\n--- DADOS COLETADOS DA INTERNET E LINKS FORNECIDOS ---\n' + allResults.join('\n\n') + '\n---\n'
      : (fileTexts.length ? '' : '\n[ATENÇÃO: Nenhuma fonte web disponível. Marque todos os campos como null.]\n');

    const lensMap = {
      cliente:    'CLIENTE: investigue saúde financeira, reputação, capacidade de pagamento e potencial de expansão.',
      fornecedor: 'FORNECEDOR: investigue confiabilidade, capacidade de entrega, histórico e riscos de dependência.',
      concorrente:'CONCORRENTE: investigue posicionamento, diferenciais, market share e estratégias de mercado.',
      outra:      'INVESTIGAÇÃO GERAL: levante o máximo de informações verificáveis sobre a empresa.',
    };

    const system = `Você é um investigador de inteligência corporativa da Brentor.ai. Sua função é montar dossiês ${deep ? 'APROFUNDADOS (modo Deep Analysis)' : 'completos'} sobre empresas.

REGRAS OBRIGATÓRIAS:
1. Use EXCLUSIVAMENTE as informações dos DADOS COLETADOS. Não invente NADA.
2. Se um dado NÃO aparece nas fontes, retorne null — NUNCA estime ou fabrique.
3. Extraia o MÁXIMO de informações relevantes das fontes.
4. No campo "sources", liste APENAS URLs/fontes realmente usadas.
5. Se encontrar informações contraditórias entre fontes, mencione a divergência.
6. Se houver bloco [CADASTRO OFICIAL — Receita Federal], esses dados são OFICIAIS e têm prioridade máxima para CNPJ, situação cadastral, sócios, capital social, endereço e natureza jurídica.
7. Dê atenção especial a: reclamações (Reclame Aqui e similares), notas/avaliações de clientes, comentários e presença em redes sociais — preencha customerFeedback e socialPresence com tudo que encontrar.
8. Se houver bloco [ARQUIVO(S) ANEXADO(S) PELO USUÁRIO], esse conteúdo foi fornecido diretamente pelo usuário sobre a própria empresa — é fonte PRIMÁRIA e tem prioridade sobre dados genéricos da web. Extraia dele o máximo de dados concretos (números, produtos, histórico, sócios etc.) antes de recorrer à web.
${deep ? '9. MODO DEEP: analise com rigor de due diligence — avalie compliance, ESG, saúde financeira, riscos jurídicos e governança.' : ''}
${ctxBlock(context)}`;

    // --- JSON STRUCTURE: base + seções Deep ---
    const deepSections = deep ? `
  "dueDiligence": {
    "overallRisk": "BAIXO/MÉDIO/ALTO — avaliação baseada nas fontes",
    "riskJustification": "justificativa em 2-3 frases baseada nos dados encontrados",
    "financialHealth": {
      "status": "SAUDÁVEL/ATENÇÃO/CRÍTICO ou null se sem dados",
      "indicators": ["indicador encontrado nas fontes", "outro indicador"],
      "debt": "informações sobre endividamento/dívidas ou null",
      "profitability": "informações sobre lucro/margem ou null"
    },
    "compliance": {
      "status": "REGULAR/IRREGULAR/INCONCLUSIVO ou null",
      "cnpjStatus": "situação cadastral (ativa/baixada/suspensa) se encontrada ou null",
      "taxIssues": "pendências fiscais encontradas ou null",
      "regulatoryIssues": "problemas regulatórios encontrados ou null",
      "certifications": ["certificação encontrada"] ou null
    },
    "esg": {
      "environmental": "práticas ambientais encontradas ou null",
      "social": "práticas sociais/trabalhistas encontradas ou null",
      "governance": "práticas de governança encontradas ou null",
      "esgScore": "nota ESG se encontrada ou null",
      "controversies": ["controvérsia ESG encontrada"] ou null
    },
    "legal": {
      "lawsuits": "processos judiciais encontrados ou null",
      "laborIssues": "questões trabalhistas ou null",
      "consumerComplaints": "volume/natureza de reclamações ou null",
      "sanctions": "sanções/penalidades encontradas ou null"
    },
    "governance": {
      "boardStructure": "informações sobre conselho/diretoria ou null",
      "transparency": "nível de transparência (publica balanço, RI, etc) ou null",
      "auditedBy": "empresa de auditoria ou null",
      "listedExchange": "bolsa(s) onde é listada ou null"
    }
  },
` : '';

    const userMsg = `Investigue a empresa: "${name}"
Contexto: ${relation || 'outra'} — ${lensMap[relation] || lensMap.outra}
Informações do usuário: ${info || 'nenhuma'}
${deep ? 'MODO: Deep Analysis (due diligence completa — compliance, ESG, saúde financeira, riscos jurídicos)' : ''}
${fileBlock}${webBlock}

IMPORTANTE: Baseie-se APENAS nos dados coletados. Extraia o máximo de informações reais.

Retorne um JSON com exatamente esta estrutura (use null para QUALQUER campo sem informação nas fontes):
{
  "name": "razão social ou nome oficial",
  "tradeName": "nome fantasia ou marca comercial ou null",
  "cnpj": "CNPJ se encontrado ou null",
  "sector": "setor / segmento de atuação",
  "description": "descrição da empresa em 2-3 frases — o que faz, como opera",

  "address": {
    "street": "endereço completo ou null",
    "city": "cidade ou null",
    "state": "estado / UF ou null",
    "country": "país ou null",
    "cep": "CEP ou null"
  },

  "contacts": {
    "website": "site oficial ou null",
    "phone": "telefone principal ou null",
    "email": "email de contato ou null",
    "instagram": "perfil Instagram ou null",
    "facebook": "perfil Facebook ou null",
    "linkedin": "perfil LinkedIn ou null",
    "otherSocial": ["outros perfis sociais encontrados"] ou null
  },

  "corporate": {
    "founded": "ano de fundação ou null",
    "founders": "fundador(es) ou null",
    "partners": ["sócio/diretor 1 — cargo", "sócio 2 — cargo"] ou null,
    "legalNature": "natureza jurídica (ex: LTDA, S/A, MEI) ou null",
    "capitalStock": "capital social registrado ou null",
    "subsidiaries": ["subsidiárias ou empresas do grupo"] ou null,
    "parentCompany": "empresa controladora ou null"
  },

  "operations": {
    "employees": "número de colaboradores com fonte ou null",
    "size": "porte (MEI, ME, EPP, Médio, Grande) ou null",
    "products": ["produto/serviço 1", "produto/serviço 2"],
    "mainClients": ["cliente 1", "cliente 2"] ou null,
    "mainSuppliers": ["fornecedor 1", "fornecedor 2"] ou null,
    "regions": "regiões/mercados onde atua ou null",
    "competitors": ["concorrente 1", "concorrente 2"] ou null
  },

  "financial": {
    "revenue": "receita com fonte e ano ou null — NÃO ESTIME",
    "revTrend": [valores numéricos históricos] ou null,
    "growth": "crescimento com fonte ou null",
    "marketShare": "participação de mercado com fonte ou null",
    "stockTicker": "código na bolsa ou null",
    "financialNotes": "informações financeiras adicionais ou null"
  },

  "reputation": {
    "highlights": ["destaque positivo encontrado nas fontes"],
    "risks": ["risco ou ponto de atenção encontrado nas fontes"],
    "awards": ["prêmio ou reconhecimento"] ou null,
    "lawsuits": "informações sobre processos ou null",
    "reclameAqui": "nota ou reputação no Reclame Aqui ou null",
    "nps": "NPS/satisfação se encontrado ou null"
  },

  "customerFeedback": {
    "overallSentiment": "POSITIVO/NEUTRO/NEGATIVO/MISTO ou null — baseado em avaliações encontradas",
    "ratings": [{"platform": "Reclame Aqui / Google / Glassdoor / etc", "score": "nota encontrada", "detail": "contexto"}] ou null,
    "commonComplaints": ["tema de reclamação recorrente encontrado"] ou null,
    "commonPraises": ["elogio/ponto positivo recorrente"] ou null,
    "responseQuality": "como a empresa responde reclamações (taxa de resposta/solução) ou null"
  },

  "socialPresence": {
    "summary": "avaliação geral da presença digital ou null",
    "profiles": [{"platform": "Instagram/LinkedIn/etc", "handle": "@perfil ou URL", "followers": "seguidores se encontrado", "activity": "nível de atividade/engajamento ou null"}] ou null,
    "contentStrategy": "tipo de conteúdo que publica ou null"
  },

  "recentNews": [
    {"title": "título", "summary": "resumo", "source": "fonte", "date": "data"}
  ] ou null,

${deepSections}
  "summary": "resumo investigativo em ${deep ? '4-6' : '3-4'} parágrafos${deep ? ', incluindo avaliação de risco, compliance e ESG' : ''}. Baseado APENAS nas fontes. Ótica: ${relation||'investigação geral'}.",
  "score": número 0-100 (confiabilidade geral),
  "sparse": boolean,
  "sources": ["fonte real utilizada"]
}`;

    const raw = await askClaude(system, userMsg, deep ? M.advanced : M.standard, deep ? 12000 : 8000);
    let company = extractJSON(raw);
    company = await reviewResult(company, `Dossiê investigativo da empresa "${name}" (relação: ${relation || 'geral'}). Todo o conteúdo deve ser sobre essa empresa, baseado nas fontes.`, deep ? 12000 : 8000);
    company.known = true;
    company.input = name;
    company._deep = !!deep;

    res.json({ ok: true, company });
  } catch (e) {
    console.error('[analyze]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   COMPARE — comparação de empresas
   ──────────────────────────────────────────────────────────── */
app.post('/api/compare', upload.array('files', 5), async (req, res) => {
  const names = req.body.names ? (typeof req.body.names === 'string' ? JSON.parse(req.body.names) : req.body.names) : [];
  const { reason } = req.body;
  const links = req.body.links ? (typeof req.body.links === 'string' ? JSON.parse(req.body.links) : req.body.links) : [];
  let context = req.body.context;
  if (typeof context === 'string') { try { context = JSON.parse(context); } catch { context = null; } }
  if (!names || names.length < 2) return res.status(400).json({ ok:false, error:'Informe ao menos duas empresas' });

  try {
    const yr = new Date().getFullYear();

    // Extrai texto dos arquivos anexados (ex.: apresentação/planilha de uma das empresas)
    const files = req.files || [];
    const fileTexts = [];
    for (const f of files) {
      const text = await extractFileText(f.buffer, f.mimetype, f.originalname);
      if (text) fileTexts.push(`[Arquivo anexado pelo usuário: ${f.originalname}]\n${text}`);
    }

    // Queries individuais por empresa + comparativas
    const queries = [
      names.map(n => `"${n}"`).join(' vs ') + ` comparação mercado ${yr}`,
      ...names.map(n => `"${n}" empresa CNPJ receita faturamento porte clientes ${yr}`),
      ...names.map(n => `"${n}" reclame aqui reclamações nota avaliação google clientes`),
      ...names.map(n => `"${n}" redes sociais instagram linkedin presença digital reputação`),
    ];
    const searchResults = await searchWeb(queries, 5, { maxQueries: 1 + names.length * 3 });

    // Cadastro oficial (BrasilAPI) por empresa, quando o CNPJ aparece nas fontes
    const cnpjBlocks = await Promise.all(names.map(async n => {
      const hits = searchResults.filter(r => r.toLowerCase().includes(n.toLowerCase()));
      const c = findCNPJ(...hits.slice(0, 5));
      return c ? fetchCNPJ(c) : null;
    }));
    cnpjBlocks.filter(Boolean).forEach(b => searchResults.unshift(b));

    // Links fornecidos
    const linkResults = [];
    if (links && links.length) {
      const fetches = await Promise.allSettled(links.slice(0, 5).map(u => fetchUrl(u)));
      fetches.forEach(r => {
        if (r.status === 'fulfilled' && r.value.text) {
          linkResults.push(`[Link fornecido: ${r.value.title || r.value.url}]\n${r.value.text}\nFonte: ${r.value.url}`);
        }
      });
    }

    const fileBlock = fileTexts.length
      ? '\n--- ARQUIVO(S) ANEXADO(S) PELO USUÁRIO (fonte primária — prioridade sobre a web) ---\n' + fileTexts.join('\n\n') + '\n---\n'
      : '';
    const allResults = [...linkResults, ...searchResults];
    const webBlock = allResults.length
      ? '\n--- DADOS COLETADOS DA INTERNET E LINKS FORNECIDOS ---\n' + allResults.join('\n\n') + '\n---\n' : '';

    const system = `Você é um analista de inteligência competitiva da Brentor.ai. Produz comparações detalhadas e aprofundadas entre empresas.

REGRAS OBRIGATÓRIAS:
1. Use EXCLUSIVAMENTE os dados das fontes fornecidas. Não invente números ou métricas.
2. Se um dado não aparece nas fontes, retorne null — NUNCA estime.
3. No campo sources, liste apenas URLs/fontes realmente utilizadas.
4. Avalie cada empresa nos critérios: porte, finanças, reputação, satisfação de clientes, presença digital, compliance e risco.
5. A recomendação deve ser detalhada e justificada com dados das fontes.
6. Se houver bloco [CADASTRO OFICIAL — Receita Federal], esses dados são OFICIAIS e têm prioridade (situação cadastral, porte, capital social, sócios).
7. Use reclamações, notas de clientes e presença em redes sociais como critérios de comparação — eles diferenciam empresas na prática.
8. Se houver bloco [ARQUIVO(S) ANEXADO(S) PELO USUÁRIO], é fonte PRIMÁRIA fornecida diretamente pelo usuário sobre uma das empresas — priorize esses dados sobre resultados genéricos da web.
${ctxBlock(context)}`;

    const userMsg = `Compare as empresas: ${names.join(', ')}
Objetivo: ${reason || 'análise competitiva geral'}
${fileBlock}${webBlock}

IMPORTANTE: Use APENAS dados das fontes. Não invente.

Retorne JSON:
{
  "companies": [
    {
      "name": "nome oficial",
      "sector": "setor ou null",
      "region": "região de atuação ou null",
      "employees": "porte/colaboradores ou null",
      "revenue": "receita com fonte ou null",
      "founded": "ano de fundação ou null",
      "marketShare": número ou null,
      "growth": número ou null,
      "nps": número ou null,
      "score": número 0-100 (avaliação geral baseada nos dados),
      "strengths": ["ponto forte baseado nas fontes"],
      "weaknesses": ["fraqueza baseada nas fontes"],
      "reputation": "avaliação de reputação (Reclame Aqui, prêmios, etc) ou null",
      "customerSentiment": "POSITIVO/NEUTRO/NEGATIVO/MISTO — sentimento de clientes nas avaliações ou null",
      "ratings": [{"platform": "Reclame Aqui/Google/etc", "score": "nota encontrada"}] ou null,
      "socialPresence": "resumo da presença digital/redes sociais ou null",
      "cnpjStatus": "situação cadastral oficial (ativa/baixada/etc) ou null",
      "compliance": "situação regulatória/compliance ou null",
      "riskLevel": "BAIXO/MÉDIO/ALTO — baseado nos dados ou null",
      "differentials": "principais diferenciais encontrados",
      "known": true
    }
  ],
  "criteria": [
    {
      "name": "nome do critério (ex: Solidez financeira, Reputação, Porte, Experiência de mercado, Compliance, Custo-benefício)",
      "description": "o que esse critério avalia",
      "scores": [nota 0-100 para empresa 1, nota para empresa 2, ...],
      "winner": índice da empresa vencedora nesse critério (0-based),
      "analysis": "frase justificando o resultado neste critério"
    }
  ],
  "winner": índice da empresa vencedora geral (0-based),
  "summary": "análise comparativa em 3-4 parágrafos detalhados. Para cada empresa: quem é, porte, reputação, pontos fortes e fracos. Depois, comparação direta e justificativa da recomendação. Objetivo: ${reason||'comparação geral'}.",
  "recommendation": "recomendação detalhada em 2-3 frases, com justificativa baseada nos dados encontrados",
  "risks": ["risco identificado na escolha recomendada 1", "risco 2"],
  "sources": ["fonte real utilizada"]
}`;

    const raw = await askClaude(system, userMsg, M.standard, 9000);
    let result = extractJSON(raw);
    result = await reviewResult(result, `Comparação entre as empresas: ${names.join(', ')}. Objetivo: ${reason || 'análise competitiva'}. Todo o conteúdo deve ser sobre essas empresas.`, 9000);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[compare]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   CHAT — assistente do portal
   ──────────────────────────────────────────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { message, plan, context, history } = req.body;
  if (!message) return res.status(400).json({ ok:false, error:'Mensagem vazia' });

  const isPremium = ['gold','diamond'].includes(plan);
  const planInfo = {
    free:    '350 créditos / 15 dias',
    silver:  '750 créditos / mês — sem My News e Focus',
    gold:    '1.500 créditos / mês — com My News 1.0 e Focus 1.0',
    diamond: '3.000 créditos / mês (R$109,90) — com My News 2.0 e Focus 2.0 (IA avançada)',
  }[plan] || '';

  const system = `Você é o assistente inteligente do Brentor.ai, um portal de inteligência de negócios.

FERRAMENTAS DISPONÍVEIS:
• Analysis — pesquisa e relatório completo de qualquer empresa
• Compare — comparação lado a lado de empresas com vantagens relativas
• Display — geração de apresentações, slides, dashboards e relatórios executivos
${isPremium ? '• My News — jornal digital personalizado com as principais notícias dos temas de interesse do usuário\n• Focus — síntese e análise estratégica de documentos, e-mails, relatórios\n' : ''}
PLANO DO USUÁRIO: ${plan?.toUpperCase()} (${planInfo})

ESCOPO RESTRITO: Responda APENAS sobre negócios, empresas, mercados, gestão, estratégia e o uso do Brentor.ai.
Recuse educadamente qualquer pergunta sobre: futebol, culinária, entretenimento, política partidária, assuntos pessoais não relacionados a negócios.

ESTILO DE CONVERSA (REGRAS RÍGIDAS):
1. Converse como um consultor humano experiente: linguagem formal porém descontraída, natural, sem robotismo.
2. RESPOSTAS CURTAS: máximo 2-4 frases na maioria das respostas. Seus usuários são diretores e executivos sem tempo a perder.
3. NUNCA faça questionários ou listas de perguntas. Se precisar de mais informação, faça UMA ÚNICA pergunta por mensagem (proibido duas perguntas, mesmo na mesma frase) — escolha a mais importante.
4. Prefira PROPOR a perguntar: em vez de pedir 5 detalhes, sugira um caminho ("Posso montar X partindo de Y — funciona pra você?").
5. Evite listas com bullets, títulos com # e formatação pesada. Texto corrido, como numa conversa real. Bullets só quando realmente listar opções (máx 4 itens curtos).
6. Sem introduções tipo "Ótimo! Vamos potencializar..." — vá direto ao ponto, com simpatia.
7. Sugira a ferramenta Brentor mais adequada quando fizer sentido, em 1 frase.
Em português do Brasil.
${ctxBlock(context)}`;

  try {
    // Monta histórico de conversa (últimas 8 mensagens)
    const msgs = (history || []).slice(-8).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    }));
    msgs.push({ role: 'user', content: message });

    const response = await claude.messages.create({
      model: M.fast,
      max_tokens: 600,
      system: system + BRAND_GUARD,
      messages: msgs,
    });
    const reply = response.content[0]?.text || 'Desculpe, não consegui processar sua mensagem.';

    // Detecta se deve sugerir ferramenta
    const toolSuggestion = detectTool(message, plan);
    res.json({ ok: true, reply, tool: toolSuggestion });
  } catch (e) {
    console.error('[chat]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

function detectTool(msg, plan) {
  const q = msg.toLowerCase();
  const isPremium = ['gold','diamond'].includes(plan);
  if (/resumo|sintetizar|síntese|e-mail|pdf|documento|apresentaç/.test(q) && isPremium) return 'focus';
  if (/notícia|noticia|jornal|news|atualidades|acontecendo|novidades/.test(q) && isPremium) return 'mynews';
  if (/analis|investig|empresa|fornecedor|cliente|concorrent/.test(q)) return 'analysis';
  if (/compar|versus| vs |entre .* e /.test(q)) return 'compare';
  if (/apresenta|slide|dashboard|dashboard|visual|relatório visual/.test(q)) return 'display';
  return null;
}

/* ────────────────────────────────────────────────────────────
   MY NEWS — jornal digital personalizado
   ──────────────────────────────────────────────────────────── */

/* Veículos brasileiros (domínios registráveis — cobrem subdomínios como g1.globo.com).
   Usados em include_domains para restringir o escopo "Brasil" a fontes nacionais. */
const BR_NEWS_DOMAINS = [
  'globo.com','uol.com.br','estadao.com.br','exame.com','infomoney.com.br','metropoles.com',
  'cnnbrasil.com.br','r7.com','terra.com.br','poder360.com.br','ebc.com.br','abril.com.br',
  'istoe.com.br','correiobraziliense.com.br','gazetadopovo.com.br','cartacapital.com.br',
  'moneytimes.com.br','seudinheiro.com.br','tecmundo.com.br','canaltech.com.br',
  'olhardigital.com.br','lance.com.br','brasildefato.com.br','agazeta.com.br','band.com.br',
];

/* Detecta se um domínio é de um veículo brasileiro (para o escopo "Brasil"). */
function isBrazilianHost(host) {
  host = (host || '').toLowerCase();
  if (/\.br$/.test(host)) return true;                 // .com.br, .org.br, .gov.br…
  const brands = [
    'globo.com','uol.com','folha','estadao','exame.com','infomoney','metropoles','terra.com',
    'r7.com','band.','veja.','cnnbrasil','poder360','gazetadopovo','brasil247','cartacapital',
    'agenciabrasil','valor.','oglobo','abril.com','correiobraziliense','otempo','gauchazh',
    'nsctotal','moneytimes','seudinheiro','canaltech','tecmundo','olhardigital','agazeta',
    'jovempan','recordtv','ig.com','em.com','revistaoeste','antagonista','intercept','aosfatos',
    'agenciabrasil','ebc.com','migalhas','jota.info','conjur','infomoney','neofeed','startupi',
  ];
  return brands.some(t => host.includes(t));
}

/* Detecta URLs de vídeo que não são matérias legíveis */
function isVideoUrl(url) {
  return /\/(video|videos|watch|player)\//i.test(url) || /\.(mp4|webm|m3u8|mov)(\?|$)/i.test(url);
}

/* Busca estruturada de notícias (preserva título, url, fonte e imagem por matéria) */
async function searchNewsArticles(queries, maxResults = 6, days = 4) {
  if (!hasTavily) return [];
  const out = [];
  const fetches = await Promise.allSettled(queries.map(async q => {
    const body = {
      api_key: process.env.TAVILY_API_KEY,
      query: q.text, max_results: maxResults,
      search_depth: 'advanced',
      topic: 'news', days,                 // janela curta = notícias atuais
      include_answer: false,
      include_raw_content: false,
      include_images: false,               // não usamos as imagens globais do Tavily (não são por artigo)
    };
    if (q.includeDomains && q.includeDomains.length) body.include_domains = q.includeDomains;
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status !== 200) console.log(`[tavily] ERRO ${res.status}:`, JSON.stringify(data).slice(0,300));
    else console.log(`[tavily] OK results:${(data.results||[]).length} query:"${q.text.slice(0,40)}"`);
    return { meta: q, data };
  }));
  const seen = new Set();
  fetches.forEach(r => {
    if (r.status !== 'fulfilled') { console.log('[tavily] fetch rejected:', r.reason); return; }
    if (!r.value.data) return;
    const meta = r.value.meta;
    (r.value.data.results || []).forEach(item => {
      if (!item.url || seen.has(item.url)) return;
      if (isVideoUrl(item.url)) return;
      // descarta páginas de busca/navegação (conteúdo com padrão de menu/tags, não de artigo)
      const rawContent = item.content || '';
      if (/^search\s+latest/i.test(rawContent) || (rawContent.match(/\s\+\s/g) || []).length > 5) return;
      seen.add(item.url);
      let host = '';
      try { host = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
      out.push({
        title: item.title || '',
        content: rawContent.slice(0, 700),
        url: item.url,
        source: host,
        image: null,
        topic: meta.topic,
        lang: meta.lang,
        published: item.published_date || null,
      });
    });
  });
  // ordena por data de publicação (mais recentes primeiro; sem data vai para o fim)
  out.sort((a, b) => {
    const ta = a.published ? Date.parse(a.published) : 0;
    const tb = b.published ? Date.parse(b.published) : 0;
    return tb - ta;
  });
  return out;
}

/* Extrai a imagem principal (og:image / twitter:image) da página de uma matéria. */
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Brentor.ai/1.0; +https://brentor.ai)' },
      signal: AbortSignal.timeout(6000),
    });
    const html = (await res.text()).slice(0, 120000);
    const pick = (re) => { const m = html.match(re); return m && m[1]; };
    let img = pick(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
           || pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
           || pick(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
           || pick(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i)
           || pick(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i);
    if (!img) return null;
    img = img.trim().replace(/&amp;/g, '&');
    if (img.startsWith('//')) img = 'https:' + img;
    else if (img.startsWith('/')) { try { img = new URL(url).origin + img; } catch {} }
    return /^https?:\/\//.test(img) ? img : null;
  } catch { return null; }
}

/* Detecta URL de página inicial (só filtra root "/" ou path vazio) */
function isHomepageUrl(url) {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    return !path;  // apenas raiz do domínio sem nenhum caminho
  } catch { return false; }
}

/* Variantes de query para diversificar resultados no "carregar mais" */
const BR_QUERY_VARIANTS = [
  (t) => `${t} notícias Brasil hoje`,
  (t) => `últimas notícias ${t} Brasil`,
  (t) => `${t} Brasil atualidades semana`,
  (t) => `${t} notícias recentes hoje site:g1.globo.com OR site:estadao.com.br OR site:folha.uol.com.br`,
];
const INT_QUERY_VARIANTS = [
  (t) => `${t} latest news today`,
  (t) => `${t} breaking news this week`,
];

app.post('/api/mynews', async (req, res) => {
  let { topics, scope, version, context, userName, exclude } = req.body;
  if (typeof context === 'string') { try { context = JSON.parse(context); } catch { context = null; } }
  const isV2 = version === '2.0';
  const safeScope = isV2 ? (['br','intl','both'].includes(scope) ? scope : 'br') : 'br';
  const topicList = Array.isArray(topics) ? topics.map(t => (t || '').toString().trim()).filter(Boolean).slice(0, 10) : [];
  if (!topicList.length) return res.status(400).json({ ok:false, error:'Informe ao menos um tema de interesse' });
  if (!hasTavily) return res.status(503).json({ ok:false, error:'Busca de notícias indisponível no momento (configure TAVILY_API_KEY).' });

  const wantBR  = safeScope === 'br' || safeScope === 'both';
  const wantINT = safeScope === 'intl' || safeScope === 'both';
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
  const isLoadMore = excludeSet.size > 0;   // segunda chamada = "carregar mais"

  try {
    // Monta queries — para "carregar mais" usa variantes diferentes para obter artigos novos do Tavily
    const queries = [];
    const brVariant  = isLoadMore ? 1 : 0;   // índice da variante (roda entre as opções)
    const intVariant = isLoadMore ? 1 : 0;
    topicList.forEach(t => {
      if (wantBR) {
        // sempre envia 2 variantes de busca BR para ampliar o pool
        queries.push({ text: BR_QUERY_VARIANTS[brVariant % BR_QUERY_VARIANTS.length](t),       topic: t, lang: 'pt', includeDomains: BR_NEWS_DOMAINS });
        queries.push({ text: BR_QUERY_VARIANTS[(brVariant + 1) % BR_QUERY_VARIANTS.length](t), topic: t, lang: 'pt', includeDomains: BR_NEWS_DOMAINS });
      }
      if (wantINT) {
        queries.push({ text: INT_QUERY_VARIANTS[intVariant % INT_QUERY_VARIANTS.length](t), topic: t, lang: 'en' });
      }
    });

    // Busca com pool maior para garantir artigos suficientes mesmo após exclusões
    let pool = await searchNewsArticles(queries.slice(0, 24), 10);

    const d = {
      raw: pool.length,
      afterHomepage: null, afterBRFilter: null, afterExclude: null,
      sampleSources: pool.slice(0, 8).map(a => `${a.source}(${a.lang})`),
      sampleUrls: pool.slice(0, 4).map(a => a.url),
    };

    // Filtra páginas iniciais/categoria (sem artigo real) e URLs já exibidas
    pool = pool.filter(a => !isHomepageUrl(a.url));
    d.afterHomepage = pool.length;
    pool = pool.filter(a => a.lang !== 'pt' || isBrazilianHost(a.source));
    d.afterBRFilter = pool.length;
    if (excludeSet.size) pool = pool.filter(a => !excludeSet.has(a.url));
    d.afterExclude = pool.length;
    console.log('[mynews][diag]', JSON.stringify(d));

    // Balanceia BR e Internacional no escopo "Brasil + Mundo"
    if (safeScope === 'both') {
      const br  = pool.filter(a => a.lang === 'pt');
      const int = pool.filter(a => a.lang !== 'pt');
      const max = Math.ceil((br.length + int.length) * 0.6);  // nenhum idioma pode passar de 60%
      // interleave: 1 BR, 1 INT alternado
      const balanced = [];
      const bi = [...br], ii = [...int];
      while (balanced.length < max && (bi.length || ii.length)) {
        if (bi.length) balanced.push(bi.shift());
        if (ii.length) balanced.push(ii.shift());
      }
      pool = balanced;
    }

    if (!pool.length) return res.status(502).json({ ok:false, error:'Não encontramos notícias novas sobre esses temas. Tente outros tópicos ou volte em breve.' });

    // Catálogo enxuto para o curador (sem despejar tudo no prompt)
    const catalog = pool.slice(0, 60).map((a, i) =>
      `#${i} [tema: ${a.topic}] [idioma: ${a.lang}] [fonte: ${a.source}] [data: ${a.published || 'recente'}]\nTítulo: ${a.title}\nResumo bruto: ${a.content}\nURL: ${a.url}\nImagem: ${a.image || 'nenhuma'}`
    ).join('\n\n');

    const scopeLabel = safeScope === 'br' ? 'somente Brasil (em português)' :
                       safeScope === 'intl' ? 'somente internacionais (em inglês)' :
                       'Brasil (português) e internacionais (inglês)';

    const system = `Você é o editor-chefe do "My News", o jornal digital personalizado da Brentor.ai.
Recebe um catálogo de matérias reais coletadas de fontes da web e monta uma edição enxuta e relevante para o leitor.

REGRAS RÍGIDAS:
1. Use EXCLUSIVAMENTE as matérias do catálogo. NUNCA invente notícias, títulos, fatos, fontes, URLs ou imagens.
2. Cada matéria DEVE referenciar o índice (#n) do catálogo. Copie a URL e a imagem EXATAMENTE como aparecem no item escolhido (imagem = null se o item não tiver).
3. Selecione apenas FONTES DE BOA REPUTAÇÃO e descarte: conteúdo duplicado, spam, propaganda, clickbait, matéria sem substância ou fora dos temas de interesse.
4. Escreva uma CHAMADA (headline) jornalística clara e um RESUMO de 2-3 frases fiel ao conteúdo da matéria — sem exagerar nem inventar.
5. Cubra os temas de interesse de forma equilibrada. ${isV2 ? `Escopo: ${scopeLabel}. Mantenha o idioma original de cada matéria (pt ou en).` : 'Apenas matérias em português do Brasil.'}
6. RECÊNCIA: o catálogo já vem ordenado da mais recente para a mais antiga — prefira as do topo. Notícias dos últimos dias são válidas; NÃO rejeite matérias úteis só por não serem exatamente de hoje.
7. IMPORTANTE: use as matérias REAIS que existem no catálogo. Se houver poucas, monte uma edição menor com o que há — NUNCA devolva uma lista vazia quando existirem matérias relevantes no catálogo, e NUNCA invente para completar.
Responda em português do Brasil (resumos de matérias internacionais podem ser escritos em português, mas mantenha o campo lang correto).
${ctxBlock(context)}`;

    const userMsg = `LEITOR: ${userName || 'Assinante'}
TEMAS DE INTERESSE: ${topicList.join(', ')}
ESCOPO: ${scopeLabel}

CATÁLOGO DE MATÉRIAS DISPONÍVEIS:
${catalog}

Monte a edição de hoje do My News. APROVEITE BEM o catálogo: inclua TODAS as matérias relevantes e distintas (mire em ${isV2 ? '10 a 16' : '8 a 12'} quando o catálogo permitir), cobrindo cada tema de interesse com 2 a 4 matérias quando houver. Não seja excessivamente seletivo — matérias reais e relevantes de boa fonte devem entrar. Só monte uma edição menor se realmente houver poucas matérias. NUNCA invente para completar e NUNCA devolva lista vazia havendo matérias reais.
Retorne JSON:
{
  "edition_title": "manchete-resumo da edição em 1 linha (ex: 'As principais notícias de hoje em Tecnologia, Finanças e Agro')",
  "lead": "1 frase editorial curta dando o tom da edição",
  "articles": [
    {
      "ref": número do índice #n do catálogo usado,
      "headline": "chamada jornalística clara",
      "summary": "resumo de 2-3 frases fiel à matéria",
      "topic": "um dos temas de interesse",
      "source": "domínio da fonte (copie do item)",
      "url": "URL exata do item",
      "image": "URL da imagem do item ou null",
      "lang": "pt ou en",
      "featured": true para 1-2 matérias de maior destaque, senão false
    }
  ]
}`;

    const raw = await askClaude(system, userMsg, isV2 ? M.advanced : M.standard, isV2 ? 7000 : 5000);
    let result = extractJSON(raw);

    // Sanitiza os artigos da IA: mapeia ao pool real (anti-alucinação) e descarta inválidos.
    // (Não usamos o agente revisor aqui — a sanitização já garante que toda matéria é real
    //  do catálogo; o revisor genérico chegava a remover notícias legítimas.)
    let arts = (result && Array.isArray(result.articles)) ? result.articles.map(a => {
      const ref = pool[a.ref];
      if (ref) {
        a.url = ref.url;
        a.image = ref.image || null;
        a.source = a.source || ref.source;
        if (!a.lang) a.lang = ref.lang;
        a.published = ref.published || null;
      }
      return a;
    }).filter(a => a.url && /^https?:\/\//.test(a.url)) : [];

    // Completa a edição com matérias REAIS do pool quando a IA selecionou poucas.
    // Para tópicos customizados, verifica relevância pelo conteúdo antes de incluir
    // (evita colocar artigos de tema errado sob o rótulo de um tópico que não corresponde).
    // Verifica se o conteúdo do artigo é relevante para o tópico da busca.
    // Exige que ao menos uma palavra-chave do tópico apareça no título ou resumo —
    // evita que o supplement insira artigos de esporte num tópico de "Poker", por ex.
    function isRelevant(article, topic) {
      if (!topic) return true;
      const words = topic.toLowerCase().replace(/[&\/\-]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      if (!words.length) return true;
      const text = (article.title + ' ' + article.content).toLowerCase();
      return words.some(w => text.includes(w));
    }

    const target = isV2 ? 12 : 9;
    const have = new Set(arts.map(a => a.url));
    for (const a of pool) {
      if (arts.length >= target) break;
      if (have.has(a.url)) continue;
      if (!isRelevant(a, a.topic)) continue;   // descarta artigos fora do tema do tópico
      have.add(a.url);
      arts.push({
        headline: a.title, summary: (a.content || '').slice(0, 240),
        topic: a.topic, source: a.source, url: a.url, image: a.image || null,
        lang: a.lang, featured: false, published: a.published || null,
      });
    }
    if (arts.length && !arts.some(a => a.featured)) arts.slice(0, 2).forEach(a => a.featured = true);

    result = {
      edition_title: (result && result.edition_title && !/indispon|não foi poss|sem matéria/i.test(result.edition_title)) ? result.edition_title : 'As principais notícias de hoje, selecionadas para você',
      lead: (result && result.lead && !/não foi poss|indispon/i.test(result.lead)) ? result.lead : null,
      articles: arts,
    };

    // Enriquece as imagens: busca og:image real da página de cada matéria.
    if (result && Array.isArray(result.articles)) {
      await Promise.allSettled(result.articles.map(async a => {
        const og = await fetchOgImage(a.url);
        a.image = og || null;
      }));
      // Remove imagens duplicadas: se dois artigos compartilham a mesma URL de imagem,
      // o segundo fica sem imagem (placeholder) — evita a mesma foto em matérias distintas.
      const usedImages = new Set();
      result.articles.forEach(a => {
        if (a.image) {
          if (usedImages.has(a.image)) a.image = null;
          else usedImages.add(a.image);
        }
      });
    }

    res.json({ ok: true, result, version, scope: safeScope, count: (result.articles || []).length });
  } catch (e) {
    console.error('[mynews]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* Leitura completa de uma matéria (para o pop-up de leitura) */
app.post('/api/readnews', async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) return res.status(400).json({ ok:false, error:'URL inválida' });
  try {
    const { title, text, error } = await fetchUrl(url);
    if (error || !text) return res.json({ ok:true, title:'', text:'', partial:true });
    res.json({ ok:true, title, text: text.slice(0, 6000) });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   FOCUS — síntese e análise estratégica de conteúdo
   ──────────────────────────────────────────────────────────── */
app.post('/api/focus', upload.array('files', 5), async (req, res) => {
  const { content, objective, audience, version, urls: urlsJson } = req.body;
  // multipart/form-data manda tudo como string — sem isso, ctxBlock(context) nunca reconhecia
  // o objeto e o contexto empresarial do usuário era silenciosamente ignorado no Focus.
  let context = req.body.context;
  if (typeof context === 'string') { try { context = JSON.parse(context); } catch { context = null; } }
  const isV2 = version === '2.0';
  const urls = urlsJson ? JSON.parse(urlsJson) : [];
  const files = req.files || [];

  // Extrai texto dos arquivos
  const fileTexts = [];
  for (const f of files) {
    const text = await extractFileText(f.buffer, f.mimetype, f.originalname);
    if (text) fileTexts.push(`[Arquivo: ${f.originalname}]\n${text}`);
  }

  // Busca URLs
  const urlTexts = [];
  for (const url of urls.slice(0, 5)) {
    const { title, text, error } = await fetchUrl(url);
    if (!error && text) urlTexts.push(`[URL: ${url}]\n${title ? 'Título: '+title+'\n' : ''}${text}`);
  }

  const fullContent = [
    content ? `[Conteúdo informado pelo usuário]\n${content}` : '',
    ...fileTexts,
    ...urlTexts,
  ].filter(Boolean).join('\n\n---\n\n');

  if (!fullContent.trim()) return res.status(400).json({ ok:false, error:'Nenhum conteúdo para analisar' });

  /* Verificação web dos pontos-chave (mesmo princípio do Analysis) */
  const probe = (objective || '').slice(0, 80) || fullContent.replace(/\s+/g, ' ').slice(0, 100);
  const focusWeb = await searchWeb([
    `${probe} dados contexto`,
    `${probe} mercado informações atuais`,
  ], 4, { maxQueries: 2 });
  const focusWebBlock = focusWeb.length
    ? `\n--- DADOS DA WEB PARA VERIFICAÇÃO (compare com o conteúdo; aponte confirmações e divergências) ---\n${focusWeb.slice(0, 8).join('\n\n')}\n---\n`
    : '';

  const system = `Você é um especialista em análise e síntese de conteúdo empresarial da Brentor.ai — ${isV2 ? 'versão 2.0 com análise estratégica profunda' : 'versão 1.0 com síntese objetiva'}.

REGRAS:
1. O Focus é uma ferramenta de RESUMO para executivos sem tempo: o leitor é um CEO. Tudo deve ser DIRETO e OBJETIVO — frases curtas, zero enrolação, zero repetição.
2. Extraia os PONTOS-CHAVE sem perder as informações principais — resumo sólido e fiel ao original, mas ENXUTO.
3. Use EXCLUSIVAMENTE o conteúdo fornecido e os dados de verificação da web. NÃO invente dados ou números. Se algo não está claro no conteúdo, seja honesto e diga.
4. Quando os dados da web confirmarem ou contradisserem algo do conteúdo, registre no campo "verification" (apenas os 3-4 pontos mais relevantes).
5. LIMITES RÍGIDOS: parágrafos de no máximo 3 frases; bullets de no máximo 15 palavras; nenhuma lista com mais de 5 itens.
Responda em português do Brasil.
${ctxBlock(context)}`;

  const userMsg = isV2
    ? `Analise o seguinte conteúdo com profundidade estratégica. Identifique você mesmo, a partir do texto, que tipo de conteúdo é (documento/relatório, apresentação, e-mail/thread, proposta comercial, texto livre, ata de reunião, ou outro).
Audiência: ${audience || 'geral'}
Foco solicitado: ${objective || 'análise geral'}

CONTEÚDO:
${fullContent.slice(0, 20000)}
${focusWebBlock}
IMPORTANTE: O resultado é uma SÍNTESE, não um relatório. Inclua APENAS o que existe de fato no conteúdo — campos sem informação real ficam null (não preencha por obrigação).

Retorne JSON:
{
  "title": "título curto que identifica o assunto do documento (ex: nome da empresa/projeto/proposta) — máx 8 palavras, SEM mencionar 'Focus' ou ferramentas",
  "document_type": "tipo de conteúdo identificado por você a partir do texto — máx 3 palavras (ex: Documento/Relatório, Apresentação, E-mail/Thread, Proposta Comercial, Texto livre, Ata de reunião, ou outro rótulo apropriado)",
  "context": "o que é este documento, em 1 frase",
  "executive_summary": "síntese em 1-2 parágrafos curtos (máx 3 frases cada) — o essencial que um CEO precisa saber",
  "key_points": ["ponto relevante do conteúdo (máx 15 palavras)", "..."] — 3 a 6 pontos, só os que importam,
  "data_points": [
    { "metric": "nome curto", "value": "valor extraído do conteúdo", "context": "máx 5 palavras" }
  ] ou null — APENAS números que existem literalmente no conteúdo, máx 5,
  "alerts": [
    { "level": "Crítico/Atenção", "description": "risco ou alerta REAL do conteúdo, máx 15 palavras" }
  ] ou null — máx 3, null se não houver,
  "strategic_implications": "o que isso significa para ${audience || 'a gestão'} — 1 parágrafo de máx 3 frases",
  "action_items": ["ação objetiva 1", "ação 2"] — máx 3, ações que decorrem do conteúdo,
  "strategic_questions": ["pergunta que o conteúdo deixa em aberto"] ou null — máx 3,
  "verification": [
    { "point": "afirmação checada", "status": "confirmado/divergente/não verificado", "note": "máx 12 palavras" }
  ] ou null — só os 2-3 pontos mais importantes,
  "focus_answer": ${objective ? '"resposta direta ao foco solicitado: ' + objective + ' (máx 3 frases)"' : 'null'},
  "sources": ["fonte da web usada"] ou null
}`
    : `Faça uma síntese objetiva do seguinte conteúdo. Identifique você mesmo, a partir do texto, que tipo de conteúdo é (documento/relatório, apresentação, e-mail/thread, proposta comercial, texto livre, ata de reunião, ou outro).
Foco solicitado: ${objective || 'síntese geral'}

CONTEÚDO:
${fullContent.slice(0, 12000)}
${focusWebBlock}
IMPORTANTE: O resultado é uma SÍNTESE curta. Inclua APENAS o que existe no conteúdo — campos sem informação real ficam null.

Retorne JSON:
{
  "title": "título curto que identifica o assunto do documento (ex: nome da empresa/projeto/proposta) — máx 8 palavras, SEM mencionar 'Focus' ou ferramentas",
  "document_type": "tipo de conteúdo identificado por você a partir do texto — máx 3 palavras (ex: Documento/Relatório, Apresentação, E-mail/Thread, Proposta Comercial, Texto livre, Ata de reunião, ou outro rótulo apropriado)",
  "summary": "resumo executivo em 1 parágrafo direto (máx 4 frases) — o essencial, fiel ao conteúdo",
  "key_points": ["ponto relevante curto (máx 15 palavras)", "..."] — 3 a 5 pontos,
  "data_points": [{ "metric": "nome curto", "value": "valor do conteúdo", "context": "máx 5 palavras" }] ou null — só números literais do conteúdo, máx 4,
  "action_items": ["ação objetiva 1", "ação 2"] — máx 3 ou null,
  "verification": [
    { "point": "afirmação checada", "status": "confirmado/divergente/não verificado", "note": "máx 12 palavras" }
  ] ou null — máx 2,
  "focus_answer": ${objective ? '"resposta direta ao foco: ' + objective + ' (máx 3 frases)"' : 'null'},
  "sources": ["fonte da web usada"] ou null
}`;

  try {
    const raw = await askClaude(system, userMsg, isV2 ? M.advanced : M.fast, isV2 ? 6000 : 3500);
    let result = extractJSON(raw);
    result = await reviewResult(result, `Resumo executivo objetivo de um conteúdo (tipo identificado automaticamente: "${result.document_type||'documento'}"). Foco: ${objective || 'síntese geral'}. Só pode haver informações presentes no conteúdo original analisado.`, isV2 ? 6000 : 3500);
    res.json({ ok: true, result, version, fileCount: files.length, urlCount: urls.length });
  } catch (e) {
    console.error('[focus]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   DISPLAY — geração de conteúdo para apresentação
   ──────────────────────────────────────────────────────────── */
app.post('/api/display', upload.array('files', 5), async (req, res) => {
  const { topic, content, outputType } = req.body;
  let seed = req.body.seed;
  if (typeof seed === 'string') { try { seed = JSON.parse(seed); } catch { seed = null; } }
  let context = req.body.context;
  if (typeof context === 'string') { try { context = JSON.parse(context); } catch { context = null; } }

  // Extrai texto dos arquivos anexados — antes eram descartados silenciosamente e o
  // material saía genérico/fora do assunto mesmo com um arquivo relevante anexado.
  const files = req.files || [];
  const fileTexts = [];
  for (const f of files) {
    const text = await extractFileText(f.buffer, f.mimetype, f.originalname);
    if (text) fileTexts.push(`[Arquivo anexado pelo usuário: ${f.originalname}]\n${text}`);
  }
  const fileBlock = fileTexts.length
    ? `\n--- ARQUIVO(S) ANEXADO(S) PELO USUÁRIO (fonte primária — o material deve ser baseado principalmente nisto, não em generalidades sobre o tema) ---\n${fileTexts.join('\n\n').slice(0, 24000)}\n---\n`
    : '';
  // Quando não há tema digitado mas há arquivo/conteúdo colado, usa um trecho deles
  // pra guiar a busca web em vez de pesquisar por uma string vazia (gerava resultados genéricos).
  const searchProbe = topic || fileTexts[0]?.replace(/\s+/g, ' ').slice(0, 120) || content?.slice(0, 120) || '';
  const topicLabel = topic || (fileTexts.length ? 'o conteúdo do arquivo anexado pelo usuário' : (content ? content.slice(0,60) : 'o tema informado'));

  /* ── Pesquisa web para enriquecer com dados reais ─────── */
  const isCompareSeed = seed?.type === 'compare' && seed.cmp?.companies?.length;
  const cmpNames = isCompareSeed ? seed.cmp.companies.map(c => c.name) : [];
  const searchQueries = isCompareSeed
    ? [
        `${cmpNames.join(' vs ')} comparação dados`,
        ...cmpNames.map(n => `"${n}" empresa dados números mercado reputação`),
      ]
    : [
        `${searchProbe} dados estatísticas números`,
        `${searchProbe} mercado tendências 2024 2025`,
        `${searchProbe} análise informações relevantes`,
      ];
  const webData = await searchWeb(searchQueries, 5, { includeImages: true });
  const webBlock = webData.length
    ? `\n--- DADOS COLETADOS DA WEB (use esses dados reais — NÃO invente) ---\n${webData.slice(0, 20).join('\n\n')}\n---\n`
    : '';
  const webImages = (webData.images || []).slice(0, 12);

  // Busca dedicada ao logotipo oficial da empresa analisada (só faz sentido fora do
  // Compare, que já proíbe logo de uma única empresa). Query separada da busca de
  // imagens genéricas — imagens de tópico geral costumam vir fracas/pequenas quando
  // usadas na capa, então priorizamos aqui um resultado que seja de fato um logotipo.
  let logoImages = [];
  if (!isCompareSeed && searchProbe) {
    const logoData = await searchWeb([`"${searchProbe}" logo oficial site:wikipedia.org OR logo png transparente`], 5, { includeImages: true });
    logoImages = (logoData.images || []).slice(0, 4);
  }

  const imgBlockParts = [];
  if (logoImages.length) {
    imgBlockParts.push(`LOGOTIPO CANDIDATO (possível logo oficial da empresa/tema — use no "cover" SOMENTE se for claramente um logotipo limpo; se nenhum destes parecer um logotipo de verdade, não use nenhum e omita o campo "image" do cover):\n${logoImages.map((u, i) => `LOGO_${i + 1}: ${u}`).join('\n')}`);
  }
  if (webImages.length) {
    imgBlockParts.push(`IMAGENS DISPONÍVEIS (URLs reais da web sobre o tema — use nos campos "image" de slides que NÃO sejam o cover, quando fizer sentido visual):\n${webImages.map((u, i) => `IMG_${i + 1}: ${u}`).join('\n')}`);
  }
  const imgBlock = imgBlockParts.length ? `\n--- ${imgBlockParts.join('\n\n---\n\n')}\n---\n` : '';

  const system = `Você é um diretor de comunicação empresarial da Brentor.ai. Cria materiais visuais profissionais, ricos em dados e visualmente impactantes.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE dados dos DADOS COLETADOS e do conteúdo fornecido. NÃO invente números, percentuais ou estatísticas.
2. Se não tem dado exato, descreva qualitativamente — NUNCA crie números fictícios.
3. Todo conteúdo deve ser ESPECÍFICO ao tema — proibido textos genéricos como "Métrica A", "Indicador 1", "lorem ipsum".
4. Cada seção/slide deve ter substância real — parágrafos completos com informação concreta.
5. Em português do Brasil, linguagem executiva, clara e profissional.
6. Inclua fontes quando citar dados específicos.
7. Se houver bloco [ARQUIVO(S) ANEXADO(S) PELO USUÁRIO], o material deve ser construído PRINCIPALMENTE a partir desse conteúdo — é a fonte primária. NÃO gere um relatório genérico sobre o tema geral quando um arquivo específico foi fornecido; sintetize e apresente o que está no arquivo, usando a web apenas para complementar/verificar.
${ctxBlock(context)}`;

  /* Monta contexto do seed (vindo do Analysis ou Compare) */
  let seedContext = '';
  if (seed?.type === 'analysis' && seed.company) {
    const co = seed.company;
    const parts = [
      `Empresa: ${co.name}`, `Setor: ${co.sector||'N/A'}`,
      co.description ? `Descrição: ${co.description}` : '',
      co.summary ? `Resumo: ${co.summary}` : '',
      co.operations?.employees ? `Colaboradores: ${co.operations.employees}` : '',
      co.financial?.revenue ? `Receita: ${co.financial.revenue}` : '',
      co.operations?.products?.length ? `Produtos: ${co.operations.products.join(', ')}` : '',
      co.operations?.clients?.length ? `Clientes: ${co.operations.clients.join(', ')}` : '',
      co.operations?.competitors?.length ? `Concorrentes: ${co.operations.competitors.join(', ')}` : '',
      co.reputation?.highlights?.length ? `Destaques: ${co.reputation.highlights.join('; ')}` : '',
      co.reputation?.risks?.length ? `Riscos: ${co.reputation.risks.join('; ')}` : '',
      co.recentNews?.length ? `Notícias: ${co.recentNews.map(n=>n.title||n).join('; ')}` : '',
    ].filter(Boolean);
    seedContext = `\n--- DADOS DA ANÁLISE (dados reais verificados) ---\n${parts.join('\n')}\n---\n`;
  } else if (seed?.type === 'compare' && seed.cmp) {
    const parts = seed.cmp.companies.map(co => [
      `=== ${co.name} ===`,
      `Setor: ${co.sector||'N/A'} · Região: ${co.region||'N/A'} · Fundação: ${co.founded||'N/A'}`,
      `Porte/colaboradores: ${co.employees||'N/A'} · Receita: ${co.revenue||'N/A'} · Score geral: ${co.score!=null?co.score+'/100':'N/A'}`,
      `Forças: ${(co.strengths||[]).join('; ')||'N/A'}`,
      `Fraquezas: ${(co.weaknesses||[]).join('; ')||'N/A'}`,
      co.reputation ? `Reputação: ${co.reputation}` : '',
      co.customerSentiment ? `Sentimento de clientes: ${co.customerSentiment}` : '',
      (co.ratings||[]).length ? `Notas: ${co.ratings.map(r=>`${r.platform}: ${r.score}`).join(' · ')}` : '',
      co.socialPresence ? `Presença digital: ${co.socialPresence}` : '',
      co.riskLevel ? `Nível de risco: ${co.riskLevel}` : '',
      co.cnpjStatus ? `Situação cadastral: ${co.cnpjStatus}` : '',
      co.differentials ? `Diferenciais: ${co.differentials}` : '',
    ].filter(Boolean).join('\n'));
    const crits = (seed.cmp.criteria||[]).map(cr =>
      `${cr.name}: ${seed.cmp.companies.map((co,i)=>`${co.name}=${(cr.scores||[])[i]!=null?cr.scores[i]:'N/A'}`).join(' · ')}${cr.winner!=null?` (melhor: ${seed.cmp.companies[cr.winner]?.name||''})`:''}`);
    seedContext = `\n--- DADOS DA COMPARAÇÃO (dados reais verificados) ---\n${parts.join('\n\n')}\n\nCRITÉRIOS PONTUADOS:\n${crits.join('\n')||'N/A'}\n\nResumo: ${seed.cmp.summary||''}\nRecomendação: ${seed.cmp.recommendation||''}\n---\n`;
  }

  const contentRef = content ? content.slice(0, 8000) : '';
  const compareRules = isCompareSeed ? `
REGRAS DE COMPARAÇÃO (OBRIGATÓRIAS — este material compara ${cmpNames.join(' x ')}):
1. EQUILÍBRIO TOTAL: todas as empresas devem ter a MESMA presença, os MESMOS indicadores e o MESMO nível de detalhe. Nenhuma pode dominar o material.
2. Sempre que citar um dado de uma empresa, apresente o equivalente da(s) outra(s) — ou indique "não disponível".
3. Prefira estruturas lado a lado: layout "comparison", gráficos chart_bar com uma barra por empresa no MESMO critério, tabelas comparativas.
   Em gráficos comparativos: o TÍTULO do slide/gráfico indica o critério e o "label" de cada barra é APENAS o nome da empresa (máx 3 palavras). Se quiser vários critérios num gráfico só, use label "Critério · Empresa" com no máximo 5 palavras — NUNCA frases longas que serão cortadas.
4. PROIBIDO usar logotipo ou imagem de UMA única empresa na capa ou em destaque — use imagem neutra do setor ou nenhuma imagem.
5. A conclusão deve comparar e recomendar com base nos critérios, citando as empresas pelo nome.
` : '';
  const fullContext = `${fileBlock}${webBlock}${imgBlock}${seedContext}${compareRules}\n${contentRef ? 'Conteúdo do usuário:\n' + contentRef : ''}`;

  let promptByType;

  if (outputType === 'slides') {
    promptByType = `Crie uma APRESENTAÇÃO DE SLIDES profissional e VISUAL (8-12 slides) sobre: "${topicLabel}"
${fullContext}

REGRAS DE OURO:
- Apresentação NÍVEL DIRETORIA: impacto visual, robustez de informação, zero texto desnecessário.
- Slides são VISUAIS, não documentos de texto. Máximo 3-4 bullets curtos por slide (1 linha cada).
- VARIE os layouts — NUNCA use "bullets" em mais de 2 slides. Priorize layouts visuais: kpi, chart_bar, chart_donut, meter, icon_grid, big_number, image_split.
- Textos curtos e diretos — cada bullet max 12 palavras. Notes max 1 frase.
- Dados numéricos devem ser REAIS (dos dados coletados). Se não tem número exato, use o layout qualitativo.
- IMAGENS: se houver IMAGENS DISPONÍVEIS, USE-AS GENEROSAMENTE em 2-4 slides image_split — apresentações projetadas ficam muito mais fortes com apoio visual. Escolha imagens relevantes ao tema; se várias forem boas, prefira usar mais slides image_split a deixar imagens de lado. Se nenhuma imagem disponível for relevante, omita o campo.
- LOGO NA CAPA: use o campo "image" do "cover" APENAS com uma URL de LOGOTIPO CANDIDATO (se houver) que seja claramente um logotipo oficial limpo da empresa/tema. NUNCA use uma imagem de IMAGENS DISPONÍVEIS (foto genérica, print, banco de imagens) como substituto do logo na capa. Se não houver nenhum LOGOTIPO CANDIDATO adequado, OMITA o campo "image" do cover por completo — a capa deve ficar só com título e subtítulo, sem imagem nenhuma.
- QUALIDADE DA IMAGEM: use SOMENTE imagens que continuam legíveis quando exibidas pequenas (fotos limpas, ilustrações, logotipos). NUNCA use como imagem de capa ou destaque um print de gráfico, infográfico com texto, tabela ou captura de tela — esse tipo de imagem fica ilegível quando reduzida e passa impressão amadora. Na dúvida, omita o campo "image".
- DISTRIBUIÇÃO: cada slide deve ter volume de conteúdo suficiente para preencher bem o espaço (evite slides com só 1-2 bullets curtos perdidos no meio do slide) — combine elementos quando fizer sentido (ex.: kpi com 4 itens em vez de 2, meter com 4-5 métricas em vez de 3, icon_grid com 5-6 itens em vez de 4).
- Todo slide DEVE ter conteúdo real preenchido para o seu layout (ex.: "kpi" precisa de "kpis" com itens; "comparison"/"two_column" precisam de colunas com itens). NUNCA gere um slide só com título/kicker e nada mais — se não houver dado suficiente para um layout de dados, use "bullets" ou "image_split" no lugar.

Layouts disponíveis (USE NO MÍNIMO 6 TIPOS DIFERENTES):
- "cover": abertura (título + subtítulo; campo opcional "image" — SOMENTE um LOGOTIPO CANDIDATO adequado; será exibido pequeno e elegante acima do título; se não houver logo adequado, omita o campo)
- "image_split": imagem à esquerda + título e NO MÁXIMO 3 bullets à direita (máx 10 palavras cada) — campos: image, bullets
- "kpi": cards de métricas (2-4 KPIs visuais com ícone, valor e trend)
- "chart_bar": gráfico de barras horizontais (3-6 items com label, value numérico 0-100, display curto — máx 16 caracteres, ex: "65%", "R$ 36 bi", "18,7%")
- "chart_donut": gráfico de rosca (3-5 segmentos com label, value numérico, color hex)
- "meter": barras de progresso/score visual (3-5 métricas com label, value 0-100, color)
- "bullets": lista curta (máximo 4 bullets de 1 linha) — use NO MÁXIMO 2x na apresentação
- "icon_grid": grade de 4-5 items (não 6, fica apertado) com ícone, título curto (máx 3 palavras) e descrição de 1 linha (máx 7 palavras)
- "comparison": 2-3 colunas comparativas (3-4 items curtos por coluna, máx 8 palavras cada)
- "quote": citação/dado em destaque grande
- "timeline": 3-5 marcos temporais (período + frase curta)
- "two_column": 2 colunas (oportunidades vs riscos, prós vs contras) — MÁXIMO 3-4 itens por coluna, cada item máx 8 palavras
- "big_number": 1 número gigante impactante com legenda curta
- "closing": encerramento com 2-3 ações concretas — cada ação máx 8 palavras (é um slide de fechamento, não uma lista de instruções)

Retorne JSON:
{
  "title": "título impactante",
  "subtitle": "subtítulo curto",
  "date": "${new Date().toLocaleDateString('pt-BR')}",
  "slides": [
    { "layout": "cover", "kicker": "ABERTURA", "title": "título", "subtitle": "subtítulo", "image": "URL de LOGOTIPO CANDIDATO ou omitir" },
    { "layout": "image_split", "kicker": "CONTEXTO", "title": "título", "image": "URL", "bullets": ["ponto curto 1", "ponto 2"] },
    { "layout": "kpi", "kicker": "PANORAMA", "title": "Indicadores-Chave",
      "kpis": [{ "label": "Receita", "value": "R$ 36 bi", "detail": "+8% a.a.", "trend": "up", "icon": "revenue" }] },
    { "layout": "chart_bar", "kicker": "MERCADO", "title": "Participação por Segmento",
      "chart": { "items": [{ "label": "Segmento A", "value": 65, "display": "65%" }] } },
    { "layout": "chart_donut", "kicker": "DISTRIBUIÇÃO", "title": "Receita por Região",
      "chart": { "segments": [{ "label": "Sudeste", "value": 45, "color": "#3b82f6" }] } },
    { "layout": "meter", "kicker": "PERFORMANCE", "title": "Avaliação de Desempenho",
      "meters": [{ "label": "Satisfação", "value": 82, "color": "#22d3ee" }] },
    { "layout": "icon_grid", "kicker": "DESTAQUES", "title": "Principais Diferenciais",
      "items": [{ "icon": "target", "title": "Inovação", "desc": "Líder em P&D no setor" }] },
    { "layout": "big_number", "kicker": "IMPACTO", "title": "contexto", "number": "R$ 150 bi", "caption": "legenda curta" },
    { "layout": "timeline", "kicker": "EVOLUÇÃO", "title": "Marcos",
      "timeline": [{ "period": "2020", "event": "marco curto" }] },
    { "layout": "two_column", "kicker": "ANÁLISE", "title": "Oportunidades vs Riscos",
      "left": { "heading": "Oportunidades", "items": ["item 1"] },
      "right": { "heading": "Riscos", "items": ["item 1"] } },
    { "layout": "closing", "kicker": "CONCLUSÃO", "title": "Próximos Passos",
      "bullets": ["ação 1", "ação 2"], "closing_message": "mensagem final" }
  ],
  "key_messages": ["msg 1", "msg 2", "msg 3"],
  "sources": ["fonte 1"]
}

Ícones para icon_grid: target, chart, users, shield, globe, bolt, star, building, revenue, trend, brain, handshake.
Use MÍNIMO 6 layouts diferentes. Comece com cover, termine com closing. PRIORIZE layouts visuais (chart_bar, chart_donut, meter, kpi, icon_grid).`;
  } else if (outputType === 'dash') {
    promptByType = `Crie um DASHBOARD EXECUTIVO para DIRETORIA sobre: "${topicLabel}"
${fullContext}

REGRAS DE OURO (dashboard é VISUAL, não documento):
- O leitor é um diretor com 60 segundos: leitura instantânea, zero texto longo.
- LIMITES RÍGIDOS DE TEXTO:
  · "label" de gráficos/KPIs: máximo 3 palavras
  · "display" de gráficos: valor curto e AUTOEXPLICATIVO (ex: "65%", "R$ 23,5 bi", "832 seguidores", "500+ conexões") — máximo 20 caracteres. PROIBIDO abreviações obscuras tipo "seg.", "conn.", "id." — escreva a unidade por extenso ou use só o número com símbolo.
  · "detail" de KPI: máximo 6 palavras
  · "text" de highlights: 1 frase de máximo 14 palavras
  · "insights": 1 frase de máximo 18 palavras cada
  · "risks"/"opportunities": máximo 15 palavras cada
  · "summary": máximo 3 frases curtas
- Números REAIS dos dados coletados. Se não tem número, não crie o gráfico/KPI correspondente.
- GRÁFICOS SÓ COM DADOS MENSURÁVEIS: cada barra/segmento precisa de um número real e comparável. PROIBIDO barras para fatos qualitativos ou ausentes ("Não identificado", "Ativo", "Sim/Não") — esses fatos vão em "highlights" como frase, nunca em gráfico.
- "value" dos gráficos é sempre NÚMERO puro (0-100 proporcional à grandeza real), nunca texto. Itens da mesma categoria devem ser comparáveis entre si (mesma unidade).

Retorne JSON:
{
  "title": "título curto do dashboard",
  "subtitle": "contexto ou período (máx 6 palavras)",
  "summary": "leitura executiva da situação em NO MÁXIMO 3 frases curtas",
  "kpis": [
    { "label": "indicador (máx 3 palavras)", "value": "valor curto", "detail": "contexto (máx 6 palavras)", "trend": "up/down/neutral", "icon": "revenue/users/growth/alert/check/target" }
  ],
  "categories": [
    { "name": "nome da categoria (máx 4 palavras)", "items": [
      { "label": "item (máx 3 palavras)", "value": 65, "display": "65%" }
    ]}
  ],
  "distribution": [
    { "label": "segmento (máx 3 palavras)", "value": 42, "color": "#3b82f6" }
  ],
  "highlights": [
    { "type": "positive", "text": "1 frase curta com dado real" },
    { "type": "negative", "text": "1 frase curta de atenção" },
    { "type": "neutral", "text": "1 fato relevante curto" }
  ],
  "insights": ["insight de 1 frase 1", "insight 2", "insight 3"],
  "trend_data": { "label": "Evolução de X (máx 4 palavras)", "values": [12,15,18,22,28,34] },
  "risks": ["risco curto 1", "risco 2"],
  "opportunities": ["oportunidade curta 1", "oportunidade 2"],
  "sources": ["fonte 1", "fonte 2"]
}

Gere 4-6 KPIs, 2 categorias com 3-4 items cada, 3-5 segmentos de distribuição e 3 insights. Inclua trend_data apenas se houver série histórica real.`;
  } else if (outputType === 'onepager') {
    promptByType = `Crie um ONE-PAGER (resumo executivo em 1 página) sobre: "${topicLabel}"
${fullContext}

O one-pager deve ser DENSO em informação real — tudo que um executivo precisa saber condensado em uma única página impactante.

Retorne JSON:
{
  "title": "título principal direto",
  "subtitle": "linha de contexto",
  "hero_image": "URL de IMAGENS DISPONÍVEIS relevante ao tema ou null",
  "headline": "frase de impacto que resume tudo em 1 linha (com dado real se possível)",
  "kpis": [
    { "label": "indicador real", "value": "valor real", "detail": "contexto" }
  ],
  "sections": [
    {
      "title": "nome da seção",
      "icon": "target/chart/users/shield/globe/bolt",
      "content": "parágrafo completo e detalhado com informações reais — mínimo 3 frases substanciais com dados concretos dos DADOS COLETADOS",
      "highlights": ["dado ou fato destacado 1", "dado 2"]
    }
  ],
  "callout": {
    "type": "warning/success/info",
    "title": "Ponto Crítico",
    "text": "informação importante que merece destaque visual"
  },
  "conclusion": "parágrafo de fechamento com recomendação clara e próximos passos concretos",
  "sources": ["fonte 1", "fonte 2"]
}

Gere 3-5 KPIs e 4-6 seções substanciais.`;
  } else {
    promptByType = `Crie um RELATÓRIO EXECUTIVO profissional e detalhado sobre: "${topicLabel}"
${fullContext}

O relatório deve ter profundidade de consultoria — cada seção com análise real, dados concretos e recomendações práticas.

Retorne JSON:
{
  "title": "título do relatório",
  "subtitle": "contexto ou escopo",
  "hero_image": "URL de IMAGENS DISPONÍVEIS relevante ao tema ou null",
  "executive_summary": "2-3 parágrafos de resumo executivo denso — a síntese completa com dados reais do relatório",
  "kpis": [
    { "label": "indicador real", "value": "valor", "detail": "contexto", "trend": "up/down/neutral" }
  ],
  "sections": [
    {
      "title": "título da seção",
      "icon": "target/chart/users/shield/globe/bolt/report",
      "content": "2-3 parágrafos objetivos e densos com análise real, dados concretos e contexto — sem genericidades e sem repetir o resumo executivo",
      "highlights": ["ponto-chave 1 com dado", "ponto-chave 2"],
      "subsections": [
        { "title": "subtítulo", "content": "parágrafo detalhado" }
      ]
    }
  ],
  "key_findings": [
    { "finding": "achado importante com dado real", "impact": "alto/médio/baixo", "detail": "explicação" }
  ],
  "risks": [
    { "risk": "descrição do risco", "severity": "alto/médio/baixo", "mitigation": "como mitigar" }
  ],
  "recommendations": [
    { "title": "título da recomendação", "description": "explicação detalhada", "priority": "alta/média/baixa" }
  ],
  "conclusion": "parágrafo de conclusão com visão de futuro e próximos passos",
  "sources": ["fonte 1 utilizada", "fonte 2"]
}

Gere 4-6 seções objetivas (use subsections só quando realmente agregarem — no máximo 1-2 por seção), 3-4 key_findings, 3-4 risks e 3-4 recommendations. Prefira densidade a extensão: um relatório executivo conciso e certeiro vale mais que um longo e repetitivo.`;
  }

  try {
    // Teto de saída por tipo — o relatório era o mais pesado (gerava ~10k tokens
    // e levava ~3 min). Com o prompt mais enxuto, 6500 acomoda o conteúdo sem
    // truncar e corta o tempo de geração quase pela metade.
    const maxTok = outputType === 'report' ? 6500 : (outputType === 'slides' ? 8500 : 7000);
    const raw = await askClaude(system, promptByType, M.standard, maxTok);
    let result = extractJSON(raw);
    result = await reviewResult(result, `Material visual (${outputType}) sobre: "${topicLabel}". Todo slide/seção deve ser sobre esse tema, sem placeholders genéricos e sem dados inventados. Em gráficos: remova itens sem dado numérico real (ex: "Não identificado") e corrija rótulos/valores com abreviações obscuras (ex: "832 seg." deve virar "832 seguidores").${isCompareSeed ? ` ATENÇÃO: é uma COMPARAÇÃO entre ${cmpNames.join(' x ')} — verifique que todas as empresas têm presença equilibrada (mesmos indicadores e detalhe); remova imagem/logotipo que destaque só uma empresa.` : ''}`, 10000);
    // Rede de segurança: remove slides sem conteúdo real para o layout (a IA às vezes gera
    // um slide só com título/kicker, sem preencher os campos de dados — vira um slide vazio).
    if (outputType === 'slides' && Array.isArray(result.slides)) {
      const hasContent = (s) => {
        switch (s.layout) {
          case 'image_split': return (s.bullets || []).length > 0;
          case 'kpi': return (s.kpis || []).length > 0;
          case 'chart_bar': return (s.chart?.items || []).length > 0;
          case 'chart_donut': return (s.chart?.segments || []).length > 0;
          case 'meter': return (s.meters || []).length > 0;
          case 'bullets': return (s.bullets || []).length > 0;
          case 'icon_grid': return (s.items || []).length > 0;
          case 'comparison': return (s.columns || []).some(c => (c.items || []).length > 0);
          case 'quote': return !!(s.quote && s.quote.trim());
          case 'timeline': return (s.timeline || []).length > 0;
          case 'two_column': return ((s.left?.items || []).length > 0) || ((s.right?.items || []).length > 0);
          case 'big_number': return !!(s.number && String(s.number).trim());
          case 'closing': return (s.bullets || []).length > 0 || !!(s.closing_message && s.closing_message.trim());
          default: return true; // cover e layouts não listados: mantém (título já é conteúdo suficiente)
        }
      };
      result.slides = result.slides.filter(hasContent);
    }
    result._outputType = outputType;
    result._sources = webData.length;
    res.json({ ok: true, result });
  } catch (e) {
    console.error('[display]', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   SOLVE (Direcionamento rápido do Display)
   ──────────────────────────────────────────────────────────── */
app.post('/api/solve', async (req, res) => {
  const { topic, context } = req.body;
  const system = `Você é um consultor estratégico da Brentor.ai. Dê um direcionamento prático sobre como abordar e apresentar o tema solicitado. Seja direto e objetivo. ${ctxBlock(context)}`;
  try {
    const raw = await askClaude(system, `Dê direcionamento estratégico para apresentar: "${topic}"
Retorne JSON: { "approach": "...", "structure": ["passo 1","passo 2","passo 3"], "risks": ["risco 1"], "tips": ["dica 1","dica 2"] }`, M.fast, 1500);
    res.json({ ok: true, ...extractJSON(raw) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ────────────────────────────────────────────────────────────
   START
   ──────────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log('\n══════════════════════════════════════');
  console.log('  🤖  Brentor.ai — Servidor iniciado');
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  🧠  Claude: ${M.standard}`);
  console.log(`  🔍  Busca web (Tavily): ${hasTavily ? '✅ ativa' : '⚠️  não configurada (modo conhecimento interno)'}`);
  console.log('══════════════════════════════════════\n');
});
