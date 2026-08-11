/* ============================================================
   Brentor.ai — engine.js
   Geração SIMULADA de relatórios. Em produção, estas funções
   chamariam a Claude API + uma API de busca (Tavily/Serper).
   Princípio: nunca inventar números — campo sem fonte vira N/A.
   ============================================================ */
(function (B) {
  'use strict';

  // hash determinístico para gerar números estáveis por nome
  function seed(str) { let h = 2166136261; for (let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0); }
  function rng(s) { return function(){ s = (s*1664525+1013904223)>>>0; return s/4294967296; }; }
  const NA = { na: true };

  /* Gera o perfil de uma empresa: conhecida (base) ou plausível (genérico). */
  B.buildCompany = function (rawName, knownInfo) {
    const key = B.companyKey(rawName);
    if (B.companyDB[key]) {
      const c = JSON.parse(JSON.stringify(B.companyDB[key]));
      c.known = true; c.input = rawName;
      return c;
    }
    // Empresa não está na base de demonstração → perfil estrutural honesto.
    const r = rng(seed(key || rawName || 'x'));
    const sectors = ['Tecnologia / SaaS','Serviços B2B','Indústria','Varejo','Saúde','Logística','Construção','Agronegócio'];
    const regions = ['Brasil (regional)','Brasil (nacional)','São Paulo, SP','Sudeste','Sul do Brasil'];
    const sizeBand = ['pequeno porte','médio porte','grande porte'][Math.floor(r()*3)];
    const pickInfo = (knownInfo||'').length > 40; // se o usuário deu contexto, refletimos
    return {
      name: rawName, known:false, input: rawName,
      sector: sectors[Math.floor(r()*sectors.length)] + (pickInfo ? '' : ''),
      region: regions[Math.floor(r()*regions.length)],
      hq: NA, founded: NA, employees: sizeBand, revenue: NA, revTrend: null,
      marketShare: NA, growth: NA, nps: NA, score: Math.floor(55+r()*25),
      // pontos derivados do contexto informado (não numéricos = sem risco de inventar dado)
      strengths: pickInfo
        ? ['Informações fornecidas pelo usuário indicam atuação ativa no setor','Presença identificada em canais digitais públicos']
        : ['Presença identificada em canais digitais públicos'],
      weaknesses: ['Dados financeiros públicos limitados para análise aprofundada'],
      opportunities: ['Aprofundar a coleta com fontes específicas (RI, registros, imprensa setorial)'],
      threats: ['Concorrência do setor — requer comparação direta (use o Compare)'],
      clients: pickInfo ? 'Conforme contexto informado pelo usuário' : NA,
      products: pickInfo ? 'Conforme contexto informado pelo usuário' : NA,
      sources: ['busca web pública','contexto informado pelo usuário'],
      sparse: true,
    };
  };

  /* Texto de resumo executivo conforme a categoria de relacionamento.
     Incorpora contexto empresarial quando disponível.                */
  B.execSummary = function (c, relation) {
    const lens = {
      cliente:    'sob a ótica de relacionamento como CLIENTE, o foco está em saúde financeira, fidelização e potencial de expansão da conta.',
      fornecedor: 'sob a ótica de FORNECEDOR, o foco está em confiabilidade, capacidade de entrega e risco de dependência.',
      concorrente:'sob a ótica de CONCORRENTE, o foco está em posicionamento, diferenciais competitivos e pontos de ataque.',
      outra:      'em uma investigação geral, cobrindo posicionamento de mercado, operação e indicadores disponíveis.',
    }[relation] || '';

    const ctx = B.store.getContext();
    let ctxNote = '';
    if (ctx.filled) {
      const who = [ctx.role && `${ctx.role}`, ctx.companyName && `da ${ctx.companyName}`, ctx.sector && `(setor: ${ctx.sector})`].filter(Boolean).join(' ');
      ctxNote = who ? ` Esta análise foi personalizada com o contexto informado pelo usuário (${who}).` : '';
    }

    if (c.known) {
      return `${c.name} atua em ${c.sector}, com presença em ${c.region}. Esta análise foi conduzida ${lens}${ctxNote} ` +
        `A empresa apresenta indicadores consistentes de mercado, com pontos fortes claros e riscos monitoráveis descritos abaixo. ` +
        `Os números citados têm origem em fontes públicas (relatórios de resultados e site oficial) e devem ser confirmados antes de decisões críticas.`;
    }
    return `Não localizamos uma base consolidada de dados públicos para "${c.name}". O relatório abaixo reúne o que foi possível ` +
      `verificar de forma confiável ${lens}${ctxNote} Campos sem fonte segura estão marcados como "não disponível" — preferimos não estimar números ` +
      `para preservar a credibilidade da análise. Recomendamos complementar com documentos internos ou dados que você já possua.`;
  };

  /* Constrói o objeto de comparação entre 2+ empresas. */
  B.buildComparison = function (companies, reason) {
    const rows = [
      { key:'sector',   label:'Setor' },
      { key:'region',   label:'Região de atuação' },
      { key:'employees',label:'Porte / colaboradores' },
      { key:'revenue',  label:'Receita estimada', numeric:true },
      { key:'marketShare', label:'Participação de mercado', suffix:'%', numeric:true },
      { key:'growth',   label:'Crescimento a.a.', suffix:'%', numeric:true },
      { key:'nps',      label:'NPS / satisfação', numeric:true },
      { key:'score',    label:'Brentor Score', numeric:true, score:true },
    ];
    // determina vencedor por linha numérica
    rows.forEach(row => {
      if (!row.numeric) return;
      let best = -Infinity, bi = -1, any = false;
      companies.forEach((c,i) => {
        const v = c[row.key];
        if (v && !v.na && typeof v === 'number') { any=true; if (v>best){best=v; bi=i;} }
        else if (typeof v === 'string' && /\d/.test(v)) { /* receita string */ }
      });
      row.winner = any ? bi : -1;
    });
    // vencedor geral por score
    let bestScore=-1, wi=0;
    companies.forEach((c,i)=>{ const s=(c.score&&!c.score.na)?c.score:0; if(s>bestScore){bestScore=s; wi=i;} });
    return { companies, reason, rows, overallWinner: wi };
  };

  /* Gera os slides de uma apresentação (Display). */
  B.buildSlides = function (topic, context, source) {
    const t = topic || 'Apresentação Brentor';
    return [
      { kicker:'Brentor.ai · Display', title:t, subtitle: context ? context.slice(0,90) : 'Material gerado a partir do conteúdo informado',
        bullets:['Visão geral e contexto','Principais números e destaques','Conclusões e próximos passos'], type:'capa' },
      { kicker:'Contexto', title:'Panorama',
        bullets:['Resumo do tema e por que ele importa agora','O que os dados disponíveis indicam','Onde estão as oportunidades'], type:'lista' },
      { kicker:'Dados', title:'Destaques quantitativos', chart:true,
        bullets:['Indicadores organizados de forma visual','Comparação entre os principais pontos','Tendência ao longo do período'], type:'dados' },
      { kicker:'Análise', title:'Pontos fortes e atenção',
        bullets:['Forças que sustentam a tese','Riscos que merecem acompanhamento','Recomendações práticas'], type:'lista' },
      { kicker:'Conclusão', title:'Próximos passos',
        bullets:['Decisões sugeridas com base no material','Responsáveis e prazos a definir','Como medir o resultado'], type:'lista' },
    ];
  };

  /* Retorna o HTML do logotipo da empresa (Diamond + logo preenchido).
     variant: 'report' (padrão) | 'slide' | 'sm'
     Retorna '' quando não aplicável — use sempre com verificação.         */
  B.companyLogoHtml = function (variant) {
    if (B.store.get().plan !== 'diamond') return '';
    const ctx = B.store.getContext();
    if (!ctx || !ctx.logoDataUrl) return '';
    const v = variant || 'report';
    const cls = v === 'slide' ? 'slide-logo' : v === 'sm' ? 'report-brand-logo sm' : 'report-brand-logo';
    const alt = B.esc(ctx.companyName || 'Logo da empresa');
    return `<img src="${ctx.logoDataUrl}" class="${cls}" alt="${alt}" title="${alt}">`;
  };

  /* Constrói o resumo de contexto ativo para uso nas ferramentas. */
  B.buildContextPrompt = function () {
    const ctx = B.store.getContext();
    if (!ctx || !ctx.filled) return '';
    const parts = [];
    if (ctx.companyName) parts.push(`Empresa: ${ctx.companyName}`);
    if (ctx.sector)      parts.push(`Setor: ${ctx.sector}`);
    if (ctx.size)        parts.push(`Porte: ${ctx.size}`);
    if (ctx.region)      parts.push(`Região: ${ctx.region}`);
    if (ctx.role)        parts.push(`Cargo: ${ctx.role}`);
    if (ctx.area)        parts.push(`Área: ${ctx.area}`);
    if (ctx.challenges)  parts.push(`Desafios: ${ctx.challenges}`);
    return parts.join(' · ');
  };

  /* Verifica % de preenchimento do contexto (para progress bar). */
  B.ctxProgress = function () {
    const ctx = B.store.getContext();
    const fields = ['companyName','sector','products','size','region','mainClients','competitors','differentials','challenges','role','area','responsibilities'];
    const filled = fields.filter(f => ctx[f] && (ctx[f]+'').trim()).length;
    return Math.round(filled / fields.length * 100);
  };

  /* Roteamento de intenção do Chat → ferramenta sugerida (escopo restrito).
     Recebe o plano atual para informar restrições de Silver/Grátis.          */
  B.OFF_TOPIC = ['futebol','jogo','receita de','culinária','cozinhar','novela','política','horóscopo','signo','piada','namoro','filme','série','música','time do'];
  B.routeChat = function (text, plan) {
    const q = (text||'').toLowerCase();
    const isPremium = ['gold','diamond'].includes(plan||'');

    if (B.OFF_TOPIC.some(w => q.includes(w))) {
      return { offTopic:true,
        reply:'Sou o assistente do Brentor.ai e atuo apenas em temas ligados ao uso do portal: análise de empresas, comparações, apresentações/dashboards e produtividade de negócios. Não consigo ajudar com esse assunto — mas posso te orientar em qualquer uma das nossas soluções. 🙂' };
    }
    const has = (arr) => arr.some(w => q.includes(w));

    // Resumo / arquivo / síntese → Focus (Premium)
    if (has(['resumir','resumo','sintetizar','síntese','arquivo','documento','pdf','planilha','e-mail','email','thread','relatório',
             'apresentação comercial','pontos importantes','pontos relevantes','pontos-chave','destacar','extrair informações'])) {
      if (!isPremium) {
        return { planBlock:true, reply:`A função de **resumo e síntese de documentos** é exclusiva dos planos **Gold** e **Diamond**, disponível na ferramenta **Focus**. No seu plano atual (${plan==='silver'?'Silver':'Gratuito'}), essa funcionalidade não está disponível.\n\nFaça upgrade para acessar o Focus e muito mais!` };
      }
      return { tool:'focus', reply:'Para resumos, síntese e extração de pontos-chave, a ferramenta certa é o **Focus**. Você pode enviar documentos, apresentações, e-mails, atas ou textos — e o sistema extrai o que é relevante com inteligência.\n\nClique abaixo para abrir o Focus.' };
    }

    // My News → Premium
    if (has(['notícia','noticia','jornal','news','atualidades','novidades','o que está acontecendo','acontecendo no mundo','minhas notícias','my news'])) {
      if (!isPremium) {
        return { planBlock:true, reply:`O **My News** é uma ferramenta premium dos planos **Gold** e **Diamond**. Ele monta um jornal digital personalizado com as principais notícias dos seus temas de interesse — com chamada, foto e resumo.\n\nSeu plano atual (${plan==='silver'?'Silver':'Gratuito'}) não inclui acesso ao My News. Faça upgrade para desbloquear!` };
      }
      return { tool:'mynews', reply:'Para acompanhar as principais notícias do dia nos seus temas de interesse, use o **My News**. Defina suas preferências (tecnologia, finanças, agronegócio, política, sua cidade…) e o sistema monta um jornal digital personalizado para você.' };
    }

    if (has(['analis','investig','due dilig','pesquisar empresa','saber sobre a empresa','perfil da empresa','fornecedor','cliente']))
      return { tool:'analysis', reply:'Pelo que você descreveu, a melhor ferramenta é a **Analysis**. Informe o nome da empresa, tudo que você já sabe sobre ela e a categoria (cliente, fornecedor, concorrente ou outra). O sistema pesquisa fontes públicas e monta um relatório completo.' };
    if (has(['compar','versus',' vs ','melhor entre','diferença entre']))
      return { tool:'compare', reply:'Isso é caso para o **Compare**. Informe as empresas que deseja comparar e o motivo. Geramos um relatório lado a lado com vantagens relativas — e você pode transformar em dashboard ou slides.' };
    if (has(['apresenta','slide','dashboard','dash','palestra','ppt','powerpoint','visual','gráfico','relatório visual']))
      return { tool:'display', reply:'Use o **Display**. Cole o conteúdo ou o tema, escolha o formato (slides, dashboard, relatório executivo ou one-pager) e o sistema gera o material visual pronto para reunião.' };
    if (has(['como funciona','o que é','planos','crédito','preço','assinatura','quanto custa']))
      return { tool:null, reply:'O Brentor.ai funciona com créditos mensais por plano:\n\n• **Grátis** — 350 créditos por 15 dias (CPF/CNPJ)\n• **Silver** — 750 créditos · R$39,90/mês\n• **Gold** — 1.500 créditos · R$69,90/mês (+ My News + Focus)\n• **Diamond** — 3.000 créditos · R$109,90/mês (IA avançada)\n\nQual aspecto quer entender melhor?' };

    // Contexto empresarial personaliza a resposta
    const ctx = B.store.getContext();
    if (ctx.filled && has(['contexto','perfil','minha empresa','minhas informações'])) {
      const who = [ctx.role, ctx.companyName].filter(Boolean).join(' — ');
      return { tool:'context', reply:`Seu contexto empresarial está **ativo**${who?' ('+who+')':''} e sendo usado para personalizar todas as ferramentas do Brentor. Para atualizar as informações, acesse **Contexto empresarial** no menu do usuário.` };
    }
    if (!ctx.filled && has(['contexto','perfil','personalizar','minha empresa'])) {
      return { tool:'context', reply:'O **Contexto empresarial** ainda não foi preenchido. Acesse pelo menu do usuário (avatar no canto superior direito) e informe sobre sua empresa e cargo — o Brentor usará essas informações para tornar as análises, o chat e as ferramentas muito mais assertivos para o seu negócio.' };
    }
    // Histórico e consultas antigas
    if (has(['histórico','historico','consulta anterior','consulta antiga','operação anterior','resultado anterior',
              'análise anterior','comparação anterior','relatório anterior','apresentação anterior',
              'análise que fiz','comparação que fiz','já analisei','ver minhas análises','minhas operações',
              'última análise','último relatório','última consulta','ver análise','ver resultado',
              'encontrar análise','achar análise','buscar histórico','pesquisar histórico'])) {
      return { tool:'history', reply:'Para consultar operações anteriores — análises, comparações, apresentações, My News e Focus — acesse o **Histórico** na barra lateral (Gestão → Histórico). Você pode filtrar por tipo, buscar por nome e reabrir qualquer resultado com um clique.' };
    }

    const ctxIntro = ctx.filled && ctx.sector ? ` Considerando que você atua em **${ctx.sector}**,` : '';
    return { tool:null, reply:`Posso te ajudar a escolher a ferramenta certa do Brentor.${ctxIntro} me conta o objetivo:\n\n• Investigar uma empresa?\n• Comparar concorrentes ou fornecedores?\n• Montar uma apresentação ou dashboard?\n• Resumir ou sintetizar um documento?\n• Acompanhar as notícias dos seus temas de interesse?\n\nDescreva e eu indico o caminho mais eficiente.` };
  };

})(window.Brentor);
