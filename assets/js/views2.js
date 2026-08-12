/* ============================================================
   Brentor.ai — views2.js  (Chat, Conta, Admin)
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon, el = B.el, esc = B.esc, store = B.store;

  /* Zona de anexos (mesma do Focus) */
  function makeFileZone(id) {
    const uid = id || B.uid();
    const files = [];
    let updateCb = null;
    const html = `
      <div class="field">
        <label>Anexar arquivos <span class="muted" style="font-weight:400;font-size:12px">(relatórios, dados, e-mails que ajudem na decisão)</span></label>
        <div class="file-zone" id="fz-${uid}">
          <input type="file" id="fi-${uid}" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.png,.jpg">
          <div class="fz-ic">${ic.upload}</div>
          <b>Clique para selecionar ou arraste aqui</b>
          <span>Documentos, relatórios, planilhas ou imagens</span>
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
    return { html, init, getFiles:()=>files, onUpdate:(fn)=>{updateCb=fn;} };
  }

  /* Aviso de créditos insuficientes → leva para comprar. */
  B.creditWall = function () {
    B.modal({
      title: 'Créditos insuficientes',
      body: `<p>Você não tem créditos suficientes para esta ação. Faça upgrade de plano ou compre um pacote de créditos extras para continuar usando o Brentor.</p>`,
      actions: [
        { label:'Comprar créditos', class:'primary', icon:'coin', onClick: () => { B.router.go('account'); } },
        { label:'Agora não', class:'ghost' },
      ],
    });
  };

  /* ============================================================
     MY NEWS — jornal digital personalizado
     ============================================================ */
  B.views.mynews = function (mount, params) {
    const plan = store.get().plan;
    const isV2 = plan === 'diamond';
    const ver = isV2 ? '2.0' : '1.0';
    const actionKey = isV2 ? 'mynewsv2' : 'mynewsv1';
    const userName = store.get().user?.name || 'Assinante';

    // Reabrir do histórico → mostra a edição salva
    if (params && params.reopen && params.reopen.payload && params.reopen.payload.aiResult) {
      mount.innerHTML = `<div id="mnBody"></div>`;
      renderNewspaper(mount.querySelector('#mnBody'), params.reopen.payload);
      return;
    }

    const prefs = store.getMyNews();
    const selected = new Set(prefs.topics || []);
    const customTopics = (prefs.custom || []).slice();
    let scope = isV2 ? (prefs.scope || 'br') : 'br';

    mount.innerHTML = `
      <div class="mn-header fade-up">
        <div class="mn-badge ${isV2?'v2':'v1'}">${ic.news} My News ${ver} · ${B.plans[plan].name}</div>
        <h1 style="font-size:26px;letter-spacing:-.5px;display:flex;align-items:center;gap:12px">${ic.news} My News ${ver}</h1>
        <p>${isV2
          ? 'Seu jornal digital personalizado com IA avançada. Escolha seus temas de interesse e receba as principais notícias do dia — do Brasil e do mundo — com chamada, foto e resumo.'
          : 'Seu jornal digital personalizado. Escolha seus temas de interesse e receba as principais notícias do dia no Brasil — com chamada, foto e resumo.'}</p>
      </div>

      <div id="mnBody">
      <div class="card pad-lg fade-up" style="margin-top:18px">
        <div class="form-grid">
          <div class="field">
            <label>Seus temas de interesse <span class="muted" style="font-weight:400;font-size:12px">(selecione um ou mais)</span></label>
            <div class="mn-topics" id="mnTopics">
              ${B.newsTopics.map(t=>`<button class="mn-topic ${selected.has(t.id)?'on':''}" data-topic="${t.id}" data-label="${esc(t.label)}">
                <span class="mt-ic">${ic[t.icon]||ic.news}</span>${esc(t.label)}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>Outro tema específico <span class="muted" style="font-weight:400;font-size:12px">(opcional — ex.: setor, cidade, time, assunto de nicho)</span></label>
            <div style="display:flex;gap:9px">
              <input class="input" id="mnCustom" placeholder="Ex.: mercado imobiliário em Curitiba" style="flex:1">
              <button class="btn ghost sm" id="mnCustomAdd" type="button">${ic.plus} Adicionar</button>
            </div>
            <div id="mnCustomList" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"></div>
          </div>
          ${isV2 ? `
          <div class="field">
            <label>Abrangência das notícias</label>
            <div class="seg" id="mnScope">
              <button class="${scope==='br'?'on':''}" data-scope="br">🇧🇷 Brasil (português)</button>
              <button class="${scope==='intl'?'on':''}" data-scope="intl">🌎 Internacionais (inglês)</button>
              <button class="${scope==='both'?'on':''}" data-scope="both">🌐 Brasil + Mundo</button>
            </div>
            <div class="hint" style="margin-top:6px">${ic.globe} Exclusivo do My News 2.0 (Diamond): combine notícias nacionais e internacionais na mesma edição.</div>
          </div>` : `
          <div class="field">
            <div class="hint">${ic.info} No My News 1.0, a edição traz as principais notícias do <b>Brasil em português</b>. Para incluir notícias internacionais, faça upgrade para o plano Diamond (My News 2.0).</div>
          </div>`}
          ${B.costRow(actionKey)}
          <button class="btn primary lg" id="mnRun" style="background:linear-gradient(160deg,${isV2?'#0e7490,#22d3ee':'var(--brand-600),var(--brand-400)'})">${ic.news} Acessar as principais notícias de hoje</button>
        </div>
      </div>
      </div>`;

    // chips de temas
    mount.querySelectorAll('.mn-topic').forEach(b => b.onclick = () => {
      const id = b.dataset.topic;
      if (selected.has(id)) { selected.delete(id); b.classList.remove('on'); }
      else { selected.add(id); b.classList.add('on'); }
    });

    // temas customizados
    const customList = mount.querySelector('#mnCustomList');
    const customInput = mount.querySelector('#mnCustom');
    function renderCustom() {
      customList.innerHTML = '';
      customTopics.forEach(t => {
        const chip = el(`<span class="mn-custom-chip">${ic.news} ${esc(t)} <button class="rm" title="Remover">${ic.x}</button></span>`);
        chip.querySelector('.rm').onclick = () => { const i=customTopics.indexOf(t); if(i>=0) customTopics.splice(i,1); renderCustom(); };
        customList.appendChild(chip);
      });
    }
    function addCustom() {
      const v = (customInput.value||'').trim();
      if (!v) return;
      if (customTopics.length >= 6) { B.toast('Máximo de 6 temas personalizados','warn'); return; }
      if (customTopics.some(t=>t.toLowerCase()===v.toLowerCase())) { B.toast('Esse tema já foi adicionado','info'); return; }
      customTopics.push(v); customInput.value=''; renderCustom();
    }
    mount.querySelector('#mnCustomAdd').onclick = addCustom;
    customInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addCustom(); } });
    renderCustom();

    // abrangência (v2)
    if (isV2) {
      mount.querySelectorAll('#mnScope button').forEach(b => b.onclick = () => {
        mount.querySelectorAll('#mnScope button').forEach(x=>x.classList.remove('on'));
        b.classList.add('on'); scope = b.dataset.scope;
      });
    }

    const runBtn = mount.querySelector('#mnRun');
    const runBtnHtml = runBtn.innerHTML;
    const lockRun = () => { runBtn.disabled = true; runBtn.style.opacity = '.65'; runBtn.style.cursor = 'wait'; runBtn.innerHTML = `${ic.refresh} Buscando suas notícias…`; };
    const unlockRun = () => { runBtn.disabled = false; runBtn.style.opacity = ''; runBtn.style.cursor = ''; runBtn.innerHTML = runBtnHtml; };

    runBtn.onclick = () => {
      if (runBtn.disabled) return;
      const topicLabels = [...selected].map(id => B.newsTopics.find(t=>t.id===id)?.label || id);
      const allTopics = [...topicLabels, ...customTopics];
      if (!allTopics.length) { B.toast('Selecione ou adicione ao menos um tema de interesse','warn'); return; }
      // salva preferências para a próxima vez
      store.setMyNews({ topics: [...selected], custom: customTopics.slice(), scope });
      if (!B.aiReady()) return;
      if (!store.spend(actionKey)) { B.creditWall(); return; }
      lockRun();   // bloqueia o botão durante todo o processo (evita reinício acidental)

      const steps = (isV2 ? B.statusSteps_mn2 : B.statusSteps_mn1).slice();
      const mnBody = mount.querySelector('#mnBody');
      const apiPromise = B.aiMode.active
        ? B.api.mynews(allTopics, scope, ver, userName)
        : Promise.resolve(null);

      B.runStatus(mnBody, steps, { title:'My News '+ver+' — montando sua edição', speed: isV2?0.8:1.0, waitFor: apiPromise, onDone: async () => {
        const payload = { topics: allTopics, scope, ver, plan, userName, date: B.now().toISOString(), aiGenerated: B.aiMode.active };
        try {
          if (B.aiMode.active) {
            const apiResult = await apiPromise;
            payload.aiResult = apiResult.result;
          }
        } catch (e) { store.refund(actionKey); B.toast('Erro ao buscar notícias: '+e.message+' — créditos reembolsados','warn'); }
        if (B.aiMode.active && (!payload.aiResult || !(payload.aiResult.articles||[]).length)) {
          store.refund(actionKey);
          unlockRun();
          mnBody.innerHTML = '';
          mnBody.appendChild(el(`<div class="card pad-lg fade-up" style="text-align:center">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px">${ic.warn} Não foi possível montar sua edição agora</div>
            <p class="muted" style="font-size:13px;margin:0 0 14px">A busca de notícias falhou ou não retornou matérias relevantes para os temas escolhidos. Seus créditos foram reembolsados. Tente novamente em instantes ou ajuste os temas.</p>
            <button class="btn primary" data-retry>${ic.refresh} Tentar novamente</button>
          </div>`));
          mnBody.querySelector('[data-retry]').onclick = () => B.router.go('mynews');
          return;
        }
        unlockRun();
        store.addHistory({ type:'mynews', title:'My News '+ver+' · '+allTopics.slice(0,3).join(', ')+(allTopics.length>3?'…':''),
          subtitle: (scope==='br'?'Brasil':scope==='intl'?'Internacional':'Brasil + Mundo'), payload });
        renderNewspaper(mnBody, payload);
        B.toast('Sua edição do My News está pronta','success');
      }});
    };

    if (!B.aiMode.active) {
      // sem servidor: aviso amistoso (a busca de notícias exige a IA + web)
      mount.querySelector('#mnBody').innerHTML = `<div class="card pad-lg fade-up" style="margin-top:16px;display:flex;align-items:center;gap:12px">
        <span style="color:var(--amber);font-size:20px">${ic.warn}</span>
        <div><b style="font-size:13px">O My News precisa do servidor Brentor ativo</b>
        <div class="muted" style="font-size:12px;margin-top:2px">Inicie o servidor (Iniciar-Brentor.bat) e recarregue a página para buscar as notícias reais dos seus temas.</div></div></div>`;
    }
  };

  /* ── My News — render do jornal digital ─────────────────────
     POLÍTICA DE IMAGENS: usa SOMENTE a imagem real da própria matéria (og:image).
     Quando a matéria não tem imagem (ou ela falha ao carregar), mostramos um
     espaço limpo com o ícone e o nome do tema — NUNCA uma foto genérica/aleatória,
     para não exibir imagens fora de contexto com a notícia. */

  function renderNewspaper(body, p) {
    const ai = p.aiResult || {};
    let articles = (ai.articles || []).filter(a => a && a.url);
    const userName = p.userName || store.get().user?.name || 'Assinante';
    const editionDate = new Date(p.date).toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const editionTime = new Date(p.date).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
    const mnLogoHtml = B.companyLogoHtml('report');
    const isDiamond = (p.plan || store.get().plan) === 'diamond';
    const topicIcon = (label) => {
      const t = B.newsTopics.find(x => x.label.toLowerCase() === (label||'').toLowerCase() || x.id === (label||'').toLowerCase());
      return ic[t?.icon] || ic.news;
    };

    // Somente a imagem real da matéria. Sem imagem → placeholder limpo (ícone + tema).
    const placeholder = (a) => `<span class="mn-img-fallback">${topicIcon(a.topic)}<span class="mn-img-ph-label">${esc(a.topic||'Notícia')}</span></span>`;
    const imgBlock = (a, big) => a.image
      ? `<div class="mn-art-img ${big?'big':''}"><img src="${esc(a.image)}" alt="" loading="lazy" onerror="this.closest('.mn-art-img').classList.add('failed')">${placeholder(a)}</div>`
      : `<div class="mn-art-img ${big?'big':''} failed">${placeholder(a)}</div>`;

    const card = (a, big) => `<button class="mn-article ${big?'feat':''}" data-url="${esc(a.url)}">
        ${imgBlock(a, big)}
        <div class="mn-art-body">
          <div class="mn-art-meta"><span class="mn-topic-tag">${topicIcon(a.topic)} ${esc(a.topic||'Geral')}</span>
            ${a.lang==='en'?'<span class="mn-lang">EN</span>':''}
            <span class="mn-source">${esc(a.source||'')}</span></div>
          <h3 class="mn-headline">${esc(a.headline||a.title||'')}</h3>
          <p class="mn-summary">${esc(a.summary||'')}</p>
          <span class="mn-read">${ic.eye} Ler matéria ${ic.arrow}</span>
        </div>
      </button>`;

    const wrap = el(`<div class="mn-paper fade-up" id="mnPaper">
      <div class="mn-masthead">
        <div class="mn-mast-top">
          <span class="mn-mast-edition">Edição de ${esc(editionDate)} · gerada às ${esc(editionTime)}</span>
          ${mnLogoHtml ? `<div class="mn-mast-logo">${mnLogoHtml}</div>` : `<span class="mn-mast-brand">${ic.news} My News</span>`}
        </div>
        <h1 class="mn-mast-title">${esc(userName)} <span>News</span></h1>
        <div class="mn-mast-sub">${esc(ai.edition_title || 'As principais notícias de hoje, selecionadas para você')}</div>
        ${ai.lead ? `<div class="mn-mast-lead">${esc(ai.lead)}</div>` : ''}
      </div>

      <div class="mn-featured" id="mnFeatured"></div>
      <div class="mn-grid" id="mnGrid"></div>
      <div id="mnLoadMore"></div>

      <div class="credibility" style="margin-top:18px">${ic.info}
        <div>Notícias reais e recentes coletadas de fontes públicas da web e organizadas pela IA conforme seus temas de interesse. Clique em qualquer matéria para ler na íntegra e gerar um resumo com o Focus.</div></div>
    </div>`);

    const featBox = wrap.querySelector('#mnFeatured');
    const gridBox = wrap.querySelector('#mnGrid');
    const loadBox = wrap.querySelector('#mnLoadMore');

    // Monta a edição sempre preenchendo as linhas (sem espaços vazios):
    // destaque com exatamente 2 (ou nenhum) e a grade em múltiplos de 3.
    function layout() {
      let feats = articles.filter(a => a.featured).slice(0, 2);
      if (feats.length === 1) feats = [];
      let rest = articles.filter(a => !feats.includes(a));
      const rem = rest.length % 3;
      if (rem !== 0) rest = rest.slice(0, rest.length - rem);
      featBox.style.display = feats.length ? '' : 'none';
      featBox.innerHTML = feats.map(a => card(a, true)).join('');
      gridBox.innerHTML = rest.map(a => card(a, false)).join('');
      wrap.querySelectorAll('.mn-article').forEach(btn => btn.onclick = () => {
        const art = articles.find(a => a.url === btn.dataset.url);
        if (art) openArticle(art);
      });
    }

    // Carregar mais (Gold e Diamond) — custo conforme a versão (1.0 ou 2.0).
    {
      const loadKey = p.ver === '2.0' ? 'mynewsv2' : 'mynewsv1';
      const cost = (B.creditCost[loadKey] && B.creditCost[loadKey].total) || (p.ver === '2.0' ? 55 : 30);
      const grad = p.ver === '2.0' ? '#0e7490,#22d3ee' : 'var(--brand-600),var(--brand-400)';
      loadBox.innerHTML = `<div style="text-align:center;margin-top:24px">
        <button class="btn primary lg" id="mnMore" style="background:linear-gradient(160deg,${grad})">${ic.plus} Carregar mais notícias <span style="opacity:.9;font-weight:600;font-size:12.5px;margin-left:8px;display:inline-flex;align-items:center;gap:4px">${ic.coin} ${cost} créditos</span></button>
        <div class="muted" style="font-size:12px;margin-top:8px">Busca novas matérias atuais dos seus temas, sem repetir as já exibidas.</div>
      </div>`;
      loadBox.querySelector('#mnMore').onclick = function loadMore() {
        const btn = loadBox.querySelector('#mnMore');
        const note = loadBox.querySelector('.muted');
        if (!B.aiReady()) return;
        if (!store.spend(loadKey)) { B.creditWall(); return; }
        const exclude = articles.map(a => a.url);
        const orig = btn.innerHTML; btn.disabled = true;
        // informativo rotativo para manter o cliente ciente do processo
        const msgs = ['Pesquisando novas matérias…', 'Lendo as fontes de notícias…', 'Organizando as matérias…', 'Selecionando as melhores fotos…', 'Quase lá, aguarde…'];
        let mi = 0;
        const setMsg = () => { btn.innerHTML = `${ic.refresh} ${msgs[mi]}`; };
        setMsg();
        if (note) note.textContent = 'Buscando e organizando as notícias — isso pode levar alguns segundos. Aguarde…';
        const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setMsg(); }, 1600);
        const finish = () => { clearInterval(iv); btn.disabled = false; btn.innerHTML = orig; if (note) note.textContent = 'Busca novas matérias atuais dos seus temas, sem repetir as já exibidas.'; };
        B.api.mynews(p.topics, p.scope, p.ver, userName, exclude).then(r => {
          const novas = ((r.result && r.result.articles) || []).filter(a => a && a.url && !articles.some(x => x.url === a.url));
          finish();
          if (!novas.length) { B.toast('Não encontramos novas notícias agora. Tente novamente mais tarde.', 'info'); return; }
          articles = articles.concat(novas);
          p.aiResult.articles = articles;
          layout();
          B.toast(`+${novas.length} notícias carregadas`, 'success');
        }).catch(e => { store.refund(loadKey); finish(); B.toast('Erro ao carregar mais: ' + e.message + ' — créditos reembolsados', 'warn'); });
      };
    }

    const toolbar = el(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn subtle sm" data-x="fs">${ic.maximize} Exibir em tela cheia</button>
        ${B.exportButtons()}
      </div>
      <button class="btn ghost sm" data-new>${ic.refresh} Nova edição / temas</button></div>`);

    body.innerHTML = ''; body.appendChild(toolbar); body.appendChild(wrap);
    toolbar.querySelector('[data-new]').onclick = () => B.router.go('mynews');
    B.wireExportButtons(toolbar, {
      node: () => wrap,
      title: 'My News - ' + new Date().toLocaleDateString('pt-BR'),
      toolName: 'My News',
    });

    // Tela cheia da edição
    const fsBtn = toolbar.querySelector('[data-x="fs"]');
    function syncFsBtn() {
      const on = document.fullscreenElement === wrap;
      fsBtn.innerHTML = on ? `${ic.minimize} Sair da tela cheia` : `${ic.maximize} Exibir em tela cheia`;
    }
    fsBtn.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(()=>B.toast('Não foi possível abrir em tela cheia','warn'));
    };
    document.addEventListener('fullscreenchange', syncFsBtn);

    layout();
  }

  /* ── My News — pop-up de leitura completa ─────────────────── */
  function openArticle(art) {
    const topicLabel = art.topic || 'Notícia';
    const m = B.modal({
      title: '',
      wide: true,
      body: `<div class="mn-read-pop">
        ${art.image ? `<div class="mn-read-hero"><img src="${esc(art.image)}" alt="" onerror="this.closest('.mn-read-hero').style.display='none'"></div>` : ''}
        <div class="mn-read-meta">
          <span class="mn-topic-tag">${ic.news} ${esc(topicLabel)}</span>
          <span class="mn-source">${ic.globe} ${esc(art.source||'')}</span>
          ${art.lang==='en'?'<span class="mn-lang">EN</span>':''}
        </div>
        <h2 class="mn-read-title">${esc(art.headline||art.title||'')}</h2>
        <p class="mn-read-lead">${esc(art.summary||'')}</p>
        <div id="mnReadFull" class="mn-read-full"><div class="mn-read-loading">${ic.refresh} Carregando a matéria completa…</div></div>
      </div>`,
      actions: [
        { label:'Resumir com Focus', class:'primary', icon:'focus', onClick: () => {
          B.router.go('focus', { prefill: {
            content: [art.headline||art.title, art.summary, fetchedText].filter(Boolean).join('\n\n'),
            obj: 'principais pontos relevantes desta notícia',
          }});
        }},
        { label:'Abrir matéria original', class:'ghost', icon:'external', onClick: () => { window.open(art.url, '_blank', 'noopener'); return false; } },
        { label:'Fechar', class:'ghost' },
      ],
    });

    // busca o texto completo da matéria
    let fetchedText = '';
    const fullBox = document.getElementById('mnReadFull');
    if (B.aiMode.active) {
      B.api.readnews(art.url).then(r => {
        fetchedText = (r && r.text) || '';
        if (!fullBox) return;
        if (fetchedText) {
          const paras = fetchedText.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂ])/).reduce((acc,s)=>{ if(!acc.length||acc[acc.length-1].length>320) acc.push(s); else acc[acc.length-1]+=' '+s; return acc; }, []);
          fullBox.innerHTML = paras.slice(0, 14).map(t=>`<p>${esc(t)}</p>`).join('')
            + `<div class="mn-read-foot">${ic.info} Trecho extraído da fonte original. <a href="${esc(art.url)}" target="_blank" rel="noopener">Ler matéria completa na fonte ${ic.external}</a></div>`;
        } else {
          fullBox.innerHTML = `<div class="mn-read-foot">${ic.info} Não foi possível extrair o texto completo desta fonte. <a href="${esc(art.url)}" target="_blank" rel="noopener">Abrir a matéria original ${ic.external}</a></div>`;
        }
      }).catch(() => {
        if (fullBox) fullBox.innerHTML = `<div class="mn-read-foot">${ic.info} <a href="${esc(art.url)}" target="_blank" rel="noopener">Abrir a matéria original ${ic.external}</a></div>`;
      });
    } else if (fullBox) {
      fullBox.innerHTML = `<div class="mn-read-foot">${ic.info} <a href="${esc(art.url)}" target="_blank" rel="noopener">Abrir a matéria original ${ic.external}</a></div>`;
    }
  }

  /* ============================================================
     CHAT BRENTOR
     ============================================================ */
  B.views.chat = function (mount, params) {
    const plan = store.get().plan;
    const isPremium = ['gold','diamond'].includes(plan);

    mount.innerHTML = `
      <div class="chat-page">
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-green">${ic.chat}</span> Chat Brentor</h1>
        <p>Seu assistente do portal. Indica a melhor ferramenta, ensina como usá-la e orienta sobre as soluções disponíveis. Foco exclusivo em negócios e no uso do Brentor.</p>
      </div>
      <div class="chat-wrap">
        <div class="chat-scroll" id="chatScroll"></div>
        <div class="chat-input">
          <div class="askbox" style="margin:0;max-width:none">
            <textarea id="chatInput" rows="1" placeholder="Pergunte algo ou descreva sua necessidade…"></textarea>
            <button class="btn primary send" id="chatSend">${ic.send}</button>
          </div>
          <div class="scope-note">${ic.lock} O Chat Brentor responde apenas temas ligados ao portal e a negócios. Outros assuntos fora do escopo não serão respondidos.</div>
        </div>
      </div>
      </div>`;

    const scroll = mount.querySelector('#chatScroll');
    const input = mount.querySelector('#chatInput');
    const scrollDown = () => { scroll.scrollTop = scroll.scrollHeight; };

    function bubble(role, html) {
      const b = el(`<div class="msg ${role} fade-up">
        <span class="av">${role==='bot'?'<img src="assets/img/brentor-icon.png" alt="B" class="av-logo">':esc(B.initials(store.get().user?.name||'Você'))}</span>
        <div class="bubble">${html}</div></div>`);
      scroll.appendChild(b); scrollDown(); return b;
    }
    function typing() {
      const t = el(`<div class="msg bot"><span class="av"><img src="assets/img/brentor-icon.png" alt="B" class="av-logo"></span><div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div></div>`);
      scroll.appendChild(t); scrollDown(); return t;
    }
    function botReply(route) {
      const t = typing();
      setTimeout(() => {
        t.remove();
        let html = mdToHtml(route.reply);
        if (route.tool && !route.planBlock) {
          const names = {
            analysis:   ['Analysis',   'analysis',  'ic-blue'],
            compare:    ['Compare',    'compare',   'ic-cyan'],
            display:    ['Display',    'display',   'ic-violet'],
            focus:      ['Focus',      'focus',     'ic-green'],
            mynews:     ['My News',    'news',      'ic-cyan'],
            history:    ['Histórico',  'clock',     'ic-blue'],
            context:    ['Contexto',   'building',  'ic-blue'],
          };
          const n = names[route.tool];
          if (n && route.tool !== 'chat') {
            html += `<div class="tool-suggest"><button class="ts" data-tool="${route.tool}">${ic[n[1]]} Abrir ${n[0]} ${ic.arrow}</button></div>`;
          }
        }
        const b = bubble('bot', html);
        b.querySelectorAll('[data-tool]').forEach(btn => btn.onclick = () => B.router.go(btn.dataset.tool));
      }, 650 + Math.random()*500);
    }
    function send(text) {
      const v = (text!=null?text:input.value).trim(); if (!v) return;
      if (!B.aiReady()) return;
      bubble('user', esc(v));
      input.value=''; input.style.height='auto';
      if (!store.spend('chat_msg')) { B.creditWall(); return; }
      chatHistory.push({ role:'user', text: v });

      if (B.aiMode.active) {
        // IA real
        const t = typing();
        B.api.chat(v, chatHistory).then(result => {
          t.remove();
          const reply = result.reply || '';
          const html = mdToHtml(reply);
          const bub = bubble('bot', html);
          chatHistory.push({ role:'bot', text: reply });
          // Sugere ferramenta se detectado
          if (result.tool) {
            const names = { analysis:'Analysis', compare:'Compare', display:'Display',
              focus:'Focus', mynews:'My News', history:'Histórico', context:'Contexto' };
            const icons = { analysis:'analysis', compare:'compare', display:'display',
              focus:'focus', mynews:'news', history:'clock', context:'building' };
            const toolName = names[result.tool];
            if (toolName && result.tool !== 'chat') {
              const ts = el(`<div class="tool-suggest" style="margin-top:10px">
                <button class="ts">${ic[icons[result.tool]]||''} Abrir ${esc(toolName)} ${ic.arrow}</button></div>`);
              ts.querySelector('button').onclick = () => B.router.go(result.tool);
              bub.querySelector('.bubble').appendChild(ts);
            }
          }
        }).catch(e => {
          t.remove();
          bubble('bot', mdToHtml(`Erro ao processar: ${e.message}. Tente novamente.`));
        });
      } else {
        // Demo
        botReply(B.routeChat(v, plan));
      }
    }

    // histórico de conversa para contexto
    const chatHistory = [];

    // mensagem de boas-vindas
    const premiumNote = isPremium ? '\n\n• **My News** — seu jornal digital personalizado de notícias\n• **Focus** — resumir e sintetizar documentos' : '';
    const welcomeMsg = B.aiMode.active
      ? `Olá! Sou o assistente do **Brentor.ai** com IA real ativa. Posso te ajudar com análises, comparações, apresentações e estratégia empresarial.\n\nO que você precisa hoje?`
      : `Olá! Sou o assistente do **Brentor.ai**. Posso te ajudar a escolher a ferramenta certa:\n\n• **Analysis** — investigar uma empresa\n• **Compare** — comparar empresas\n• **Display** — criar apresentações e dashboards${premiumNote}\n\nMe conta o que você precisa fazer hoje?`;
    bubble('bot', mdToHtml(welcomeMsg));

    const autoGrow = () => { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,120)+'px'; };
    input.addEventListener('input', autoGrow);
    input.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    mount.querySelector('#chatSend').onclick = () => send();

    // mensagem inicial vinda da Home
    if (params && params.initial) { setTimeout(()=>send(params.initial), 400); }
    setTimeout(()=>input.focus(), 100);
  };

  function mdToHtml(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/^• (.*)$/gm, '<div style="display:flex;gap:8px;margin:3px 0"><span style="color:var(--brand-400)">•</span><span>$1</span></div>')
      .replace(/\n/g, '<br>');
  }

  /* ============================================================
     CONTA / PLANOS / CRÉDITOS
     ============================================================ */
  B.views.account = function (mount) {
    const s = store.get();
    const plan = B.plans[s.plan];
    const pct = Math.round((s.credits / s.creditsMax) * 100);
    const spent = s.consumption.reduce((a,c)=>a+c.cost,0);

    mount.innerHTML = `
      <div class="view-head fade-up"><h1><span class="tool-ic ic-amber">${ic.coin}</span> Conta & Créditos</h1>
        <p>Gerencie sua assinatura, acompanhe o consumo de créditos e compre créditos extras quando precisar.</p></div>

      <div class="grid cols-3 fade-up" style="margin-bottom:24px">
        <div class="card" style="grid-column:span 2">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div><div class="muted" style="font-size:13px">Créditos disponíveis</div>
              <div style="font-size:38px;font-weight:800;letter-spacing:-1px">${B.fmtNum(s.credits)} <small class="muted" style="font-size:15px;font-weight:500">/ ${B.fmtNum(s.creditsMax)}</small></div></div>
            <span class="plan-tag" style="background:${plan.color}22;color:${plan.color};padding:5px 12px;border-radius:20px;font-weight:700">Plano ${plan.name}</span>
          </div>
          <div class="bar" style="margin-top:14px"><i style="width:${pct}%"></i></div>
          <div class="muted" style="font-size:12.5px;margin-top:6px">${pct}% do seu saldo mensal disponível · renova com a próxima fatura</div>
        </div>
        <div class="card center" style="display:flex;flex-direction:column;justify-content:center">
          <div class="muted" style="font-size:13px">Consumido neste ciclo</div>
          <div style="font-size:30px;font-weight:800;color:var(--accent)">${B.fmtNum(spent)}</div>
          <div class="muted" style="font-size:12.5px">créditos utilizados neste ciclo</div>
        </div>
      </div>

      <div class="section-title"><h2>Planos de assinatura</h2></div>
      <div class="plan-grid fade-up" id="planGrid"></div>

      <div class="section-title"><h2>Comprar créditos extras</h2><span class="muted" style="font-size:13px">Acabaram no meio do mês? Recarregue sem mudar de plano.</span></div>
      <div class="pack-grid fade-up" id="packGrid"></div>

      <div class="section-title"><h2>Histórico de consumo</h2></div>
      <div class="card" id="usageCard"></div>

      <div class="card" style="margin-top:18px;background:rgba(34,211,238,.04);border-color:rgba(34,211,238,.16)">
        <h3 style="font-size:15px;display:flex;align-items:center;gap:9px;margin-bottom:10px">${ic.info} Como os créditos são calculados</h3>
        <p class="muted" style="font-size:13.5px;line-height:1.6">Cada ação consome créditos conforme o esforço real: <b style="color:var(--text)">buscas na web</b> + <b style="color:var(--text)">processamento de IA</b>. Ações simples como uma mensagem no chat custam pouco; análises e comparações com pesquisa custam mais. Isso mantém o portal sustentável e justo — você paga pelo que usa.
        <span style="display:block;margin-top:8px;color:var(--text-faint)">Modo demonstração: nenhuma cobrança real é feita nesta fase de testes.</span></p>
      </div>`;

    // banner de trial
    if (s.plan === 'free') {
      const expired = store.isTrialExpired();
      const days = store.trialDaysLeft();
      const banner = el(`<div class="trial-banner ${expired?'trial-expired':''}" style="margin-bottom:20px">
        ${ic[expired?'warn':'clock']}
        <div>${expired
          ? '<b>Seu período gratuito expirou.</b> Faça upgrade para continuar usando o Brentor.ai sem interrupção.'
          : `<b>Período gratuito em andamento</b> — restam <b>${days} dia(s)</b>. Aproveite para conhecer todas as funcionalidades.`}</div>
        ${expired ? `<button class="btn primary sm" style="margin-left:auto" data-upgrade>Fazer upgrade</button>` : ''}
      </div>`);
      if (expired) banner.querySelector('[data-upgrade]').onclick = () => banner.scrollIntoView({ behavior:'smooth' });
      mount.querySelector('#planGrid').parentElement.insertBefore(banner, mount.querySelector('.section-title'));
    }

    // planos
    const pg = mount.querySelector('#planGrid');
    ['silver','gold','diamond'].forEach(id => {
      const p = B.plans[id]; const current = id===s.plan;
      const card = el(`<div class="plan ${p.featured?'featured':''}">
        ${p.featured?'<span class="ribbon">Mais escolhido</span>':''}
        <div class="p-name ${id}">${p.name}</div>
        <div class="p-price">${B.fmtBRL(p.price)}<small>/mês</small></div>
        <div class="p-credits">${ic.coin} ${B.fmtNum(p.credits)} créditos / mês</div>
        <ul>${p.features.map(f=>`<li>${ic.check} ${esc(f)}</li>`).join('')}</ul>
        ${current ? `<div class="current-tag">${ic.check} Seu plano atual</div>` : `<button class="btn ${p.featured?'primary':'ghost'} block">${B.plans[s.plan].price < p.price ? 'Fazer upgrade' : 'Mudar para '+p.name}</button>`}
      </div>`);
      const btn = card.querySelector('button');
      if (btn) btn.onclick = () => B.modal({
        title:`Mudar para o plano ${p.name}?`,
        body:`<p>Você passará a ter <b>${B.fmtNum(p.credits)} créditos/mês</b> por <b>${B.fmtBRL(p.price)}</b>. <span class="muted">(Demonstração — sem cobrança real.)</span></p>`,
        actions:[{label:'Confirmar', class:'primary', onClick:()=>{ store.setPlan(id); B.toast('Plano atualizado para '+p.name,'success'); B.views.account(mount); }},{label:'Cancelar',class:'ghost'}],
      });
      pg.appendChild(card);
    });

    // pacotes
    const pk = mount.querySelector('#packGrid');
    B.creditPacks.forEach(pack => {
      const card = el(`<div class="pack">
        ${pack.tag?`<div class="tag" style="font-size:11px;color:var(--accent);background:var(--accent-soft);display:inline-block;padding:2px 10px;border-radius:20px;margin-bottom:8px;white-space:nowrap">${esc(pack.tag)}</div>`:''}
        <div class="pk-cr">+${B.fmtNum(pack.credits)}</div><div class="pk-pr">créditos · ${B.fmtBRL(pack.price)}</div>
        <button class="btn ghost block">${ic.plus} Comprar</button></div>`);
      card.querySelector('button').onclick = () => B.modal({
        title:'Comprar créditos extras',
        body:`<p>Adicionar <b>${B.fmtNum(pack.credits)} créditos</b> à sua conta por <b>${B.fmtBRL(pack.price)}</b>. <span class="muted">(Demonstração — sem cobrança real.)</span></p>`,
        actions:[{label:'Confirmar compra', class:'primary', icon:'coin', onClick:()=>{ store.addCredits(pack.credits); B.toast(`+${pack.credits} créditos adicionados`,'success'); B.views.account(mount); }},{label:'Cancelar',class:'ghost'}],
      });
      pk.appendChild(card);
    });

    // histórico de consumo
    const uc = mount.querySelector('#usageCard');
    if (!s.consumption.length) {
      uc.innerHTML = `<div class="empty"><div class="ei">${ic.activity}</div><b>Sem consumo registrado</b><div class="muted">Use as soluções e o detalhamento de créditos aparecerá aqui.</div></div>`;
    } else {
      uc.innerHTML = `<div style="overflow-x:auto"><table class="usage-table">
        <thead><tr><th>Ação</th><th>Data</th><th class="num">Web</th><th class="num">IA</th><th class="num">Créditos</th></tr></thead>
        <tbody>${s.consumption.slice(0,12).map(c=>`<tr>
          <td>${esc(c.label)}</td><td class="muted">${B.fmtDate(c.date)}</td>
          <td class="num muted">${c.web}</td><td class="num muted">${c.ai}</td>
          <td class="num"><b>${c.cost}</b></td></tr>`).join('')}</tbody></table></div>`;
    }
  };

  /* ============================================================
     ADMIN
     ============================================================ */

  B.views.admin = function (mount) {
    const m = B.adminMetrics();
    const s = store.get();
    mount.innerHTML = `
      <div class="view-head fade-up"><h1><span class="tool-ic" style="background:rgba(52,211,153,.12);color:var(--green)">${ic.admin}</span> Administração</h1>
        <p>Acompanhe assinaturas, receita, consumo e a configuração do portal. Visão exclusiva do administrador.</p></div>

      <div class="stat-grid fade-up">
        <div class="stat"><div class="s-top"><div class="s-lbl">Receita mensal (MRR)</div><span class="s-ic ic-green">${ic.revenue}</span></div>
          <div class="s-val">${B.fmtBRL(m.mrr)}</div><div class="s-delta k-up">ARR ≈ ${B.fmtBRL(m.arr)}</div></div>
        <div class="stat"><div class="s-top"><div class="s-lbl">Assinantes</div><span class="s-ic ic-blue">${ic.users}</span></div>
          <div class="s-val">${m.customers}</div><div class="s-delta muted">${m.active} ativos · ${m.trials} em teste</div></div>
        <div class="stat"><div class="s-top"><div class="s-lbl">Margem estimada</div><span class="s-ic ic-cyan">${ic.trend}</span></div>
          <div class="s-val">${B.fmtBRL(m.margin)}</div><div class="s-delta ${m.marginPct>=0?'k-up':'k-down'}">${m.marginPct.toFixed(0)}% sobre a receita</div></div>
        <div class="stat"><div class="s-top"><div class="s-lbl">Uso médio de créditos</div><span class="s-ic ic-violet">${ic.activity}</span></div>
          <div class="s-val">${m.avgUsage}%</div><div class="s-delta ${m.past?'k-down':'muted'}">${m.past} em atraso</div></div>
      </div>

      <div class="section-title" style="margin-top:22px"><h2>Status das APIs</h2>
        <button class="btn ghost sm" id="apiRecheckBtn" style="display:inline-flex;align-items:center;gap:7px">${ic.refresh || ''}<span>Verificar agora</span></button></div>
      <div class="card fade-up" id="apiHealthCard"><p class="muted" style="font-size:13px">Verificando…</p></div>

      <div class="grid cols-2 fade-up" style="margin-top:22px">
        <div id="adminDonut"></div>
        <div id="adminBars"></div>
      </div>

      <div class="section-title"><h2>Assinantes</h2><span class="muted" style="font-size:13px">${m.customers} contas</span></div>
      <div class="card fade-up" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table class="admin-table" id="custTable"></table></div></div>

      <div class="grid cols-2" style="margin-top:24px">
        <div class="card fade-up"><h3 style="font-size:16px;margin-bottom:6px;display:flex;align-items:center;gap:9px">${ic.globe} Publicação do portal</h3>
          <p class="muted" style="font-size:13px;margin-bottom:10px">Controle a visibilidade do Brentor para os assinantes.</p>
          <div id="settingsBox"></div></div>
        <div class="card fade-up"><h3 style="font-size:16px;margin-bottom:6px;display:flex;align-items:center;gap:9px">${ic.revenue} Receita por plano</h3>
          <div id="revByPlan" style="margin-top:14px"></div></div>
      </div>

      <div class="card" style="margin-top:18px;background:var(--amber-soft);border-color:rgba(251,191,36,.2)">
        <div style="display:flex;gap:11px"><span style="color:var(--amber)">${ic.warn}</span>
        <p style="font-size:13px;color:var(--text-soft)">Painel em <b>modo demonstração</b> com dados de exemplo. Ao conectar o backend real, estes números virão das assinaturas, do gateway de pagamento e do consumo efetivo de créditos.</p></div>
      </div>`;

    // status das APIs (Anthropic / Tavily) — checagem real, não só presença da chave
    (() => {
      const box = mount.querySelector('#apiHealthCard');
      const btn = mount.querySelector('#apiRecheckBtn');
      if (!box) return;
      const links = {
        anthropic: { console: 'https://console.anthropic.com/', billing: 'https://console.anthropic.com/settings/billing' },
        tavily:    { console: 'https://app.tavily.com/home',      billing: 'https://app.tavily.com/account/plan' },
      };
      function statusRow(name, h, lk) {
        if (!h || h.ok == null) return `<div class="cost-row" style="background:var(--surface-2)">${ic.info}<span><b>${name}</b> — aguardando primeira checagem…</span></div>`;
        const ok = h.ok === true;
        const color = ok ? 'var(--green)' : 'var(--red)';
        const bg = ok ? 'rgba(52,211,153,.08)' : 'rgba(248,113,113,.1)';
        const border = ok ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.3)';
        const when = h.lastCheckedAt ? new Date(h.lastCheckedAt).toLocaleString('pt-BR') : '—';
        return `<div class="cost-row" style="background:${bg};border-color:${border};align-items:flex-start">
          <span style="color:${color}">${ok ? ic.check : ic.warn}</span>
          <span style="flex:1"><b style="color:${color}">${name} — ${ok ? 'operando normalmente' : 'PROBLEMA DETECTADO'}</b>
          <div class="muted" style="font-size:12px;margin-top:2px">${ok ? 'Última checagem' : esc(h.lastError||'Erro desconhecido')} · ${when}</div>
          <div style="font-size:12px;margin-top:5px;display:flex;gap:14px;flex-wrap:wrap">
            <a href="${lk.console}" target="_blank" rel="noopener">Painel da API ↗</a>
            <a href="${lk.billing}" target="_blank" rel="noopener">${ok ? 'Ver créditos/saldo ↗' : 'Verificar saldo agora ↗'}</a>
          </div></span>
        </div>`;
      }
      function paint(h) {
        box.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">
          ${statusRow('Anthropic (IA)', h.anthropic, links.anthropic)}
          ${statusRow('Tavily (busca web)', h.tavily, links.tavily)}
        </div>`;
      }
      async function load(recheck) {
        try {
          const res = recheck
            ? await fetch('/api/health/recheck', { method: 'POST' })
            : await fetch('/api/health');
          const data = await res.json();
          paint(data.apiHealth || {});
        } catch (e) {
          box.innerHTML = `<div class="cost-row" style="background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3)">${ic.warn}<span><b>Servidor Brentor inacessível</b><div class="muted" style="font-size:12px;margin-top:2px">Não foi possível checar o status — o backend pode estar fora do ar.</div></span></div>`;
        }
      }
      if (btn) btn.addEventListener('click', async () => {
        btn.disabled = true; btn.style.opacity = '.6'; btn.style.cursor = 'wait';
        btn.querySelector('span').textContent = 'Verificando…';
        box.innerHTML = `<p class="muted" style="font-size:13px">${ic.refresh} Testando as APIs em tempo real…</p>`;
        await load(true);
        btn.disabled = false; btn.style.opacity = ''; btn.style.cursor = '';
        btn.querySelector('span').textContent = 'Verificar agora';
      });
      load(false);
    })();

    // gráficos
    mount.querySelector('#adminDonut').innerHTML = B.charts.donut('Distribuição de planos', [
      { label:'Silver',  value:m.byPlan.silver,  color:'#cbd5e1' },
      { label:'Gold',    value:m.byPlan.gold,    color:'#fbbf24' },
      { label:'Diamond', value:m.byPlan.diamond, color:'#22d3ee' },
    ]);
    mount.querySelector('#adminBars').innerHTML = B.charts.bars('Uso de créditos por assinante (%)',
      s.admin.customers.map((c,i)=>({ label:c.name, value:c.usage, max:100, display:c.usage+'%', fill:['fill-a','fill-b','fill-c'][i%3] })));

    // tabela de assinantes
    const planColors = { silver:'#cbd5e1', gold:'#fbbf24', diamond:'#22d3ee' };
    const statusMap = { active:['st-active','Ativo'], trial:['st-trial','Teste'], past_due:['st-past','Em atraso'] };
    mount.querySelector('#custTable').innerHTML = `
      <thead><tr><th>Empresa</th><th>Plano</th><th>Status</th><th>Desde</th><th class="num">Uso</th><th class="num">MRR</th></tr></thead>
      <tbody>${s.admin.customers.map(c=>`<tr>
        <td><b>${esc(c.name)}</b><div class="muted" style="font-size:12px">${esc(c.email)}</div></td>
        <td><span class="plan-dot"><i style="background:${planColors[c.plan]}"></i>${B.plans[c.plan].name}</span></td>
        <td><span class="status-tag ${statusMap[c.status][0]}">${statusMap[c.status][1]}</span></td>
        <td class="muted">${new Date(c.since).toLocaleDateString('pt-BR')}</td>
        <td class="num">${c.usage}%</td>
        <td class="num"><b>${c.mrr?B.fmtBRL(c.mrr):'—'}</b></td></tr>`).join('')}</tbody>`;

    // receita por plano
    const revRows = ['diamond','gold','silver'].map((id,i)=>{
      const count = m.byPlan[id]; const rev = count*B.plans[id].price;
      return { label:`${B.plans[id].name} (${count})`, value:rev, max:Math.max(m.byPlan.diamond*99.9,m.byPlan.gold*69.9,m.byPlan.silver*39.9,1), display:B.fmtBRL(rev), fill:['fill-b','fill-a','fill-c'][i] };
    });
    mount.querySelector('#revByPlan').innerHTML = `<div class="barchart">${revRows.map(r=>`<div class="row"><span class="lbl">${esc(r.label)}</span><span class="track"><i class="${r.fill}" style="width:${Math.round(r.value/r.max*100)}%"></i></span><span class="val" style="width:80px">${esc(r.display)}</span></div>`).join('')}</div>`;

    // configurações do portal
    const settings = [
      { k:'portalOnline', b:'Portal online', d:'Quando ativo, assinantes conseguem acessar o portal.' },
      { k:'allowSignups', b:'Permitir novos cadastros', d:'Abre o portal para novas assinaturas.' },
      { k:'brandOnReports', b:'Marca nos relatórios', d:'Adiciona a identidade Brentor nos PDFs exportados.' },
      { k:'maintenance', b:'Modo manutenção', d:'Exibe aviso e bloqueia novas ações temporariamente.' },
    ];
    const sb = mount.querySelector('#settingsBox');
    settings.forEach(cfg => {
      const row = el(`<div class="setting-row"><div class="sr-txt"><b>${esc(cfg.b)}</b><span>${esc(cfg.d)}</span></div>
        <div class="toggle ${s.settings[cfg.k]?'on':''}"></div></div>`);
      row.querySelector('.toggle').onclick = (e) => {
        const nv = !s.settings[cfg.k]; store.setSetting(cfg.k, nv);
        e.currentTarget.classList.toggle('on', nv);
        B.toast(`${cfg.b}: ${nv?'ativado':'desativado'}`, nv?'success':'info');
      };
      sb.appendChild(row);
    });
  };

  /* ============================================================
     CONTEXTO EMPRESARIAL
     ============================================================ */
  B.views.context = function (mount) {
    const ctx = store.getContext();
    const pct = B.ctxProgress();
    const sizes = ['Microempresa (MEI/ME)','Pequeno porte (EPP)','Médio porte','Grande empresa / Corporação'];

    mount.innerHTML = `
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-blue">${ic.building}</span> Contexto empresarial</h1>
        <p>Informe sobre sua empresa e seu cargo. O Brentor usa essas informações para personalizar análises, respostas do chat, sugestões do My News, sínteses do Focus e todos os resultados — tornando tudo mais assertivo para o seu negócio.</p>
      </div>

      ${ctx.filled ? `
      <div class="ctx-active-banner fade-up" style="margin-bottom:20px">
        ${ic.check}
        <div style="flex:1"><b>Contexto ativo e sendo aplicado em todas as ferramentas</b>
          <span style="color:var(--text-soft);font-size:12.5px;display:block;margin-top:2px">
            ${[ctx.companyName, ctx.sector, ctx.role].filter(Boolean).join(' · ')}
            · Atualizado ${B.fmtDate(ctx.updatedAt)}
          </span></div>
        <button class="btn ghost sm" id="ctxClear">${ic.x} Limpar contexto</button>
      </div>` : `
      <div class="ctx-active-banner ctx-inactive-banner fade-up" style="margin-bottom:20px">
        ${ic.info}
        <div><b>Contexto não preenchido</b>
          <span style="color:var(--text-soft);font-size:12.5px;display:block;margin-top:2px">Preencha os campos abaixo. Quanto mais informações, mais personalizado e assertivo será o Brentor para o seu negócio.</span></div>
      </div>`}

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:8px">
        <span style="font-size:13px;color:var(--text-mute)">Preenchimento do perfil</span>
        <span style="font-size:13px;font-weight:700;color:${pct>=80?'var(--green)':pct>=40?'var(--amber)':'var(--text-mute)'}">${pct}%</span>
      </div>
      <div class="ctx-progress fade-up" style="margin-bottom:22px"><i id="ctxBar" style="width:${pct}%"></i></div>

      <div style="display:flex;flex-direction:column;gap:18px">
        <!-- Seção 1: Empresa -->
        <div class="ctx-section fade-up">
          <div class="ctx-section-head">
            <span class="ctx-ic ic-blue">${ic.building}</span>
            <div><h3>Sua empresa</h3><p>Contexto organizacional que orienta as análises e recomendações.</p></div>
          </div>
          <div class="form-grid">
            <div class="ctx-2col">
              <div class="field" style="margin:0"><label>Nome da empresa</label>
                <input class="input" id="cx-companyName" value="${esc(ctx.companyName)}" placeholder="Ex.: TechNova Sistemas"></div>
              <div class="field" style="margin:0"><label>Setor / Mercado de atuação</label>
                <input class="input" id="cx-sector" value="${esc(ctx.sector)}" placeholder="Ex.: Tecnologia, Construção, Saúde, Varejo…"></div>
            </div>
            <div class="field" style="margin:0"><label>Principais produtos ou serviços</label>
              <input class="input" id="cx-products" value="${esc(ctx.products)}" placeholder="Ex.: software de gestão para construtoras, consultoria em TI, varejo de materiais…"></div>
            <div class="ctx-2col">
              <div class="field" style="margin:0"><label>Porte da empresa</label>
                <select class="select" id="cx-size">
                  <option value="">Selecione o porte</option>
                  ${sizes.map(s=>`<option value="${s}" ${ctx.size===s?'selected':''}>${s}</option>`).join('')}
                </select></div>
              <div class="field" style="margin:0"><label>Região / Cidades de atuação</label>
                <input class="input" id="cx-region" value="${esc(ctx.region)}" placeholder="Ex.: São Paulo, Brasil, América Latina…"></div>
            </div>
            <div class="field" style="margin:0"><label>Perfil dos principais clientes</label>
              <input class="input" id="cx-mainClients" value="${esc(ctx.mainClients)}" placeholder="Ex.: pequenas empresas do setor de construção, indústrias metalúrgicas, consumidores finais de média renda…"></div>
            <div class="ctx-2col">
              <div class="field" style="margin:0"><label>Principais concorrentes</label>
                <input class="input" id="cx-competitors" value="${esc(ctx.competitors)}" placeholder="Ex.: Totvs, Linx, SAP, concorrentes locais…"></div>
              <div class="field" style="margin:0"><label>Nossos diferenciais competitivos</label>
                <input class="input" id="cx-differentials" value="${esc(ctx.differentials)}" placeholder="Ex.: atendimento personalizado, custo-benefício, tecnologia proprietária…"></div>
            </div>
            <div class="field" style="margin:0"><label>Principais desafios e objetivos atuais</label>
              <textarea class="textarea" id="cx-challenges" style="min-height:72px" placeholder="Ex.: aumentar a base de clientes, reduzir o CAC, expandir para novos mercados, melhorar a margem operacional…">${esc(ctx.challenges)}</textarea></div>
            <div class="field" style="margin:0"><label>História e contexto da empresa <span class="muted" style="font-weight:400;font-size:12px">(opcional)</span></label>
              <textarea class="textarea" id="cx-history" style="min-height:72px" placeholder="Ano de fundação, trajetória, momentos importantes, cultura da empresa…">${esc(ctx.history)}</textarea></div>
          </div>
        </div>

        <!-- Seção 2: Pessoal -->
        <div class="ctx-section fade-up">
          <div class="ctx-section-head">
            <span class="ctx-ic ic-cyan">${ic.account}</span>
            <div><h3>Sobre você</h3><p>Seu cargo e responsabilidades ajudam o Brentor a adaptar a linguagem e o foco das respostas.</p></div>
          </div>
          <div class="form-grid">
            <div class="ctx-2col">
              <div class="field" style="margin:0"><label>Cargo / Função</label>
                <input class="input" id="cx-role" value="${esc(ctx.role)}" placeholder="Ex.: Diretor Comercial, CEO, Gerente de Compras, Analista…"></div>
              <div class="field" style="margin:0"><label>Área de responsabilidade</label>
                <input class="input" id="cx-area" value="${esc(ctx.area)}" placeholder="Ex.: Vendas, Financeiro, Operações, Produto, RH…"></div>
            </div>
            <div class="field" style="margin:0"><label>Principais decisões que você toma</label>
              <textarea class="textarea" id="cx-responsibilities" style="min-height:72px" placeholder="Ex.: aprovação de fornecedores, definição de estratégia comercial, contratação de tecnologia, análise de propostas…">${esc(ctx.responsibilities)}</textarea></div>
            <div class="field" style="margin:0"><label>O que você quer que o Brentor saiba sobre você <span class="muted" style="font-weight:400;font-size:12px">(campo livre)</span></label>
              <textarea class="textarea" id="cx-personalNotes" style="min-height:72px" placeholder="Qualquer informação adicional que ajude o sistema a ser mais útil para o seu dia a dia…">${esc(ctx.personalNotes)}</textarea></div>
          </div>
        </div>

        <!-- Seção 3: Logo -->
        <div class="ctx-section fade-up">
          <div class="ctx-section-head">
            <span class="ctx-ic ic-cyan">${ic.image}</span>
            <div>
              <h3>Logotipo da empresa <span class="diamond-badge">${ic.crown} Diamond</span></h3>
              <p>O logotipo é exibido automaticamente nos relatórios e apresentações gerados pelo plano Diamond.</p>
            </div>
          </div>
          <div id="logoZone" class="logo-zone ${ctx.logoDataUrl?'has-logo':''}">
            <input type="file" id="logoFile" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml">
            ${ctx.logoDataUrl
              ? `<img src="${esc(ctx.logoDataUrl)}" class="lz-preview" alt="Logo atual" id="lzPreview">
                 <div class="lz-info"><b>Logotipo carregado</b><span>Clique para substituir</span></div>
                 <button class="lz-remove" id="logoRemove" type="button">${ic.x} Remover</button>`
              : `<div class="lz-placeholder">${ic.upload}<div><b>Clique para enviar o logotipo</b><p style="margin:0;font-size:12px">PNG, JPG, SVG ou GIF · máx. 2 MB</p></div></div>`}
          </div>
          <div class="hint" style="margin-top:8px">
            ${store.get().plan === 'diamond'
              ? `${ic.check} Seu plano Diamond ativa o uso do logo nos relatórios e slides.`
              : `${ic.lock} O logo será salvo, mas <b>exibido somente no plano Diamond</b>. Faça upgrade para ativar a marca nos relatórios.`}
          </div>
        </div>

        <!-- Botões -->
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding-bottom:16px">
          <button class="btn primary lg" id="ctxSave">${ic.check} Salvar contexto</button>
          <button class="btn ghost" id="ctxSaveClose">${ic.check} Salvar e voltar ao início</button>
          <span class="muted" style="font-size:12.5px;margin-left:auto">O contexto é salvo localmente e nunca compartilhado.</span>
        </div>
      </div>`;

    /* ── Logo upload ────────────────────────────────────────── */
    let pendingLogoDataUrl = ctx.logoDataUrl || ''; // pode ser alterado antes do save

    function resizeLogo(file, callback) {
      if (file.size > 2 * 1024 * 1024) { B.toast('Imagem muito grande — máximo 2 MB','warn'); return; }
      const reader = new FileReader();
      reader.onload = function (e) {
        // SVG: não precisa de resize, usa direto
        if (file.type === 'image/svg+xml') { callback(e.target.result); return; }
        const img = new Image();
        img.onload = function () {
          const MAX = 280;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height, 1));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          callback(canvas.toDataURL('image/png', 0.88));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function renderLogoZone(dataUrl) {
      const zone = mount.querySelector('#logoZone');
      if (!zone) return;
      zone.classList.toggle('has-logo', !!dataUrl);
      zone.innerHTML = `<input type="file" id="logoFile" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml">
        ${dataUrl
          ? `<img src="${B.esc(dataUrl)}" class="lz-preview" alt="Logo" id="lzPreview">
             <div class="lz-info"><b>Logotipo carregado</b><span>Clique para substituir</span></div>
             <button class="lz-remove" id="logoRemove" type="button">${ic.x} Remover</button>`
          : `<div class="lz-placeholder">${ic.upload}<div><b>Clique para enviar o logotipo</b><p style="margin:0;font-size:12px">PNG, JPG, SVG · máx. 2 MB</p></div></div>`}`;
      bindLogoEvents();
    }

    function bindLogoEvents() {
      const zone = mount.querySelector('#logoZone');
      const fileInput = mount.querySelector('#logoFile');
      if (!zone || !fileInput) return;
      zone.onclick = (e) => { if (e.target.closest('.lz-remove')) return; fileInput.click(); };
      fileInput.onchange = () => {
        const f = fileInput.files[0]; if (!f) return;
        resizeLogo(f, (dataUrl) => {
          pendingLogoDataUrl = dataUrl;
          renderLogoZone(dataUrl);
          B.toast('Logo carregado — clique em "Salvar contexto" para confirmar','info');
        });
        fileInput.value = '';
      };
      const rmBtn = mount.querySelector('#logoRemove');
      if (rmBtn) rmBtn.onclick = (e) => {
        e.stopPropagation();
        pendingLogoDataUrl = '';
        renderLogoZone('');
        B.toast('Logo removido — salve para confirmar','info');
      };
    }
    bindLogoEvents();

    /* ── Progress bar em tempo real ─────────────────────────── */
    function recalcProgress() {
      const fields = { 'cx-companyName':'companyName','cx-sector':'sector','cx-products':'products',
        'cx-size':'size','cx-region':'region','cx-mainClients':'mainClients','cx-competitors':'competitors',
        'cx-differentials':'differentials','cx-challenges':'challenges','cx-role':'role','cx-area':'area','cx-responsibilities':'responsibilities' };
      const filled = Object.keys(fields).filter(id => { const el = mount.querySelector('#'+id); return el && (el.value||'').trim(); }).length;
      const pct2 = Math.round(filled / Object.keys(fields).length * 100);
      const bar = mount.querySelector('#ctxBar');
      if (bar) bar.style.width = pct2 + '%';
    }
    mount.querySelectorAll('.input, .textarea, .select').forEach(f => f.addEventListener('input', recalcProgress));

    function collectAndSave() {
      const get = id => (mount.querySelector('#'+id)?.value || '').trim();
      const ctx2 = {
        companyName:    get('cx-companyName'),   sector:       get('cx-sector'),
        products:       get('cx-products'),      size:         get('cx-size'),
        region:         get('cx-region'),        mainClients:  get('cx-mainClients'),
        competitors:    get('cx-competitors'),   differentials:get('cx-differentials'),
        challenges:     get('cx-challenges'),    history:      get('cx-history'),
        role:           get('cx-role'),          area:         get('cx-area'),
        responsibilities:get('cx-responsibilities'), personalNotes:get('cx-personalNotes'),
        logoDataUrl:    pendingLogoDataUrl,
      };
      if (!ctx2.companyName && !ctx2.role && !ctx2.sector) {
        B.toast('Preencha ao menos o nome da empresa ou cargo antes de salvar','warn'); return false;
      }
      store.setContext(ctx2);
      B.toast('Contexto salvo! O Brentor já está usando suas informações.','success');
      return true;
    }

    mount.querySelector('#ctxSave').onclick = () => { collectAndSave(); B.views.context(mount); };
    mount.querySelector('#ctxSaveClose').onclick = () => { if (collectAndSave()) B.router.go('home'); };
    mount.querySelector('#ctxClear')?.addEventListener('click', () => {
      B.modal({ title:'Limpar contexto?', body:'<p>Isso remove todas as informações da empresa e do seu cargo. As ferramentas voltarão a responder de forma genérica.</p>',
        actions:[{label:'Limpar', class:'primary', onClick:()=>{ store.clearContext(); B.views.context(mount); B.toast('Contexto removido','info'); }},{label:'Cancelar',class:'ghost'}] });
    });
  };

})(window.Brentor);
