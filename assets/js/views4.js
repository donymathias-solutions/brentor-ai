/* ============================================================
   Brentor.ai — views4.js  (Histórico)
   ============================================================ */
(function (B) {
  'use strict';
  const ic = B.icon, el = B.el, esc = B.esc, store = B.store;

  /* Meta de cada tipo: ícone, classe, rótulo legível */
  const TYPE_META = {
    analysis:   { icon:'analysis',  cls:'ic-blue',   label:'Analysis',    color:'var(--brand-400)' },
    compare:    { icon:'compare',   cls:'ic-cyan',   label:'Compare',     color:'var(--accent)' },
    display:    { icon:'display',   cls:'ic-violet', label:'Display',     color:'#a78bfa' },
    mynews:     { icon:'news',      cls:'ic-cyan',   label:'My News',     color:'#22d3ee' },
    focus:      { icon:'focus',     cls:'ic-green',  label:'Focus',       color:'var(--green)' },
    chat:       { icon:'chat',      cls:'ic-green',  label:'Chat',        color:'var(--green)' },
  };
  const ALL_TYPES = Object.keys(TYPE_META);

  /* Agrupa itens por faixa de data (hoje, esta semana, este mês, mais antigos) */
  function dateBucket(iso) {
    const d = new Date(iso), now = new Date();
    const diffH = (now - d) / 3600000;
    if (diffH < 24) return 'Hoje';
    if (diffH < 48) return 'Ontem';
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return 'Últimos 7 dias';
    if (diffD < 30) return 'Este mês';
    if (diffD < 60) return 'Mês passado';
    return 'Mais antigos';
  }
  const BUCKET_ORDER = ['Hoje','Ontem','Últimos 7 dias','Este mês','Mês passado','Mais antigos'];

  /* ============================================================
     MAIN VIEW
     ============================================================ */
  B.views.history = function (mount, params) {
    const s = store.get();
    const plan = s.plan;
    const days = B.historyDays[plan] || 30;
    const dayLabel = B.historyLabels[plan] || '30 dias';
    const totalStored = s.history.length;
    const hidden = store.getHiddenCount();

    /* Estado da view */
    let activeType = (params && params.type) || 'all';
    let searchVal = '';

    /* ── Render ──────────────────────────────────────────────── */
    mount.innerHTML = `
      <div class="view-head fade-up">
        <h1><span class="tool-ic ic-blue">${ic.clock}</span> Histórico</h1>
        <p>Todas as suas operações organizadas por tipo. Reabra qualquer resultado com um clique. O histórico respeita o limite do seu plano.</p>
      </div>

      <!-- plan bar -->
      <div class="hist-plan-bar fade-up">
        ${ic.clock}
        <span>Plano <b>${B.plans[plan]?.name || plan}</b>: histórico de <b>${dayLabel}</b></span>
        ${hidden > 0 ? `<span class="muted">· ${hidden} operaç${hidden===1?'ão':'ões'} ocultada${hidden===1?'':'s'} por limite do plano</span>` : ''}
        <span class="hpb-right">${totalStored} operaç${totalStored===1?'ão':'ões'} armazenada${totalStored===1?'':'s'}</span>
        ${plan !== 'diamond' ? `<a data-go="account" style="font-size:12px;color:var(--brand-400);cursor:pointer">Aumentar limite →</a>` : ''}
      </div>

      <!-- topbar: busca + filtros -->
      <div class="hist-topbar fade-up">
        <div class="hist-search-wrap">
          ${ic.search}
          <input class="hist-search" id="histSearch" placeholder="Buscar no histórico…" value="${esc(searchVal)}" autocomplete="off">
        </div>
        <div class="hist-tabs" id="histTabs"></div>
      </div>

      <!-- lista -->
      <div id="histList"></div>`;

    /* Constrói as abas de tipo com contagem */
    function buildTabs() {
      const tabs = mount.querySelector('#histTabs');
      tabs.innerHTML = '';
      const allCount = store.getFilteredHistory({ search: searchVal }).length;
      const makeTab = (type, label, count) => {
        const b = el(`<button class="hist-tab ${activeType===type?'on':''}" data-t="${type}">${label}${count!==null?`<span class="hist-count">${count}</span>`:''}</button>`);
        b.onclick = () => { activeType = type; buildTabs(); renderList(); };
        tabs.appendChild(b);
      };
      makeTab('all', 'Todos', allCount);
      ALL_TYPES.forEach(t => {
        const cnt = store.getFilteredHistory({ type: t, search: searchVal }).length;
        if (cnt > 0) makeTab(t, TYPE_META[t].label, cnt);
      });
    }

    /* Renderiza a lista de itens agrupados por data */
    function renderList() {
      const items = store.getFilteredHistory({ type: activeType === 'all' ? null : activeType, search: searchVal });
      const listEl = mount.querySelector('#histList');

      if (!items.length) {
        listEl.innerHTML = `<div class="hist-empty-state">
          <div class="hes-ic">${ic.clock}</div>
          <h3>${searchVal ? 'Nenhum resultado encontrado' : 'Histórico vazio'}</h3>
          <p>${searchVal ? `Nenhuma operação corresponde a "<b>${esc(searchVal)}</b>". Tente outros termos.`
            : activeType !== 'all' ? `Você ainda não usou o ${TYPE_META[activeType]?.label||activeType}.`
            : 'Use as soluções do portal e cada operação será salva aqui automaticamente.'}</p>
          ${searchVal ? `<button class="btn ghost sm" style="margin-top:14px" id="clearSearch">${ic.x} Limpar busca</button>` : ''}
        </div>`;
        listEl.querySelector('#clearSearch')?.addEventListener('click', () => {
          searchVal = ''; mount.querySelector('#histSearch').value = ''; buildTabs(); renderList();
        });
        return;
      }

      /* Agrupa por bucket */
      const grouped = {};
      items.forEach(h => {
        const b = dateBucket(h.date);
        if (!grouped[b]) grouped[b] = [];
        grouped[b].push(h);
      });

      listEl.innerHTML = '';
      BUCKET_ORDER.forEach(bucket => {
        if (!grouped[bucket]) return;
        const sep = el(`<div class="hist-date-sep">${esc(bucket)}</div>`);
        listEl.appendChild(sep);
        const section = el('<div class="hist-list"></div>');
        grouped[bucket].forEach(h => section.appendChild(buildCard(h)));
        listEl.appendChild(section);
      });
    }

    /* Constrói um card de item do histórico */
    function buildCard(h) {
      const meta = TYPE_META[h.type] || { icon:'doc', cls:'ic-blue', label:h.type, color:'var(--brand-400)' };
      const isRecent = (Date.now() - new Date(h.date)) < 48 * 3600000;
      const card = el(`<div class="hist-card">
        <span class="hc-ic ${meta.cls}">${ic[meta.icon] || ic.doc}</span>
        <div class="hc-body">
          <div class="hc-title">${esc(h.title)}</div>
          <div class="hc-sub">
            <span class="hc-type" style="background:${meta.color}1a;color:${meta.color};border:1px solid ${meta.color}30">${meta.label}</span>
            ${h.subtitle ? `<span>${esc(h.subtitle)}</span>` : ''}
            <span>${B.fmtDate(h.date)}</span>
            ${isRecent ? `<span class="hist-48h-note">${ic.spark} Recente</span>` : ''}
          </div>
        </div>
        <div class="hc-acts">
          <button class="btn-icon" data-open title="Reabrir resultado">${ic.eye}</button>
          <button class="btn-icon" data-exp title="Exportar">${ic.download}</button>
          <button class="btn-icon" data-del style="color:var(--text-faint)" title="Excluir">${ic.x}</button>
        </div>
      </div>`);

      card.querySelector('[data-open]').onclick = () => {
        if (B.views[h.type]) B.router.go(h.type, { reopen: h });
        else B.toast('Não foi possível reabrir este tipo de operação','warn');
      };

      card.querySelector('[data-exp]').onclick = () => {
        const title = h.title.replace(/[^\w\- ]/g, '').slice(0, 40).trim() || 'operacao';
        const content = JSON.stringify({ tipo: h.type, titulo: h.title, data: h.date, subtitulo: h.subtitle }, null, 2);
        B.exportJSON(h.payload || {}, title);
      };

      card.querySelector('[data-del]').onclick = () => {
        B.modal({
          title: 'Excluir operação?',
          body: `<p>Tem certeza que deseja excluir <b>${esc(h.title)}</b> do seu histórico?</p><p class="muted" style="font-size:13px;margin-top:8px">Esta ação não pode ser desfeita.</p>`,
          actions: [
            { label: 'Excluir', class: 'primary', onClick: () => {
              store.removeHistoryDirect(h.id);
              buildTabs();
              renderList();
              B.toast('Operação removida do histórico', 'info');
            }},
            { label: 'Cancelar', class: 'ghost' },
          ],
        });
      };

      return card;
    }

    /* Busca em tempo real */
    const searchInput = mount.querySelector('#histSearch');
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchVal = searchInput.value.trim();
        buildTabs(); renderList();
      }, 220);
    });

    /* Link "Aumentar limite" */
    mount.querySelector('[data-go="account"]')?.addEventListener('click', () => B.router.go('account'));

    /* Render inicial */
    buildTabs();
    renderList();

    /* Foco automático na busca */
    setTimeout(() => searchInput.focus(), 120);
  };

})(window.Brentor);
