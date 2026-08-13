/* ============================================================
   Brentor.ai — auth.js
   Contas de verdade: cadastro, login, sessão e créditos no servidor.

   Por que isso existe: até aqui plano e créditos moravam no
   localStorage do navegador, ou seja, qualquer pessoa podia se dar
   um plano Diamond com o console aberto — e quem pagasse perdia o
   acesso ao trocar de navegador. Nada de cobrança faz sentido antes
   de a conta viver no servidor.
   ============================================================ */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const mailer = require('./mailer');

/* Espelho dos planos de assets/js/config.js. Precisa ser mantido igual —
   o servidor é a autoridade sobre plano e créditos; o navegador só exibe. */
const PLANOS = {
  free:    { credits: 350,  trialDays: 15 },
  silver:  { credits: 750 },
  gold:    { credits: 1500 },
  diamond: { credits: 3000 },
};

const COOKIE = 'brentor_sess';
const DIAS_SESSAO = 30;

/* ── utilidades ─────────────────────────────────────────── */
const normEmail = (e) => String(e || '').trim().toLowerCase();
const soDigitos = (d) => String(d || '').replace(/\D/g, '');

function lerCookie(req, nome) {
  const raw = req.headers.cookie || '';
  for (const parte of raw.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) return decodeURIComponent(parte.slice(i + 1));
  }
  return null;
}

function gravarCookie(res, token) {
  const seguro = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESSAO * 86400}` +
    (seguro ? '; Secure' : ''));
}
function limparCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

/* O que o navegador pode saber sobre a conta. Nunca inclui o hash da senha. */
function publico(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company || '',
    doc: u.doc || '',
    plan: u.plan,
    credits: u.credits,
    creditsMax: u.credits_max,
    trialExpiry: u.trial_expiry ? new Date(u.trial_expiry).toISOString() : null,
    isAdmin: u.is_admin,
    emailVerificado: !!u.email_verified,
  };
}

/* ── tokens de e-mail (confirmação e redefinição) ────────
   O que vai no link é o token cru; no banco fica só o SHA-256 dele.
   Assim um vazamento do banco não entrega acesso a conta nenhuma. */
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function criarToken(userId, kind, horas) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + horas * 3600000);
  // um pedido novo invalida os anteriores do mesmo tipo
  await db.q('DELETE FROM tokens WHERE user_id = $1 AND kind = $2', [userId, kind]);
  await db.q('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES ($1,$2,$3,$4)',
    [hashToken(token), userId, kind, exp]);
  return token;
}

async function consumirToken(token, kind) {
  const { rows } = await db.q(
    `UPDATE tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`, [hashToken(token), kind]);
  return rows[0] ? rows[0].user_id : null;
}

function enderecoBase(req) {
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

async function mandarConfirmacao(req, u) {
  const token = await criarToken(u.id, 'verify', 48);
  const link = `${enderecoBase(req)}/#confirmar=${token}`;
  const { assunto, html } = mailer.emailConfirmacao(String(u.name).split(' ')[0], link);
  const r = await mailer.enviar(u.email, assunto, html);
  if (!r.enviado) console.log(`[auth] link de confirmação de ${u.email}: ${link}`);
  return r;
}

async function usuarioDaSessao(req) {
  const token = lerCookie(req, COOKIE);
  if (!token) return null;
  const { rows } = await db.q(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expires_at > now()`, [token]);
  return rows[0] || null;
}

async function criarSessao(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const exp = new Date(Date.now() + DIAS_SESSAO * 86400000);
  await db.q('INSERT INTO sessions (token, user_id, expires_at) VALUES ($1,$2,$3)', [token, userId, exp]);
  gravarCookie(res, token);
  return token;
}

/* Middleware: exige login. Usado nas rotas de IA para ninguém consumir
   a chave da Anthropic sem conta e sem créditos. */
async function exigirLogin(req, res, next) {
  if (!db.ativo()) return next();           // banco ausente → modo local, como antes
  try {
    const u = await usuarioDaSessao(req);
    if (!u) return res.status(401).json({ error: 'Sessão expirada — entre novamente.' });
    req.usuario = u;
    next();
  } catch (e) { res.status(500).json({ error: 'Falha ao validar a sessão: ' + e.message }); }
}

/* ── rotas ──────────────────────────────────────────────── */
function montar(app) {
  /* Diz ao navegador se existe backend de contas. Enquanto for false, o
     frontend segue com o estado local — nada quebra durante a transição. */
  app.get('/api/auth/status', (req, res) => {
    res.json({ contas: db.ativo(), configurado: db.configurado() });
  });

  app.post('/api/auth/register', async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Cadastro indisponível no momento.' });
    try {
      const { name, email, company, doc, password } = req.body || {};
      if (!String(name || '').trim()) return res.status(400).json({ error: 'Informe seu nome.' });
      const em = normEmail(email);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ error: 'E-mail inválido.' });
      if (String(password || '').length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      const documento = soDigitos(doc);
      if (documento.length !== 11 && documento.length !== 14) {
        return res.status(400).json({ error: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.' });
      }

      const hash = await bcrypt.hash(String(password), 10);
      const validade = new Date(Date.now() + PLANOS.free.trialDays * 86400000);
      const { rows } = await db.q(
        `INSERT INTO users (name, email, email_norm, company, doc, pass_hash, plan, credits, credits_max, trial_expiry)
         VALUES ($1,$2,$3,$4,$5,$6,'free',$7,$7,$8) RETURNING *`,
        [String(name).trim(), String(email).trim(), em, String(company || '').trim(), documento, hash,
         PLANOS.free.credits, validade]);

      await criarSessao(res, rows[0].id);
      mandarConfirmacao(req, rows[0]).catch(e => console.error('[auth] confirmação:', e.message));
      res.json({ user: publico(rows[0]) });
    } catch (e) {
      if (e.code === '23505') {   // violação de unicidade
        const msg = /users_doc_unico/.test(e.message || '')
          ? 'Este CPF/CNPJ já utilizou o período gratuito.'
          : 'Já existe uma conta com este e-mail.';
        return res.status(409).json({ error: msg });
      }
      res.status(500).json({ error: 'Não foi possível criar a conta: ' + e.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Login indisponível no momento.' });
    try {
      const em = normEmail(req.body?.email);
      const { rows } = await db.q('SELECT * FROM users WHERE email_norm = $1', [em]);
      const u = rows[0];
      // Mesma resposta para e-mail inexistente e senha errada: não entrega
      // a quem tenta adivinhar a informação de quais e-mails têm conta.
      const ok = u && await bcrypt.compare(String(req.body?.password || ''), u.pass_hash);
      if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
      await criarSessao(res, u.id);
      res.json({ user: publico(u) });
    } catch (e) { res.status(500).json({ error: 'Falha no login: ' + e.message }); }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const token = lerCookie(req, COOKIE);
      if (token && db.ativo()) await db.q('DELETE FROM sessions WHERE token = $1', [token]);
    } catch (e) { /* sair nunca deve falhar para o usuário */ }
    limparCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!db.ativo()) return res.json({ user: null, contas: false });
    try {
      const u = await usuarioDaSessao(req);
      res.json({ user: u ? publico(u) : null, contas: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* Atualiza dados de cadastro e, opcionalmente, a senha. Trocar a senha
     encerra as outras sessões — se alguém entrou na conta, perde o acesso. */
  app.post('/api/auth/update', exigirLogin, async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    try {
      const u = req.usuario;
      const { name, email, company, password, currentPassword } = req.body || {};
      const em = email ? normEmail(email) : u.email_norm;
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return res.status(400).json({ error: 'E-mail inválido.' });

      let hash = u.pass_hash;
      if (password) {
        if (String(password).length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
        if (!await bcrypt.compare(String(currentPassword || ''), u.pass_hash)) {
          return res.status(401).json({ error: 'A senha atual está incorreta.' });
        }
        hash = await bcrypt.hash(String(password), 10);
      }

      const { rows } = await db.q(
        `UPDATE users SET name=$1, email=$2, email_norm=$3, company=$4, pass_hash=$5, updated_at=now()
          WHERE id=$6 RETURNING *`,
        [String(name || u.name).trim(), String(email || u.email).trim(), em,
         String(company ?? u.company ?? '').trim(), hash, u.id]);

      if (password) {
        const atual = lerCookie(req, COOKIE);
        await db.q('DELETE FROM sessions WHERE user_id = $1 AND token <> $2', [u.id, atual]);
      }
      res.json({ user: publico(rows[0]) });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      res.status(500).json({ error: 'Não foi possível salvar: ' + e.message });
    }
  });

  /* ── Confirmação de e-mail ──────────────────────────── */

  app.post('/api/auth/verify', async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    try {
      const userId = await consumirToken(String(req.body?.token || ''), 'verify');
      if (!userId) return res.status(400).json({ error: 'Link inválido ou expirado. Peça um novo e-mail de confirmação.' });
      const { rows } = await db.q(
        'UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = $1 RETURNING *', [userId]);
      res.json({ user: publico(rows[0]) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/verify/resend', exigirLogin, async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    try {
      if (req.usuario.email_verified) return res.json({ ok: true, jaConfirmado: true });
      const r = await mandarConfirmacao(req, req.usuario);
      res.json({ ok: true, enviado: r.enviado });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  /* ── Recuperação de senha ───────────────────────────── */

  /* Responde sempre igual, exista ou não a conta: senão, esta rota vira um
     detector de quais e-mails estão cadastrados no Brentor. */
  app.post('/api/auth/forgot', async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    const resposta = { ok: true };
    try {
      const em = normEmail(req.body?.email);
      const { rows } = await db.q('SELECT * FROM users WHERE email_norm = $1', [em]);
      const u = rows[0];
      if (u) {
        const token = await criarToken(u.id, 'reset', 1);
        const link = `${enderecoBase(req)}/#senha=${token}`;
        const { assunto, html } = mailer.emailRecuperacao(String(u.name).split(' ')[0], link);
        const r = await mailer.enviar(u.email, assunto, html);
        if (!r.enviado) console.log(`[auth] link de redefinição de ${u.email}: ${link}`);
      }
    } catch (e) { console.error('[auth] forgot:', e.message); }
    res.json(resposta);
  });

  app.post('/api/auth/reset', async (req, res) => {
    if (!db.ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    try {
      const senha = String(req.body?.password || '');
      if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
      const userId = await consumirToken(String(req.body?.token || ''), 'reset');
      if (!userId) return res.status(400).json({ error: 'Link inválido, já usado ou expirado. Peça um novo.' });

      const hash = await bcrypt.hash(senha, 10);
      await db.q('UPDATE users SET pass_hash = $1, updated_at = now() WHERE id = $2', [hash, userId]);
      // Quem redefine a senha derruba todas as sessões: se alguém estava
      // dentro da conta, perde o acesso na hora.
      await db.q('DELETE FROM sessions WHERE user_id = $1', [userId]);

      const { rows } = await db.q('SELECT * FROM users WHERE id = $1', [userId]);
      await criarSessao(res, userId);
      res.json({ user: publico(rows[0]) });
    } catch (e) { res.status(500).json({ error: 'Não foi possível redefinir: ' + e.message }); }
  });
}

/* ── créditos (a autoridade passa a ser o servidor) ─────── */

/* Debita antes de chamar a IA. Um UPDATE condicional resolve a corrida:
   duas abas pedindo ao mesmo tempo não conseguem gastar o mesmo saldo. */
async function debitar(userId, custo, acao, label, web, ai) {
  const { rows } = await db.q(
    `UPDATE users SET credits = credits - $2, updated_at = now()
      WHERE id = $1 AND credits >= $2 RETURNING credits`, [userId, custo]);
  if (!rows[0]) return null;
  await db.q(
    `INSERT INTO credit_events (user_id, action, label, cost, web, ai) VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, acao, label || '', custo, web || 0, ai || 0]);
  return rows[0].credits;
}

/* Estorna quando a geração falha — o usuário não paga por erro nosso. */
async function estornar(userId, custo, acao) {
  const { rows } = await db.q(
    `UPDATE users SET credits = LEAST(credits + $2, credits_max), updated_at = now()
      WHERE id = $1 RETURNING credits`, [userId, custo]);
  await db.q(`INSERT INTO credit_events (user_id, action, label, cost) VALUES ($1,$2,'estorno',$3)`,
    [userId, acao, -custo]);
  return rows[0] ? rows[0].credits : null;
}

module.exports = { montar, exigirLogin, usuarioDaSessao, debitar, estornar, publico, PLANOS };
