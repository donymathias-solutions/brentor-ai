/* ============================================================
   Brentor.ai — views3.js  (Focus 1.0 / 2.0)
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon, el = B.el, esc = B.esc, store = B.store;

  /* helper reutilizado do views.js (declarado aqui também para independência) */
  function makeFileZone(id) {
    const uid = id || B.uid();
    const files = [];
    let updateCb = null;
    const html = `
      <div class="field">
        <label>Anexar arquivos <span class="muted" style="font-weight:400;font-size:12px">(principal ou complementar o texto)</span></label>
        <div class="file-zone" id="fz-${uid}">
          <input type="file" id="fi-${uid}" multiple accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.pptx,.png,.jpg">
          <div class="fz-ic">${ic.upload}</div>
          <b>Clique para selecionar ou arraste aqui</b>
          <span>Documentos, relatórios, apresentações, planilhas ou imagens</span>
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

  /* ============================================================
     FOCUS
     ============================================================ */
  B.views.focus = function (mount, params) {
    const plan = store.get().plan;
    const isV2 = plan === 'diamond';
    const ver = isV2 ? '2.0' : '1.0';

    mount.innerHTML = `
      <div class="focus-header fade-up">
        <div class="focus-badge ${isV2?'v2':'v1'}">${ic.focus} Focus ${ver} · ${B.plans[plan].name}</div>
        <h1 style="font-size:26px;letter-spacing:-.5px;display:flex;align-items:center;gap:12px">${ic.summarize} Focus ${ver}</h1>
        <p>${isV2
          ? 'Análise estratégica profunda de qualquer conteúdo. IA avançada extrai KPIs, riscos, oportunidades, implicações estratégicas e perguntas que você deveria estar fazendo.'
          : 'Síntese objetiva e extração de pontos-chave de documentos, apresentações, e-mails, relatórios e textos — rápido e sem enrolação.'}</p>
        ${isV2 ? `<div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:12px">
          <span class="source-pill" style="color:var(--accent)">${ic.target} Extração de KPIs e métricas</span>
          <span class="source-pill" style="color:var(--accent)">${ic.warn} Identificação de riscos e alertas</span>
          <span class="source-pill" style="color:var(--accent)">${ic.spark} Implicações estratégicas</span>
          <span class="source-pill" style="color:var(--accent)">${ic.brain||ic.search} Perguntas para aprofundar</span>
        </div>` : ''}
      </div>

      <div class="card pad-lg fade-up" style="margin-top:18px">
        <div class="form-grid">
          <div class="field">
            <label>Cole o conteúdo aqui <span class="muted" style="font-weight:400;font-size:12px">(ou apenas anexe o arquivo abaixo)</span></label>
            <textarea class="textarea" id="focusContent" style="min-height:110px"
              placeholder="Cole o texto do e-mail, trecho do relatório, conteúdo da apresentação, anotações de reunião…"></textarea>
          </div>
          <div id="focusFzSlot"></div>
          <div class="field">
            <label>O que você quer extrair / qual é o foco? <span class="muted" style="font-weight:400;font-size:12px">(opcional)</span></label>
            <input class="input" id="focusObj" placeholder="Ex.: pontos relevantes para o negócio · riscos da proposta · itens de ação da reunião · KPIs financeiros">
          </div>
          ${isV2 ? `
          <div class="field">
            <label>Links de notícias ou URLs para análise <span class="muted" style="font-weight:400;font-size:12px">(opcional — Focus 2.0 lê e incorpora o conteúdo)</span></label>
            <div id="urlList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px"></div>
            <div style="display:flex;gap:9px">
              <input class="input" id="focusUrlInput" placeholder="https://g1.globo.com/noticia… ou qualquer URL pública" style="flex:1">
              <button class="btn ghost sm" id="focusUrlAdd" type="button">${ic.plus} Adicionar</button>
            </div>
            <div class="hint" style="margin-top:6px">${ic.web||''}Cole links de notícias, artigos, relatórios online ou qualquer página pública. O Focus 2.0 acessa, lê o conteúdo e incorpora na análise — combinando com o texto que você colou acima.</div>
          </div>
          <div class="field">
            <label>Perfil da audiência <span class="muted" style="font-weight:400;font-size:12px">(para direcionar a linguagem)</span></label>
            <div class="seg" id="focusAudSeg">
              <button class="on" data-a="diretoria">Diretoria / C-Level</button>
              <button data-a="gerencia">Gerência / Liderança</button>
              <button data-a="tecnico">Time técnico / Operacional</button>
              <button data-a="cliente">Apresentação a clientes</button>
            </div>
          </div>` : ''}
          ${B.costRow('focusv'+(isV2?'2':'1'))}
          <button class="btn primary lg" id="focusRun" style="background:linear-gradient(160deg,${isV2?'#059669,#34d399':'var(--green),#10b981'})">${ic.focus} Processar com Focus ${ver}</button>
        </div>
      </div>
      <div id="focusBody"></div>`;
    if (params && params.reopen && params.reopen.payload) {
      const pl = params.reopen.payload;
      (pl.aiResult ? renderFocusResult : (pl.ver === '2.0' ? renderFocusV2 : renderFocusV1))(mount.querySelector('#focusBody'), pl);
      return;
    }

    // file zone
    const fz = makeFileZone('focus');
    mount.querySelector('#focusFzSlot').outerHTML = fz.html;
    // após substituição o slot desapareceu, precisa inicializar no mount
    setTimeout(() => fz.init(mount), 0);

    // URLs (v2 only)
    const urls = [];
    if (isV2) {
      const urlList = mount.querySelector('#urlList');
      const urlInput = mount.querySelector('#focusUrlInput');

      function addUrl() {
        const v = (urlInput.value||'').trim();
        if (!v) return;
        if (!v.startsWith('http')) { B.toast('Informe uma URL válida (começa com http)','warn'); return; }
        if (urls.includes(v)) { B.toast('Esse link já foi adicionado','info'); return; }
        if (urls.length >= 5) { B.toast('Máximo de 5 links por análise','warn'); return; }
        urls.push(v);
        const chip = B.el(`<div class="attached-file">
          <span>${ic.web||ic.globe}</span>
          <span style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${B.esc(v)}">${B.esc(v)}</span>
          <button class="rm" title="Remover">${ic.x}</button></div>`);
        chip.querySelector('.rm').onclick = () => { const i=urls.indexOf(v); if(i>=0) urls.splice(i,1); chip.remove(); };
        urlList.appendChild(chip);
        urlInput.value = '';
      }
      mount.querySelector('#focusUrlAdd').onclick = addUrl;
      urlInput.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); addUrl(); } });
    }

    // audiência (v2)
    let audience = 'diretoria';
    mount.querySelectorAll('#focusAudSeg button').forEach(b => b.onclick = () => {
      mount.querySelectorAll('#focusAudSeg button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); audience = b.dataset.a;
    });

    // Pré-preenchimento (ex.: vindo de uma matéria do My News)
    if (params && params.prefill) {
      const pf = params.prefill;
      if (pf.content) mount.querySelector('#focusContent').value = pf.content;
      if (pf.obj && mount.querySelector('#focusObj')) mount.querySelector('#focusObj').value = pf.obj;
      B.toast('Conteúdo carregado no Focus — clique em processar para resumir','info');
    }

    mount.querySelector('#focusRun').onclick = () => {
      const content = mount.querySelector('#focusContent').value.trim();
      const obj = mount.querySelector('#focusObj')?.value?.trim() || '';
      const attachedFiles = fz.getFiles();
      if (!content && !attachedFiles.length && !urls.length) {
        B.toast('Cole o conteúdo, anexe um arquivo ou adicione um link para processar','warn');
        return;
      }
      const actionKey = 'focusv' + (isV2?'2':'1');
      if (!store.spend(actionKey)) { B.creditWall(); return; }
      attachedFiles.forEach(() => store.spend('file_analysis'));
      // créditos extras por URL (busca web)
      urls.forEach(() => store.spend('file_analysis'));
      const steps = (isV2 ? B.statusSteps_f2 : B.statusSteps_f1).slice();
      if (attachedFiles.length > 0)
        steps.unshift({ icon:'file', t:`Lendo ${attachedFiles.length} arquivo(s): ${attachedFiles.map(f=>f.name).join(', ')}` });
      if (urls.length > 0)
        steps.unshift({ icon:'web', t:`Acessando e lendo ${urls.length} link(s) informado(s)` });
      const focusBody = mount.querySelector('#focusBody');

      const apiPromise = B.aiMode.active
        ? B.api.focus(content, obj, audience, ver, urls, attachedFiles)
        : Promise.resolve(null);

      B.runStatus(focusBody, steps, { title:'Focus '+ver+' — processando', speed: isV2?0.75:1.1, waitFor: apiPromise, onDone: async () => {
        const payload = { content, obj, audience: isV2?audience:'',
          files: attachedFiles.map(f=>f.name), urls: urls.slice(), ver, plan, date: B.now().toISOString(), aiGenerated: B.aiMode.active };
        try {
          if (B.aiMode.active) {
            const apiResult = await apiPromise;
            payload.aiResult = apiResult.result;
          }
        } catch (e) { store.refund(actionKey); B.toast('Erro na IA: '+e.message+' — créditos reembolsados','warn'); }
        if (B.aiMode.active && !payload.aiResult) {
          store.refund(actionKey);
          focusBody.innerHTML = '';
          focusBody.appendChild(el(`<div class="card pad-lg fade-up" style="text-align:center">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px">${ic.warn} Não foi possível concluir a síntese</div>
            <p class="muted" style="font-size:13px;margin:0 0 14px">Houve uma falha na comunicação com a IA. Seus créditos foram reembolsados automaticamente.</p>
            <button class="btn primary" data-retry>${ic.refresh} Tentar novamente</button>
          </div>`));
          focusBody.querySelector('[data-retry]').onclick = () => B.router.go('focus');
          return;
        }
        store.addHistory({ type:'focus', title:'Focus '+ver+' — '+(obj||content||urls[0]||'').slice(0,40),
          subtitle:ver==='2.0'?'Análise estratégica':'Síntese', payload });
        (payload.aiResult ? renderFocusResult : (isV2 ? renderFocusV2 : renderFocusV1))(focusBody, payload);
        B.toast('Análise Focus concluída','success');
      }});
    };
  };

  /* ── Focus — resultado real da IA (síntese verificada) ────── */
  function renderFocusResult(body, p) {
    const ai = p.aiResult || {};
    const isV2 = p.ver === '2.0';
    const typeLabel = ai.document_type || 'Conteúdo';
    const fLogoHtml = B.companyLogoHtml('report');
    const summary = ai.executive_summary || ai.summary || '';
    const keyPoints = ai.key_points || [];
    const verif = ai.verification || [];
    const vColor = s => /confirmado/i.test(s||'') ? 'var(--green)' : /divergente/i.test(s||'') ? 'var(--red)' : 'var(--muted)';
    const vIcon  = s => /confirmado/i.test(s||'') ? ic.checkSmall : /divergente/i.test(s||'') ? ic.warn : ic.info;

    const wrap = el(`<div class="fade-up" id="focusReportAI"><div class="card pad-lg">
      <div class="report-head">
        <div style="min-width:0"><h2>${esc(ai.title || p.obj || typeLabel)}</h2>
          ${ai.context ? `<div class="muted" style="font-size:13px;margin-top:2px">${esc(ai.context)}</div>` : ''}
          <div class="meta"><span>${ic.doc} ${esc(typeLabel)}</span>${p.obj?`<span>${ic.target} Foco: ${esc(p.obj)}</span>`:''}<span>${ic.clock} ${B.fmtDate(p.date)}</span></div></div>
        ${fLogoHtml ? `<div style="margin-left:auto;padding-right:12px">${fLogoHtml}</div>` : ''}
      </div>

      ${summary ? `<div class="report-section">
        <h3><span class="ico">${ic.report}</span> Resumo executivo</h3>
        <div class="prose">${summary.split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
      </div>` : ''}

      ${keyPoints.length ? `<div class="report-section">
        <h3><span class="ico">${ic.target}</span> Pontos-chave do conteúdo</h3>
        ${keyPoints.map(k=>`<div class="focus-bullet"><span class="fb-dot"></span>${esc(k)}</div>`).join('')}
      </div>` : ''}

      ${((ai.data_points||ai.kpis)||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.activity}</span> Dados e métricas extraídos</h3>
        <div class="fact-list">${((ai.data_points||ai.kpis)||[]).map(k=>`<div class="fact"><span class="f-k">${esc(k.metric||'')}</span><span class="f-v"><b>${esc(k.value||'')}</b>${k.context?' — '+esc(k.context):''}</span></div>`).join('')}</div>
      </div>` : ''}

      ${(ai.highlights||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.star}</span> Destaques</h3>
        ${(ai.highlights||[]).map(h=>`<div class="focus-bullet"><span class="fb-dot" style="background:var(--accent)"></span>${esc(h)}</div>`).join('')}
      </div>` : ''}

      ${verif.length ? `<div class="report-section">
        <h3><span class="ico">${ic.shield}</span> Verificação com fontes da web</h3>
        ${verif.map(v=>`<div class="card" style="padding:10px 14px;margin-bottom:8px;border-left:3px solid ${vColor(v.status)}">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="color:${vColor(v.status)}">${vIcon(v.status)}</span><b>${esc(v.point||'')}</b>
            <span class="source-pill" style="margin-left:auto;font-size:11px;color:${vColor(v.status)};border-color:${vColor(v.status)}40">${esc((v.status||'').toUpperCase())}</span></div>
          ${v.note?`<div class="muted" style="font-size:12.5px;margin-top:5px">${esc(v.note)}</div>`:''}
        </div>`).join('')}
      </div>` : ''}

      ${(ai.critical_insights||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.spark}</span> Insights críticos</h3>
        ${(ai.critical_insights||[]).map(i=>`<div class="focus-bullet"><span class="fb-dot" style="background:${/alta/i.test(i.priority||'')?'var(--red)':'var(--amber)'}"></span><b style="margin-right:4px">[${esc(i.priority||'Média')}]</b> ${esc(i.insight||'')}</div>`).join('')}
      </div>` : ''}

      ${((ai.alerts||ai.risks)||[]).length || (ai.opportunities||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.warn}</span> Alertas</h3>
        <div class="grid ${(ai.opportunities||[]).length?'cols-2':''}" style="gap:14px">
          ${((ai.alerts||ai.risks)||[]).length?`<div class="card" style="padding:14px;border-left:3px solid var(--red)">
            <ul style="margin:0;padding-left:16px;font-size:13px">${((ai.alerts||ai.risks)||[]).map(r=>`<li style="margin-bottom:5px"><b style="color:${/crítico/i.test(r.level||'')?'var(--red)':'var(--amber)'}">${esc(r.level||'Atenção')}:</b> ${esc(r.description||r)}</li>`).join('')}</ul></div>`:''}
          ${(ai.opportunities||[]).length?`<div class="card" style="padding:14px;border-left:3px solid var(--green)"><h4 style="font-size:13px;margin:0 0 8px;color:var(--green)">${ic.trend} Oportunidades</h4>
            <ul style="margin:0;padding-left:16px;font-size:13px">${(ai.opportunities||[]).map(o=>`<li style="margin-bottom:5px">${esc(o)}</li>`).join('')}</ul></div>`:''}
        </div>
      </div>` : ''}

      ${ai.strategic_implications ? `<div class="report-section">
        <h3><span class="ico">${ic.brain||ic.spark}</span> Implicações estratégicas</h3>
        <div class="prose">${ai.strategic_implications.split('\n').filter(Boolean).map(par=>`<p>${esc(par)}</p>`).join('')}</div>
      </div>` : ''}

      ${ai.focus_answer ? `<div class="next-cta" style="margin-top:14px;background:var(--green-soft);border-color:rgba(52,211,153,.25)">
        <div class="txt"><b>${ic.target} Resposta ao seu foco${p.obj?': "'+esc(p.obj)+'"':''}</b><span>${esc(ai.focus_answer)}</span></div></div>` : ''}

      ${(ai.action_items||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.flag}</span> Itens de ação</h3>
        ${(ai.action_items||[]).map(a=>`<div class="focus-bullet"><span class="fb-dot" style="background:var(--amber)"></span>${esc(a)}</div>`).join('')}
      </div>` : ''}

      ${isV2 && (ai.strategic_questions||[]).length ? `<div class="report-section">
        <h3><span class="ico">${ic.info}</span> Perguntas estratégicas para levar à mesa</h3>
        <ul style="margin:0;padding-left:18px">${(ai.strategic_questions||[]).map(q=>`<li style="margin-bottom:6px">${esc(q)}</li>`).join('')}</ul>
      </div>` : ''}

      ${p.files&&p.files.length ? `<div class="report-section"><h3><span class="ico">${ic.file}</span> Arquivos processados</h3>
        <div style="display:flex;gap:9px;flex-wrap:wrap">${p.files.map(f=>`<span class="source-pill">${ic.file} ${esc(f)}</span>`).join('')}</div></div>` : ''}

      ${(ai.sources||[]).length ? `<div class="report-section"><h3><span class="ico">${ic.web}</span> Fontes de verificação</h3>
        <div style="display:flex;gap:9px;flex-wrap:wrap">${(ai.sources||[]).map(s=>`<span class="source-pill">${ic.globe} ${esc(s)}</span>`).join('')}</div></div>` : ''}

      <div class="credibility" style="margin-top:10px">${ic.info}
        <div>Síntese gerada pela IA a partir do conteúdo fornecido, com verificação em fontes públicas. Dados extraídos literalmente do material — sem estimativas.</div></div>
    </div></div>`);

    const docTitle = ai.title || p.obj || typeLabel || 'Síntese';
    const toolbar = makeResultToolbar(body, wrap, docTitle, () => B.router.go('focus'));
    body.innerHTML = ''; body.appendChild(toolbar); body.appendChild(wrap);
    wireToolbar(toolbar, wrap, docTitle, 'Focus');
    const dspBtn = toolbar.querySelector('[data-display]');
    if (dspBtn) dspBtn.onclick = () => B.router.go('display', { seed:null, prefill:{ topic: ai.context || p.obj || typeLabel, content: [summary, ...keyPoints].filter(Boolean).join('\n') } });
  }

  /* ── Focus 1.0 resultado ──────────────────────────────────── */
  function renderFocusV1(body, p) {
    const f1LogoHtml = B.companyLogoHtml('sm');
    const wrap = el(`<div id="focusReport1" class="fade-up" style="display:flex;flex-direction:column;gap:16px">

      <div class="card" style="padding:10px 16px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
        <span style="color:var(--amber);font-size:18px">${ic.warn}</span>
        <div>
          <b style="font-size:13px;color:var(--amber)">Modo demonstração — IA não conectada</b>
          <div class="muted" style="font-size:12px;margin-top:2px">Para processar seu conteúdo real, inicie o servidor Brentor (Iniciar-Brentor.bat) e recarregue a página.</div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">1</span><h3>Resumo executivo</h3>
          ${f1LogoHtml ? `<div style="margin-left:auto">${f1LogoHtml}</div>` : ''}
        </div>
        <div class="prose">
          <p><i class="muted" style="font-size:13px">Com a IA conectada, este campo mostrará a síntese real do seu conteúdo: um parágrafo direto com o essencial para tomada de decisão — fiel ao documento, sem invenção.</i></p>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">2</span><h3>Pontos-chave identificados</h3></div>
        <div>
          <div class="focus-bullet"><span class="fb-dot"></span><i class="muted">Exemplo: ponto central extraído do seu documento.</i></div>
          <div class="focus-bullet"><span class="fb-dot"></span><i class="muted">Exemplo: informação relevante identificada no conteúdo.</i></div>
          <div class="focus-bullet"><span class="fb-dot"></span><i class="muted">Exemplo: dado ou métrica extraída literalmente do material.</i></div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">3</span><h3>Itens de ação identificados</h3></div>
        <div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--amber)"></span><i class="muted">Exemplo: ação concreta gerada com base no seu conteúdo.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--amber)"></span><i class="muted">Exemplo: próximo passo identificado no documento.</i></div>
        </div>
      </div>

      ${p.obj ? `<div class="focus-section">
        <div class="fs-head"><span class="fs-num">4</span><h3>Resposta ao seu foco: "${esc(p.obj)}"</h3></div>
        <div class="prose"><p><i class="muted" style="font-size:13px">Com a IA conectada, este campo responderá diretamente ao seu foco com base no conteúdo real do documento.</i></p></div>
      </div>` : ''}

      ${p.files&&p.files.length ? `<div class="focus-section" style="background:rgba(52,211,153,.04);border-color:rgba(52,211,153,.2)">
        <div class="fs-head"><span class="fs-num" style="background:linear-gradient(150deg,var(--green),#059669)">${p.files.length}</span><h3>Arquivo(s) processado(s)</h3></div>
        <div style="display:flex;gap:9px;flex-wrap:wrap">${p.files.map(f=>`<span class="source-pill">${ic.file} ${esc(f)}</span>`).join('')}</div>
      </div>` : ''}

      <div class="credibility">${ic.info}<div>Síntese de demonstração com estrutura real. Com a IA do Brentor conectada, o Focus 1.0 lê cada palavra do seu conteúdo e gera um resumo fiel — sem inventar pontos que não estejam no documento.</div></div>
    </div>`);

    const toolbar = makeResultToolbar(body, wrap, 'Focus1-'+p.date.slice(0,10), () => B.router.go('focus'));
    body.innerHTML = ''; body.appendChild(toolbar); body.appendChild(wrap);
    wireToolbar(toolbar, wrap, 'Focus 1.0 — '+p.date.slice(0,10), 'Focus');
  }

  /* ── Focus 2.0 resultado ──────────────────────────────────── */
  function renderFocusV2(body, p) {
    const audLabel = { diretoria:'Diretoria/C-Level', gerencia:'Gerência/Liderança', tecnico:'Time técnico', cliente:'Clientes externos' }[p.audience] || 'Geral';
    const f2LogoHtml = B.companyLogoHtml('report');
    const wrap = el(`<div id="focusReport2" class="fade-up" style="display:flex;flex-direction:column;gap:16px">

      ${f2LogoHtml ? `<div style="display:flex;justify-content:flex-end"><div style="padding:10px 14px;background:var(--surface);border:1px solid var(--line-soft);border-radius:var(--r-md);display:grid;place-items:center">${f2LogoHtml}</div></div>` : ''}

      <div class="card" style="padding:10px 16px;margin-bottom:4px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:var(--r-md);display:flex;align-items:center;gap:10px">
        <span style="color:var(--amber);font-size:18px">${ic.warn}</span>
        <div>
          <b style="font-size:13px;color:var(--amber)">Modo demonstração — IA não conectada</b>
          <div class="muted" style="font-size:12px;margin-top:2px">Para processar seu conteúdo real, inicie o servidor Brentor (Iniciar-Brentor.bat) e recarregue a página.</div>
        </div>
      </div>

      <div class="focus-section v2-deep" style="background:linear-gradient(160deg,rgba(52,211,153,.07),transparent)">
        <div class="fs-head"><span class="fs-num">1</span><h3>Classificação e contexto do documento</h3></div>
        <div class="fact-list">
          <div class="fact"><span class="f-k">Tipo</span><span class="f-v">Detectado automaticamente pela IA</span></div>
          <div class="fact"><span class="f-k">Audiência direcionada</span><span class="f-v">${esc(audLabel)}</span></div>
          <div class="fact"><span class="f-k">Foco solicitado</span><span class="f-v">${p.obj?esc(p.obj):'<span class="na">não especificado</span>'}</span></div>
          <div class="fact"><span class="f-k">Arquivos</span><span class="f-v">${p.files&&p.files.length?p.files.map(f=>esc(f)).join(', '):'<span class="na">somente texto</span>'}</span></div>
          <div class="fact"><span class="f-k">Links analisados</span><span class="f-v">${p.urls&&p.urls.length
            ? p.urls.map(u=>`<span class="source-pill" style="display:inline-flex;margin:2px 4px 2px 0">${ic.globe||''} <a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--brand-400);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u)}</a></span>`).join('')
            : '<span class="na">nenhum link informado</span>'}</span></div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">2</span><h3>Resumo estratégico executivo</h3></div>
        <div class="prose">
          <p><i class="muted" style="font-size:13px">Este é um exemplo de como o resumo aparecerá. Com a IA conectada, este campo conterá a síntese real do conteúdo que você informou — fiel ao documento, sem invenção.</i></p>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">3</span><h3>Insights críticos — pontos que exigem atenção</h3></div>
        <div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--brand-400)"></span><i class="muted">Exemplo: ponto de maior impacto identificado no conteúdo.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--brand-400)"></span><i class="muted">Exemplo: informação que confirma ou contradiz premissas do leitor.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--accent)"></span><i class="muted">Exemplo: dado ou fato diferencial identificado no material.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--accent)"></span><i class="muted">Exemplo: implicação de curto prazo para o negócio.</i></div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">4</span><h3>KPIs e dados numéricos extraídos</h3></div>
        ${B.charts.bars('Métricas identificadas no conteúdo (escala comparativa)',[
          {label:'Indicador principal',value:84,max:100,fill:'fill-a'},
          {label:'Métrica secundária',value:67,max:100,fill:'fill-b'},
          {label:'KPI de controle',value:55,max:100,fill:'fill-c'},
          {label:'Variação vs. referência',value:72,max:100,fill:'fill-a'},
        ])}
        <div class="credibility" style="margin-top:12px">${ic.info}<div style="font-size:12px">Valores demonstrativos. Com a IA conectada, os números são extraídos literalmente do seu documento — sem estimativas.</div></div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">5</span><h3>Oportunidades identificadas</h3></div>
        <div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--green)"></span><i class="muted">Exemplo: oportunidade extraída do seu conteúdo real.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--green)"></span><i class="muted">Exemplo: brecha ou vantagem identificada no documento.</i></div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">6</span><h3>Riscos e alertas</h3></div>
        <div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--red)"></span><i class="muted">Exemplo: alerta crítico identificado no seu conteúdo.</i></div>
          <div class="focus-bullet"><span class="fb-dot" style="background:var(--amber)"></span><i class="muted">Exemplo: ponto de atenção que requer acompanhamento.</i></div>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">7</span><h3>Implicações estratégicas para ${esc(audLabel)}</h3></div>
        <div class="prose">
          <p><i class="muted" style="font-size:13px">Com a IA conectada, este campo mostrará as implicações reais do seu conteúdo para ${esc(audLabel.toLowerCase())}.</i></p>
        </div>
      </div>

      <div class="focus-section">
        <div class="fs-head"><span class="fs-num">8</span><h3>Perguntas estratégicas para aprofundar</h3></div>
        <div>
          <div class="focus-question"><span class="fq-ic">${ic.target}</span><span><i class="muted">Exemplo: pergunta gerada pela IA com base no seu documento.</i></span></div>
          <div class="focus-question"><span class="fq-ic">${ic.target}</span><span><i class="muted">Exemplo: questão estratégica que o conteúdo deixa em aberto.</i></span></div>
        </div>
      </div>

      <div class="credibility">${ic.info}<div>Análise estratégica de demonstração com estrutura e frameworks reais. Com a IA avançada do Brentor conectada, o Focus 2.0 processa cada frase do seu conteúdo — extraindo fatos, não opiniões — e gera análise completamente fiel ao documento.</div></div>
    </div>`);

    const toolbar = makeResultToolbar(body, wrap, 'Focus2-'+p.date.slice(0,10), () => B.router.go('focus'));
    body.innerHTML = ''; body.appendChild(toolbar); body.appendChild(wrap);
    wireToolbar(toolbar, wrap, 'Focus 2.0 — '+p.date.slice(0,10), 'Focus');

    // botão de Display
    toolbar.querySelector('[data-display]')?.addEventListener('click', () => {
      B.router.go('display', { seed:{ type:'analysis', company:{ name:'Focus '+p.ver } } });
    });
  }

  /* ── helpers de toolbar ────────────────────────────────────── */
  function makeResultToolbar(body, wrap, title, onNew) {
    return el(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn subtle sm" data-x="pdf">${ic.pdf} PDF</button>
        <button class="btn subtle sm" data-x="local">${ic.download} Salvar</button>
        <button class="btn subtle sm" data-x="share">${ic.share} Compartilhar</button>
        <button class="btn ghost sm" data-display>${ic.display} Gerar Display</button>
      </div>
      <button class="btn ghost sm" data-new>${ic.refresh} Nova análise</button></div>`);
  }
  function wireToolbar(toolbar, node, title, toolName) {
    toolbar.querySelector('[data-new]').onclick = () => B.router.go('focus');
    toolbar.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      if (b.dataset.x==='pdf') B.exportPDF(node, title, toolName);
      else if (b.dataset.x==='local') B.exportText(B.nodeText(node), title.replace(/[^\w\-]+/g,'_'));
      else B.share('Brentor.ai · Focus', B.nodeText(node).slice(0,280)+'…');
    });
  }

})(window.Brentor);
