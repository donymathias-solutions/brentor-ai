/* ============================================================
   Brentor.ai — billing.js
   Assinaturas via Stripe: Checkout hospedado, webhook e Portal do
   Cliente. O plano e o saldo de créditos do usuário passam a ser
   confirmados pela Stripe, não escolhidos pelo navegador.

   Sem STRIPE_SECRET_KEY configurada, as rotas respondem 503 e o
   resto do app segue intacto — mesmo padrão de db.js e mailer.js.
   Chaves de teste (sk_test_/pk_test_) funcionam de igual pra igual
   às chaves reais: dá para construir e testar tudo antes de a conta
   Stripe terminar de ser verificada.
   ============================================================ */
const express = require('express');
const db = require('./db');
const auth = require('./auth');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}
const ativo = () => !!stripe;

/* Preço da Stripe → plano do Brentor, e o caminho inverso. Os IDs vivem em
   variável de ambiente porque mudam entre o modo de teste e o modo real —
   nunca ficam gravados no código. */
function precoDoPlano(plano) {
  return { silver: process.env.STRIPE_PRICE_SILVER, gold: process.env.STRIPE_PRICE_GOLD,
    diamond: process.env.STRIPE_PRICE_DIAMOND }[plano];
}
function planoDoPreco(priceId) {
  const mapa = { [process.env.STRIPE_PRICE_SILVER]: 'silver', [process.env.STRIPE_PRICE_GOLD]: 'gold',
    [process.env.STRIPE_PRICE_DIAMOND]: 'diamond' };
  return mapa[priceId] || null;
}

/* Preço de cada plano em reais — espelho de B.plans (assets/js/config.js).
   O Pix Automático exige declarar de antemão, em centavos, o teto que o
   banco do cliente pode debitar por ciclo — diferente do cartão, que lê
   isso direto da fatura. A cobrança de verdade sempre segue o Price da
   Stripe; isto é só o limite do mandato. */
const PRECO_PLANO_BRL = { silver: 39.90, gold: 69.90, diamond: 109.90 };

/* Cria o Customer da Stripe na primeira vez e grava no banco; da segunda
   em diante reaproveita — é o vínculo entre a conta Brentor e a Stripe. */
async function garantirCustomer(u) {
  if (u.stripe_customer_id) return u.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: u.email, name: u.name, metadata: { brentor_user_id: String(u.id) },
  });
  await db.q('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, u.id]);
  return customer.id;
}

/* Aplica o estado de uma assinatura ao usuário. `sub === null` é cancelamento
   ou inadimplência definitiva → volta para o plano free (sem repetir o
   período de teste, que já foi usado no cadastro). */
async function aplicarAssinatura(customerId, sub) {
  const { rows } = await db.q('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
  const u = rows[0];
  if (!u) { console.error('[billing] customer sem usuário correspondente:', customerId); return; }

  if (!sub || sub.status === 'canceled' || sub.status === 'unpaid') {
    await db.q(`UPDATE users SET plan='free', credits=LEAST(credits,350), credits_max=350,
      stripe_subscription_id=NULL, updated_at=now() WHERE id=$1`, [u.id]);
    return;
  }

  const priceId = sub.items?.data?.[0]?.price?.id;
  const plano = planoDoPreco(priceId);
  if (!plano) { console.error('[billing] price sem plano mapeado:', priceId); return; }

  const max = auth.PLANOS[plano].credits;
  await db.q(`UPDATE users SET plan=$1, credits=$2, credits_max=$2, trial_expiry=NULL,
    stripe_subscription_id=$3, updated_at=now() WHERE id=$4`, [plano, max, sub.id, u.id]);
}

/* ── Webhook ── precisa do corpo CRU para validar a assinatura da Stripe;
   por isso é montado ANTES do express.json() global, que consumiria o
   corpo e quebraria a verificação. */
function montarWebhook(app) {
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!ativo()) return res.status(503).send('Stripe não configurado');
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      console.error('[billing] assinatura do webhook inválida:', e.message);
      return res.status(400).send('Assinatura inválida');
    }
    if (!db.ativo()) return res.json({ received: true }); // sem banco não há o que gravar

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.mode === 'subscription' && session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            await aplicarAssinatura(session.customer, sub);
          }
          break;
        }
        case 'customer.subscription.updated':
          await aplicarAssinatura(event.data.object.customer, event.data.object);
          break;
        case 'customer.subscription.deleted':
          await aplicarAssinatura(event.data.object.customer, null);
          break;
        case 'invoice.payment_succeeded': {
          // renovação do ciclo: recarrega os créditos ao teto do plano
          const invoice = event.data.object;
          if (invoice.billing_reason === 'subscription_cycle') {
            const { rows } = await db.q('SELECT id, plan FROM users WHERE stripe_customer_id = $1', [invoice.customer]);
            if (rows[0] && rows[0].plan !== 'free') {
              await db.q('UPDATE users SET credits = credits_max, updated_at = now() WHERE id = $1', [rows[0].id]);
            }
          }
          break;
        }
      }
    } catch (e) {
      console.error('[billing] erro processando webhook:', e.message);
      return res.status(500).send('Erro interno');
    }
    res.json({ received: true });
  });
}

/* ── Checkout e Portal ── exigem login; montadas depois do express.json(). */
function montarRotas(app) {
  app.get('/api/billing/status', (req, res) => res.json({ ativo: ativo() }));

  app.post('/api/billing/checkout', auth.exigirLogin, async (req, res) => {
    if (!ativo()) return res.status(503).json({ error: 'Pagamentos indisponíveis no momento.' });
    try {
      const plano = String(req.body?.plan || '');
      const price = precoDoPlano(plano);
      if (!price) return res.status(400).json({ error: 'Plano inválido.' });

      const customerId = await garantirCustomer(req.usuario);
      const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const config = {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/#assinatura=ok`,
        cancel_url: `${base}/#assinatura=cancelada`,
        allow_promotion_codes: true,
        locale: 'pt-BR',
      };
      // Pix só entra quando a conta Stripe já tiver o método liberado — pedir
      // um tipo de pagamento que a conta ainda não tem faz a sessão inteira
      // falhar, cartão incluso. STRIPE_PIX_ATIVO=1 liga isto sem deploy novo,
      // assim que o Pix aparecer disponível no painel da Stripe.
      if (process.env.STRIPE_PIX_ATIVO === '1') {
        config.payment_method_types = ['card', 'pix'];
        // Pix Automático: a renovação não é instantânea como no cartão — o
        // banco do cliente avisa 3 dias antes de debitar — e o teto do
        // mandato precisa vir declarado aqui, em centavos.
        config.payment_method_options = {
          pix: { mandate_options: { payment_schedule: 'monthly', amount: Math.round(PRECO_PLANO_BRL[plano] * 100) } },
        };
      }
      const session = await stripe.checkout.sessions.create(config);
      res.json({ url: session.url });
    } catch (e) { res.status(500).json({ error: 'Não foi possível iniciar o pagamento: ' + e.message }); }
  });

  /* Portal do Cliente: trocar cartão, ver faturas, mudar de plano, cancelar
     — tudo do lado da Stripe, sem precisar construir nenhuma tela disso. */
  app.post('/api/billing/portal', auth.exigirLogin, async (req, res) => {
    if (!ativo()) return res.status(503).json({ error: 'Indisponível no momento.' });
    try {
      if (!req.usuario.stripe_customer_id) return res.status(400).json({ error: 'Você ainda não tem uma assinatura ativa.' });
      const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: req.usuario.stripe_customer_id,
        return_url: `${base}/#conta`,
      });
      res.json({ url: session.url });
    } catch (e) { res.status(500).json({ error: 'Não foi possível abrir o portal: ' + e.message }); }
  });
}

module.exports = { montarWebhook, montarRotas, ativo };
