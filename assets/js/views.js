/* ============================================================
   Brentor.ai — views.js
   Todas as telas do portal. Cada view recebe o elemento `mount`.
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon, el = B.el, esc = B.esc;
  const store = B.store;
  B.views = {};
  B.handoff = null; // transporta dados entre telas (ex.: Analysis → Compare)

  /* ── Zona de Upload de Arquivo (reutilizável) ─────────────────────────
     Retorna { html: string, getFiles: () => File[], onUpdate: (fn) => void }
  ─────────────────────────────────────────────────────────────────────── */
  function makeFileZone(id) {
    const uid = id || B.uid();
    const files = [];
    let updateCb = null;
    const html = `
      <div class="field">
        <label>Anexar arquivos <span class="muted" style="font-weight:400;font-size:12px">(opcional — melhora o resultado)</span></label>
        <div class="file-zone" id="fz-${uid}">
          <input type="file" id="fi-${uid}" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.png,.jpg">
          <div class="fz-ic">${ic.upload}</div>
          <b>Clique para selecionar ou arraste aqui</b>
          <span>Documentos, relatórios, planilhas, apresentações ou imagens</span>
          <div class="fz-types">PDF · DOCX · XLSX · PPTX · TXT · CSV · PNG · JPG</div>
        </div>
        <div class="attached-files" id="af-${uid}"></div>
      </div>`;

    function init(scope) {
      const zone = scope.querySelector(`#fz-${uid}`);
      const input = scope.querySelector(`#fi-${uid}`);
      const list = scope.querySelector(`#af-${uid}`);
      if (!zone) return;
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
      zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag'); addFiles(e.dataTransfer.files, list); });
      input.addEventListener('change', () => { addFiles(input.files, list); input.value=''; });
    }
    function addFiles(fileList, list) {
      Array.from(fileList).forEach(f => {
        if (files.find(x=>x.name===f.name)) return;
        files.push(f);
        const chip = el(`<div class="attached-file"><span>${ic.file}</span><span>${esc(f.name)}</span><button class="rm" title="Remover">${ic.x}</button></div>`);
        chip.querySelector('.rm').onclick = () => { const i=files.indexOf(f); if(i>=0) files.splice(i,1); chip.remove(); if(updateCb) updateCb(files); };
        list.appendChild(chip);
      });
      if (updateCb) updateCb(files);
    }
    return {
      html,
      init,
      getFiles: () => files,
      onUpdate: (fn) => { updateCb = fn; },
    };
  }

  /* util: rótulo do valor ou "não disponível" */
  function val(v) { return (v && v.na) ? '<span class="na">não disponível</span>' : esc(v); }
  function kpi(label, v, sub, dir) {
    const na = (v && v.na);
    return `<div class="kpi"><div class="k-lbl">${esc(label)}</div>
      <div class="k-val ${na?'k-na':''}">${na?'—':esc(v)}</div>
      <div class="k-sub ${na?'k-na':(dir||'')}">${na?'sem fonte pública':esc(sub||'')}</div></div>`;
  }

  /* Barra de ações de exportação para qualquer relatório/resultado. */
  function exportToolbar() {
    return `<div class="toolbar">
      <button class="btn subtle sm" data-x="pdf">${ic.pdf} PDF</button>
      <button class="btn subtle sm" data-x="local">${ic.download} Salvar</button>
      <button class="btn subtle sm" data-x="share">${ic.share} Compartilhar</button>
    </div>`;
  }
  function wireExports(scope, getNode, title, payload, toolName) {
    scope.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const node = getNode();
      if (b.dataset.x === 'pdf') B.exportPDF(node, title, toolName);
      else if (b.dataset.x === 'local') B.exportText(B.nodeText(node), title.replace(/[^\w\-]+/g,'_'));
      else if (b.dataset.x === 'share') B.share('Brentor.ai · ' + title, B.nodeText(node).slice(0, 280) + '…');
    });
  }

  /* ============================================================
     HOME
     ============================================================ */
  B.views.home = function (mount) {
    const s = store.get();
    const first = (s.user?.name || 'bem-vindo').split(' ')[0];
    const plan = s.plan;
    const isPremium = ['gold','diamond'].includes(plan);

    // 4 soluções base
    const sols = [
      { id:'analysis', icon:'analysis', cls:'ic-blue',   tag:'Investigação', name:'Analysis',     desc:'Dossiê completo de qualquer empresa — cadastro, sócios, mercado, finanças, reputação e notícias. Dados reais da internet.' },
      { id:'compare',  icon:'compare',  cls:'ic-cyan',   tag:'Decisão',    name:'Compare',      desc:'Compare duas ou mais empresas lado a lado e descubra vantagens relativas para tomar a melhor decisão.' },
      { id:'display',  icon:'display',  cls:'ic-violet', tag:'Visual',     name:'Display',      desc:'Transforme dados, relatórios ou temas em apresentações, slides, dashboards e relatórios executivos.' },
      { id:'chat',     icon:'chat',     cls:'ic-green',  tag:'Assistente', name:'Chat Brentor', desc:'Assistente do portal: indica a melhor ferramenta, ensina a usá-la e orienta sobre o uso do Brentor.' },
    ];
    // 2 soluções Premium
    const premSols = [
      { id:'mynews', icon:'news', cls:'ic-cyan', tag:'Notícias', name:'My News',
        desc:'Seu jornal digital personalizado: escolha seus temas de interesse e receba as principais notícias de hoje, com chamada, foto e resumo.',
        ver: plan==='diamond'?'2.0':'1.0' },
      { id:'focus', icon:'focus', cls:'ic-green', tag:'Síntese', name:'Focus',
        desc:'Resuma documentos, apresentações e e-mails. Extraia pontos-chave, KPIs, alertas e implicações estratégicas de qualquer conteúdo.',
        ver: plan==='diamond'?'2.0':'1.0' },
    ];

    mount.innerHTML = `
      <div class="hero fade-up">
        <h1>Olá, ${esc(first)}. O que vamos <span>resolver</span> hoje?</h1>
        <p>Não sabe por onde começar? Pergunte ao Chat</p>
        <div class="askbox">
          <textarea id="homeAsk" rows="1" placeholder="Ex.: Quero analisar o fornecedor TechNova antes de fechar contrato…"
            data-placeholder-curto="Ex.: analisar a TechNova antes de fechar contrato"></textarea>
          <button class="btn primary send" id="homeSend">${ic.send}</button>
        </div>
        <div class="suggest-row">
          <button class="suggest" data-go="analysis">${ic.analysis}Analisar empresa</button>
          <button class="suggest" data-go="compare">${ic.compare}Comparar</button>
          <button class="suggest" data-go="display">${ic.display}Apresentação</button>
          <button class="suggest" data-go="focus">${ic.focus}Resumir arquivo</button>
          <button class="suggest" data-go="mynews">${ic.news}Minhas notícias</button>
        </div>
      </div>

      <div class="section-title" style="margin-top:30px"><h2>Soluções prontas para uso</h2></div>
      <div class="grid cols-4" id="solGrid"></div>

      <div class="section-title" style="margin-top:20px">
        <h2 style="display:flex;align-items:center;gap:10px">${ic.spark} <span>Ferramentas Premium</span> <span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;background:linear-gradient(90deg,rgba(251,191,36,.2),rgba(251,191,36,.08));color:var(--amber);border:1px solid rgba(251,191,36,.25)">Gold · Diamond</span></h2>
      </div>
      <div class="grid cols-2" id="premGrid"></div>

      <div class="section-title" style="margin-top:20px">
        <h2>Atividade recente <span class="hist-48h-note">${ic.clock} Últimas 48h</span></h2>
        <a data-go="history" style="cursor:pointer;font-size:13px">Ver histórico completo →</a>
      </div>
      <div id="recent"></div>
    `;

    // cards base
    const grid = mount.querySelector('#solGrid');
    sols.forEach((x,i) => {
      const c = el(`<button class="sol-card fade-up delay-${i+1}" data-go="${x.id}">
        <span class="glow"></span>
        <span class="ic ${x.cls}">${ic[x.icon]}</span>
        <h3>${x.name} <span class="tag">${x.tag}</span></h3>
        <p>${x.desc}</p>
        <span class="go">Abrir ${x.name} ${ic.arrow}</span></button>`);
      grid.appendChild(c);
    });

    // cards premium
    const premGrid = mount.querySelector('#premGrid');
    premSols.forEach((x,i) => {
      const locked = !isPremium;
      const c = el(`<button class="sol-card fade-up delay-${i+1}" data-go="${x.id}" style="${locked?'opacity:.75':''}">
        <span class="glow" style="background:radial-gradient(circle,rgba(251,191,36,.22),transparent 70%)"></span>
        <span class="ic ${x.cls}">${ic[x.icon]}</span>
        <h3>${x.name} <span class="tag">${x.tag}</span><span class="premium-tag">${locked?ic.lock+' ':''}Premium ${x.ver}</span></h3>
        <p>${x.desc}</p>
        <span class="go">${locked?'Disponível no Gold/Diamond':'Abrir '+x.name} ${ic.arrow}</span></button>`);
      premGrid.appendChild(c);
    });

    // atividade recente — apenas últimas 48h
    const recent = mount.querySelector('#recent');
    const hist48 = store.getRecent48h(4);
    if (!hist48.length) {
      recent.innerHTML = `<div class="empty"><div class="ei">${ic.clock}</div>
        <b>Nenhuma atividade nas últimas 48 horas</b>
        <div class="muted">Use as soluções do portal — cada operação aparece aqui. Para consultar operações anteriores, acesse o <a data-go="history" style="cursor:pointer">Histórico</a>.</div></div>`;
      const goHist = recent.querySelector('[data-go="history"]');
      if (goHist) goHist.onclick = () => B.router.go('history');
    } else {
      const map = { analysis:['ic-blue','analysis'], compare:['ic-cyan','compare'], display:['ic-violet','display'],
        chat:['ic-green','chat'], mynews:['ic-cyan','news'], focus:['ic-green','focus'], history:['ic-blue','clock'] };
      const list = el('<div class="grid" style="gap:10px"></div>');
      hist48.forEach(h => {
        const m = map[h.type] || ['ic-blue','doc'];
        const item = el(`<div class="hist-item">
          <span class="hi-ic ${m[0]}">${ic[m[1]]}</span>
          <div class="hi-main"><b>${esc(h.title)}</b><span>${esc(h.subtitle||'')} · ${B.fmtDate(h.date)}</span></div>
          <div class="hi-acts">
            <button class="btn-icon" data-open="${esc(h.id)}" title="Reabrir">${ic.eye}</button>
            <button class="btn-icon" data-del="${esc(h.id)}" title="Remover">${ic.x}</button>
          </div></div>`);
        item.querySelector('[data-open]').onclick = () => B.router.go(h.type, { reopen: h });
        item.querySelector('[data-del]').onclick = () => store.removeHistory(h.id);
        list.appendChild(item);
      });
      recent.appendChild(list);
    }

    // interações
    const ask = mount.querySelector('#homeAsk');
    /* No celular o exemplo longo não cabia na caixa e aparecia cortado pela
       metade. Troca por uma versão curta que fecha em duas linhas. */
    if (window.matchMedia('(max-width: 720px)').matches && ask.dataset.placeholderCurto) {
      ask.placeholder = ask.dataset.placeholderCurto;
    }
    const autoGrow = () => { ask.style.height='auto'; ask.style.height = Math.min(ask.scrollHeight, 140)+'px'; };
    ask.addEventListener('input', autoGrow);
    const submit = () => { const v = ask.value.trim(); if (!v) { ask.focus(); return; } B.router.go('chat', { initial: v }); };
    mount.querySelector('#homeSend').onclick = submit;
    ask.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    mount.querySelectorAll('[data-go]').forEach(b => b.onclick = () => B.router.go(b.dataset.go));
    mount.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => B.router.go('chat', { initial: b.dataset.ask }));
  };

  /* ============================================================
     ANALYSIS
     ============================================================ */
  B.views.analysis = function (mount, params) {
    mount.innerHTML = `
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-blue">${ic.analysis}</span> Analysis</h1>
        <p>Investigue uma empresa a fundo. O sistema pesquisa dados reais na internet — cadastro, sócios, endereço, mercado, finanças, reputação e notícias — e entrega um dossiê completo e organizado.</p>
      </div>
      <div id="anaBody"></div>`;
    const body = mount.querySelector('#anaBody');
    if (params && params.reopen) { renderAnalysisReport(body, params.reopen.payload); return; }
    renderAnalysisForm(body, params);
  };

  function renderAnalysisForm(body, params) {
    const deep = store.get().plan === 'diamond';
    const fz = makeFileZone('ana');
    body.innerHTML = `
      <div class="card pad-lg fade-up">
        <div class="form-grid">
          <div class="field">
            <label>Qual empresa você quer analisar?</label>
            <input class="input" id="anaName" placeholder="Nome da empresa (ex.: Magazine Luiza, TechNova Sistemas…)" value="${esc(params?.prefill||'')}">
            <div class="hint">Dica: para a demonstração, experimente <b>Magalu</b>, <b>Natura</b> ou <b>Localiza</b> (têm dados completos).</div>
          </div>
          <div class="field">
            <label>Tudo que você já sabe sobre ela (opcional, mas melhora o resultado)</label>
            <textarea class="textarea" id="anaInfo" placeholder="Site, setor, porte, cidade, contatos, histórico de relacionamento, o que te preocupa…"></textarea>
          </div>
          ${fz.html}
          <div class="field">
            <label>Links relevantes <span class="muted" style="font-weight:400;font-size:12px">(opcional — site oficial, Instagram, LinkedIn, notícias…)</span></label>
            <div id="anaLinks" class="link-inputs" style="display:flex;flex-direction:column;gap:8px">
              <input class="input" placeholder="https://www.instagram.com/empresa ou site oficial…" data-link>
            </div>
            <button class="btn ghost sm" id="anaAddLink" style="margin-top:6px">${ic.plus} Adicionar outro link</button>
            <div class="hint">Cole links do site oficial, redes sociais (Instagram, Facebook, LinkedIn), matérias de jornal ou qualquer fonte útil.</div>
          </div>
          <div class="field">
            <label>Qual a relação com a sua empresa?</label>
            <div class="seg cat" id="anaRel">
              ${B.relations.map((r,i)=>`<button data-r="${r.id}" class="${i===0?'on':''}">${ic[r.icon]} ${r.label}</button>`).join('')}
            </div>
            <div class="hint" id="anaRelHint">${B.relations[0].hint}</div>
          </div>
          ${deep ? `<div class="field"><label style="display:flex;align-items:center;gap:9px;cursor:pointer">
            <span class="toggle" id="anaDeep"></span> Pesquisa aprofundada (deep search) <span class="tag" style="font-size:11px;color:var(--accent);background:var(--accent-soft);padding:2px 8px;border-radius:20px">Diamond</span></label>
            <div class="hint">Cruza mais fontes e gera análise mais densa. Consome mais créditos.</div></div>` : ''}
          <div id="anaCost">${B.costRow('analysis')}</div>
          <button class="btn primary lg" id="anaRun">${ic.search} Investigar empresa</button>
        </div>
      </div>`;

    fz.init(body);
    // Links
    body.querySelector('#anaAddLink').onclick = () => {
      const box = body.querySelector('#anaLinks');
      if (box.querySelectorAll('[data-link]').length >= 5) { B.toast('Máximo de 5 links','info'); return; }
      box.appendChild(el(`<input class="input" placeholder="https://…" data-link>`));
    };
    let rel = B.relations[0].id, deepOn = false;
    body.querySelectorAll('#anaRel button').forEach(b => b.onclick = () => {
      body.querySelectorAll('#anaRel button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); rel = b.dataset.r;
      body.querySelector('#anaRelHint').textContent = B.relations.find(r=>r.id===rel).hint;
    });
    const deepEl = body.querySelector('#anaDeep');
    if (deepEl) deepEl.onclick = () => { deepOn = !deepOn; deepEl.classList.toggle('on', deepOn);
      body.querySelector('#anaCost').innerHTML = B.costRow(deepOn?'analysisDeep':'analysis'); };

    body.querySelector('#anaRun').onclick = () => {
      const name = body.querySelector('#anaName').value.trim();
      if (!name) { B.toast('Informe o nome da empresa','warn'); body.querySelector('#anaName').focus(); return; }
      if (!B.aiReady()) return;

      /* A profunda faz 9 buscas em vez de 6 e gera um relatório bem maior —
         medido em produção, passa dos 3 minutos. Avisar antes evita que a
         pessoa ache que travou e feche a página no meio. */
      if (!deepOn) return runAnalysis(false);
      B.modal({
        wide: true,
        title: 'Atenção ao tempo de espera da Análise Profunda',
        body: `<p>Essa pesquisa consulta mais fontes e rastreia mais informações para que o
                 resultado do relatório seja bem mais detalhado.
                 O tempo de espera costuma ser de <b>3 a 5 minutos</b>.</p>
               <p style="margin-top:12px">A Análise Simples fica pronta em cerca de um minuto e meio.</p>
               <p class="muted" style="margin-top:12px">Deixe esta aba aberta enquanto processa.</p>`,
        actions: [
          { label:'Continuar com a profunda', class:'primary', onClick: () => runAnalysis(true) },
          { label:'Fazer a análise simples',  class:'ghost',   onClick: () => runAnalysis(false) },
          { label:'Cancelar',                 class:'ghost' },
        ],
      });
    };

    function runAnalysis(deep) {
      const name = body.querySelector('#anaName').value.trim();
      const info = body.querySelector('#anaInfo').value.trim();
      const links = Array.from(body.querySelectorAll('#anaLinks [data-link]')).map(i=>i.value.trim()).filter(Boolean);
      const attachedFiles = fz.getFiles();
      const action = deep ? 'analysisDeep' : 'analysis';
      if (!store.spend(action, { label:'Analysis — '+name })) { B.creditWall(); return; }
      attachedFiles.forEach(() => store.spend('file_analysis'));

      const steps = B.statusSteps.analysis.slice();
      if (links.length > 0)
        steps.unshift({ icon:'web', t:`Acessando ${links.length} link(s) fornecido(s)…` });
      if (attachedFiles.length > 0)
        steps.unshift({ icon:'file', t:`Lendo ${attachedFiles.length} arquivo(s): ${attachedFiles.map(f=>f.name).join(', ')}` });
      if (deep)
        steps.push({ icon:'info', t:'Análise profunda — pode levar de 3 a 5 minutos' });
      if (!B.aiMode.active)
        steps.push({ icon:'info', t:'Modo demonstração — configure a IA real para pesquisa real' });

      // Dispara chamada à API em paralelo com a animação
      const apiPromise = B.aiMode.active
        ? B.api.analyze(name, info, rel, deep, links, attachedFiles)
        : Promise.resolve(null);

      B.runStatus(body, steps, { title:`Analisando ${name}`, speed: deep?0.8:1, waitFor: apiPromise, onDone: async () => {
        let company;
        try {
          if (B.aiMode.active) {
            const result = await apiPromise;
            company = result.company;
          } else {
            company = B.buildCompany(name, info);
          }
        } catch (e) {
          store.refund(action);
          B.toast('Erro na IA: ' + e.message + ' — créditos reembolsados, exibindo demonstração','warn');
          company = B.buildCompany(name, info);
        }
        const payload = { company, relation: rel, info, deep, files: attachedFiles.map(f=>f.name),
          summary: company.summary || B.execSummary(company, rel), date: B.now().toISOString(), aiGenerated: B.aiMode.active };
        store.addHistory({ type:'analysis', title:'Análise · '+company.name,
          subtitle: B.relations.find(r=>r.id===rel).label, payload });
        renderAnalysisReport(body, payload);
        B.toast('Relatório gerado','success');
      }});
    }
  }

  function renderAnalysisReport(body, p) {
    const c = p.company;
    const relLabel = B.relations.find(r=>r.id===p.relation)?.label || '—';
    const logoHtml = B.companyLogoHtml('report');

    /* Helpers para o dossiê */
    const addr = c.address || {};
    const cont = c.contacts || {};
    const corp = c.corporate || {};
    const ops  = c.operations || {};
    const fin  = c.financial || {};
    const rep  = c.reputation || {};
    const news = c.recentNews;

    function factRow(label, v) {
      if (!v || v === 'null') return '';
      return `<div class="fact"><span class="f-k">${esc(label)}</span><span class="f-v">${val(v)}</span></div>`;
    }
    function listBlock(items) {
      if (!items || !items.length) return '<span class="na">não disponível</span>';
      return `<ul style="margin:0;padding-left:18px">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    }
    function linkPill(url, label) {
      if (!url) return '';
      const display = label || url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
      return `<a href="${esc(url)}" target="_blank" rel="noopener" class="source-pill" style="text-decoration:none;cursor:pointer">${ic.globe} ${esc(display)}</a>`;
    }

    /* Endereço formatado */
    const addrParts = [addr.street, addr.city, addr.state, addr.cep, addr.country].filter(Boolean);
    const addrStr = addrParts.length ? addrParts.join(', ') : null;

    /* Redes sociais */
    const socialLinks = [];
    if (cont.website) socialLinks.push(linkPill(cont.website, 'Site oficial'));
    if (cont.instagram) socialLinks.push(linkPill(cont.instagram.startsWith('http')?cont.instagram:'https://instagram.com/'+cont.instagram.replace('@',''), 'Instagram'));
    if (cont.facebook) socialLinks.push(linkPill(cont.facebook.startsWith('http')?cont.facebook:'https://facebook.com/'+cont.facebook, 'Facebook'));
    if (cont.linkedin) socialLinks.push(linkPill(cont.linkedin.startsWith('http')?cont.linkedin:'https://linkedin.com/company/'+cont.linkedin, 'LinkedIn'));
    if (cont.otherSocial) cont.otherSocial.forEach(s => socialLinks.push(linkPill(s, s.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])));

    const wrap = el(`<div class="fade-up"></div>`);
    const report = el(`<div id="anaReport">
      <div class="card pad-lg">
        <!-- CABEÇALHO -->
        <div class="report-head">
          <div class="report-logo">${B.initials(c.name)}</div>
          <div style="min-width:0">
            <h2>${esc(c.name)}</h2>
            ${c.tradeName && c.tradeName !== c.name ? `<div class="muted" style="font-size:13px;margin-top:2px">Nome fantasia: <b style="color:var(--text)">${esc(c.tradeName)}</b></div>` : ''}
            <div class="meta">
              ${c.sector ? `<span>${ic.building} ${esc(c.sector)}</span>` : ''}
              ${c.cnpj ? `<span>${ic.shield} CNPJ: ${esc(c.cnpj)}</span>` : ''}
              <span>${ic.flag} Relação: <b style="color:var(--text)">${esc(relLabel)}</b></span>
              <span>${ic.clock} ${B.fmtDate(p.date)}</span>
            </div>
          </div>
          ${logoHtml ? `<div style="margin-left:auto;padding-right:12px">${logoHtml}</div>` : ''}
          ${exportToolbar()}
        </div>

        ${c.sparse ? `<div class="credibility" style="margin-top:18px">${ic.warn}
          <div>Informações públicas limitadas para esta empresa. Campos sem fonte confirmada aparecem como <b>"não disponível"</b>.</div></div>` : ''}

        <!-- RESUMO INVESTIGATIVO -->
        <div class="report-section">
          <h3><span class="ico">${ic.report}</span> Resumo investigativo</h3>
          <div class="prose">${(p.summary||'').split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
        </div>

        <!-- SCORE DE CONFIABILIDADE -->
        <div class="report-section">
          <div class="kpi-grid">
            ${kpi('Score de confiabilidade', c.score, 'baseado nos dados encontrados', c.score >= 60 ? 'k-up' : '')}
            ${kpi('Porte', ops.size || {na:true}, '')}
            ${kpi('Colaboradores', ops.employees || {na:true}, '')}
            ${kpi('Receita', fin.revenue || {na:true}, '')}
          </div>
        </div>

        <!-- DADOS CADASTRAIS -->
        <div class="report-section">
          <h3><span class="ico">${ic.building}</span> Dados cadastrais</h3>
          <div class="fact-list">
            ${factRow('Razão social', c.name)}
            ${factRow('Nome fantasia', c.tradeName)}
            ${factRow('CNPJ', c.cnpj)}
            ${factRow('Natureza jurídica', corp.legalNature)}
            ${factRow('Capital social', corp.capitalStock)}
            ${factRow('Fundação', corp.founded)}
            ${factRow('Fundador(es)', corp.founders)}
            ${factRow('Endereço', addrStr)}
            ${factRow('Telefone', cont.phone)}
            ${factRow('E-mail', cont.email)}
          </div>
        </div>

        <!-- REDES SOCIAIS E WEB -->
        ${socialLinks.length ? `<div class="report-section">
          <h3><span class="ico">${ic.web}</span> Presença digital</h3>
          <div style="display:flex;gap:9px;flex-wrap:wrap">${socialLinks.join('')}</div>
        </div>` : ''}

        <!-- QUADRO SOCIETÁRIO -->
        ${corp.partners && corp.partners.length ? `<div class="report-section">
          <h3><span class="ico">${ic.users}</span> Quadro societário / Diretoria</h3>
          <div class="fact-list">${corp.partners.map(p => {
            const parts = p.split(' — ');
            return `<div class="fact"><span class="f-k">${esc(parts[1]||'Sócio')}</span><span class="f-v">${esc(parts[0])}</span></div>`;
          }).join('')}</div>
          ${corp.parentCompany ? `<div class="fact" style="margin-top:8px"><span class="f-k">Controladora</span><span class="f-v">${esc(corp.parentCompany)}</span></div>` : ''}
          ${corp.subsidiaries && corp.subsidiaries.length ? `<div style="margin-top:8px"><span class="muted" style="font-size:12px">Subsidiárias / grupo:</span> ${corp.subsidiaries.map(s=>`<span class="source-pill" style="font-size:12px">${esc(s)}</span>`).join('')}</div>` : ''}
        </div>` : ''}

        <!-- OPERAÇÕES -->
        <div class="report-section">
          <h3><span class="ico">${ic.activity}</span> Operações e mercado</h3>
          <div class="fact-list">
            ${factRow('Setor / segmento', c.sector)}
            ${factRow('Regiões de atuação', ops.regions)}
            ${factRow('Colaboradores', ops.employees)}
            ${factRow('Porte', ops.size)}
          </div>
          <div class="grid cols-2" style="margin-top:14px;gap:14px">
            <div class="card" style="padding:14px"><h4 style="font-size:13px;margin:0 0 8px;color:var(--brand-300)">${ic.layers} Produtos / Serviços</h4>
              ${listBlock(ops.products)}</div>
            <div class="card" style="padding:14px"><h4 style="font-size:13px;margin:0 0 8px;color:var(--cyan)">${ic.users} Principais clientes</h4>
              ${listBlock(ops.mainClients)}</div>
          </div>
          ${ops.competitors && ops.competitors.length ? `<div style="margin-top:10px"><span class="muted" style="font-size:12px">Concorrentes identificados:</span> ${ops.competitors.map(x=>`<span class="source-pill" style="font-size:12px">${esc(x)}</span>`).join('')}</div>` : ''}
          ${ops.mainSuppliers && ops.mainSuppliers.length ? `<div style="margin-top:8px"><span class="muted" style="font-size:12px">Fornecedores:</span> ${ops.mainSuppliers.map(x=>`<span class="source-pill" style="font-size:12px">${esc(x)}</span>`).join('')}</div>` : ''}
        </div>

        <!-- FINANCEIRO -->
        <div class="report-section">
          <h3><span class="ico">${ic.revenue}</span> Informações financeiras</h3>
          <div class="fact-list">
            ${factRow('Receita', fin.revenue)}
            ${factRow('Crescimento', fin.growth)}
            ${factRow('Market share', fin.marketShare)}
            ${factRow('Ação na bolsa', fin.stockTicker)}
            ${factRow('Observações', fin.financialNotes)}
          </div>
          ${fin.revTrend ? `<div style="margin-top:14px">${B.charts.line('Evolução de receita', fin.revTrend)}</div>` : ''}
        </div>

        <!-- REPUTAÇÃO -->
        <div class="report-section">
          <h3><span class="ico">${ic.star}</span> Reputação e alertas</h3>
          <div class="grid cols-2" style="gap:14px">
            <div class="card" style="padding:14px;border-left:3px solid var(--green)"><h4 style="font-size:13px;margin:0 0 8px;color:var(--green)">${ic.trend} Destaques positivos</h4>
              ${listBlock(rep.highlights)}</div>
            <div class="card" style="padding:14px;border-left:3px solid var(--red)"><h4 style="font-size:13px;margin:0 0 8px;color:var(--red)">${ic.warn} Riscos e pontos de atenção</h4>
              ${listBlock(rep.risks)}</div>
          </div>
          <div class="fact-list" style="margin-top:12px">
            ${factRow('Prêmios / reconhecimentos', rep.awards && rep.awards.length ? rep.awards.join(', ') : null)}
            ${factRow('Reclame Aqui', rep.reclameAqui)}
            ${factRow('NPS / satisfação', rep.nps)}
            ${factRow('Processos / jurídico', rep.lawsuits)}
          </div>
        </div>

        <!-- FEEDBACK DE CLIENTES -->
        ${(() => {
          const fb = c.customerFeedback;
          if (!fb || (!fb.overallSentiment && !(fb.ratings||[]).length && !(fb.commonComplaints||[]).length && !(fb.commonPraises||[]).length)) return '';
          const sentColor = {'POSITIVO':'var(--green)','NEGATIVO':'var(--red)','MISTO':'var(--amber)','NEUTRO':'var(--muted)'}[fb.overallSentiment] || 'var(--text)';
          return `<div class="report-section">
          <h3><span class="ico">${ic.users}</span> Avaliações e feedback de clientes</h3>
          ${fb.overallSentiment ? `<div style="margin-bottom:12px"><span class="source-pill" style="font-size:12px;color:${sentColor};border-color:${sentColor}50">Sentimento geral: <b>${esc(fb.overallSentiment)}</b></span></div>` : ''}
          ${(fb.ratings||[]).length ? `<div class="kpi-grid" style="margin-bottom:12px">${fb.ratings.map(r =>
            kpi(r.platform || 'Plataforma', r.score || '—', r.detail || '')).join('')}</div>` : ''}
          <div class="grid cols-2" style="gap:14px">
            ${(fb.commonPraises||[]).length ? `<div class="card" style="padding:14px;border-left:3px solid var(--green)"><h4 style="font-size:13px;margin:0 0 8px;color:var(--green)">${ic.star} Elogios recorrentes</h4>${listBlock(fb.commonPraises)}</div>` : ''}
            ${(fb.commonComplaints||[]).length ? `<div class="card" style="padding:14px;border-left:3px solid var(--red)"><h4 style="font-size:13px;margin:0 0 8px;color:var(--red)">${ic.warn} Reclamações recorrentes</h4>${listBlock(fb.commonComplaints)}</div>` : ''}
          </div>
          ${fb.responseQuality ? `<div class="fact-list" style="margin-top:12px">${factRow('Qualidade de resposta', fb.responseQuality)}</div>` : ''}
        </div>`;
        })()}

        <!-- PRESENÇA DIGITAL DETALHADA -->
        ${(() => {
          const sp = c.socialPresence;
          if (!sp || (!sp.summary && !(sp.profiles||[]).length)) return '';
          return `<div class="report-section">
          <h3><span class="ico">${ic.globe}</span> Redes sociais e presença digital</h3>
          ${sp.summary ? `<p class="muted" style="font-size:13.5px;margin:0 0 12px">${esc(sp.summary)}</p>` : ''}
          ${(sp.profiles||[]).length ? `<div class="fact-list">${sp.profiles.map(pr =>
            `<div class="fact"><span class="f-k">${esc(pr.platform||'Rede')}</span><span class="f-v">${esc(pr.handle||'')}${pr.followers ? ` — <b>${esc(pr.followers)}</b> seguidores` : ''}${pr.activity ? ` · ${esc(pr.activity)}` : ''}</span></div>`).join('')}</div>` : ''}
          ${sp.contentStrategy ? `<div class="fact-list" style="margin-top:8px">${factRow('Estratégia de conteúdo', sp.contentStrategy)}</div>` : ''}
        </div>`;
        })()}

        <!-- NOTÍCIAS RECENTES -->
        ${news && news.length ? `<div class="report-section">
          <h3><span class="ico">${ic.clock}</span> Notícias recentes</h3>
          ${news.map(n => `<div class="card" style="padding:12px;margin-bottom:8px">
            <b style="color:var(--text)">${esc(n.title)}</b>
            <div class="muted" style="font-size:12.5px;margin-top:4px">${esc(n.summary||'')}</div>
            <div class="meta" style="margin-top:6px"><span>${esc(n.source||'')}</span>${n.date?`<span>${esc(n.date)}</span>`:''}</div>
          </div>`).join('')}
        </div>` : ''}

        <!-- DEEP ANALYSIS: DUE DILIGENCE -->
        ${c.dueDiligence ? (() => {
          const dd = c.dueDiligence;
          const fh = dd.financialHealth || {};
          const comp = dd.compliance || {};
          const esg = dd.esg || {};
          const leg = dd.legal || {};
          const gov = dd.governance || {};
          const riskColor = {'BAIXO':'var(--green)','MÉDIO':'var(--amber)','ALTO':'var(--red)'}[dd.overallRisk] || 'var(--text)';
          return `
        <div class="report-section" style="border-top:2px solid rgba(251,191,36,.3);padding-top:20px;margin-top:24px">
          <h3 style="display:flex;align-items:center;gap:10px"><span class="ico">${ic.shield}</span> Due Diligence <span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;background:linear-gradient(90deg,rgba(251,191,36,.2),rgba(251,191,36,.08));color:var(--amber);border:1px solid rgba(251,191,36,.25)">Deep Analysis</span></h3>
          <div class="next-cta" style="margin-top:12px;border-color:${riskColor}40;background:${riskColor}10">
            <div class="txt"><b style="color:${riskColor}">${ic.flag} Risco geral: ${esc(dd.overallRisk || 'INCONCLUSIVO')}</b>
            <span>${esc(dd.riskJustification || '')}</span></div>
          </div>
        </div>

        <div class="report-section">
          <h3><span class="ico">${ic.revenue}</span> Saúde financeira</h3>
          ${fh.status ? `<div style="margin-bottom:10px"><span class="source-pill" style="font-size:12px;border-color:${fh.status==='SAUDÁVEL'?'rgba(52,211,153,.4)':fh.status==='CRÍTICO'?'rgba(239,68,68,.4)':'rgba(251,191,36,.4)'}">${esc(fh.status)}</span></div>` : ''}
          <div class="fact-list">
            ${fh.indicators && fh.indicators.length ? fh.indicators.map(i => `<div class="fact"><span class="f-k">Indicador</span><span class="f-v">${esc(i)}</span></div>`).join('') : ''}
            ${factRow('Endividamento', fh.debt)}
            ${factRow('Lucratividade', fh.profitability)}
          </div>
        </div>

        <div class="grid cols-2" style="gap:16px">
          <div class="report-section" style="margin:0">
            <h3><span class="ico">${ic.shield}</span> Compliance</h3>
            ${comp.status ? `<div style="margin-bottom:10px"><span class="source-pill" style="font-size:12px;border-color:${comp.status==='REGULAR'?'rgba(52,211,153,.4)':'rgba(239,68,68,.4)'}">${esc(comp.status)}</span></div>` : ''}
            <div class="fact-list">
              ${factRow('Situação CNPJ', comp.cnpjStatus)}
              ${factRow('Pendências fiscais', comp.taxIssues)}
              ${factRow('Questões regulatórias', comp.regulatoryIssues)}
            </div>
            ${comp.certifications && comp.certifications.length ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${comp.certifications.map(c2=>`<span class="source-pill" style="font-size:11px;border-color:rgba(52,211,153,.3)">${ic.check} ${esc(c2)}</span>`).join('')}</div>` : ''}
          </div>

          <div class="report-section" style="margin:0">
            <h3><span class="ico">${ic.spark}</span> ESG</h3>
            <div class="fact-list">
              ${factRow('Ambiental', esg.environmental)}
              ${factRow('Social', esg.social)}
              ${factRow('Governança', esg.governance)}
              ${factRow('Score ESG', esg.esgScore)}
            </div>
            ${esg.controversies && esg.controversies.length ? `<div style="margin-top:8px"><b style="font-size:12px;color:var(--red)">Controvérsias:</b><ul style="margin:4px 0 0;padding-left:18px;font-size:13px">${esg.controversies.map(c2=>`<li>${esc(c2)}</li>`).join('')}</ul></div>` : ''}
          </div>
        </div>

        <div class="grid cols-2" style="gap:16px;margin-top:16px">
          <div class="report-section" style="margin:0">
            <h3><span class="ico">${ic.warn}</span> Jurídico</h3>
            <div class="fact-list">
              ${factRow('Processos judiciais', leg.lawsuits)}
              ${factRow('Questões trabalhistas', leg.laborIssues)}
              ${factRow('Reclamações consumidor', leg.consumerComplaints)}
              ${factRow('Sanções/penalidades', leg.sanctions)}
            </div>
          </div>

          <div class="report-section" style="margin:0">
            <h3><span class="ico">${ic.building}</span> Governança corporativa</h3>
            <div class="fact-list">
              ${factRow('Conselho/Diretoria', gov.boardStructure)}
              ${factRow('Transparência', gov.transparency)}
              ${factRow('Auditoria', gov.auditedBy)}
              ${factRow('Listada em', gov.listedExchange)}
            </div>
          </div>
        </div>
          `; })() : ''}

        <!-- FONTES -->
        <div class="report-section">
          <h3><span class="ico">${ic.globe}</span> Fontes consultadas</h3>
          <div style="display:flex;gap:9px;flex-wrap:wrap">${(c.sources||[]).map(s=>`<span class="source-pill">${ic.globe} ${esc(s)}</span>`).join('')}
          ${(p.files&&p.files.length)?p.files.map(f=>`<span class="source-pill" style="border-color:rgba(34,211,238,.3)">${ic.file} ${esc(f)}</span>`).join(''):''}</div>
        </div>

        <div class="credibility" style="margin-top:6px">${ic.info}
          <div>${p.aiGenerated ? 'Dossiê gerado pela IA com base em fontes públicas da internet. Dados sem fonte confirmada aparecem como "não disponível".' : 'Dados de demonstração.'} Sempre valide informações críticas com fontes primárias antes de tomar decisões.</div>
        </div>
      </div>

      <div class="next-cta" style="margin-top:18px">
        <div class="txt"><b>Quer comparar ${esc(c.name)} com outra empresa do mercado?</b>
          <span>Leve este perfil direto para o Compare ou gere uma apresentação visual no Display.</span></div>
        <div class="acts">
          <button class="btn ghost" data-act="compare">${ic.compare} Comparar no Compare</button>
          <button class="btn accent" data-act="display">${ic.display} Gerar Display</button>
        </div>
      </div>
    </div>`);

    wrap.appendChild(report);
    const toolbarRow = el(`<div style="display:flex;justify-content:flex-end;margin-bottom:14px;gap:9px">
      <button class="btn ghost sm" data-new>${ic.refresh} Nova investigação</button></div>`);
    body.innerHTML = ''; body.appendChild(toolbarRow); body.appendChild(wrap);

    toolbarRow.querySelector('[data-new]').onclick = () => renderAnalysisForm(body, {});
    wireExports(report, () => report.querySelector('.card'), 'Dossiê - '+c.name, p, 'Analysis');
    report.querySelector('[data-act="compare"]').onclick = () => { B.handoff = { from:'analysis', company:c }; B.router.go('compare', { seed:c }); };
    report.querySelector('[data-act="display"]').onclick = () => { B.handoff = { from:'analysis', company:c }; B.router.go('display', { seed:{ type:'analysis', company:c } }); };
  }

  /* ============================================================
     COMPARE
     ============================================================ */
  B.views.compare = function (mount, params) {
    mount.innerHTML = `
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-cyan">${ic.compare}</span> Compare</h1>
        <p>Coloque empresas lado a lado para decidir com clareza. Informe quais comparar e o motivo — geramos um relatório com vantagens relativas e um vencedor por critério.</p>
      </div>
      <div id="cmpBody"></div>`;
    const body = mount.querySelector('#cmpBody');
    if (params && params.reopen) { renderCompareReport(body, params.reopen.payload); return; }
    renderCompareForm(body, params);
  };

  function renderCompareForm(body, params) {
    const seedName = params?.seed?.name || '';
    const fz = makeFileZone('cmp');
    body.innerHTML = `
      <div class="card pad-lg fade-up">
        <div class="form-grid">
          <div class="field"><label>Empresas que você quer comparar</label>
            <div id="cmpInputs" class="form-grid" style="gap:10px">
              <input class="input cmp-co" placeholder="Empresa 1" value="${esc(seedName)}">
              <input class="input cmp-co" placeholder="Empresa 2">
            </div>
            <button class="btn ghost sm" id="cmpAdd" style="margin-top:10px">${ic.plus} Adicionar outra empresa</button>
          </div>
          <div class="field"><label>Por que você quer comparar? (objetivo)</label>
            <textarea class="textarea" id="cmpReason" placeholder="Ex.: escolher o fornecedor mais confiável para um contrato anual de logística."></textarea>
          </div>
          <div class="field">
            <label>Links relevantes <span class="muted" style="font-weight:400;font-size:12px">(opcional — sites, redes sociais, notícias…)</span></label>
            <div id="cmpLinks" class="link-inputs" style="display:flex;flex-direction:column;gap:8px">
              <input class="input" placeholder="https://… (site, Instagram, LinkedIn, notícia…)" data-link>
            </div>
            <button class="btn ghost sm" id="cmpAddLink" style="margin-top:6px">${ic.plus} Adicionar outro link</button>
          </div>
          ${fz.html}
          ${B.costRow('compare')}
          <button class="btn primary lg" id="cmpRun">${ic.compare} Comparar empresas</button>
        </div>
      </div>`;

    fz.init(body);
    body.querySelector('#cmpAddLink').onclick = () => {
      const box = body.querySelector('#cmpLinks');
      if (box.querySelectorAll('[data-link]').length >= 5) { B.toast('Máximo de 5 links','info'); return; }
      box.appendChild(el(`<input class="input" placeholder="https://…" data-link>`));
    };
    body.querySelector('#cmpAdd').onclick = () => {
      const box = body.querySelector('#cmpInputs');
      if (box.querySelectorAll('.cmp-co').length >= 3) { B.toast('Comparação de até 3 empresas na demonstração','info'); return; }
      box.appendChild(el(`<input class="input cmp-co" placeholder="Empresa 3">`));
    };
    body.querySelector('#cmpRun').onclick = () => {
      const names = Array.from(body.querySelectorAll('.cmp-co')).map(i=>i.value.trim()).filter(Boolean);
      if (names.length < 2) { B.toast('Informe ao menos duas empresas','warn'); return; }
      const reason = body.querySelector('#cmpReason').value.trim();
      const links = Array.from(body.querySelectorAll('#cmpLinks [data-link]')).map(i=>i.value.trim()).filter(Boolean);
      const attachedFiles = fz.getFiles();
      if (!B.aiReady()) return;
      if (!store.spend('compare', { label:'Compare — '+names.join(' x ') })) { B.creditWall(); return; }
      attachedFiles.forEach(() => store.spend('file_analysis'));

      const steps = B.statusSteps.compare.slice();
      if (links.length > 0) steps.unshift({ icon:'web', t:`Acessando ${links.length} link(s) fornecido(s)…` });
      if (attachedFiles.length > 0) steps.unshift({ icon:'file', t:`Lendo ${attachedFiles.length} arquivo(s): ${attachedFiles.map(f=>f.name).join(', ')}` });

      const apiPromise = B.aiMode.active
        ? B.api.compare(names, reason, links, attachedFiles)
        : Promise.resolve(null);

      B.runStatus(body, steps, { title:'Comparando '+names.join(' · '), waitFor: apiPromise, onDone: async () => {
        let cmp;
        try {
          if (B.aiMode.active) {
            const result = await apiPromise;
            // Adapta resposta da API ao formato interno
            cmp = buildComparisonFromApi(result, names, reason);
          } else {
            const companies = names.map(n => B.buildCompany(n));
            cmp = B.buildComparison(companies, reason);
          }
        } catch (e) {
          store.refund('compare');
          B.toast('Erro na IA: ' + e.message + ' — créditos reembolsados, exibindo demonstração','warn');
          const companies = names.map(n => B.buildCompany(n));
          cmp = B.buildComparison(companies, reason);
        }
        const payload = { cmp, reason, date: B.now().toISOString(), names, files: attachedFiles.map(f=>f.name), aiGenerated: B.aiMode.active };
        store.addHistory({ type:'compare', title:'Comparação · '+names.join(' x '), subtitle: reason||'—', payload });
        renderCompareReport(body, payload);
        B.toast('Comparação concluída','success');
      }});
    };
  }

  /* Adapta resposta real da API ao formato de comparação interno */
  function buildComparisonFromApi(apiResult, names, reason) {
    const cos = (apiResult.companies || names.map(n => ({ name:n, known:true }))).map(c => ({
      name: c.name || c.nome,
      sector: c.sector || { na:true },
      region: c.region || { na:true },
      employees: c.employees || { na:true },
      revenue: c.revenue || { na:true },
      founded: c.founded || { na:true },
      marketShare: typeof c.marketShare === 'number' ? c.marketShare : { na:true },
      growth: typeof c.growth === 'number' ? c.growth : { na:true },
      nps: typeof c.nps === 'number' ? c.nps : { na:true },
      score: typeof c.score === 'number' ? c.score : 50,
      strengths: c.strengths || [],
      weaknesses: c.weaknesses || [],
      reputation: c.reputation || null,
      compliance: c.compliance || null,
      riskLevel: c.riskLevel || null,
      differentials: c.differentials || null,
      known: true,
    }));
    const rows = [
      { key:'sector',      label:'Setor' },
      { key:'region',      label:'Região de atuação' },
      { key:'founded',     label:'Fundação' },
      { key:'employees',   label:'Porte / colaboradores' },
      { key:'revenue',     label:'Receita' },
      { key:'marketShare', label:'Market share', suffix:'%', numeric:true },
      { key:'growth',      label:'Crescimento a.a.', suffix:'%', numeric:true },
      { key:'nps',         label:'NPS / satisfação', numeric:true },
      { key:'reputation',  label:'Reputação' },
      { key:'compliance',  label:'Compliance' },
      { key:'riskLevel',   label:'Nível de risco' },
      { key:'score',       label:'Brentor Score', numeric:true, score:true },
    ];
    rows.forEach(row => {
      if (!row.numeric) return;
      let best = -Infinity, bi = -1, any = false;
      cos.forEach((c,i) => {
        const v = c[row.key];
        if (v && !v.na && typeof v === 'number') { any=true; if(v>best){best=v; bi=i;} }
      });
      row.winner = any ? bi : -1;
    });
    let bestScore=-1, wi=0;
    cos.forEach((c,i)=>{ const s=(c.score&&!c.score.na)?c.score:0; if(s>bestScore){bestScore=s;wi=i;} });
    return {
      companies: cos, reason, rows, overallWinner: wi,
      criteria: apiResult.criteria || [],
      summary: apiResult.summary || '',
      recommendation: apiResult.recommendation || '',
      risks: apiResult.risks || [],
      sources: apiResult.sources || [],
    };
  }

  function renderCompareReport(body, p) {
    const cmp = p.cmp, cos = cmp.companies;
    const palette = ['#3b82f6','#22d3ee','#a78bfa'];
    const winner = cos[cmp.overallWinner];
    const cmpLogoHtml = B.companyLogoHtml('sm');
    const criteria = cmp.criteria || [];
    const cell = (c, row) => {
      let v = c[row.key];
      if (v && v.na) return '<span class="na">não disp.</span>';
      if (row.suffix && typeof v==='number') v = v+row.suffix;
      return esc(v==null?'—':v);
    };
    const riskColor = lv => ({'BAIXO':'var(--green)','MÉDIO':'var(--amber)','ALTO':'var(--red)'}[lv] || 'var(--text-muted)');

    const report = el(`<div id="cmpReport">
      <div class="card pad-lg">
        <div class="report-head">
          <div class="report-logo" style="background:linear-gradient(150deg,#0891b2,#22d3ee)">${ic.compare}</div>
          <div style="min-width:0"><h2>Comparação de empresas</h2>
            <div class="meta"><span>${ic.building} ${cos.map(c=>esc(c.name)).join(' · ')}</span><span>${ic.clock} ${B.fmtDate(p.date)}</span></div>
          </div>
          ${cmpLogoHtml ? `<div style="margin-left:auto;padding-right:12px">${cmpLogoHtml}</div>` : ''}
          ${exportToolbar()}
        </div>

        ${p.reason ? `<div class="report-section"><h3><span class="ico">${ic.target}</span> Objetivo da comparação</h3>
          <div class="prose"><p>${esc(p.reason)}</p></div></div>` : ''}

        <!-- RESUMO -->
        ${cmp.summary ? `<div class="report-section"><h3><span class="ico">${ic.report}</span> Análise comparativa</h3>
          <div class="prose">${cmp.summary.split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div></div>` : ''}

        <!-- VENCEDOR -->
        <div class="next-cta" style="margin-top:18px;background:var(--green-soft);border-color:rgba(52,211,153,.25)">
          <div class="txt"><b>${ic.star} Destaque geral: ${esc(winner.name)}</b>
            <span>Melhor Brentor Score (${winner.score||'—'}/100) entre as empresas comparadas.</span></div>
        </div>

        <!-- TABELA COMPARATIVA -->
        <div class="report-section">
          <h3><span class="ico">${ic.grid}</span> Ficha comparativa</h3>
          <div style="overflow-x:auto"><table class="compare-table">
            <thead><tr><th>Critério</th>${cos.map((c,i)=>`<th><div class="co-h"><span class="av" style="background:${palette[i]}">${B.initials(c.name)}</span>${esc(c.name)}</div></th>`).join('')}</tr></thead>
            <tbody>${cmp.rows.map(row=>`<tr><td>${esc(row.label)}</td>${cos.map((c,i)=>
              `<td class="${row.winner===i?'winner':''}">${cell(c,row)}${row.winner===i?'<span class="win-tag">melhor</span>':''}</td>`).join('')}</tr>`).join('')}
            </tbody></table></div>
        </div>

        <!-- GRÁFICOS -->
        <div class="report-section">
          <h3><span class="ico">${ic.chart}</span> Visão comparativa</h3>
          <div class="grid cols-2">
            ${B.charts.bars('Brentor Score', cos.map((c,i)=>({label:c.name, value:(c.score&&!c.score.na)?c.score:0, max:100, display:(c.score&&!c.score.na)?c.score:'—', fill:['fill-a','fill-b','fill-c'][i]})))}
            ${criteria.length ? B.charts.bars('Avaliação por critério — ' + esc(cos[0].name), criteria.map((cr,idx)=>({label:cr.name, value:cr.scores?cr.scores[0]:0, max:100, display:cr.scores?cr.scores[0]:'—', fill:['fill-a','fill-b','fill-c'][idx%3]}))) : B.charts.bars('Participação de mercado (%)', cos.map((c,i)=>({label:c.name, value:(c.marketShare&&!c.marketShare.na)?c.marketShare:0, max:Math.max(...cos.map(x=>(x.marketShare&&!x.marketShare.na)?x.marketShare:0),1), display:(c.marketShare&&!c.marketShare.na)?c.marketShare+'%':'—', fill:['fill-a','fill-b','fill-c'][i]})))}
          </div>
        </div>

        <!-- AVALIAÇÃO POR CRITÉRIOS -->
        ${criteria.length ? `<div class="report-section">
          <h3><span class="ico">${ic.target}</span> Avaliação por critérios</h3>
          <div style="overflow-x:auto"><table class="compare-table">
            <thead><tr><th>Critério</th>${cos.map((c,i)=>`<th><div class="co-h"><span class="av" style="background:${palette[i]}">${B.initials(c.name)}</span>${esc(c.name)}</div></th>`).join('')}<th>Análise</th></tr></thead>
            <tbody>${criteria.map(cr=>`<tr><td><b>${esc(cr.name)}</b><div class="muted" style="font-size:11px">${esc(cr.description||'')}</div></td>${(cr.scores||[]).map((s,i)=>
              `<td class="${cr.winner===i?'winner':''}" style="text-align:center"><b>${s}</b>/100${cr.winner===i?'<span class="win-tag">melhor</span>':''}</td>`).join('')}<td style="font-size:12.5px">${esc(cr.analysis||'')}</td></tr>`).join('')}
            </tbody></table></div>
        </div>` : ''}

        <!-- PONTOS FORTES E FRACOS POR EMPRESA -->
        <div class="report-section">
          <h3><span class="ico">${ic.activity}</span> Perfil de cada empresa</h3>
          <div class="grid cols-${Math.min(cos.length, 3)}" style="gap:14px">
            ${cos.map((c,i) => `<div class="card" style="padding:16px;border-top:3px solid ${palette[i]}">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="av" style="background:${palette[i]};width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:700">${B.initials(c.name)}</span><b>${esc(c.name)}</b></div>
              ${c.differentials ? `<div style="font-size:12.5px;margin-bottom:10px;color:var(--brand-300)">${ic.spark} ${esc(c.differentials)}</div>` : ''}
              ${c.riskLevel ? `<div style="margin-bottom:8px"><span class="source-pill" style="font-size:11px;border-color:${riskColor(c.riskLevel)}40;color:${riskColor(c.riskLevel)}">${ic.flag} Risco: ${esc(c.riskLevel)}</span></div>` : ''}
              <div style="margin-bottom:8px"><b style="font-size:12px;color:var(--green)">${ic.trend} Forças</b>
                <ul style="margin:4px 0 0;padding-left:16px;font-size:13px">${(c.strengths||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
              <div><b style="font-size:12px;color:var(--red)">${ic.warn} Fraquezas</b>
                <ul style="margin:4px 0 0;padding-left:16px;font-size:13px">${(c.weaknesses||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
              ${c.reputation ? `<div style="margin-top:8px;font-size:12.5px"><b style="color:var(--cyan)">Reputação:</b> ${esc(c.reputation)}</div>` : ''}
              ${c.customerSentiment ? `<div style="margin-top:6px;font-size:12.5px"><b style="color:${({'POSITIVO':'var(--green)','NEGATIVO':'var(--red)','MISTO':'var(--amber)'})[c.customerSentiment]||'var(--muted)'}">Clientes: ${esc(c.customerSentiment)}</b>${(c.ratings||[]).length ? ' · ' + c.ratings.map(r=>`${esc(r.platform||'')}: <b>${esc(r.score||'')}</b>`).join(' · ') : ''}</div>` : ''}
              ${c.socialPresence ? `<div style="margin-top:6px;font-size:12.5px"><b style="color:var(--brand-300)">Presença digital:</b> ${esc(c.socialPresence)}</div>` : ''}
              ${c.cnpjStatus ? `<div style="margin-top:6px;font-size:12px" class="muted">${ic.shield} Situação cadastral: <b style="color:var(--text)">${esc(c.cnpjStatus)}</b></div>` : ''}
            </div>`).join('')}
          </div>
        </div>

        <!-- RECOMENDAÇÃO -->
        ${cmp.recommendation ? `<div class="next-cta" style="margin-top:18px;background:var(--green-soft);border-color:rgba(52,211,153,.25)">
          <div class="txt"><b>${ic.spark} Recomendação</b><span>${esc(cmp.recommendation)}</span></div></div>` : ''}

        <!-- RISCOS DA ESCOLHA -->
        ${cmp.risks && cmp.risks.length ? `<div class="report-section">
          <h3><span class="ico">${ic.warn}</span> Riscos a considerar</h3>
          <div class="grid" style="gap:8px">${cmp.risks.map(r => `<div class="card" style="padding:10px 14px;border-left:3px solid var(--red);font-size:13px">${ic.flag} ${esc(r)}</div>`).join('')}</div>
        </div>` : ''}

        <!-- FONTES -->
        ${cmp.sources && cmp.sources.length ? `<div class="report-section"><h3><span class="ico">${ic.web}</span> Fontes consultadas</h3>
          <div style="display:flex;gap:9px;flex-wrap:wrap">${cmp.sources.map(s=>`<span class="source-pill">${ic.globe} ${esc(s)}</span>`).join('')}</div></div>` : ''}

        <div class="credibility" style="margin-top:6px">${ic.info}
          <div>${p.aiGenerated ? 'Comparação gerada pela IA com base em fontes públicas da internet. Dados sem fonte confirmada aparecem como "não disp.".' : 'Dados de demonstração.'} Sempre valide informações críticas antes de tomar decisões.</div></div>
      </div>

      <div class="next-cta" style="margin-top:18px">
        <div class="txt"><b>Transforme esta comparação em material visual</b>
          <span>Gere um dashboard ou uma apresentação de slides pronta para reunião.</span></div>
        <div class="acts"><button class="btn accent" data-act="display">${ic.display} Gerar Display</button></div>
      </div>
    </div>`);

    const toolbarRow = el(`<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn ghost sm" data-new>${ic.refresh} Nova comparação</button></div>`);
    body.innerHTML=''; body.appendChild(toolbarRow); body.appendChild(report);
    setTimeout(()=>report.querySelectorAll('.track > i').forEach(i=>i.style.width=i.style.width),50);
    toolbarRow.querySelector('[data-new]').onclick = () => renderCompareForm(body, {});
    wireExports(report, () => report.querySelector('.card'), 'Comparacao - '+p.names.join(' x '), p, 'Compare');
    report.querySelector('[data-act="display"]').onclick = () => { B.handoff={from:'compare',cmp}; B.router.go('display',{ seed:{ type:'compare', cmp } }); };
  }

  /* ============================================================
     DISPLAY
     ============================================================ */
  B.views.display = function (mount, params) {
    mount.innerHTML = `
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-violet">${ic.display}</span> Display</h1>
        <p>Gere material visual a partir de qualquer conteúdo: slides para uma palestra, dashboard de um relatório, one-pager de um produto. Você pode partir de uma análise ou comparação já feita no portal.</p>
      </div>
      <div id="dspBody"></div>`;
    if (params && params.reopen && params.reopen.payload) {
      renderDisplayResult(mount.querySelector('#dspBody'), params.reopen.payload);
      return;
    }
    renderDisplayForm(mount.querySelector('#dspBody'), params);
  };

  function renderDisplayForm(body, params) {
    const seed = params?.seed;
    let seedNote = '';
    let prefillTopic = '';
    if (seed?.type==='analysis') { seedNote = `Partindo da análise de <b>${esc(seed.company.name)}</b>`; prefillTopic = 'Análise de '+seed.company.name; }
    if (seed?.type==='compare') { seedNote = `Partindo da comparação <b>${esc(seed.cmp.companies.map(c=>c.name).join(' x '))}</b>`; prefillTopic = 'Comparação: '+seed.cmp.companies.map(c=>c.name).join(' x '); }

    const fz = makeFileZone('dsp');
    const outs = [
      { id:'slides',   icon:'slides', name:'Apresentação', desc:'Slides 16:9' },
      { id:'dash',     icon:'grid',   name:'Dashboard',    desc:'Painel de indicadores' },
      { id:'report',   icon:'report', name:'Relatório',    desc:'Executivo / texto' },
      { id:'onepager', icon:'doc',    name:'One-pager',    desc:'Resumo em 1 página' },
    ];
    body.innerHTML = `
      <div class="card pad-lg fade-up">
        ${seedNote ? `<div class="cost-row" style="background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.25);margin-bottom:16px">${ic.layers}<span>${seedNote} — o conteúdo já foi carregado. É só escolher o formato.</span></div>`:''}
        <div class="form-grid">
          <div class="field"><label>Tema / título do material</label>
            <input class="input" id="dspTopic" placeholder="Ex.: Lançamento do produto X — visão para diretoria" value="${esc(prefillTopic)}"></div>
          <div class="field"><label>Conteúdo, dados ou contexto</label>
            <textarea class="textarea" id="dspContext" placeholder="Cole aqui o texto, os números, o roteiro da palestra, ou descreva o que precisa apresentar…">${seed?esc(seedNote.replace(/<[^>]+>/g,'')):''}</textarea>
          </div>
          ${fz.html}
          <div class="field"><label>Formato de saída</label>
            <div class="out-type" id="dspOut">
              ${outs.map((o,i)=>`<button class="out-opt ${i===0?'on':''}" data-o="${o.id}"><span class="oi">${ic[o.icon]}</span><b>${o.name}</b><span>${o.desc}</span></button>`).join('')}
            </div>
          </div>
          <div id="dspCost">${B.costRow('display_slides')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn primary lg" id="dspRun" style="flex:1;min-width:200px">${ic.display} Gerar material</button>
          </div>
        </div>
      </div>`;

    fz.init(body);
    let out = 'slides';
    const costKey = { slides:'display_slides', dash:'display_dash', report:'display_report', onepager:'display_report' };
    body.querySelectorAll('#dspOut .out-opt').forEach(b => b.onclick = () => {
      body.querySelectorAll('#dspOut .out-opt').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); out = b.dataset.o;
      body.querySelector('#dspCost').innerHTML = B.costRow(costKey[out]);
    });

    body.querySelector('#dspRun').onclick = () => {
      const topic = body.querySelector('#dspTopic').value.trim();
      const ctx = body.querySelector('#dspContext').value.trim();
      const attachedFiles = fz.getFiles();
      if (!topic && !ctx && !seed && !attachedFiles.length) { B.toast('Informe um tema, conteúdo ou anexe um arquivo','warn'); return; }
      if (!B.aiReady()) return;
      if (!store.spend(costKey[out], { label:'Display — '+(topic||out) })) { B.creditWall(); return; }
      attachedFiles.forEach(() => store.spend('file_analysis'));
      const steps = B.statusSteps.display.slice();
      if (attachedFiles.length > 0) steps.unshift({ icon:'file', t:`Lendo arquivo(s): ${attachedFiles.map(f=>f.name).join(', ')}` });

      const apiPromise = B.aiMode.active
        ? B.api.display(topic||prefillTopic, ctx, out, seed, attachedFiles)
        : Promise.resolve(null);

      B.runStatus(body, steps, { title:'Gerando '+({slides:'apresentação',dash:'dashboard',report:'relatório',onepager:'one-pager'}[out]), waitFor: apiPromise, onDone: async () => {
        const payload = { out, topic: topic||prefillTopic, ctx, seed, files: attachedFiles.map(f=>f.name), date: B.now().toISOString(), aiGenerated: B.aiMode.active };
        try {
          if (B.aiMode.active) {
            const apiResult = await apiPromise;
            payload.aiResult = apiResult.result;
          }
        } catch (e) { store.refund(costKey[out]); B.toast('Erro na IA: '+e.message+' — créditos reembolsados, exibindo demo','warn'); }
        store.addHistory({ type:'display', title:'Display · '+(topic||prefillTopic||out), subtitle:{slides:'Apresentação',dash:'Dashboard',report:'Relatório',onepager:'One-pager'}[out], payload });
        renderDisplayResult(body, payload);
        B.toast('Material gerado','success');
      }});
    };
  }

  function renderSolve(body, topic) {
    const panel = el(`<div class="card pad-lg fade-up">
      <div class="report-head"><div class="report-logo" style="background:linear-gradient(150deg,#7c3aed,#a78bfa)">${ic.solve}</div>
        <div><h2>Solve — direcionamento</h2><div class="meta"><span>${ic.target} ${esc(topic)}</span></div></div></div>
      <div class="report-section"><h3><span class="ico">${ic.spark}</span> Recomendações de abordagem</h3>
        <div class="prose">
          <p><b>Abertura:</b> comece pelo "porquê" — o problema ou oportunidade que motiva o tema. Prenda a atenção com um número ou fato concreto (sem inventar: use só dados que você tem).</p>
          <p><b>Estrutura sugerida:</b> contexto → evidências/dados → análise → recomendação → próximos passos. Cada slide com uma ideia única.</p>
          <p><b>Pontos a destacar:</b> o diferencial da sua tese e o impacto esperado. <b>Riscos a antecipar:</b> objeções prováveis da audiência e como respondê-las.</p>
          <p><b>Fechamento:</b> uma chamada de ação clara, com responsáveis e prazos.</p>
        </div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-back>${ic.display} Gerar a apresentação agora</button>
        <button class="btn ghost" data-new>${ic.refresh} Voltar</button></div>
    </div>`);
    body.innerHTML=''; body.appendChild(panel);
    panel.querySelector('[data-back]').onclick = () => renderDisplayForm(body, {});
    panel.querySelector('[data-new]').onclick = () => renderDisplayForm(body, {});
  }

  function renderDisplayResult(body, p) {
    const ai = p.aiResult || {};
    const isSlides = p.out === 'slides';
    let resultNode;
    if (isSlides) resultNode = buildSlidesView(p, ai);
    else if (p.out === 'onepager') resultNode = buildOnePagerView(p, ai);
    else if (p.out === 'dash') resultNode = buildDashboardView(p, ai);
    else resultNode = buildExecReport(p, ai);

    // Apresentações (slides) têm exportação própria (PDF em slides + PPTX nativo) —
    // "Salvar" em .txt não faz sentido pra um deck visual, por isso não aparece aqui.
    const leftButtons = isSlides
      ? `<button class="btn subtle sm" data-x="pdf-slides">${ic.pdf} PDF (slides)</button>
         <button class="btn subtle sm" data-x="pptx">${ic.display} PPTX</button>
         <button class="btn subtle sm" data-x="share">${ic.share} Compartilhar</button>`
      : exportToolbar().replace('<div class="toolbar">','').replace('</div>','');

    const toolbarRow = el(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">
      <div style="display:flex;gap:9px;flex-wrap:wrap">${leftButtons}</div>
      <div style="display:flex;gap:9px">
        <button class="btn primary sm" data-fullscreen>${ic.display} Tela cheia</button>
        <button class="btn ghost sm" data-new>${ic.refresh} Novo Display</button>
      </div></div>`);
    body.innerHTML=''; body.appendChild(toolbarRow); body.appendChild(resultNode);

    toolbarRow.querySelector('[data-new]').onclick = () => renderDisplayForm(body, {});
    toolbarRow.querySelector('[data-fullscreen]').onclick = () => {
      // Para slides, apresenta só o palco; para os demais, o material inteiro
      const target = resultNode.querySelector('.slide-stage') || resultNode;
      target.classList.add('fs-view');
      (target.requestFullscreen || target.webkitRequestFullscreen || function(){}).call(target);
    };
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) body.querySelectorAll('.fs-view').forEach(n => n.classList.remove('fs-view'));
    });

    if (isSlides) {
      toolbarRow.querySelector('[data-x="pdf-slides"]').onclick = () => resultNode._exportSlidesPDF();
      toolbarRow.querySelector('[data-x="pptx"]').onclick = () => resultNode._exportSlidesPPTX();
      toolbarRow.querySelector('[data-x="share"]').onclick = () => B.share('Brentor.ai · '+(p.topic||'Apresentação'), B.nodeText(resultNode).slice(0,280)+'…');
    } else {
      wireExports(toolbarRow, () => resultNode, 'Display - '+(p.topic||p.out), p, 'Display');
    }
  }

  /* ── SLIDES (layouts variados, profissionais) ──────────────── */
  function buildSlidesView(p, ai) {
    const slides = (ai.slides && ai.slides.length) ? ai.slides : B.buildSlides(p.topic, p.ctx, p.seed);
    // A mesma imagem não pode aparecer em mais de um slide — mantém só a primeira ocorrência.
    const usedImages = new Set();
    slides.forEach(s => {
      if (!s.image) return;
      if (usedImages.has(s.image)) delete s.image;
      else usedImages.add(s.image);
    });
    const slideLogoHtml = B.companyLogoHtml('slide');
    const aiTitle = ai.title || p.topic || 'Apresentação';
    const aiDate = ai.date || new Date().toLocaleDateString('pt-BR');
    const wrap = el(`<div class="fade-up">
      <div class="slide-stage"><div id="slideMount"></div>
        <div class="slide-nav"><button class="btn-icon" data-prev>${ic.chevL}</button>
          <div class="dots"></div><button class="btn-icon" data-next>${ic.chevR}</button></div>
        <div class="thumbs"></div>
      </div>
      ${ai.key_messages && ai.key_messages.length ? `<div class="card pad-lg" style="margin-top:18px">
        <h3 style="margin:0 0 10px"><span class="ico">${ic.spark}</span> Mensagens-chave</h3>
        <ul style="margin:0;padding-left:18px">${ai.key_messages.map(m=>`<li style="margin-bottom:6px">${esc(m)}</li>`).join('')}</ul>
      </div>` : ''}
      ${ai.sources && ai.sources.length ? `<div style="margin-top:10px;font-size:12px;color:var(--text-400)">
        <b>Fontes:</b> ${ai.sources.map(s=>esc(s)).join(' · ')}
      </div>` : ''}
    </div>`);
    let cur = 0;

    /* Renderiza conteúdo por tipo de layout */
    /* Mapa de ícones para icon_grid */
    const gridIcons = {target:ic.target,chart:ic.activity,users:ic.users,shield:ic.shield,globe:ic.globe,bolt:ic.bolt,star:ic.star,building:ic.building,revenue:ic.revenue,trend:ic.trend,brain:ic.brain,handshake:ic.handshake,search:ic.search,doc:ic.doc,check:ic.check,spark:ic.spark};

    function slideBody(s) {
      const layout = s.layout || 'bullets';
      const brandBar = `<div class="s-brand" style="display:flex;align-items:center;gap:9px">${slideLogoHtml||''}<img src="assets/img/brentor-logo.png" alt="Brentor.ai" style="height:${slideLogoHtml?'14':'18'}px;width:auto;filter:brightness(1.18)"></div>`;
      const kickerHtml = s.kicker ? `<div class="s-kicker">${esc(s.kicker)}</div>` : '';
      const footHtml = `<div class="s-foot"><span>${esc(aiTitle)} · ${aiDate}</span><span>${cur+1} / ${slides.length}</span></div>`;

      if (layout === 'cover') {
        const coverImg = s.image ? `<img class="s-cover-logo" src="${esc(s.image)}" alt="" onerror="this.remove()">` : '';
        return `<div class="slide slide-cover" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
          ${brandBar}
          ${coverImg}
          <h1>${esc(s.title)}</h1>
          ${s.subtitle ? `<p style="font-size:16px;color:var(--text-300);margin:12px auto 0;max-width:80%">${esc(s.subtitle)}</p>` : ''}
          ${footHtml}
        </div>`;
      }

      if (layout === 'image_split') {
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-img-split${s.image?'':' no-img'}">
            ${s.image ? `<div class="s-img-box"><img src="${esc(s.image)}" alt="" loading="eager" onerror="var w=this.closest('.s-img-split'); if(w) w.classList.add('no-img');"></div>` : ''}
            <ul class="s-img-bullets">${(s.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul>
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'kpi') {
        const kpis = s.kpis || [];
        const n = Math.min(kpis.length, 4);
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-kpi-grid cols-${n}">
            ${kpis.slice(0, 4).map(k => {
              const kIcon = gridIcons[k.icon] || ic.activity;
              return `<div class="s-kpi-card">
                <div class="s-kpi-icon">${kIcon}</div>
                <div class="s-kpi-val">${esc(k.value)}</div>
                <div class="s-kpi-lbl">${esc(k.label)}</div>
                ${k.detail ? `<div class="s-kpi-detail ${k.trend||'neutral'}">${k.trend==='up'?'▲ ':k.trend==='down'?'▼ ':''}${esc(k.detail)}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'chart_bar') {
        const ch = s.chart || {};
        const items = ch.items || [];
        const max = Math.max(...items.map(i=>i.value||0), 1);
        const chartHtml = B.charts.bars(s.title, items.map((it,idx) => ({
          label: String(it.label||'').slice(0,60), value: it.value||0, max,
          display: String(it.display!=null?it.display:(it.value||'')).slice(0,22),
          fill: ['fill-a','fill-b','fill-c','fill-a'][idx%4]
        })));
        return `<div class="slide">${brandBar}${kickerHtml}
          <div class="s-chart">${chartHtml}</div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'chart_donut') {
        const ch = s.chart || {};
        const segs = ch.segments || [];
        const defaultColors = ['#3b82f6','#22d3ee','#a78bfa','#f59e0b','#34d399'];
        const chartHtml = B.charts.donut(s.title, segs.map((sg,i) => ({
          label: sg.label, value: sg.value||0, color: sg.color || defaultColors[i%defaultColors.length]
        })));
        return `<div class="slide">${brandBar}${kickerHtml}
          <div class="s-chart">${chartHtml}</div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'meter') {
        const meters = s.meters || [];
        const mColors = ['#3b82f6','#22d3ee','#a78bfa','#f59e0b','#34d399'];
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-meter">
            ${meters.map((m,i) => {
              const c = m.color || mColors[i%mColors.length];
              const v = Math.min(100, Math.max(0, m.value||0));
              return `<div class="s-meter-row">
                <div class="s-meter-lbl">${esc(m.label)}</div>
                <div class="s-meter-bar"><div class="s-meter-fill" style="width:${v}%;background:${c}"></div></div>
                <div class="s-meter-val" style="color:${c}">${v}%</div>
              </div>`;
            }).join('')}
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'icon_grid') {
        const items = s.items || [];
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-icon-grid">
            ${items.map(it => {
              const itIcon = gridIcons[it.icon] || ic.bolt;
              return `<div class="s-icon-item">
                ${itIcon}
                <div><div class="s-ii-title">${esc(it.title)}</div><div class="s-ii-desc">${esc(it.desc||'')}</div></div>
              </div>`;
            }).join('')}
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'comparison') {
        const cols = s.columns || [];
        const colColors = ['var(--brand-400)','#8b5cf6','#22d3ee'];
        const colBgs = ['rgba(59,130,246,.05)','rgba(139,92,246,.05)','rgba(34,211,238,.05)'];
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-columns cols-${Math.min(cols.length,3)}">
            ${cols.map((col,ci) => `<div class="s-col" style="border-color:${colColors[ci%3]}22;background:${colBgs[ci%3]}">
              <h4 style="color:${colColors[ci%3]}">${esc(col.heading)}</h4>
              <ul>${(col.items||[]).map(it=>`<li>${esc(it)}</li>`).join('')}</ul>
            </div>`).join('')}
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'quote') {
        return `<div class="slide" style="display:flex;flex-direction:column;justify-content:center">${brandBar}${kickerHtml}
          ${s.title ? `<h2 style="margin-bottom:8px">${esc(s.title)}</h2>` : ''}
          <blockquote>"${esc(s.quote || '')}"</blockquote>
          ${s.attribution ? `<div class="s-attribution">— ${esc(s.attribution)}</div>` : ''}
          ${footHtml}
        </div>`;
      }

      if (layout === 'timeline') {
        const tl = s.timeline || [];
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-tl">
            ${tl.map(t => `<div class="s-tl-item">
              <div class="s-tl-dot"></div>
              <div class="s-tl-period">${esc(t.period)}</div>
              <div class="s-tl-text">${esc(t.event)}</div>
            </div>`).join('')}
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'two_column') {
        const l = s.left || { heading:'', items:[] };
        const r = s.right || { heading:'', items:[] };
        return `<div class="slide">${brandBar}${kickerHtml}
          <h2>${esc(s.title)}</h2>
          <div class="s-columns cols-2">
            <div class="s-col" style="background:rgba(52,211,153,.04);border-color:rgba(52,211,153,.18)">
              <h4 style="color:var(--green)">${ic.check} ${esc(l.heading)}</h4>
              <ul>${(l.items||[]).map(it=>`<li>${esc(it)}</li>`).join('')}</ul>
            </div>
            <div class="s-col" style="background:rgba(239,68,68,.04);border-color:rgba(239,68,68,.18)">
              <h4 style="color:#ef4444">${ic.warn} ${esc(r.heading)}</h4>
              <ul>${(r.items||[]).map(it=>`<li>${esc(it)}</li>`).join('')}</ul>
            </div>
          </div>
          ${footHtml}
        </div>`;
      }

      if (layout === 'big_number') {
        return `<div class="slide" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">${brandBar}${kickerHtml}
          ${s.title ? `<h2 style="margin-bottom:4px">${esc(s.title)}</h2>` : ''}
          <div class="s-big-num">${esc(s.number || '')}</div>
          ${s.caption ? `<p class="s-big-caption">${esc(s.caption)}</p>` : ''}
          ${footHtml}
        </div>`;
      }

      if (layout === 'closing') {
        const bullets = s.bullets || [];
        return `<div class="slide" style="display:flex;flex-direction:column;justify-content:center">${brandBar}${kickerHtml}
          <h2 style="margin-bottom:16px">${esc(s.title)}</h2>
          ${bullets.length ? `<ul style="font-size:15px;margin-bottom:14px">${bullets.map(b => `<li style="margin-bottom:8px">${ic.checkSmall} ${esc(b)}</li>`).join('')}</ul>` : ''}
          ${s.closing_message ? `<div class="s-closing-msg">${ic.spark} ${esc(s.closing_message)}</div>` : ''}
          ${footHtml}
        </div>`;
      }

      /* Fallback: layout bullets (padrão) */
      const bullets = s.bullets || [];
      return `<div class="slide">${brandBar}${kickerHtml}
        <h2>${esc(s.title)}</h2>
        ${s.subtitle ? `<p class="muted" style="margin-bottom:10px;font-size:15px">${esc(s.subtitle)}</p>` : ''}
        ${bullets.length ? `<ul>${bullets.map(b => `<li>${ic.checkSmall} ${esc(b)}</li>`).join('')}</ul>` : ''}
        ${footHtml}
      </div>`;
    }

    /* Reduz --fit (fonte/espaçamento) só o suficiente para o conteúdo caber no slide 16:9 —
       preserva o texto grande (bom para projeção) e só encolhe quando o material for extenso,
       evitando cortes de conteúdo por overflow. */
    function fitSlideContent(slideEl) {
      if (!slideEl) return;
      let fit = 1;
      slideEl.style.setProperty('--fit', fit);
      while (slideEl.scrollHeight > slideEl.clientHeight + 1 && fit > 0.5) {
        fit = +(fit - 0.05).toFixed(2);
        slideEl.style.setProperty('--fit', fit);
      }
    }
    function renderSlide() {
      const s = slides[cur];
      wrap.querySelector('#slideMount').innerHTML = slideBody(s);
      const slideEl = wrap.querySelector('#slideMount .slide');
      fitSlideContent(slideEl);
      // imagens carregam de forma assíncrona — re-checa o ajuste quando terminam,
      // pois é só aí que a altura real delas afeta o layout (o CSS já limita a altura
      // máxima da imagem, isso é só uma segunda camada de segurança pro texto ao redor).
      slideEl.querySelectorAll('img').forEach(img => {
        if (img.complete) return;
        img.addEventListener('load', () => fitSlideContent(slideEl), { once: true });
        img.addEventListener('error', () => fitSlideContent(slideEl), { once: true });
      });
      wrap.querySelectorAll('.dots i').forEach((d,i)=>d.classList.toggle('on', i===cur));
      wrap.querySelectorAll('.thumb').forEach((t,i)=>t.classList.toggle('on', i===cur));
    }
    const dots = wrap.querySelector('.dots'); const thumbs = wrap.querySelector('.thumbs');
    const layoutIcons = {cover:'🎯',kpi:'📊',chart_bar:'📊',chart_donut:'🍩',meter:'📈',icon_grid:'🔲',image_split:'🖼️',comparison:'⚖️',quote:'💬',timeline:'📅',two_column:'↔️',big_number:'🔢',closing:'🏁'};
    function rebuildNav() {
      dots.innerHTML = ''; thumbs.innerHTML = '';
      slides.forEach((s,i)=>{
        dots.appendChild(el(`<i data-i="${i}"></i>`));
        const th = el(`<div class="thumb" data-i="${i}">
          <button class="thumb-del" data-del="${i}" title="Excluir slide">${ic.x}</button>
          <span style="opacity:.6">${layoutIcons[s.layout]||'📝'} ${esc(s.kicker||'')}</span><b>${esc(s.title||'')}</b></div>`);
        thumbs.appendChild(th);
      });
      wrap.querySelectorAll('.dots i, .thumb').forEach(d=>d.onclick=(e)=>{ if(e.target.closest('[data-del]')) return; cur=+d.dataset.i; renderSlide(); });
      wrap.querySelectorAll('[data-del]').forEach(btn => btn.onclick = (e) => {
        e.stopPropagation();
        if (slides.length <= 1) { B.toast('A apresentação precisa de pelo menos 1 slide','warn'); return; }
        const idx = +btn.dataset.del;
        slides.splice(idx, 1);
        if (cur >= slides.length) cur = slides.length - 1;
        else if (idx < cur) cur -= 1;
        rebuildNav();
        renderSlide();
        B.toast('Slide removido','info');
      });
    }
    rebuildNav();
    wrap.querySelector('[data-prev]').onclick=()=>{cur=(cur-1+slides.length)%slides.length; renderSlide();};
    wrap.querySelector('[data-next]').onclick=()=>{cur=(cur+1)%slides.length; renderSlide();};
    /* Navegação por teclado (útil em tela cheia): ← → e Esc nativo */
    document.addEventListener('keydown', function nav(e){
      if (!document.body.contains(wrap)) { document.removeEventListener('keydown', nav); return; }
      if (e.key==='ArrowRight') { cur=(cur+1)%slides.length; renderSlide(); }
      else if (e.key==='ArrowLeft') { cur=(cur-1+slides.length)%slides.length; renderSlide(); }
    });
    /* rAF: no primeiro render o `wrap` ainda não foi inserido no DOM pelo chamador —
       medir overflow antes disso sempre dá 0/0. Espera o próximo frame (já anexado). */
    requestAnimationFrame(renderSlide);

    /* Exportação — expostas para o toolbar externo (renderDisplayResult) usar. */
    wrap._exportSlidesPDF = () => {
      const savedCur = cur;
      const htmls = slides.map((s, i) => { cur = i; return slideBody(s); });
      cur = savedCur;
      B.exportSlidesPDF(htmls, aiTitle);
    };
    wrap._exportSlidesPPTX = () => B.exportSlidesPPTX(slides, aiTitle);
    return wrap;
  }

  /* ── DASHBOARD ────────────────────────────────────────────── */
  function buildDashboardView(p, ai) {
    const dashLogoHtml = B.companyLogoHtml('sm');
    const kpis = ai.kpis || [];
    const cats = ai.categories || [];
    const dist = ai.distribution || [];
    const trend = ai.trend_data;
    const insights = ai.insights || [];
    const highlights = ai.highlights || [];
    const risks = ai.risks || [];
    const opportunities = ai.opportunities || [];

    const kpiHtml = kpis.length
      ? kpis.map(k => kpi(String(k.label||'').slice(0,38), String(k.value||'—').slice(0,18), String(k.detail||'').slice(0,70), k.trend==='up'?'k-up':(k.trend==='down'?'k-down':''))).join('')
      : kpi('Sem dados', '—', 'gere com conteúdo', '');

    const wrap = el(`<div class="card pad-lg fade-up">
      <div class="report-head"><div class="report-logo" style="background:linear-gradient(150deg,#7c3aed,#a78bfa)">${ic.grid}</div>
        <div><h2>${esc(ai.title || p.topic || 'Dashboard')}</h2>
          ${ai.subtitle ? `<div class="muted" style="font-size:13px">${esc(ai.subtitle)}</div>` : ''}
          <div class="meta"><span>${ic.activity} Dashboard executivo</span><span>${ic.clock} ${B.fmtDate(p.date)}</span></div></div>
        ${dashLogoHtml ? `<div style="margin-left:auto">${dashLogoHtml}</div>` : ''}
      </div>

      ${ai.summary ? `<div style="margin-top:16px;padding:14px 18px;background:rgba(59,130,246,.04);border:1px solid rgba(59,130,246,.12);border-radius:12px;font-size:14px;line-height:1.6;color:var(--text-200)">
        ${esc(ai.summary)}
      </div>` : ''}

      <div class="kpi-grid" style="margin-top:18px">${kpiHtml}</div>

      ${highlights.length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        ${highlights.map(h => {
          const colors = {positive:'52,211,153',negative:'239,68,68',neutral:'148,163,184'};
          const c = colors[h.type]||colors.neutral;
          const icon = h.type==='positive'?ic.check:h.type==='negative'?ic.warn:ic.info;
          return `<div style="flex:1;min-width:200px;padding:12px 14px;background:rgba(${c},.06);border:1px solid rgba(${c},.18);border-radius:10px;font-size:13px;display:flex;align-items:start;gap:8px">
            <span style="color:rgb(${c});flex-shrink:0">${icon}</span><span>${esc(h.text)}</span>
          </div>`;
        }).join('')}
      </div>` : ''}

      ${(trend || dist.length) ? `<div class="grid cols-2" style="margin-top:18px">
        ${trend && trend.values ? B.charts.line(trend.label || 'Evolução', trend.values) : ''}
        ${dist.length ? B.charts.donut('Distribuição', dist.map(d=>({label:d.label, value:d.value, color:d.color||'#3b82f6'}))) : ''}
      </div>` : ''}

      ${cats.length ? `<div class="grid cols-${Math.min(cats.length, 2)}" style="margin-top:18px">
        ${cats.map(cat => {
          const max = Math.max(...cat.items.map(i=>i.value||0), 1);
          return B.charts.bars(cat.name, cat.items.map((it,idx) => ({
            label: String(it.label||'').slice(0,40), value: it.value||0, max,
            display: String(it.display!=null?it.display:(it.value||'')).slice(0,22),
            fill: ['fill-a','fill-b','fill-c','fill-a'][idx%4]
          })));
        }).join('')}
      </div>` : ''}

      ${insights.length ? `<div class="report-section" style="margin-top:18px">
        <h3><span class="ico">${ic.spark}</span> Insights Estratégicos</h3>
        <div style="display:grid;gap:10px">${insights.map((ins,i) => `<div style="padding:12px 16px;background:rgba(139,92,246,.05);border-left:3px solid #8b5cf6;border-radius:0 10px 10px 0;font-size:13.5px">
          <b style="color:#8b5cf6">${i+1}.</b> ${esc(ins)}
        </div>`).join('')}</div>
      </div>` : ''}

      ${(risks.length || opportunities.length) ? `<div class="grid cols-2" style="margin-top:18px">
        ${opportunities.length ? `<div style="padding:16px;background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.15);border-radius:12px">
          <h4 style="margin:0 0 10px;color:var(--green)">${ic.check} Oportunidades</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px">${opportunities.map(o=>`<li style="margin-bottom:6px">${esc(o)}</li>`).join('')}</ul>
        </div>` : ''}
        ${risks.length ? `<div style="padding:16px;background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.15);border-radius:12px">
          <h4 style="margin:0 0 10px;color:#ef4444">${ic.warn} Riscos</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px">${risks.map(r=>`<li style="margin-bottom:6px">${esc(r)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>` : ''}

      ${ai.sources && ai.sources.length ? `<div style="margin-top:16px;font-size:11px;color:var(--text-400)">
        <b>Fontes:</b> ${ai.sources.map(s=>esc(s)).join(' · ')}
      </div>` : ''}
    </div>`);
    return wrap;
  }

  /* ── ONE-PAGER ────────────────────────────────────────────── */
  function buildOnePagerView(p, ai) {
    const logoHtml = B.companyLogoHtml('sm');
    const sections = ai.sections || [];
    const opKpis = ai.kpis || [];
    const secIcons = {target:ic.target,chart:ic.activity,users:ic.users,shield:ic.shield,globe:ic.globe,bolt:ic.bolt};

    const wrap = el(`<div class="card pad-lg fade-up">
      <div class="report-head"><div class="report-logo" style="background:linear-gradient(150deg,#059669,#34d399)">${ic.doc}</div>
        <div style="min-width:0"><h2>${esc(ai.title || p.topic || 'One-pager')}</h2>
          ${ai.subtitle ? `<div class="muted" style="font-size:13px">${esc(ai.subtitle)}</div>` : ''}
          <div class="meta"><span>${ic.doc} One-pager executivo</span><span>${ic.clock} ${B.fmtDate(p.date)}</span></div></div>
        ${logoHtml ? `<div style="margin-left:auto">${logoHtml}</div>` : ''}
      </div>

      ${ai.hero_image ? `<div class="hero-img" style="background-image:url('${esc(ai.hero_image)}')"></div>` : ''}

      ${ai.headline ? `<div style="margin-top:18px;padding:16px 20px;background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.08));border:1px solid rgba(59,130,246,.2);border-radius:14px;text-align:center">
        <div style="font-size:17px;font-weight:700;color:var(--brand-300)">${ic.spark} ${esc(ai.headline)}</div>
      </div>` : ''}

      ${opKpis.length ? `<div class="kpi-grid" style="margin-top:18px">
        ${opKpis.map(k => kpi(k.label, k.value, k.detail||'', 'k-up')).join('')}
      </div>` : ''}

      ${sections.map(sec => {
        const secIcon = secIcons[sec.icon] || ic.target;
        return `<div class="report-section">
          <h3><span class="ico">${secIcon}</span> ${esc(sec.title)}</h3>
          <div class="prose">${(sec.content||'').split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
          ${sec.highlights && sec.highlights.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
            ${sec.highlights.map(h=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.18);border-radius:8px;font-size:12.5px;color:var(--brand-300)">${ic.checkSmall} ${esc(h)}</span>`).join('')}
          </div>` : ''}
        </div>`;
      }).join('')}

      ${ai.callout ? `<div style="margin-top:16px;padding:14px 18px;border-radius:12px;display:flex;gap:10px;align-items:start;${
        ai.callout.type==='warning'?'background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.18)':
        ai.callout.type==='success'?'background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.18)':
        'background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.18)'}">
        <span style="flex-shrink:0;margin-top:2px">${ai.callout.type==='warning'?ic.warn:ai.callout.type==='success'?ic.check:ic.info}</span>
        <div><b style="font-size:13px">${esc(ai.callout.title||'')}</b><div style="font-size:13px;margin-top:4px">${esc(ai.callout.text||'')}</div></div>
      </div>` : ''}

      ${ai.conclusion ? `<div style="margin-top:16px;padding:16px 20px;background:var(--green-soft);border:1px solid rgba(52,211,153,.2);border-radius:12px">
        <b style="display:flex;align-items:center;gap:6px;margin-bottom:6px">${ic.check} Conclusão</b>
        <div style="font-size:14px;line-height:1.6">${esc(ai.conclusion)}</div>
      </div>` : ''}

      ${ai.sources && ai.sources.length ? `<div style="margin-top:14px;font-size:11px;color:var(--text-400)">
        <b>Fontes:</b> ${ai.sources.map(s=>esc(s)).join(' · ')}
      </div>` : ''}
    </div>`);
    return wrap;
  }

  /* ── RELATÓRIO EXECUTIVO ──────────────────────────────────── */
  function buildExecReport(p, ai) {
    const sections = ai.sections || [];
    const logoHtml = B.companyLogoHtml('sm');
    const secIcons = {target:ic.target,chart:ic.activity,users:ic.users,shield:ic.shield,globe:ic.globe,bolt:ic.bolt,report:ic.report};
    const kpis = ai.kpis || [];
    const keyFindings = ai.key_findings || [];
    const risks = ai.risks || [];
    const recs = ai.recommendations || [];

    const wrap = el(`<div class="card pad-lg fade-up">
      <div class="report-head"><div class="report-logo">${ic.report}</div>
        <div style="min-width:0"><h2>${esc(ai.title || p.topic || 'Relatório executivo')}</h2>
          ${ai.subtitle ? `<div class="muted" style="font-size:13px">${esc(ai.subtitle)}</div>` : ''}
          <div class="meta"><span>${ic.doc} Relatório executivo</span><span>${ic.clock} ${B.fmtDate(p.date)}</span></div></div>
        ${logoHtml ? `<div style="margin-left:auto">${logoHtml}</div>` : ''}
      </div>

      ${ai.hero_image ? `<div class="hero-img" style="background-image:url('${esc(ai.hero_image)}')"></div>` : ''}

      ${ai.executive_summary ? `<div class="report-section">
        <h3><span class="ico">${ic.report}</span> Resumo Executivo</h3>
        <div class="prose">${ai.executive_summary.split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
      </div>` : ''}

      ${kpis.length ? `<div class="kpi-grid" style="margin-top:14px">
        ${kpis.map(k => kpi(k.label, k.value, k.detail||'', k.trend==='up'?'k-up':(k.trend==='down'?'k-down':''))).join('')}
      </div>` : ''}

      ${sections.map(sec => {
        const secIcon = secIcons[sec.icon] || ic.target;
        const subsections = sec.subsections || [];
        return `<div class="report-section">
          <h3><span class="ico">${secIcon}</span> ${esc(sec.title)}</h3>
          <div class="prose">${(sec.content||'').split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
          ${subsections.length ? subsections.map(sub => `<div style="margin:12px 0 8px 16px;padding-left:14px;border-left:2px solid rgba(59,130,246,.2)">
            <h4 style="margin:0 0 6px;font-size:14px;color:var(--brand-300)">${esc(sub.title)}</h4>
            <div class="prose" style="font-size:13.5px">${(sub.content||'').split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
          </div>`).join('') : ''}
          ${sec.highlights && sec.highlights.length ? `<div style="margin-top:10px;padding:12px 16px;background:rgba(59,130,246,.04);border-radius:10px;border:1px solid rgba(59,130,246,.12)">
            <b style="font-size:12px;color:var(--brand-300)">Pontos-chave:</b>
            <ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px">${sec.highlights.map(h=>`<li style="margin-bottom:4px">${esc(h)}</li>`).join('')}</ul>
          </div>` : ''}
        </div>`;
      }).join('')}

      ${keyFindings.length ? `<div class="report-section">
        <h3><span class="ico">${ic.search}</span> Principais Achados</h3>
        <div style="display:grid;gap:10px">${keyFindings.map((f,i) => {
          const item = typeof f === 'string' ? {finding:f} : f;
          const impactColors = {alto:'239,68,68',médio:'234,179,8',baixo:'52,211,153'};
          const c = impactColors[item.impact]||'148,163,184';
          return `<div style="padding:12px 16px;background:rgba(${c},.05);border-left:3px solid rgb(${c});border-radius:0 10px 10px 0;font-size:13.5px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b style="color:var(--text-100)">${i+1}. ${esc(item.finding)}</b>
              ${item.impact ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(${c},.12);color:rgb(${c})">${esc(item.impact)}</span>` : ''}
            </div>
            ${item.detail ? `<div style="margin-top:4px;color:var(--text-300);font-size:13px">${esc(item.detail)}</div>` : ''}
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      ${risks.length ? `<div class="report-section">
        <h3><span class="ico">${ic.warn}</span> Riscos Identificados</h3>
        <div style="display:grid;gap:10px">${risks.map(r => {
          const item = typeof r === 'string' ? {risk:r} : r;
          const sevColors = {alto:'239,68,68',médio:'234,179,8',baixo:'52,211,153'};
          const c = sevColors[item.severity]||'234,179,8';
          return `<div style="padding:14px 16px;background:rgba(${c},.04);border:1px solid rgba(${c},.15);border-radius:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <b style="font-size:13.5px">${esc(item.risk)}</b>
              ${item.severity ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(${c},.12);color:rgb(${c})">${esc(item.severity)}</span>` : ''}
            </div>
            ${item.mitigation ? `<div style="font-size:12.5px;color:var(--text-300)">${ic.checkSmall} <b>Mitigação:</b> ${esc(item.mitigation)}</div>` : ''}
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      ${recs.length ? `<div class="report-section">
        <h3><span class="ico">${ic.spark}</span> Recomendações</h3>
        <div style="display:grid;gap:10px">${recs.map((r,i) => {
          const item = typeof r === 'string' ? {title:r} : r;
          const prioColors = {alta:'59,130,246',média:'139,92,246',baixa:'148,163,184'};
          const c = prioColors[item.priority]||'59,130,246';
          return `<div style="padding:14px 16px;border-left:3px solid rgb(${c});background:rgba(${c},.04);border-radius:0 10px 10px 0">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b style="font-size:13.5px;color:var(--text-100)">${i+1}. ${esc(item.title)}</b>
              ${item.priority ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(${c},.12);color:rgb(${c})">${esc(item.priority)}</span>` : ''}
            </div>
            ${item.description ? `<div style="margin-top:6px;font-size:13px;color:var(--text-300)">${esc(item.description)}</div>` : ''}
          </div>`;
        }).join('')}</div>
      </div>` : ''}

      ${ai.conclusion ? `<div style="margin-top:16px;padding:16px 20px;background:var(--green-soft);border:1px solid rgba(52,211,153,.2);border-radius:12px">
        <b style="display:flex;align-items:center;gap:6px;margin-bottom:6px">${ic.check} Conclusão</b>
        <div style="font-size:14px;line-height:1.6">${esc(ai.conclusion)}</div>
      </div>` : ''}

      ${ai.sources && ai.sources.length ? `<div style="margin-top:14px;font-size:11px;color:var(--text-400)">
        <b>Fontes:</b> ${ai.sources.map(s=>esc(s)).join(' · ')}
      </div>` : ''}
    </div>`);
    return wrap;
  }

  // continua em views.js → chat/account/admin definidos abaixo
  B._viewsCore = true;
})(window.Brentor);
