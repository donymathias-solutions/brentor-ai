/* ============================================================
   Brentor.ai — api.js
   Cliente frontend para o servidor real (Node.js + Claude).
   Detecta automaticamente se o servidor está ativo.
   Quando não está, o portal mantém o modo demonstração.
   ============================================================ */
(function (B) {
  'use strict';

  /* Estado da conexão com o servidor real */
  B.aiMode = { active: false, tavily: false, checked: false };

  /* Detecta servidor ao carregar */
  async function detectServer() {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data.ai) {
          B.aiMode = { active: true, tavily: data.tavily, checked: true, models: data.models };
          console.log('[Brentor.ai] ✅ IA ativa —', data.tavily ? 'busca web: sim' : 'busca web: não');
          // Indica no portal
          document.addEventListener('DOMContentLoaded', () => showAiBanner());
          if (document.readyState !== 'loading') showAiBanner();
        }
      }
    } catch { /* servidor não encontrado — modo demo */ }
    B.aiMode.checked = true;
  }

  function showAiBanner() {
    // Atualiza o chip de status na topbar com indicador de IA real
    const chip = document.getElementById('onlineChip');
    if (chip && B.aiMode.active) {
      chip.innerHTML = `<span class="dotpulse" style="background:var(--green)"></span> IA ativa${B.aiMode.tavily ? ' + busca web' : ''}`;
    }
  }

  detectServer();

  /* ── Helper: POST genérico para a API ───────────────────── */
  async function post(endpoint, body) {
    const res = await fetch('/api/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Erro na API');
    return data;
  }

  async function postForm(endpoint, formData) {
    const res = await fetch('/api/' + endpoint, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Erro na API');
    return data;
  }

  /* ── API pública ─────────────────────────────────────────── */
  B.api = {

    /* Análise de empresa */
    async analyze(name, info, relation, deep, links, files) {
      const fd = new FormData();
      fd.append('name', name || '');
      fd.append('info', info || '');
      fd.append('relation', relation || '');
      fd.append('deep', deep ? '1' : '');
      fd.append('links', JSON.stringify(links || []));
      fd.append('context', JSON.stringify(B.store.hasContext() ? B.store.getContext() : {}));
      (files || []).forEach(f => fd.append('files', f));
      return postForm('analyze', fd);
    },

    /* Comparação de empresas */
    async compare(names, reason, links, files) {
      const fd = new FormData();
      fd.append('names', JSON.stringify(names || []));
      fd.append('reason', reason || '');
      fd.append('links', JSON.stringify(links || []));
      fd.append('context', JSON.stringify(B.store.hasContext() ? B.store.getContext() : {}));
      (files || []).forEach(f => fd.append('files', f));
      return postForm('compare', fd);
    },

    /* Chat */
    async chat(message, chatHistory) {
      return post('chat', {
        message,
        plan: B.store.get().plan,
        history: (chatHistory || []).slice(-8),
        context: B.store.hasContext() ? B.store.getContext() : null,
      });
    },

    /* My News — jornal digital personalizado */
    async mynews(topics, scope, version, userName, exclude) {
      return post('mynews', {
        topics: topics || [],
        scope: scope || 'br',
        version: version || '1.0',
        userName: userName || '',
        exclude: exclude || [],
        context: B.store.hasContext() ? B.store.getContext() : null,
      });
    },

    /* Leitura completa de uma matéria */
    async readnews(url) {
      return post('readnews', { url });
    },

    /* Focus */
    async focus(content, objective, audience, version, urls, files) {
      const fd = new FormData();
      fd.append('content', content || '');
      fd.append('objective', objective || '');
      fd.append('audience', audience || 'geral');
      fd.append('version', version || '1.0');
      fd.append('urls', JSON.stringify(urls || []));
      fd.append('context', JSON.stringify(B.store.hasContext() ? B.store.getContext() : {}));
      (files || []).forEach(f => fd.append('files', f));
      return postForm('focus', fd);
    },

    /* Display */
    async display(topic, content, outputType, seed, files) {
      const fd = new FormData();
      fd.append('topic', topic || '');
      fd.append('content', content || '');
      fd.append('outputType', outputType || '');
      fd.append('seed', JSON.stringify(seed || null));
      fd.append('context', JSON.stringify(B.store.hasContext() ? B.store.getContext() : {}));
      (files || []).forEach(f => fd.append('files', f));
      return postForm('display', fd);
    },

    /* Solve */
    async solve(topic) {
      return post('solve', {
        topic,
        context: B.store.hasContext() ? B.store.getContext() : null,
      });
    },
  };

})(window.Brentor);
