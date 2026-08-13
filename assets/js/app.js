/* ============================================================
   Brentor.ai — app.js
   Shell, roteador, autenticação (mock) e inicialização.
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon, el = B.el, esc = B.esc, store = B.store;
  const root = document.getElementById('app');

  const NAV_BASE = [
    { id:'home',       label:'Início',          icon:'home',       group:'Portal' },
    { id:'analysis',   label:'Analysis',        icon:'analysis',   group:'Soluções' },
    { id:'compare',    label:'Compare',         icon:'compare',    group:'Soluções' },
    { id:'display',    label:'Display',         icon:'display',    group:'Soluções' },
    { id:'mynews',     label:'My News',         icon:'news',       group:'Soluções', premium:true },
    { id:'focus',      label:'Focus',           icon:'focus',      group:'Soluções', premium:true },
    { id:'chat',       label:'Chat Brentor',    icon:'chat',       group:'Soluções' },
    { id:'context',    label:'Contexto',         icon:'building',   group:'Gestão' },
    { id:'history',    label:'Histórico',         icon:'clock',      group:'Gestão' },
  ];

  /* Status do contexto empresarial para o selo na navegação */
  function contextStatus() {
    if (!store.hasContext()) return { label:'Não informado', color:'var(--red)', bg:'rgba(248,113,113,.16)' };
    const c = store.getContext();
    const keys = ['companyName','sector','role'];
    const filled = keys.filter(k => (c[k]||'').trim()).length;
    if (filled >= keys.length) return { label:'OK', color:'var(--green)', bg:'rgba(52,211,153,.16)' };
    return { label:'Incompleto', color:'var(--amber)', bg:'rgba(251,191,36,.16)' };
  }
  const PREMIUM_ROUTES = ['mynews','focus'];
  const TITLES = {
    home:       ['Início','Bem-vindo ao seu portal de IA'],
    analysis:   ['Analysis','Análise e investigação de empresas'],
    compare:    ['Compare','Comparação de empresas'],
    display:    ['Display','Apresentações e dashboards'],
    chat:       ['Chat Brentor','Assistente do portal'],
    mynews:     ['My News','Seu jornal digital personalizado de notícias'],
    focus:      ['Focus','Síntese e análise estratégica de conteúdo'],
    context:    ['Contexto empresarial','Personalize as respostas do Brentor para sua empresa'],
    history:    ['Histórico','Todas as suas operações organizadas por tipo'],
    account:    ['Conta & Créditos','Assinatura e consumo'],
    admin:      ['Administração','Gestão do portal'],
  };

  let current = 'home';

  B.router = {
    go(route, params) {
      if (!store.isAuthed()) return;
      const plan = store.get().plan;
      const isPremium = ['gold','diamond'].includes(plan);
      // bloqueia rotas premium para planos não elegíveis
      if (PREMIUM_ROUTES.includes(route) && !isPremium) {
        showPremiumWall(route, plan);
        return;
      }
      current = route;
      renderShell(route, params);
      const main = document.querySelector('.content');
      if (main && B.views[route]) {
        B.views[route](main, params);
      }
      // Quem realmente rola é a janela/documento (.main/.content não têm overflow próprio) —
      // sem isso, ao trocar de ferramenta a página ficava na posição de rolagem anterior.
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelector('.sidebar')?.classList.remove('open');
      document.querySelector('.sidebar-backdrop')?.classList.remove('on');
    },
  };

  function showPremiumWall(route, plan) {
    const names = { mynews:'My News', focus:'Focus' };
    const name = names[route] || route;
    B.modal({
      title: name + ' — Função Premium',
      body: `<div style="text-align:center;padding:8px 0">
        <div style="width:54px;height:54px;border-radius:14px;background:linear-gradient(150deg,rgba(251,191,36,.2),rgba(251,191,36,.08));border:1px solid rgba(251,191,36,.3);display:grid;place-items:center;margin:0 auto 16px;color:var(--amber)">${ic.spark}</div>
        <p>A ferramenta <b>${B.esc(name)}</b> está disponível nos planos <b>Gold</b> e <b>Diamond</b>.</p>
        <p style="margin-top:10px;color:var(--text-mute);font-size:13px">Seu plano atual é <b style="color:var(--text)">${plan === 'silver' ? 'Silver' : 'Gratuito'}</b>. Faça upgrade para desbloquear ${B.esc(name)}, acesso a IA mais avançada e mais créditos mensais.</p>
      </div>`,
      actions: [
        { label:'Ver planos e fazer upgrade', class:'primary', icon:'coin', onClick: () => B.router.go('account') },
        { label:'Agora não', class:'ghost' },
      ],
    });
  }

  /* ---------- Marca (logotipo oficial) ---------- */
  function brandHTML(size) {
    return `<span class="brand ${size||''}"><img src="assets/img/brentor-logo.png" alt="Brentor.ai" class="brand-img"></span>`;
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  function renderAuth() {
    root.innerHTML = `
    <div class="auth">
      <div class="auth-aside">
        <div class="glow"></div>
        ${brandHTML('lg')}
        <div>
          <h1>Inteligência artificial <span>focada em soluções</span> para o seu negócio.</h1>
          <p class="lead">Analise empresas, compare concorrentes e gere apresentações profissionais em minutos — com transparência em cada etapa.</p>
        </div>
        <div class="auth-feats">
          <div class="auth-feat"><span class="ic">${ic.analysis}</span><div><b>Analysis & Compare</b><span>Relatórios de empresas com dados verificáveis</span></div></div>
          <div class="auth-feat"><span class="ic">${ic.display}</span><div><b>Display</b><span>Slides e dashboards prontos para reunião</span></div></div>
          <div class="auth-feat"><span class="ic">${ic.news}</span><div><b>My News</b><span>Jornal digital personalizado com suas notícias</span></div></div>
        </div>
        <div class="auth-trust">${ic.lock} Seus dados tratados com segurança · Sem respostas inventadas</div>
      </div>
      <div class="auth-main">
        <div class="auth-card fade-up" id="authCard">
          <div style="margin-bottom:22px">${brandHTML()}</div>
          <h2>Acessar o portal</h2>
          <div class="sub">Entre com sua conta empresarial para continuar.</div>
          <form id="loginForm">
            <div class="field"><label>E-mail corporativo</label>
              <input class="input" id="loginEmail" type="email" placeholder="voce@empresa.com" value="${B.contas.ativo?'':'diretoria@empresa.com'}" required></div>
            <div class="field"><label>Senha</label>
              <input class="input" id="loginPass" type="password" placeholder="••••••••" value="${B.contas.ativo?'':'brentor'}" required></div>
            <div class="row-between">
              <label style="display:flex;gap:8px;align-items:center;color:var(--text-soft)"><input type="checkbox" checked style="accent-color:var(--brand-500)"> Manter conectado</label>
              <a href="#" id="esqueciSenha">Esqueci a senha</a>
            </div>
            <button class="btn primary block lg" type="submit">${ic.lock} Entrar no Brentor</button>
          </form>
          <div id="authErr" class="hidden" style="margin-top:14px;color:var(--red);font-size:13px;padding:10px 12px;background:var(--red-soft);border-radius:8px;border:1px solid rgba(248,113,113,.25)"></div>
          ${B.contas.ativo ? '' : `
          <div class="demo-note" style="margin-top:14px">${ic.info} <b>Demonstração:</b> qualquer e-mail e senha entram.</div>
          <button class="btn ghost block" id="demoBtn" style="margin-top:10px">${ic.bolt} Entrar com conta demonstração</button>`}
          <div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--line-soft);text-align:center">
            <div class="muted" style="font-size:12.5px;margin-bottom:10px">Ainda não tem conta?</div>
            <button class="btn block" id="freeBtn" style="background:var(--green-soft);border-color:rgba(52,211,153,.35);color:var(--green)">${ic.spark} Criar conta gratuita — 15 dias · 350 créditos</button>
            <div class="muted" style="font-size:11.5px;margin-top:8px">1 conta por CPF ou CNPJ · Sem cartão de crédito</div>
          </div>
        </div>
      </div>
    </div>`;

    const errEl = document.getElementById('authErr');
    const mostrarErro = (msg) => { errEl.textContent = msg; errEl.classList.remove('hidden'); };

    /* Modo demonstração (sem backend de contas): qualquer e-mail entra. */
    function doLoginLocal(email) {
      const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
      const company = (email.split('@')[1]||'empresa').split('.')[0].replace(/\b\w/g,c=>c.toUpperCase());
      store.login({ name, email, company }, store.get().plan);
      B.toast('Bem-vindo ao Brentor.ai','success');
      B.router.go('home');
    }

    const form = document.getElementById('loginForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      errEl.classList.add('hidden');
      const email = document.getElementById('loginEmail').value.trim();
      const senha = document.getElementById('loginPass').value;
      if (!B.contas.ativo) return doLoginLocal(email || 'diretoria@empresa.com');

      const btn = form.querySelector('button[type=submit]');
      const rotulo = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = `${ic.clock} Entrando…`;
      try {
        await store.apiLogin(email, senha);
        B.toast('Bem-vindo de volta ao Brentor.ai','success');
        B.router.go('home');
      } catch (err) {
        mostrarErro(err.message);
        btn.disabled = false; btn.innerHTML = rotulo;
      }
    };
    document.getElementById('demoBtn')?.addEventListener('click', () => doLoginLocal('diretoria@empresa.com'));

    document.getElementById('esqueciSenha').onclick = (e) => {
      e.preventDefault();
      if (!B.contas.ativo) { B.toast('Na demonstração qualquer senha entra','info'); return; }
      showEsqueciSenha(document.getElementById('loginEmail').value.trim());
    };

    // Cadastro gratuito com CPF/CNPJ
    document.getElementById('freeBtn').onclick = () => showFreeSignup();
  }

  /* ---------- Aviso de e-mail pendente de confirmação ---------- */
  function mostrarAvisoEmail() {
    const antigo = document.getElementById('avisoEmail');
    const s = store.get();
    if (!B.contas.ativo || !s.user || s.emailVerificado) { antigo?.remove(); return; }
    if (antigo) return;

    const content = document.getElementById('content');
    if (!content) return;
    const aviso = B.el(`<div class="trial-banner" id="avisoEmail" style="margin-bottom:14px">
      ${ic.mail}
      <span>Confirme seu e-mail <b>${esc(s.user.email)}</b> — é o que permite recuperar a conta se você esquecer a senha.</span>
      <button class="btn ghost sm" id="reenviarEmail" style="margin-left:auto">Reenviar e-mail</button>
    </div>`);
    content.parentElement.insertBefore(aviso, content);
    aviso.querySelector('#reenviarEmail').onclick = (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Enviando…';
      store.apiReenviarConfirmacao()
        .then(() => { b.textContent = 'E-mail enviado'; B.toast('Link de confirmação enviado — verifique sua caixa de entrada','success'); })
        .catch(err => { b.disabled = false; b.textContent = 'Reenviar e-mail'; B.toast(err.message,'warn'); });
    };
  }

  /* ---------- Esqueci a senha ---------- */
  function showEsqueciSenha(emailPrefill) {
    const m = B.modal({
      title: 'Recuperar acesso',
      wide: true,
      body: `
        <p class="muted" style="margin-bottom:16px;font-size:13px">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
        <div class="field" style="margin:0"><label>E-mail</label>
          <input class="input" id="esEmail" type="email" placeholder="seu@email.com" value="${esc(emailPrefill||'')}"></div>
        <div id="esMsg" class="hidden" style="margin-top:14px;font-size:13px;padding:11px 13px;border-radius:8px"></div>`,
      actions: [
        { label:'Enviar link de recuperação', class:'primary', icon:'mail', onClick: () => {
            const email = document.getElementById('esEmail').value.trim();
            const msg = document.getElementById('esMsg');
            const mostrar = (txt, cor) => { msg.textContent = txt; msg.classList.remove('hidden');
              msg.style.cssText += `;color:${cor};background:var(--surface-2);border:1px solid var(--line-soft)`; };
            if (!email || !email.includes('@')) { mostrar('Informe um e-mail válido.', 'var(--red)'); return false; }
            mostrar('Enviando…', 'var(--text-mute)');
            store.apiEsqueciSenha(email)
              // Mensagem propositalmente igual exista ou não a conta: não
              // entregamos para estranhos quais e-mails têm cadastro aqui.
              .then(() => mostrar('Se existir uma conta com esse e-mail, o link de recuperação já está a caminho. Ele vale por 1 hora.', 'var(--green)'))
              .catch(e => mostrar(e.message, 'var(--red)'));
            return false;
          } },
        { label:'Voltar', class:'ghost' },
      ],
    });
    return m;
  }

  /* ---------- Definir nova senha (chegou pelo link do e-mail) ---------- */
  function showNovaSenha(token) {
    renderAuth();
    const m = B.modal({
      title: 'Criar nova senha',
      wide: true,
      body: `
        <p class="muted" style="margin-bottom:16px;font-size:13px">Escolha uma senha nova para sua conta. Ao confirmar, todas as sessões abertas são encerradas.</p>
        <div class="form-grid" style="gap:13px">
          <div class="field" style="margin:0"><label>Nova senha</label>
            <input class="input" id="nsPwd" type="password" placeholder="Mínimo 6 caracteres"></div>
          <div class="field" style="margin:0"><label>Confirmar nova senha</label>
            <input class="input" id="nsPwd2" type="password" placeholder="Repita a nova senha"></div>
          <div id="nsErr" class="hidden" style="color:var(--red);font-size:13px;padding:10px 12px;background:var(--red-soft);border-radius:8px;border:1px solid rgba(248,113,113,.25)"></div>
        </div>`,
      actions: [
        { label:'Salvar nova senha', class:'primary', icon:'lock', onClick: () => {
            const p1 = document.getElementById('nsPwd').value, p2 = document.getElementById('nsPwd2').value;
            const errEl = document.getElementById('nsErr');
            const err = (t) => { errEl.textContent = t; errEl.classList.remove('hidden'); return false; };
            if (p1.length < 6) return err('A senha deve ter pelo menos 6 caracteres.');
            if (p1 !== p2) return err('As senhas não conferem.');
            store.apiRedefinirSenha(token, p1)
              .then(() => { m.close(); B.toast('Senha alterada — você já está conectado','success'); B.router.go('home'); })
              .catch(e => err(e.message));
            return false;
          } },
        { label:'Cancelar', class:'ghost' },
      ],
    });
  }

  function showFreeSignup() {
    const m = B.modal({
      title: 'Criar conta gratuita',
      wide: true,
      body: `
        <p class="muted" style="margin-bottom:16px;font-size:13px">15 dias de acesso gratuito com 350 créditos. <b>Uma conta por CPF ou CNPJ.</b></p>
        <div class="form-grid" style="gap:13px">
          <div class="field" style="margin:0"><label>Nome completo / Razão social</label>
            <input class="input" id="fsName" placeholder="Nome da pessoa ou empresa"></div>
          <div class="field" style="margin:0"><label>E-mail</label>
            <input class="input" id="fsEmail" type="email" placeholder="seu@email.com"></div>
          <div class="field" style="margin:0"><label>CPF ou CNPJ</label>
            <input class="input" id="fsDoc" placeholder="000.000.000-00 ou 00.000.000/0000-00" maxlength="18">
            <div class="hint" id="fsDocHint">Digite seu CPF (pessoa física) ou CNPJ (empresa). Usado para garantir 1 conta gratuita por documento.</div></div>
          <div class="field" style="margin:0"><label>Senha</label>
            <input class="input" id="fsPwd" type="password" placeholder="Mínimo 6 caracteres"></div>
          <div id="fsErr" class="hidden" style="color:var(--red);font-size:13px;padding:10px 12px;background:var(--red-soft);border-radius:8px;border:1px solid rgba(248,113,113,.25)"></div>
        </div>`,
      actions: [
        { label:'Criar conta gratuita', class:'primary', icon:'spark', onClick: () => doFreeSignup(m) },
        { label:'Cancelar', class:'ghost' },
      ],
    });

    // máscara CPF/CNPJ
    document.getElementById('fsDoc').addEventListener('input', function() {
      let v = this.value.replace(/\D/g,'');
      if (v.length <= 11) v = v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
      else v = v.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
      this.value = v;
      const hint = document.getElementById('fsDocHint');
      const raw = v.replace(/\D/g,'');
      if (raw.length===11) hint.textContent = B.validCPF(raw) ? '✓ CPF válido' : '⚠ CPF inválido — confira os dígitos';
      else if (raw.length===14) hint.textContent = B.validCNPJ(raw) ? '✓ CNPJ válido' : '⚠ CNPJ inválido — confira os dígitos';
      else hint.textContent = 'Digite seu CPF (11 dígitos) ou CNPJ (14 dígitos).';
    });
  }

  async function doFreeSignup(modal) {
    const name = document.getElementById('fsName').value.trim();
    const email = document.getElementById('fsEmail').value.trim();
    const doc = document.getElementById('fsDoc').value.replace(/\D/g,'');
    const pwd = document.getElementById('fsPwd').value;
    const errEl = document.getElementById('fsErr');
    function err(msg) { errEl.textContent = msg; errEl.classList.remove('hidden'); return false; }
    errEl.classList.add('hidden');
    if (!name) return err('Informe seu nome ou razão social.');
    if (!email || !email.includes('@')) return err('Informe um e-mail válido.');
    if (doc.length===11 && !B.validCPF(doc)) return err('CPF inválido — verifique os dígitos.');
    if (doc.length===14 && !B.validCNPJ(doc)) return err('CNPJ inválido — verifique os dígitos.');
    if (doc.length!==11 && doc.length!==14) return err('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
    if (pwd.length < 6) return err('A senha deve ter pelo menos 6 caracteres.');
    const company = (email.split('@')[1]||'').split('.')[0].replace(/\b\w/g,c=>c.toUpperCase()) || name.split(' ')[0];

    if (B.contas.ativo) {
      // O servidor é quem garante 1 conta por CPF/CNPJ — restrição do banco,
      // impossível de burlar limpando o navegador.
      errEl.textContent = 'Criando sua conta…'; errEl.classList.remove('hidden');
      errEl.style.color = 'var(--text-mute)';
      store.apiRegister({ name, email, company, doc, password: pwd })
        .then(() => {
          modal.close();
          B.toast('Conta criada! Bem-vindo ao Brentor.ai — 15 dias e 350 créditos disponíveis.','success');
          B.router.go('home');
        })
        .catch(e => { errEl.style.color = 'var(--red)'; err(e.message); });
      return false;
    }

    const result = store.registerFree({ name, email, company }, doc);
    if (!result.ok) return err(result.reason);
    modal.close();
    B.toast('Conta criada! Bem-vindo ao Brentor.ai — 15 dias e 350 créditos disponíveis.','success');
    B.router.go('home');
    return false; // impede fechar antes
  }

  /* ============================================================
     APP SHELL
     ============================================================ */
  function renderShell(route, params) {
    const s = store.get();
    const plan = B.plans[s.plan];
    const pct = Math.round((s.credits/s.creditsMax)*100);
    const title = TITLES[route] || ['',''];

    // (re)monta o shell apenas se ainda não existe
    if (!document.querySelector('.app')) {
      root.innerHTML = `
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="brand-wrap">${brandHTML()}</div>
          <nav id="nav"></nav>
          <div class="sidebar-foot">
            <div class="credit-card" id="creditCard"></div>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <button class="btn-icon menu-toggle" id="menuToggle">${ic.menu}</button>
            <div class="page-title" id="pageTitle"></div>
            <div class="spacer"></div>
            <span class="chip" id="onlineChip"></span>
            <span class="chip" id="creditChip"></span>
            <div class="avatar" id="avatar"></div>
          </header>
          <div class="content" id="content"></div>
        </div>
      </div>`;
      /* Gaveta lateral no celular. O fundo escuro permite fechar tocando fora —
         antes só dava para sair escolhendo alguma ferramenta. */
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
      const fecharGaveta = () => { sidebar.classList.remove('open'); backdrop.classList.remove('on'); };
      document.getElementById('menuToggle').onclick = () => {
        const abrindo = !sidebar.classList.contains('open');
        sidebar.classList.toggle('open', abrindo);
        backdrop.classList.toggle('on', abrindo);
      };
      backdrop.onclick = fecharGaveta;
      document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharGaveta(); });
      document.getElementById('avatar').onclick = openUserMenu;
    }

    // nav — mostra todos os itens; premium bloqueado exibe lock para Silver/Free
    const isPremiumPlan = ['gold','diamond'].includes(s.plan);
    const nav = document.getElementById('nav');
    let html = ''; let lastGroup = '';
    NAV_BASE.forEach(n => {
      if (n.group !== lastGroup) { html += `<div class="nav-group">${n.group}</div>`; lastGroup = n.group; }
      const locked = n.premium && !isPremiumPlan;
      let badge = '';
      if (n.id==='chat') badge = '<span class="badge-pill">IA</span>';
      else if (n.id==='mynews') badge = `<span class="badge-pill" style="background:rgba(34,211,238,.15);color:#22d3ee">${locked?'Premium':s.plan==='diamond'?'2.0':'1.0'}</span>`;
      else if (n.id==='focus') badge = `<span class="badge-pill" style="background:rgba(52,211,153,.12);color:var(--green)">${locked?'Premium':s.plan==='diamond'?'2.0':'1.0'}</span>`;
      else if (n.id==='context') { const cs = contextStatus(); badge = `<span class="badge-pill" style="background:${cs.bg};color:${cs.color}">${cs.label}</span>`; }
      const lockIcon = locked ? `<span class="lock-ic">${ic.lock}</span>` : '';
      html += `<button class="nav-item ${n.id===route?'active':''} ${locked?'premium-locked':''}" data-route="${n.id}">${ic[n.icon]} ${n.label}${badge}${lockIcon}</button>`;
    });
    nav.innerHTML = html;
    nav.querySelectorAll('[data-route]').forEach(b => b.onclick = () => B.router.go(b.dataset.route));

    // credit card (sidebar)
    document.getElementById('creditCard').innerHTML = `
      <div class="top"><span class="lbl">Créditos</span><span class="plan-tag" style="background:${plan.color}22;color:${plan.color}">${plan.name}</span></div>
      <div class="amount">${B.fmtNum(s.credits)} <small>/ ${B.fmtNum(s.creditsMax)}</small></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <button class="btn primary sm block" style="margin-top:10px" id="buyCredits">${ic.coin} Gerenciar créditos</button>`;
    document.getElementById('buyCredits').onclick = () => B.router.go('account');

    /* Aviso de e-mail não confirmado. Não bloqueia o uso — só lembra, com um
       botão para reenviar. Sem e-mail confirmado não há como recuperar a
       conta se a pessoa esquecer a senha. */
    mostrarAvisoEmail();

    // topbar
    document.getElementById('pageTitle').innerHTML = `${esc(title[0])}<small>${esc(title[1])}</small>`;
    const online = s.settings.portalOnline;
    document.getElementById('onlineChip').innerHTML = `<span class="dotpulse" style="background:${online?'var(--green)':'var(--red)'}"></span> ${online?'Portal online':'Portal offline'}`;
    document.getElementById('creditChip').innerHTML = `${ic.coin} <b>${B.fmtNum(s.credits)}</b> créditos`;
    document.getElementById('avatar').textContent = B.initials(s.user?.name || 'U');
  }

  /* ---------- Menu do usuário ---------- */
  function openUserMenu() {
    document.querySelector('.menu')?.remove();
    const s = store.get();
    const hasCtx = store.hasContext();
    const ctx = store.getContext();
    const menu = el(`<div class="menu">
      <div style="padding:10px 12px;border-bottom:1px solid var(--line-soft);margin-bottom:5px">
        <b style="font-size:14px">${esc(s.user?.name||'Usuário')}</b>
        <div class="muted" style="font-size:12px">${esc(s.user?.email||'')}</div>
        ${hasCtx ? `<div style="margin-top:6px"><span class="ctx-tag">${ic.check} ${esc(ctx.companyName||'Contexto ativo')}</span></div>` : ''}
      </div>
      <button class="mi" data-a="cadastro">${ic.account} Cadastro <span class="muted" style="font-size:11px;margin-left:auto">dados e senha</span></button>
      <button class="mi" data-a="context">${ic.building} Contexto empresarial${hasCtx?'':' <span style="font-size:10px;color:var(--amber);margin-left:4px">●</span>'}</button>
      <button class="mi" data-a="account">${ic.coin} Conta & Créditos</button>
      <button class="mi" data-a="admin">${ic.admin} Administração</button>
      <div class="sep"></div>
      <button class="mi" data-a="reset">${ic.refresh} Reiniciar demonstração</button>
      <button class="mi" data-a="logout" style="color:var(--red)">${ic.logout} Sair</button>
    </div>`);
    document.body.appendChild(menu);
    const close = () => { menu.remove(); document.removeEventListener('click', onDoc, true); };
    function onDoc(e) { if (!menu.contains(e.target) && e.target.id!=='avatar') close(); }
    setTimeout(()=>document.addEventListener('click', onDoc, true), 0);
    menu.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a; close();
      if (a==='cadastro') showCadastro();
      else if (a==='context') B.router.go('context');
      else if (a==='account') B.router.go('account');
      else if (a==='admin') B.router.go('admin');
      else if (a==='logout') {
        if (B.contas.ativo) store.apiLogout().then(renderAuth);
        else { store.logout(); renderAuth(); }
      }
      else if (a==='reset') B.modal({ title:'Reiniciar demonstração?', body:'<p>Isso limpa seus dados locais (histórico, créditos e configurações) e volta ao estado inicial.</p>',
        actions:[{label:'Reiniciar', class:'primary', onClick:()=>{ store.reset(); store.login(s.user, 'gold'); B.router.go('home'); B.toast('Demonstração reiniciada','success'); }},{label:'Cancelar',class:'ghost'}] });
    });
  }

  /* ---------- Cadastro: atualizar dados e senha do usuário ---------- */
  function showCadastro() {
    const u = store.get().user || {};
    const m = B.modal({
      title: 'Cadastro',
      wide: true,
      body: `
        <p class="muted" style="margin-bottom:16px;font-size:13px">Atualize seus dados de acesso e sua senha quando necessário.</p>
        <div class="form-grid" style="gap:13px">
          <div class="field" style="margin:0"><label>Nome completo / Razão social</label>
            <input class="input" id="cadName" value="${esc(u.name||'')}" placeholder="Seu nome ou empresa"></div>
          <div class="field" style="margin:0"><label>E-mail</label>
            <input class="input" id="cadEmail" type="email" value="${esc(u.email||'')}" placeholder="seu@email.com"></div>
          <div class="field" style="margin:0"><label>Empresa</label>
            <input class="input" id="cadCompany" value="${esc(u.company||'')}" placeholder="Nome da empresa"></div>
          ${u.doc ? `<div class="field" style="margin:0"><label>CPF / CNPJ</label>
            <input class="input" value="${esc(u.doc)}" disabled style="opacity:.7"></div>` : ''}
          <div style="height:1px;background:var(--line-soft);margin:2px 0"></div>
          ${B.contas.ativo ? `<div class="field" style="margin:0"><label>Senha atual <span class="muted" style="font-weight:400;font-size:12px">(só para trocar a senha)</span></label>
            <input class="input" id="cadPwdAtual" type="password" placeholder="Sua senha de hoje"></div>` : ''}
          <div class="field" style="margin:0"><label>Nova senha <span class="muted" style="font-weight:400;font-size:12px">(deixe em branco para não alterar)</span></label>
            <input class="input" id="cadPwd" type="password" placeholder="Mínimo 6 caracteres"></div>
          <div class="field" style="margin:0"><label>Confirmar nova senha</label>
            <input class="input" id="cadPwd2" type="password" placeholder="Repita a nova senha"></div>
          <div id="cadErr" class="hidden" style="color:var(--red);font-size:13px;padding:10px 12px;background:var(--red-soft);border-radius:8px;border:1px solid rgba(248,113,113,.25)"></div>
        </div>`,
      actions: [
        { label:'Salvar alterações', class:'primary', icon:'check', onClick: () => doCadastro(m) },
        { label:'Cancelar', class:'ghost' },
      ],
    });
  }

  function doCadastro(modal) {
    const name = document.getElementById('cadName').value.trim();
    const email = document.getElementById('cadEmail').value.trim();
    const company = document.getElementById('cadCompany').value.trim();
    const pwd = document.getElementById('cadPwd').value;
    const pwd2 = document.getElementById('cadPwd2').value;
    const errEl = document.getElementById('cadErr');
    const err = (msg) => { errEl.textContent = msg; errEl.classList.remove('hidden'); return false; };
    errEl.classList.add('hidden');
    if (!name) return err('Informe seu nome ou razão social.');
    if (!email || !email.includes('@')) return err('Informe um e-mail válido.');
    if (pwd || pwd2) {
      if (pwd.length < 6) return err('A nova senha deve ter pelo menos 6 caracteres.');
      if (pwd !== pwd2) return err('As senhas não conferem.');
    }

    if (B.contas.ativo) {
      const atual = document.getElementById('cadPwdAtual')?.value || '';
      if (pwd && !atual) return err('Informe sua senha atual para poder trocá-la.');
      store.apiUpdate({ name, email, company, password: pwd || undefined, currentPassword: atual })
        .then(() => {
          modal.close();
          B.toast(pwd ? 'Dados e senha atualizados — as outras sessões foram encerradas' : 'Dados atualizados', 'success');
        })
        .catch(e => err(e.message));
      return false;
    }

    store.updateUser({ name, email, company });
    modal.close();
    B.toast(pwd ? 'Dados e senha atualizados' : 'Dados atualizados', 'success');
    return false;
  }

  /* ---------- Exportar todos os dados do usuário ---------- */
  function exportAll() {
    const s = store.get();
    const data = {
      exportadoEm: new Date().toISOString(),
      usuario: s.user, plano: s.plan, creditos: s.credits,
      historico: s.history.map(h => ({ tipo:h.type, titulo:h.title, data:h.date, conteudo:h.payload })),
      consumo: s.consumption,
    };
    B.exportJSON(data, 'brentor_meus_dados_'+new Date().toISOString().slice(0,10));
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init() {
    // ano no rodapé / título
    document.title = 'Brentor.ai · Soluções de IA para empresas';
    // Consulta o servidor ANTES de decidir a tela: com contas ativas, quem
    // diz se você está logado é a sessão no servidor, não o localStorage.
    await store.bootServer();

    /* Links que chegam por e-mail. O token é retirado da URL logo em seguida
       para não ficar no histórico do navegador nem em print de tela. */
    const hash = location.hash || '';
    const reset = hash.match(/^#senha=([a-f0-9]{16,})/i);
    const verify = hash.match(/^#confirmar=([a-f0-9]{16,})/i);
    if (reset || verify) history.replaceState(null, '', location.pathname + location.search);

    if (reset) return showNovaSenha(reset[1]);
    if (verify) {
      try {
        await store.apiConfirmarEmail(verify[1]);
        B.toast('E-mail confirmado com sucesso','success');
      } catch (e) { B.toast(e.message, 'warn'); }
    }

    if (store.isAuthed()) B.router.go('home');
    else renderAuth();
    // mantém topbar/sidebar sincronizados com mudanças de estado
    store.sub(() => { if (store.isAuthed() && document.querySelector('.app')) renderShell(current); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(window.Brentor);
