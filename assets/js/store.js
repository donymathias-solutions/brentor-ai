/* ============================================================
   Brentor.ai — store.js
   Estado persistente (localStorage). Em produção seria a API/DB.
   ============================================================ */
(function (B) {
  'use strict';
  const KEY     = 'brentor.state.v1';
  const DOCS_KEY = 'brentor.docs.v1';  // persiste mesmo após reset — rastreia CPF/CNPJ usados

  /* Documentos (CPF/CNPJ) que já usaram o período gratuito.
     Armazenado em chave separada para sobreviver ao store.reset(). */
  function loadDocs() {
    try { return JSON.parse(localStorage.getItem(DOCS_KEY)||'[]'); } catch(e){ return []; }
  }
  function saveDocs(arr) { try { localStorage.setItem(DOCS_KEY, JSON.stringify(arr)); } catch(e){} }

  const seedAdminCustomers = () => ([
    { name:'Construtora Andrade',   email:'fin@andrade.com',      plan:'diamond', status:'active',  mrr:109.90, since:'2026-01-12', usage:74 },
    { name:'TechNova Sistemas',     email:'ops@technova.io',      plan:'gold',    status:'active',  mrr:69.90, since:'2026-02-03', usage:88 },
    { name:'Verde Agro',            email:'compras@verdeagro.com',plan:'gold',    status:'active',  mrr:69.90, since:'2026-02-20', usage:41 },
    { name:'Lima Advogados',        email:'adm@limaadv.com.br',   plan:'silver',  status:'trial',   mrr:0,     since:'2026-05-28', usage:23 },
    { name:'Móveis Bonato',         email:'diretoria@bonato.com', plan:'silver',  status:'active',  mrr:39.90, since:'2026-03-15', usage:67 },
    { name:'Clínica Vitalis',       email:'gestao@vitalis.med',   plan:'diamond', status:'active',  mrr:109.90, since:'2026-01-30', usage:92 },
    { name:'Logística Sul',         email:'ti@logsul.com',        plan:'gold',    status:'past_due',mrr:69.90, since:'2025-12-08', usage:12 },
    { name:'Padaria do Centro',     email:'contato@padcentro.com',plan:'silver',  status:'active',  mrr:39.90, since:'2026-04-22', usage:55 },
    { name:'Renata Oliveira',       email:'renata@gmail.com',     plan:'free',    status:'trial',   mrr:0,     since:'2026-05-30', usage:18 },
  ]);

  const emptyContext = () => ({
    /* Empresa */
    companyName: '', sector: '', products: '', size: '',
    region: '', mainClients: '', competitors: '', differentials: '', challenges: '', history: '',
    /* Pessoal */
    role: '', area: '', responsibilities: '', personalNotes: '',
    /* Logo (base64 data URL — Diamond only) */
    logoDataUrl: '',
    /* Meta */
    filled: false, updatedAt: null,
  });

  const defaults = () => ({
    user: null,                // { name, email, company, doc }
    plan: 'gold',
    credits: 1500,
    creditsMax: 1500,
    trialExpiry: null,         // ISO string — só para plano free
    history: [],               // { id, type, title, subtitle, date, payload }
    consumption: [],           // { id, date, action, label, cost, web, ai, costBRL }
    context: emptyContext(),   // contexto empresarial do usuário
    mynews: { topics: [], custom: [], scope: 'br', filled: false, updatedAt: null }, // preferências do My News
    settings: {
      portalOnline: true,
      allowSignups: true,
      brandOnReports: false,
      maintenance: false,
    },
    admin: { customers: seedAdminCustomers() },
  });

  let state = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(defaults(), JSON.parse(raw)); }
    catch (e) {}
    return defaults();
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ── Contas no servidor ───────────────────────────────────
     Quando o backend de contas está ativo, quem manda em usuário, plano,
     créditos e validade do trial é o SERVIDOR — o navegador só exibe. O
     resto (histórico, contexto, preferências) continua local por enquanto.
     Sem backend, tudo funciona como antes, em modo demonstração. */
  B.contas = { ativo: false, checado: false };

  function aplicarUsuarioDoServidor(u) {
    state.user = {
      name: u.name, email: u.email,
      company: u.company || '',
      doc: u.doc ? (B.fmtDoc ? B.fmtDoc(u.doc) : u.doc) : '',
    };
    state.plan = u.plan;
    state.credits = u.credits;
    state.creditsMax = u.creditsMax;
    state.trialExpiry = u.trialExpiry || null;
    state.isAdmin = !!u.isAdmin;
  }

  async function chamar(rota, corpo) {
    const res = await fetch(rota, {
      method: corpo ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    let dados = {};
    try { dados = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(dados.error || ('Falha na comunicação (' + res.status + ')'));
    return dados;
  }

  const listeners = [];
  B.store = {
    get: () => state,

    /* Consulta o servidor na abertura do app. Se houver backend de contas,
       o estado salvo no navegador não vale mais como prova de login: quem
       decide se você está autenticado é a sessão no servidor. */
    async bootServer() {
      try {
        const d = await chamar('/api/auth/me');
        B.contas.ativo = !!d.contas;
        if (d.contas) {
          if (d.user) aplicarUsuarioDoServidor(d.user);
          else state.user = null;
          persist();
        }
      } catch (e) {
        B.contas.ativo = false;   // servidor fora do ar → segue em modo local
      }
      B.contas.checado = true;
      return B.contas.ativo;
    },

    async apiLogin(email, password) {
      const d = await chamar('/api/auth/login', { email, password });
      aplicarUsuarioDoServidor(d.user); this.emit();
    },
    async apiRegister(dados) {
      const d = await chamar('/api/auth/register', dados);
      aplicarUsuarioDoServidor(d.user); this.emit();
    },
    async apiUpdate(dados) {
      const d = await chamar('/api/auth/update', dados);
      aplicarUsuarioDoServidor(d.user); this.emit();
    },
    async apiLogout() {
      try { await chamar('/api/auth/logout', {}); } catch (e) {}
      state.user = null; this.emit();
    },
    sub: (fn) => { listeners.push(fn); return () => { const i=listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); }; },
    emit: () => { persist(); listeners.forEach(fn => { try { fn(state); } catch(e){} }); },

    login(user, plan) {
      state.user = user;
      if (plan && B.plans[plan]) { state.plan = plan; }
      const p = B.plans[state.plan];
      if (!state.creditsMax || state.creditsMax !== p.credits) {
        state.creditsMax = p.credits;
        if (state.credits == null || state.credits > p.credits) state.credits = p.credits;
      }
      this.emit();
    },

    /* Cadastro de plano gratuito com controle de CPF/CNPJ */
    registerFree(user, doc) {
      const docs = loadDocs();
      const key = (doc||'').replace(/\D/g,'');
      if (docs.includes(key)) return { ok:false, reason:'Este CPF/CNPJ já foi usado para um período gratuito.' };
      docs.push(key); saveDocs(docs);
      // calcula expiração: hoje + 15 dias
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 15);
      state.user = { ...user, doc: B.fmtDoc(key) };
      state.plan = 'free';
      state.creditsMax = 350; state.credits = 350;
      state.trialExpiry = expiry.toISOString();
      // adiciona na lista de clientes do admin
      state.admin.customers.push({
        name: user.name, email: user.email, plan:'free', status:'trial', mrr:0,
        since: new Date().toISOString().slice(0,10), usage: 0,
      });
      this.emit();
      return { ok: true };
    },

    /* Verifica se o trial expirou */
    isTrialExpired() {
      if (state.plan !== 'free' || !state.trialExpiry) return false;
      return new Date() > new Date(state.trialExpiry);
    },
    trialDaysLeft() {
      if (state.plan !== 'free' || !state.trialExpiry) return null;
      const diff = new Date(state.trialExpiry) - new Date();
      return Math.max(0, Math.ceil(diff / 86400000));
    },

    logout() { state.user = null; this.emit(); },
    isAuthed: () => !!state.user,

    /* Atualiza dados do usuário (Cadastro) */
    updateUser(partial) {
      state.user = { ...(state.user || {}), ...partial };
      this.emit();
    },

    setPlan(planId) {
      const p = B.plans[planId]; if (!p) return;
      state.plan = planId; state.creditsMax = p.credits; state.credits = p.credits;
      if (planId !== 'free') state.trialExpiry = null;
      this.emit();
    },
    addCredits(n) { state.credits += n; this.emit(); },

    spend(actionKey, opts) {
      const c = B.creditCost[actionKey]; if (!c) return true;
      if (state.credits < c.total) return false;
      state.credits -= c.total;
      state.consumption.unshift({
        id: B.uid(), date: B.now().toISOString(),
        action: actionKey, label: (opts&&opts.label) || c.label,
        cost: c.total, web: c.web, ai: c.ai,
        costBRL: +(c.total * B.creditValueBRL).toFixed(2),
      });
      if (state.consumption.length > 60) state.consumption.length = 60;
      this.emit();
      return true;
    },

    // Reembolsa a última cobrança de uma ação — chamado quando a ferramenta falha e não entrega resultado.
    refund(actionKey) {
      const c = B.creditCost[actionKey]; if (!c) return;
      const idx = state.consumption.findIndex(e => e.action === actionKey);
      if (idx !== -1) {
        state.credits += state.consumption[idx].cost;
        state.consumption.splice(idx, 1);
      } else {
        state.credits += c.total;   // fallback: devolve sem mexer no histórico
      }
      this.emit();
    },

    addHistory(item) {
      item.id = item.id || B.uid();
      item.date = item.date || B.now().toISOString();
      state.history.unshift(item);
      if (state.history.length > 40) state.history.length = 40;
      this.emit();
      return item.id;
    },
    removeHistory(id) {
      B.modal({
        title: 'Excluir do histórico?',
        body: '<p>Esta operação será removida permanentemente do seu histórico. A ação não pode ser desfeita.</p>',
        actions: [
          { label: 'Excluir', class: 'primary', onClick: () => {
            state.history = state.history.filter(h => h.id !== id);
            this.emit();
            B.toast('Item removido do histórico', 'info');
          }},
          { label: 'Cancelar', class: 'ghost' },
        ],
      });
    },
    removeHistoryDirect(id) {  // sem confirmação — usado internamente
      state.history = state.history.filter(h => h.id !== id); this.emit();
    },
    getHistory: (type) => type ? state.history.filter(h => h.type === type) : state.history,

    /* Retorna histórico filtrado por plano (data), tipo e busca textual. */
    getFilteredHistory(opts) {
      const days = B.historyDays[state.plan] || 30;
      const cutoff = isFinite(days) ? new Date(Date.now() - days * 86400000) : null;
      let items = state.history.slice();
      if (cutoff) items = items.filter(h => new Date(h.date) >= cutoff);
      if (opts && opts.type && opts.type !== 'all') items = items.filter(h => h.type === opts.type);
      if (opts && opts.search) {
        const q = (opts.search + '').toLowerCase();
        items = items.filter(h =>
          (h.title||'').toLowerCase().includes(q) ||
          (h.subtitle||'').toLowerCase().includes(q));
      }
      return items;
    },

    /* Quantos itens foram cortados por limite de plano. */
    getHiddenCount() {
      const days = B.historyDays[state.plan] || 30;
      if (!isFinite(days)) return 0;
      const cutoff = new Date(Date.now() - days * 86400000);
      return state.history.filter(h => new Date(h.date) < cutoff).length;
    },

    /* Itens das últimas 48h (para a página inicial). */
    getRecent48h(limit) {
      const cutoff = new Date(Date.now() - 48 * 3600000);
      const items = state.history.filter(h => new Date(h.date) >= cutoff);
      return limit ? items.slice(0, limit) : items;
    },

    setSetting(k, v) { state.settings[k] = v; this.emit(); },

    setContext(ctx) {
      state.context = { ...emptyContext(), ...ctx, filled: true, updatedAt: B.now().toISOString() };
      this.emit();
    },
    getContext: () => state.context || emptyContext(),
    clearContext() { state.context = emptyContext(); this.emit(); },
    hasContext: () => !!(state.context && state.context.filled),

    /* My News — preferências de notícias */
    setMyNews(prefs) {
      state.mynews = {
        topics: prefs.topics || [],
        custom: prefs.custom || [],
        scope: prefs.scope || 'br',
        filled: true,
        updatedAt: B.now().toISOString(),
      };
      this.emit();
    },
    getMyNews: () => state.mynews || { topics: [], custom: [], scope: 'br', filled: false },
    hasMyNews: () => !!(state.mynews && state.mynews.filled && (state.mynews.topics.length || state.mynews.custom.length)),

    reset() { state = defaults(); this.emit(); },
  };

  /* Métricas admin */
  B.adminMetrics = function () {
    const cs = state.admin.customers;
    const active = cs.filter(c => c.status==='active');
    const mrr = active.reduce((s,c)=>s+c.mrr,0);
    const byPlan = { free:0, silver:0, gold:0, diamond:0 };
    cs.forEach(c => { if(byPlan[c.plan]!==undefined) byPlan[c.plan]++; });
    const trials = cs.filter(c=>c.status==='trial').length;
    const past = cs.filter(c=>c.status==='past_due').length;
    const estCost = cs.filter(c=>B.plans[c.plan]).reduce((s,c)=> s + (c.usage/100) * (B.plans[c.plan].credits * B.internalCostPerCredit), 0);
    return {
      customers: cs.length, active: active.length, trials, past,
      mrr, arr: mrr*12, byPlan,
      estCost, margin: mrr - estCost,
      marginPct: mrr>0 ? ((mrr-estCost)/mrr*100) : 0,
      avgUsage: Math.round(cs.reduce((s,c)=>s+c.usage,0)/(cs.length||1)),
    };
  };

})(window.Brentor);
