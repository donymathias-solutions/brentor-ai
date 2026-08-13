/* ============================================================
   Brentor.ai — db.js
   Conexão com Postgres e criação do schema.

   Regra de ouro deste arquivo: se DATABASE_URL não estiver
   configurada, o app continua funcionando exatamente como antes
   (estado no navegador). Assim dá para publicar o backend de contas
   sem derrubar o site que já está no ar — as contas só entram em
   operação quando o banco existir.
   ============================================================ */
const { Pool } = require('pg');

const URL = process.env.DATABASE_URL || '';
let pool = null;
let pronto = false;
let erroInicial = null;

if (URL) {
  pool = new Pool({
    connectionString: URL,
    // Provedores gerenciados (Neon, Render, Supabase) exigem TLS e usam
    // certificado próprio — rejectUnauthorized:false é o padrão deles.
    ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (e) => console.error('[db] erro no pool:', e.message));
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  email_norm    TEXT        NOT NULL UNIQUE,
  company       TEXT        DEFAULT '',
  doc           TEXT        DEFAULT '',            -- CPF/CNPJ só de dígitos
  pass_hash     TEXT        NOT NULL,
  plan          TEXT        NOT NULL DEFAULT 'free',
  credits       INTEGER     NOT NULL DEFAULT 350,
  credits_max   INTEGER     NOT NULL DEFAULT 350,
  trial_expiry  TIMESTAMPTZ,
  is_admin      BOOLEAN     NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um período gratuito por CPF/CNPJ. Índice parcial: contas sem documento
-- (planos pagos criados pelo Stripe, por exemplo) não entram na restrição.
CREATE UNIQUE INDEX IF NOT EXISTS users_doc_unico
  ON users (doc) WHERE doc <> '';

-- Sessões ficam no banco (e não só num JWT) para que "sair" invalide de
-- verdade e para dar de baixa em todas as sessões ao trocar a senha.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT        PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- Histórico de consumo de créditos: é a base do extrato do usuário e da
-- conferência de custo por ferramenta.
CREATE TABLE IF NOT EXISTS credit_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT        NOT NULL,     -- analysis, compare, mynews…
  label       TEXT        DEFAULT '',
  cost        INTEGER     NOT NULL,     -- negativo = estorno
  web         INTEGER     NOT NULL DEFAULT 0,
  ai          INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_events_user ON credit_events (user_id, created_at DESC);

-- Links de confirmação de e-mail e de redefinição de senha.
-- Guardamos o HASH do token, nunca o token em si: se o banco vazar,
-- os links já emitidos não servem para invadir conta nenhuma.
CREATE TABLE IF NOT EXISTS tokens (
  token_hash  TEXT        PRIMARY KEY,
  user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT        NOT NULL,      -- 'verify' | 'reset'
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tokens_user ON tokens (user_id, kind);
`;

/* Colunas acrescentadas depois da primeira versão do schema. CREATE TABLE
   IF NOT EXISTS não altera tabela existente, então cada nova coluna precisa
   do seu ALTER — que é idempotente com IF NOT EXISTS. */
const MIGRACOES = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`,
];

async function init() {
  if (!pool) return false;
  try {
    await pool.query(SCHEMA);
    for (const m of MIGRACOES) await pool.query(m);
    pronto = true;
    console.log('✅  Banco de contas conectado e schema pronto.');
    return true;
  } catch (e) {
    erroInicial = e.message;
    console.error('❌  Não foi possível preparar o banco:', e.message);
    console.error('    O app segue no modo local (estado no navegador) até o banco responder.');
    return false;
  }
}

async function q(text, params) {
  if (!pool) throw new Error('Banco não configurado');
  return pool.query(text, params);
}

module.exports = {
  init, q,
  ativo: () => pronto,
  configurado: () => !!URL,
  ultimoErro: () => erroInicial,
};
