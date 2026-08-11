/* ============================================================
   Brentor.ai — ui.js
   Componentes reutilizáveis: toast, modal, status (progresso),
   gráficos e exportação (PDF/local/compartilhar).
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon;
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  B.el = el;
  B.esc = (s) => String(s==null?'':s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  /* ---------- Toast ---------- */
  let toastWrap;
  B.toast = function (msg, type='success', ms=3200) {
    if (!toastWrap) { toastWrap = el('<div class="toast-wrap"></div>'); document.body.appendChild(toastWrap); }
    const icons = { success: ic.check, info: ic.info, warn: ic.warn };
    const t = el(`<div class="toast ${type}"><span class="ti">${icons[type]||ic.info}</span><span>${B.esc(msg)}</span></div>`);
    toastWrap.appendChild(t);
    setTimeout(() => { t.style.transition='opacity .25s, transform .25s'; t.style.opacity='0'; t.style.transform='translateY(8px)'; setTimeout(()=>t.remove(), 260); }, ms);
  };

  /* ---------- Modal ---------- */
  B.modal = function ({ title, body, actions, wide }) {
    const overlay = el('<div class="modal-overlay"></div>');
    const m = el(`<div class="modal" ${wide?'style="max-width:620px"':''}>
      <div class="m-head"><h3>${B.esc(title)}</h3><button class="btn-icon close">${ic.x}</button></div>
      <div class="m-body"></div>
      <div class="m-foot"></div></div>`);
    m.querySelector('.m-body').innerHTML = body || '';
    const foot = m.querySelector('.m-foot');
    (actions || [{ label:'Fechar', class:'ghost' }]).forEach(a => {
      const b = el(`<button class="btn ${a.class||'ghost'}">${a.icon?ic[a.icon]:''}${B.esc(a.label)}</button>`);
      b.onclick = () => { if (!a.onClick || a.onClick() !== false) close(); };
      foot.appendChild(b);
    });
    function close() { overlay.style.opacity='0'; setTimeout(()=>overlay.remove(),180); }
    overlay.querySelector ? null : null;
    overlay.appendChild(m);
    m.querySelector('.close').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.body.appendChild(overlay);
    return { close, el: m };
  };

  /* ---------- Painel de status / progresso (transparência) ----------
     steps: [{icon,t}]; chama onDone ao concluir. Mostra o que o
     sistema está fazendo em tempo real.
  -------------------------------------------------------------------*/
  B.runStatus = function (container, steps, { title='Processando sua solicitação', onDone, speed=1, skipCtx=false, waitFor=null } = {}) {
    // injeta step de contexto quando ativo (exceto Chat e onde for suprimido)
    if (!skipCtx && B.store.hasContext()) {
      const ctx = B.store.getContext();
      const co = [ctx.companyName, ctx.sector].filter(Boolean).join(' · ');
      steps = [{ icon:'target', t:`Aplicando contexto da sua empresa${co?' ('+co+')':''}` }, ...steps];
    }
    const panel = el(`<div class="status-panel fade-up">
      <div class="sp-head"><span class="spinner"></span><div><b>${B.esc(title)}</b><div class="muted" style="font-size:12.5px">Mantendo você a par de cada etapa — sem caixa-preta.</div></div></div>
      <div class="steps"></div>
      <div class="bar progress-bar"><i style="width:0%"></i></div>
    </div>`);
    const stepsBox = panel.querySelector('.steps');
    const barFill = panel.querySelector('.progress-bar > i');
    steps.forEach((s,i) => stepsBox.appendChild(el(
      `<div class="step" data-i="${i}"><span class="dot">${ic[s.icon]||ic.bolt}</span><span class="t">${B.esc(s.t)}</span></div>`)));
    container.innerHTML = ''; container.appendChild(panel);
    // O formulário preenchido some (some tela) — rola pro topo pra mostrar o progresso
    // e, na sequência, o resultado logo abaixo do título da ferramenta.
    window.scrollTo({ top: 0, behavior: 'smooth' });

    let i = 0;
    const total = steps.length;
    /* Acompanha o tempo real da API: se waitFor for fornecida, as etapas se
       adaptam — desaceleram enquanto a API trabalha e aceleram quando termina. */
    let apiDone = !waitFor;
    if (waitFor) Promise.resolve(waitFor).then(()=>{ apiDone = true; }, ()=>{ apiDone = true; });
    const durations = steps.map((_, idx) => {
      const base = 2200 + (idx / Math.max(total-1,1)) * 3500; // 2.2s → 5.7s gradual
      return (base + Math.random() * 1200) / speed;
    });
    const waitMsgs = [
      'Cruzando informações entre as fontes…',
      'Estruturando o conteúdo…',
      'Refinando a análise…',
      'Verificando consistência dos dados…',
      'Ajustando os detalhes visuais…',
      'Validando números e referências…',
      'Revisando a qualidade do resultado…',
      'Quase lá — finalizando os últimos detalhes…',
      'Aplicando o acabamento final…',
    ];
    function activate(idx) {
      const node = stepsBox.querySelector(`.step[data-i="${idx}"]`);
      if (!node) return;
      node.classList.add('active');
      node.querySelector('.dot').innerHTML = '<span class="mini-spin"></span>';
    }
    function complete(idx) {
      const node = stepsBox.querySelector(`.step[data-i="${idx}"]`);
      if (!node) return;
      node.classList.remove('active'); node.classList.add('done');
      node.querySelector('.dot').innerHTML = ic.checkSmall;
      barFill.style.width = Math.round(((idx+1)/total)*100) + '%';
    }
    function finish() {
      panel.querySelector('.spinner').outerHTML = `<span style="color:var(--green)">${ic.check}</span>`;
      panel.querySelector('.sp-head b').textContent = 'Concluído';
      barFill.style.width = '100%';
      setTimeout(async () => { if (onDone) await onDone(); }, 380);
    }
    function tick() {
      if (i >= total) {
        if (apiDone) { finish(); return; }
        /* API ainda trabalhando: mostra mensagens rotativas até concluir.
           Gira mais rápido e por mais mensagens (sem repetir tão cedo) e a barra
           segue avançando aos poucos — evita a sensação de "travado" em esperas longas. */
        const waitStep = el(`<div class="step active fade-up" style="margin-top:6px"><span class="dot"><span class="mini-spin"></span></span><span class="t" style="color:var(--brand-300)">${B.esc(waitMsgs[0])}</span></div>`);
        stepsBox.appendChild(waitStep);
        let pct = 96;
        barFill.style.width = pct + '%';
        barFill.classList.add('pulse');
        let w = 1;
        const poll = setInterval(() => {
          if (apiDone) {
            clearInterval(poll);
            waitStep.classList.remove('active'); waitStep.classList.add('done');
            waitStep.querySelector('.dot').innerHTML = ic.checkSmall;
            barFill.classList.remove('pulse');
            finish();
            return;
          }
          waitStep.querySelector('.t').textContent = waitMsgs[w % waitMsgs.length];
          w++;
          if (pct < 99) { pct += 0.5; barFill.style.width = pct + '%'; }
        }, 3200);
        return;
      }
      activate(i);
      /* Adaptação ao tempo real: API já terminou → acelera; é a última etapa
         e a API ainda roda → segura nela em vez de cair no "finalizando". */
      let dur = durations[i];
      if (apiDone) dur = Math.min(dur, 450);
      const isLast = i === total - 1;
      const proceed = () => { complete(i); i++; setTimeout(tick, 200); };
      setTimeout(() => {
        if (isLast && !apiDone) {
          /* segura a última etapa por até 8s; se a API ainda não respondeu,
             segue para as mensagens rotativas de finalização */
          const hold = setInterval(() => { if (apiDone) { clearInterval(hold); proceed(); } }, 300);
          setTimeout(() => { clearInterval(hold); if (!apiDone) proceed(); else return; }, 8000);
        } else proceed();
      }, dur);
    }
    setTimeout(tick, 400);
    return panel;
  };

  /* ---------- Gráficos ---------- */
  B.charts = {
    bars(title, rows) { // rows: [{label,value,max,fill}]
      const max = Math.max(...rows.map(r => r.max || r.value), 1);
      return `<div class="chart-card"><h4>${B.esc(title)}</h4><div class="barchart">${
        rows.map(r => `<div class="row"><span class="lbl" title="${B.esc(r.label)}">${B.esc(r.label)}</span>
          <span class="track"><i class="${r.fill||'fill-a'}" style="width:${Math.min(100,Math.round((r.value/(r.max||max))*100))}%"></i></span>
          <span class="val" title="${B.esc(r.display!=null?r.display:r.value)}">${B.esc(r.display!=null?r.display:r.value)}</span></div>`).join('')
      }</div></div>`;
    },
    donut(title, segs) { // segs: [{label,value,color}]
      const total = segs.reduce((s,x)=>s+x.value,0) || 1;
      let acc = 0; const stops = segs.map(s => { const a=acc/total*360, b=(acc+s.value)/total*360; acc+=s.value; return `${s.color} ${a}deg ${b}deg`; }).join(', ');
      return `<div class="chart-card"><h4>${B.esc(title)}</h4><div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(${stops})"><div class="ctr"><b>${total}</b><span>total</span></div></div>
        <div class="legend">${segs.map(s=>`<div class="li"><span class="sw" style="background:${s.color}"></span>${B.esc(s.label)}<b>${s.value}</b></div>`).join('')}</div>
      </div></div>`;
    },
    line(title, points, color='var(--brand-400)') { // points: [numbers]
      const w=320, h=90, pad=6;
      const min=Math.min(...points), max=Math.max(...points), span=(max-min)||1;
      const step=(w-pad*2)/(points.length-1||1);
      const xy = points.map((p,i)=>[pad+i*step, h-pad-((p-min)/span)*(h-pad*2)]);
      const d = xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
      const area = d+` L ${xy[xy.length-1][0].toFixed(1)} ${h-pad} L ${pad} ${h-pad} Z`;
      return `<div class="chart-card"><h4>${B.esc(title)}</h4><div class="linechart">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:96px">
          <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
          <path d="${area}" fill="url(#lg)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${xy.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${color}"/>`).join('')}
        </svg></div></div>`;
    },
  };

  /* ---------- Linha de custo em créditos (transparência) ---------- */
  B.costRow = function (actionKey) {
    const c = B.creditCost[actionKey]; if (!c) return '';
    return `<div class="cost-row"><span class="coin">${ic.coin}</span>
      <span>Esta ação consome <b>${c.total} créditos</b> — pesquisa web <b>${c.web}</b> + processamento de IA <b>${c.ai}</b>.</span>
    </div>`;
  };

  /* ---------- Exportação ---------- */
  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }
  B.exportText = function (text, name) { downloadBlob(text, name+'.txt', 'text/plain;charset=utf-8'); B.toast('Arquivo .txt salvo localmente','success'); };
  B.exportJSON = function (obj, name) { downloadBlob(JSON.stringify(obj,null,2), name+'.json', 'application/json'); B.toast('Arquivo .json exportado','success'); };

  /* Exporta um nó como HTML autocontido (abre/imprime → "PDF"). */
  B.exportHTML = function (node, title) {
    const css = document.querySelector('link[href*="styles.css"]');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${B.esc(title)}</title>
      <link rel="stylesheet" href="${css?css.href:''}"><style>body{padding:30px;max-width:960px;margin:auto}</style></head>
      <body>${node.outerHTML}</body></html>`;
    downloadBlob(html, title.replace(/[^\w\-]+/g,'_')+'.html', 'text/html;charset=utf-8');
    B.toast('HTML salvo — abra no navegador para visualizar','success');
  };

  /* "Gerar PDF": abre janela de impressão com só o conteúdo do relatório. */
  B.exportPDF = function (node, title, toolName) {
    const w = window.open('', '_blank');
    if (!w) { B.toast('Permita pop-ups para gerar o PDF','warn'); return; }
    const cssHref = (document.querySelector('link[href*="styles.css"]')||{}).href || '';
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${B.esc(title)}</title>
      <link rel="stylesheet" href="${cssHref}">
      <style>
      /* ===== Tema de impressão Brentor — claro, profissional ===== */
      /* margem padrão em todos os lados para o texto não colar na borda do papel */
      @page{margin:18mm 18mm 20mm 18mm}
      :root{
        --bg-900:#fff;--bg-800:#fff;--bg-700:#fff;--bg-600:#f1f5f9;
        --surface:#fff;--surface-2:#f6f8fb;--line:#d8dfeb;--line-soft:#e6eaf2;
        --brand-700:#1e3a8a;--brand-600:#1d4ed8;--brand-500:#2563eb;--brand-400:#1d4ed8;--brand-300:#1e40af;--brand-glow:transparent;
        --accent:#0e7490;--accent-soft:rgba(14,116,144,.08);
        --text:#111827;--text-soft:#374151;--text-mute:#6b7280;--text-faint:#9ca3af;
        --text-300:#374151;--text-400:#6b7280;--muted:#6b7280;--cyan:#0e7490;
        --green:#047857;--amber:#b45309;--red:#b91c1c;
        --green-soft:rgba(4,120,87,.07);--amber-soft:rgba(180,83,9,.07);--red-soft:rgba(185,28,28,.07);
        --shadow:none;--shadow-lg:none;
      }
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact;
        animation:none!important;transition:none!important;opacity:1!important;transform:none!important;
        box-shadow:none!important;text-shadow:none!important}
      html,body{background:#fff!important;color:#111827!important;padding:0;margin:0;font-size:13px;line-height:1.55}
      body :is(.toolbar,.next-cta,.btn,.menu,button,.dots,.thumbs,.slide-nav){display:none!important}

      /* Cabeçalho do documento */
      .pdf-head{display:flex;align-items:center;gap:12px;border-bottom:3px solid #1d4ed8;padding-bottom:12px;margin-bottom:24px}
      .pdf-head img{height:34px;width:auto}
      .pdf-head span{color:#6b7280;font-size:11px;margin-left:auto}

      /* Cartões e seções */
      .card{background:#fff!important;border:none!important;border-radius:0!important;padding:0!important}
      .card .card{border:1px solid #e6eaf2!important;border-radius:10px!important;padding:12px 14px!important;background:#fafbfd!important}
      .pad-lg{padding:0!important}
      .report-head{border-bottom:1px solid #e6eaf2;padding-bottom:16px;margin-bottom:6px}
      .report-head h2{color:#111827!important;font-size:24px!important;letter-spacing:-.4px}
      .report-logo{box-shadow:none!important}
      .report-section{margin-top:22px;break-inside:auto}
      .report-section h3{color:#1e3a8a!important;font-size:13px!important;text-transform:uppercase;letter-spacing:.8px;
        border-bottom:1px solid #e6eaf2;padding-bottom:7px;margin-bottom:12px;break-after:avoid}
      .report-section h3 .ico{color:#1d4ed8!important}
      .prose p{color:#1f2937!important;font-size:12.5px;line-height:1.7;margin:0 0 10px;text-align:justify}

      /* KPIs, fatos, listas */
      .kpi{background:#f6f8fb!important;border:1px solid #e6eaf2!important}
      .kpi .k-lbl{color:#6b7280!important}.kpi .k-val{font-size:18px!important}.kpi .k-sub{color:#6b7280!important}
      .fact{border-bottom:1px dashed #e6eaf2}
      .fact .f-k{color:#6b7280!important}.fact .f-v{color:#111827!important}
      ul li,ol li{color:#1f2937}
      .source-pill{background:#f1f5f9!important;border:1px solid #dbe2ec!important;color:#334155!important}
      .credibility{background:#f8fafc!important;border:1px solid #e6eaf2!important;color:#475569!important;font-size:11px!important}
      .muted,.na{color:#6b7280!important}

      /* Tabelas */
      table,.compare-table{border-collapse:collapse;width:100%}
      .compare-table th{background:#f1f5f9!important;color:#1e3a8a!important;border:1px solid #e2e8f0!important;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
      .compare-table td{border:1px solid #e9edf4!important;color:#1f2937!important}
      .compare-table td.winner{background:rgba(4,120,87,.06)!important}
      .win-tag{background:#047857!important;color:#fff!important}

      /* Itens Focus */
      .ps-item,.focus-bullet{break-inside:avoid}
      .ps-content,.focus-bullet{color:#1f2937!important}
      .ps-phase .ph-tag{border:1px solid #dbe2ec!important;color:#1e3a8a!important;background:#f6f8fb!important}
      .focus-section,.ps-section{background:#fff!important;border:none!important;padding:0!important;margin-top:20px}
      .fs-head h3,.ps-sec-head h3{color:#1e3a8a!important}
      .fs-num,.ps-num{background:#1d4ed8!important;color:#fff!important}

      /* My News — jornal */
      .mn-masthead{border-bottom:2px solid #111827!important}
      .mn-mast-title{color:#111827!important}
      .mn-mast-title span{color:#1d4ed8!important}
      .mn-mast-sub,.mn-mast-lead,.mn-mast-edition{color:#374151!important}
      .mn-article{background:#fff!important;border:1px solid #e6eaf2!important;break-inside:avoid;color:#111827!important;display:block!important}
      .mn-headline{color:#111827!important}
      .mn-summary{color:#374151!important}
      .mn-source,.mn-read{color:#6b7280!important}
      .mn-topic-tag{background:#eff4ff!important;color:#1d4ed8!important;border:1px solid #dbe6ff!important}
      .mn-read{display:none!important}

      /* Gráficos e slides */
      .chart-card{background:#fafbfd!important;border:1px solid #e6eaf2!important}
      .chart-card h4{color:#374151!important}
      .track{background:#e6eaf2!important}
      .slide{background:#fff!important;border:1px solid #e6eaf2!important;color:#111827!important}
      .slide h1,.slide h2{color:#111827!important}

      /* Quebras de página limpas */
      .kpi,.fact,.chart-card,.s-kpi-card,.thumb,.ps-phase,.cost-row,blockquote{break-inside:avoid}
      .kpi-grid,.fact-list,.grid{break-inside:auto}
      h1,h2,h3,h4{break-after:avoid}
      </style></head><body>
      <div class="pdf-head"><img src="${location.origin}/assets/img/brentor-logo.png" alt="Brentor.ai"><span>${B.esc(title)} · Gerado em ${new Date().toLocaleString('pt-BR')}</span></div>
      ${node.outerHTML}</body></html>`);
    w.document.close();
    // troca a URL exibida no rodapé de impressão ("about:blank") por um rótulo legível
    try {
      const footerLabel = `Brentor.ai-Gerado-pela-ferramenta-${(toolName||'Brentor').replace(/\s+/g,'-')}`;
      w.history.replaceState(null, '', location.origin + '/' + footerLabel);
    } catch (e) {}
    setTimeout(() => { w.focus(); w.print(); }, 600);
    B.toast('Abrindo geração de PDF (use "Salvar como PDF")','info');
  };

  /* "Baixar PDF (slides)": imprime CADA slide como uma página paisagem 16:9 separada,
     preservando o tema escuro real da apresentação (diferente do exportPDF genérico,
     que usa o tema claro de relatório). slidesHtml = array de HTML (um por slide, já
     com --fit aplicado pelo chamador). */
  B.exportSlidesPDF = function (slidesHtml, title) {
    const w = window.open('', '_blank');
    if (!w) { B.toast('Permita pop-ups para gerar o PDF','warn'); return; }
    const cssHref = (document.querySelector('link[href*="styles.css"]')||{}).href || '';
    const pages = slidesHtml.map(html => `<div class="slide-page"><div class="slide">${html}</div></div>`).join('');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${B.esc(title)}</title>
      <link rel="stylesheet" href="${cssHref}">
      <style>
        @page { size: landscape; margin: 0; }
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact;animation:none!important;transition:none!important}
        html,body{margin:0;background:#0b1120}
        .slide-page{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0b1120;
          page-break-after:always;break-after:page}
        .slide-page:last-child{page-break-after:auto;break-after:auto}
        .slide{width:100%;height:100%;aspect-ratio:unset;border-radius:0;border:none}
      </style></head><body>${pages}
      <script>
        (function(){
          function fit(el){ let f=1; el.style.setProperty('--fit', f);
            while (el.scrollHeight > el.clientHeight+1 && f>0.5){ f=+(f-0.05).toFixed(2); el.style.setProperty('--fit', f); } }
          function run(){ document.querySelectorAll('.slide-page .slide').forEach(fit); }
          window.addEventListener('load', run);
          document.querySelectorAll('img').forEach(function(img){ if(!img.complete) img.addEventListener('load', run); });
        })();
      <\/script>
      </body></html>`);
    w.document.close();
    try {
      const footerLabel = `Brentor.ai-Apresentacao-${(title||'Brentor').replace(/\s+/g,'-')}`;
      w.history.replaceState(null, '', location.origin + '/' + footerLabel);
    } catch (e) {}
    setTimeout(() => { w.focus(); w.print(); }, 900);
    B.toast('Abrindo geração de PDF da apresentação — use orientação paisagem e "Salvar como PDF"','info');
  };

  /* "Baixar PPTX": gera um arquivo .pptx nativo (editável no PowerPoint) a partir dos
     dados dos slides — via PptxGenJS (carregado por CDN em index.html). Mapeia cada
     layout visual para formas/textos nativos; imagens de fontes externas podem falhar
     por CORS ao serem embutidas — nesse caso o slide fica só com o texto, sem quebrar
     a exportação inteira. */
  B.exportSlidesPPTX = async function (slidesData, title) {
    if (typeof PptxGenJS === 'undefined') { B.toast('Gerador de PPTX indisponível — verifique sua conexão e tente novamente','warn'); return; }
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'BRENTOR_16x9', width: 13.333, height: 7.5 });
    pptx.layout = 'BRENTOR_16x9';
    const DARK='0B1120', CARD='1A2438', LINE='2A3550', ACCENT='22D3EE', BRAND='3B82F6',
      TEXT='F1F5F9', MUTED='94A3B8', GREEN='34D399', RED='F87171';
    const W = 13.333, PAD = 0.7;

    function baseSlide(s) {
      const pS = pptx.addSlide();
      pS.background = { color: DARK };
      if (s.kicker) pS.addText(String(s.kicker).toUpperCase(), { x:PAD, y:0.35, w:W-2*PAD, h:0.35, fontSize:12, color:ACCENT, bold:true, charSpacing:2 });
      return pS;
    }
    function addTitle(pS, text, opts) {
      pS.addText(text||'', Object.assign({ x:PAD, y:0.75, w:W-2*PAD, h:1.0, fontSize:26, color:TEXT, bold:true }, opts||{}));
    }
    async function tryAddImage(pS, opts) {
      try { pS.addImage(opts); } catch (e) { /* imagem externa pode falhar por CORS — ignora */ }
    }

    for (const s of slidesData) {
      try {
        switch (s.layout) {
          case 'cover': {
            const pS = pptx.addSlide(); pS.background = { color: DARK };
            pS.addText(s.title||'', { x:0.5, y:2.6, w:W-1, h:1.3, fontSize:40, color:TEXT, bold:true, align:'center' });
            if (s.subtitle) pS.addText(s.subtitle, { x:1, y:3.9, w:W-2, h:0.8, fontSize:16, color:MUTED, align:'center' });
            break;
          }
          case 'image_split': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const hasImg = !!s.image;
            const bx = hasImg ? 6.6 : PAD, bw = hasImg ? W-6.6-PAD : W-2*PAD;
            if (hasImg) await tryAddImage(pS, { path: s.image, x:PAD, y:1.9, w:5.4, h:4.6, sizing:{ type:'cover', w:5.4, h:4.6 } });
            (s.bullets||[]).forEach((b,i)=> pS.addText('•  '+b, { x:bx, y:2.0+i*0.9, w:bw, h:0.8, fontSize:15, color:TEXT }));
            break;
          }
          case 'kpi': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const items = (s.kpis||[]).slice(0,4); const n = items.length||1;
            const cw = (W-2*PAD-(n-1)*0.3)/n;
            items.forEach((k,i)=>{
              const x = PAD + i*(cw+0.3);
              pS.addShape('roundRect', { x, y:2.1, w:cw, h:3.3, fill:{color:CARD}, line:{color:LINE} });
              pS.addText(String(k.value||''), { x, y:2.6, w:cw, h:1, fontSize:26, color:ACCENT, bold:true, align:'center' });
              pS.addText(String(k.label||''), { x:x+0.15, y:3.7, w:cw-0.3, h:0.8, fontSize:12, color:MUTED, align:'center' });
              if (k.detail) pS.addText(String(k.detail), { x:x+0.15, y:4.5, w:cw-0.3, h:0.6, fontSize:10.5, color: k.trend==='down'?RED:GREEN, align:'center' });
            });
            break;
          }
          case 'chart_bar': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const items = (s.chart?.items||[]).slice(0,6);
            if (items.length) pS.addChart(pptx.ChartType.bar, [{ name: s.title||'Dados', labels: items.map(i=>String(i.label||'').slice(0,30)), values: items.map(i=>+i.value||0) }],
              { x:PAD, y:1.9, w:W-2*PAD, h:4.7, barDir:'bar', chartColors:[BRAND], showValue:true, dataLabelColor:TEXT, catAxisLabelColor:MUTED, valAxisHidden:true, catAxisLineColor:LINE });
            break;
          }
          case 'chart_donut': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const segs = s.chart?.segments||[];
            if (segs.length) pS.addChart(pptx.ChartType.doughnut, [{ name: s.title||'Distribuição', labels: segs.map(g=>g.label), values: segs.map(g=>+g.value||0) }],
              { x:PAD, y:1.9, w:W-2*PAD, h:4.7, chartColors: segs.map(g=>(g.color||'#3b82f6').replace('#','')), dataLabelColor:TEXT, showLegend:true, legendColor:MUTED });
            break;
          }
          case 'meter': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            (s.meters||[]).slice(0,5).forEach((m,i)=>{
              const y = 2.1+i*0.85, barX = PAD+3.4, barW = W-2*PAD-3.4-0.9;
              pS.addText(String(m.label||''), { x:PAD, y, w:3.2, h:0.5, fontSize:12.5, color:TEXT, align:'right', valign:'middle' });
              pS.addShape('roundRect', { x:barX, y:y+0.08, w:barW, h:0.34, fill:{color:'1E293B'}, line:{type:'none'} });
              const pct = Math.min(100,Math.max(0,m.value||0))/100;
              if (pct>0) pS.addShape('roundRect', { x:barX, y:y+0.08, w:barW*pct, h:0.34, fill:{color:(m.color||'#3b82f6').replace('#','')}, line:{type:'none'} });
              pS.addText((m.value||0)+'%', { x:W-PAD-0.85, y, w:0.85, h:0.5, fontSize:12.5, color:TEXT, bold:true, valign:'middle' });
            });
            break;
          }
          case 'bullets': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            (s.bullets||[]).forEach((b,i)=> pS.addText('•  '+b, { x:PAD, y:2.1+i*0.75, w:W-2*PAD, h:0.7, fontSize:16, color:TEXT }));
            break;
          }
          case 'icon_grid': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const items = (s.items||[]).slice(0,6); const cols=3; const cw=(W-2*PAD-2*0.3)/cols;
            items.forEach((it,i)=>{
              const col=i%cols, row=Math.floor(i/cols);
              const x=PAD+col*(cw+0.3), y=2.1+row*1.7;
              pS.addShape('roundRect', { x, y, w:cw, h:1.5, fill:{color:CARD}, line:{color:LINE} });
              pS.addText(String(it.title||''), { x:x+0.15, y:y+0.15, w:cw-0.3, h:0.4, fontSize:13, color:TEXT, bold:true });
              pS.addText(String(it.desc||''), { x:x+0.15, y:y+0.55, w:cw-0.3, h:0.85, fontSize:10.5, color:MUTED });
            });
            break;
          }
          case 'comparison': case 'two_column': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            const cols = s.layout==='two_column'
              ? [{ heading:s.left?.heading, items:s.left?.items||[] }, { heading:s.right?.heading, items:s.right?.items||[] }]
              : (s.columns||[]);
            const n = cols.length||1; const cw=(W-2*PAD-(n-1)*0.3)/n;
            cols.forEach((col,i)=>{
              const x = PAD+i*(cw+0.3);
              pS.addShape('roundRect', { x, y:2.0, w:cw, h:4.6, fill:{color:CARD}, line:{color:LINE} });
              pS.addText(String(col.heading||''), { x:x+0.2, y:2.15, w:cw-0.4, h:0.5, fontSize:14, color:ACCENT, bold:true });
              (col.items||[]).forEach((it,j)=> pS.addText('•  '+it, { x:x+0.2, y:2.75+j*0.6, w:cw-0.4, h:0.55, fontSize:11.5, color:TEXT }));
            });
            break;
          }
          case 'quote': {
            const pS = baseSlide(s);
            pS.addText('"'+(s.quote||'')+'"', { x:1, y:2.6, w:W-2, h:1.8, fontSize:22, italic:true, color:TEXT, align:'center' });
            if (s.attribution) pS.addText('— '+s.attribution, { x:1, y:4.5, w:W-2, h:0.5, fontSize:13, color:MUTED, align:'right' });
            break;
          }
          case 'timeline': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            (s.timeline||[]).slice(0,5).forEach((t,i)=>{
              const y = 2.1+i*0.85;
              pS.addText(String(t.period||''), { x:PAD, y, w:1.6, h:0.6, fontSize:13, color:ACCENT, bold:true });
              pS.addText(String(t.event||''), { x:PAD+1.8, y, w:W-2*PAD-1.8, h:0.7, fontSize:13, color:TEXT });
            });
            break;
          }
          case 'big_number': {
            const pS = baseSlide(s);
            if (s.title) addTitle(pS, s.title, { align:'center', fontSize:20 });
            pS.addText(String(s.number||''), { x:1, y:2.6, w:W-2, h:1.8, fontSize:56, color:ACCENT, bold:true, align:'center' });
            if (s.caption) pS.addText(s.caption, { x:1.5, y:4.5, w:W-3, h:0.8, fontSize:14, color:MUTED, align:'center' });
            break;
          }
          case 'closing': {
            const pS = baseSlide(s); addTitle(pS, s.title);
            (s.bullets||[]).forEach((b,i)=> pS.addText('✓  '+b, { x:PAD, y:2.1+i*0.7, w:W-2*PAD, h:0.65, fontSize:15, color:TEXT }));
            if (s.closing_message) pS.addText(s.closing_message, { x:PAD, y:2.1+(s.bullets||[]).length*0.7+0.3, w:W-2*PAD, h:1, fontSize:15, italic:true, color:ACCENT });
            break;
          }
          default: {
            const pS = baseSlide(s); addTitle(pS, s.title||'');
            (s.bullets||[]).forEach((b,i)=> pS.addText('•  '+b, { x:PAD, y:2.1+i*0.7, w:W-2*PAD, h:0.65, fontSize:14, color:TEXT }));
          }
        }
      } catch (e) { console.warn('[pptx] falha ao montar slide', s.layout, e); }
    }

    try {
      await pptx.writeFile({ fileName: (title||'Apresentacao_Brentor').replace(/[^\w\-]+/g,'_') + '.pptx' });
      B.toast('Apresentação exportada em .pptx','success');
    } catch (e) {
      B.toast('Erro ao gerar o .pptx: '+e.message,'warn');
    }
  };

  /* Compartilhar (Web Share API → fallback copiar). */
  B.share = function (title, text) {
    if (navigator.share) { navigator.share({ title, text }).catch(()=>{}); return; }
    navigator.clipboard?.writeText(`${title}\n\n${text}`).then(()=>B.toast('Conteúdo copiado para compartilhar','success'),
      ()=>B.toast('Não foi possível copiar','warn'));
  };

  /* Helper: extrai texto plano de um relatório para export .txt */
  B.nodeText = function (node) {
    return node.innerText.replace(/\n{3,}/g,'\n\n').trim();
  };

})(window.Brentor);
