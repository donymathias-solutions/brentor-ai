/* ============================================================
   Brentor.ai — config.js
   Namespace global, ícones, dados simulados e regras de crédito.
   (Sem build: scripts clássicos compartilham window.Brentor)
   ============================================================ */
window.Brentor = window.Brentor || {};
(function (B) {
  'use strict';

  /* ---------- Ícones (SVG inline, stroke currentColor) ---------- */
  const S = (p, o) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${(o&&o.w)||2}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  B.icon = {
    shield: S('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>'),
    analysis: S('<path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-5"/><circle cx="7" cy="14" r="1.2"/><circle cx="10" cy="11" r="1.2"/><circle cx="13" cy="14" r="1.2"/><circle cx="18" cy="9" r="1.2"/>'),
    compare: S('<path d="M12 3v18"/><path d="M6 8 3 11l3 3"/><path d="m18 8 3 3-3 3"/><path d="M3 11h6M15 11h6"/>'),
    display: S('<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 12V9M11 12V7M15 12v-2"/>'),
    chat: S('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/>'),
    solve: S('<path d="M9.5 2 8 7l-5 1.5L8 10l1.5 5L11 10l5-1.5L11 7Z"/><path d="m18 14 .8 2.6L21.5 17l-2.7.4L18 20l-.8-2.6L14.5 17l2.7-.4Z"/>'),
    home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>'),
    account: S('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>'),
    admin: S('<path d="M12 2 4 6v6c0 5 8 8 8 8s8-3 8-8V6Z"/><path d="m9 12 2 2 4-4"/>'),
    send: S('<path d="m4 12 16-7-7 16-2-7Z"/>'),
    coin: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.2c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7c0 2.4-5 1.2-5 3.7 0 1 .9 1.8 2.5 1.8s2.5-.7 2.5-1.6"/>'),
    web: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>'),
    doc: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
    pdf: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M8.5 16v-2.5h1a1 1 0 1 1 0 2h-1m4-1.5V18m0-4h1.5m-1.5 2h1"/>',{w:1.6}),
    download: S('<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    share: S('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    check: S('<path d="m5 12 5 5 9-11"/>'),
    checkSmall: S('<path d="m5 12 4 4 10-12"/>',{w:2.5}),
    arrow: S('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
    chevL: S('<path d="m15 6-6 6 6 6"/>'),
    chevR: S('<path d="m9 6 6 6-6 6"/>'),
    chevD: S('<path d="m6 9 6 6 6-6"/>'),
    x: S('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    spark: S('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    bolt: S('<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>'),
    file: S('<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z"/><path d="M13 3v6h6"/>'),
    paperclip: S('<path d="M21 11.5 12 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 5 5L10 17a1.6 1.6 0 0 1-2.5-2L15 7.5"/>'),
    chart: S('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17v-4M12 17V8M16 17v-7"/>'),
    slides: S('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
    grid: S('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    report: S('<path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 11h8M8 15h6"/>'),
    users: S('<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M18 14h.5a4 4 0 0 1 4 4v.5"/>'),
    revenue: S('<path d="M3 17l5-5 4 3 7-8"/><path d="M16 4h5v5"/>'),
    activity: S('<path d="M3 12h4l3 8 4-16 3 8h4"/>'),
    map: S('<path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z"/><path d="M9 3v16M15 5v16"/>'),
    star: S('<path d="m12 3 2.6 5.6L21 9.3l-4.5 4.3L17.6 21 12 17.6 6.4 21l1.1-7.4L3 9.3l6.4-.7Z"/>'),
    warn: S('<path d="M12 3 2 20h20Z"/><path d="M12 9v5M12 17.5v.5"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>'),
    target: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>'),
    building: S('<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>'),
    logout: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
    settings: S('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18A14 14 0 0 1 12 3Z"/>'),
    lock: S('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    eye: S('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    trend: S('<path d="M3 17l6-6 4 4 8-9"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    layers: S('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>',{w:1.7}),
    menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    refresh: S('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'),
    flag: S('<path d="M4 21V4M4 4h13l-2 4 2 4H4"/>'),
    handshake: S('<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2l-1-1 1 1a1.4 1.4 0 0 0 2-2l-3-3 1-3-5 1-4-2-4 2v6l3 3"/>',{w:1.6}),
    lightning: S('<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13Z"/>'),
    focus: S('<path d="M3 5h18M3 9h12M3 13h8M3 17h10"/><circle cx="17" cy="15" r="4"/><path d="m20 18 2 2"/>',{w:1.8}),
    zap2: S('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    listcheck: S('<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 2 2 4-4M3 12l2 2 4-4M3 18l2 2 4-4"/>'),
    summarize: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><circle cx="12" cy="14" r="2.5"/><path d="M12 11.5v-2M12 16.5v-1"/>'),
    brain: S('<path d="M12 5a3 3 0 1 0-5.9.8A2.5 2.5 0 0 0 6 10.5V12"/><path d="M12 5a3 3 0 1 1 5.9.8A2.5 2.5 0 0 1 18 10.5V12"/><path d="M6 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2"/><path d="M6 12v3a6 6 0 0 0 12 0v-3"/><path d="M8 14v2M16 14v2M12 14v3"/>',{w:1.6}),
    chess: S('<path d="M9 3h6M12 3v4M8 7h8l-1 8H9ZM7 19h10l-1-4H8ZM4 22h16"/>'),
    puzzle: S('<path d="M19 11V9a2 2 0 0 0-2-2h-2V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2H7a2 2 0 0 0-2 2v2H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2Z"/>',{w:1.6}),
    upload: S('<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M12 3v12m0-12-4 4m4-4 4 4"/>'),
    id: S('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M8 14s0-3 4-3 4 3 4 3"/><circle cx="12" cy="8" r="2"/><path d="M2 10h4M18 10h4"/>'),
    image: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
    crown: S('<path d="M2 20h20M5 20 3 8l5 4 4-7 4 7 5-4-2 12"/>'),
    news: S('<path d="M4 4h13a1 1 0 0 1 1 1v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2Z"/><path d="M18 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2"/><path d="M8 8h6M8 12h6M8 16h4"/>',{w:1.7}),
    external: S('<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    maximize: S('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/>'),
    minimize: S('<path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M21 16h-3a2 2 0 0 0-2 2v3M3 16h3a2 2 0 0 1 2 2v3"/>'),
    sun: S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/>'),
    plane: S('<path d="M10.5 13.5 2 11l1.5-2 7 1.5 5.5-5.5a2 2 0 0 1 3 3L13.5 13.5 15 20.5l-2 1.5-2.5-8Z"/>',{w:1.6}),
    heart: S('<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z"/>',{w:1.7}),
    utensils: S('<path d="M5 3v7a2 2 0 0 0 4 0V3M7 12v9M16 3c-1.7 0-3 1.8-3 4.5S14.3 12 16 12v9"/>',{w:1.7}),
  };

  /* ---------- Planos ---------- */
  B.plans = {
    free:    { id:'free',    name:'Grátis',  price:0,     credits:350,  color:'#34d399', trialDays:15, requiresDoc:true,
      features:['350 créditos por 15 dias','Acesso às 4 soluções básicas','Exportação em PDF e local','1 conta por CPF/CNPJ','Suporte por e-mail'] },
    silver:  { id:'silver',  name:'Silver',  price:39.90, credits:750,  color:'#cbd5e1',
      features:['750 créditos por mês','Acesso às 4 soluções','Exportação em PDF e local','Histórico de 30 dias','Suporte por e-mail'] },
    gold:    { id:'gold',    name:'Gold',    price:69.90, credits:1500, color:'#fbbf24', featured:true,
      features:['1.500 créditos por mês','Acesso às 4 soluções','My News 1.0 (jornal das notícias do Brasil)','Focus 1.0 (síntese de conteúdo)','Exportação PDF, slides e dashboard','Histórico de 90 dias','Suporte prioritário'] },
    diamond: { id:'diamond', name:'Diamond', price:109.90, credits:3000, color:'#22d3ee',
      features:['3.000 créditos por mês','Tudo do Gold','My News 2.0 (notícias do Brasil + internacionais)','Focus 2.0 (análise estratégica com IA avançada)','Relatórios aprofundados (deep search)','Histórico ilimitado','Marca personalizada nos relatórios'] },
  };

  /* ---------- Pacotes de créditos extras ---------- */
  B.creditPacks = [
    { credits:150, price:14.90, tag:'Menor preço' },
    { credits:500, price:34.90, tag:'Mais popular' },
    { credits:1200, price:64.90, tag:'Melhor custo benefício' },
  ];

  /* ---------- Modelo de custo de créditos (demonstrativo) ----------
     Cada ação estima: buscas na web + tokens Claude → créditos.
     Mantemos margem para o portal se sustentar. 1 crédito ≈ R$0,08 de valor de venda.
  -------------------------------------------------------------------*/
  B.creditValueBRL = 0.0798;        // valor de venda médio por crédito (planos)
  B.internalCostPerCredit = 0.031;  // custo interno estimado (API+busca) por crédito

  // custo em créditos por tipo de ação + composição (transparência)
  B.creditCost = {
    analysis:      { total: 54, web: 22, ai: 32, label:'Análise de empresa' },
    analysisDeep:  { total: 84, web: 38, ai: 46, label:'Análise aprofundada (deep search)' },
    compare:       { total: 86, web: 36, ai: 50, label:'Comparação de empresas' },
    display_slides:{ total: 36, web: 5,  ai: 31, label:'Apresentação em slides' },
    display_dash:  { total: 41, web: 7,  ai: 34, label:'Dashboard visual' },
    display_report:{ total: 31, web: 4,  ai: 27, label:'Relatório executivo' },
    chat_msg:       { total: 4,  web: 0,  ai: 4,  label:'Mensagem no Chat Brentor' },
    chat_file:      { total: 11, web: 0,  ai: 11, label:'Resumo de arquivo' },
    solve:          { total: 18, web: 6,  ai: 12, label:'Direcionamento (Solve)' },
    mynewsv1:       { total: 40, web: 24, ai: 16, label:'My News 1.0 — jornal de notícias do Brasil' },
    mynewsv2:       { total: 70, web: 40, ai: 30, label:'My News 2.0 — jornal Brasil + internacional (IA avançada)' },
    focusv1:        { total: 30, web: 2,  ai: 28, label:'Focus 1.0 — síntese e pontos-chave' },
    focusv2:        { total: 66, web: 5,  ai: 61, label:'Focus 2.0 — análise estratégica profunda (IA avançada)' },
    file_analysis:  { total: 10, web: 0,  ai: 10, label:'Leitura de arquivo' },
  };

  /* ---------- Limites de histórico por plano ---------- */
  B.historyDays = { free: 15, silver: 30, gold: 90, diamond: Infinity };
  B.historyLabels = { free:'15 dias (trial)', silver:'30 dias', gold:'90 dias', diamond:'Ilimitado' };

  B.fmtBRL = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');
  B.fmtNum = (v) => v.toLocaleString('pt-BR');

  /* ---------- Categorias de relacionamento (Analysis) ---------- */
  B.relations = [
    { id:'cliente',     label:'Cliente',     icon:'handshake', hint:'Entender saúde financeira, fidelidade e potencial de expansão.' },
    { id:'fornecedor',  label:'Fornecedor',  icon:'building',  hint:'Avaliar confiabilidade, capacidade de entrega e risco de dependência.' },
    { id:'concorrente', label:'Concorrente', icon:'target',    hint:'Mapear posicionamento, diferenciais e pontos de ataque.' },
    { id:'outra',       label:'Outra',       icon:'flag',      hint:'Investigação geral, due diligence ou prospecção.' },
  ];

  /* ---------- My News — status steps ---------- */
  B.statusSteps_mn1 = [
    { icon:'account', t:'Lendo seu perfil e temas de interesse' },
    { icon:'web',     t:'Varrendo fontes de notícias de boa reputação no Brasil' },
    { icon:'layers',  t:'Selecionando as matérias mais relevantes de hoje' },
    { icon:'news',    t:'Montando sua edição personalizada do My News' },
  ];
  B.statusSteps_mn2 = [
    { icon:'account', t:'Lendo seu perfil, contexto e temas de interesse' },
    { icon:'web',     t:'Varrendo fontes nacionais e internacionais de alta reputação' },
    { icon:'globe',   t:'Cruzando notícias do Brasil e do exterior' },
    { icon:'layers',  t:'Curando e priorizando as matérias mais relevantes' },
    { icon:'image',   t:'Selecionando imagens e chamadas de capa' },
    { icon:'news',    t:'Montando sua edição premium do My News' },
  ];

  /* ---------- My News — temas sugeridos ---------- */
  B.newsTopics = [
    { id:'tecnologia',   label:'Tecnologia',           icon:'spark' },
    { id:'financas',     label:'Finanças & Mercado',   icon:'revenue' },
    { id:'economia',     label:'Economia',             icon:'trend' },
    { id:'negocios',     label:'Negócios & Empresas',  icon:'building' },
    { id:'agronegocio',  label:'Agronegócio',          icon:'map' },
    { id:'politica',     label:'Política',             icon:'flag' },
    { id:'ia',           label:'Inteligência Artificial',icon:'spark' },
    { id:'educacao',     label:'Educação',             icon:'target' },
    { id:'mundo',        label:'Mundo / Internacional',icon:'globe' },
    { id:'esportes',     label:'Esportes',             icon:'activity' },
    { id:'saude',        label:'Saúde',                icon:'shield' },
    { id:'ciencia',      label:'Ciência',              icon:'bolt' },
    { id:'startups',     label:'Startups & Inovação',  icon:'lightning' },
    { id:'industria',    label:'Indústria',            icon:'settings' },
    { id:'energia',      label:'Energia',              icon:'activity' },
    { id:'varejo',       label:'Varejo & Consumo',     icon:'handshake' },
    { id:'juridico',     label:'Jurídico & Tributário',icon:'doc' },
    { id:'viagens',      label:'Viagens',              icon:'plane' },
    { id:'bemestar',     label:'Bem-estar',            icon:'heart' },
    { id:'gastronomia',  label:'Gastronomia',          icon:'utensils' },
  ];

  /* ---------- Validadores CPF / CNPJ ---------- */
  B.validCPF = function (v) {
    v = (v||'').replace(/\D/g,'');
    if (v.length !== 11 || /^(\d)\1+$/.test(v)) return false;
    let s=0; for (let i=0;i<9;i++) s += +v[i]*(10-i);
    let r=s*10%11; if(r===10||r===11) r=0; if(r!==+v[9]) return false;
    s=0; for (let i=0;i<10;i++) s += +v[i]*(11-i);
    r=s*10%11; if(r===10||r===11) r=0; return r===+v[10];
  };
  B.validCNPJ = function (v) {
    v = (v||'').replace(/\D/g,'');
    if (v.length !== 14 || /^(\d)\1+$/.test(v)) return false;
    const w1=[5,4,3,2,9,8,7,6,5,4,3,2], w2=[6,5,4,3,2,9,8,7,6,5,4,3,2];
    const d1 = v.slice(0,12).split('').reduce((s,n,i)=>s+ +n*w1[i],0)%11;
    const r1 = d1<2?0:11-d1; if(r1!==+v[12]) return false;
    const d2 = v.slice(0,13).split('').reduce((s,n,i)=>s+ +n*w2[i],0)%11;
    const r2 = d2<2?0:11-d2; return r2===+v[13];
  };
  B.fmtDoc = function (v) {
    v = (v||'').replace(/\D/g,'');
    if (v.length===11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
    if (v.length===14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
    return v;
  };

  /* ---------- Focus — status steps ---------- */
  B.statusSteps_f1 = [
    { icon:'file',   t:'Lendo e classificando o conteúdo enviado' },
    { icon:'search', t:'Identificando estrutura e tipo de documento' },
    { icon:'layers', t:'Extraindo pontos-chave e informações relevantes' },
    { icon:'doc',    t:'Estruturando resumo e destaques objetivos' },
  ];
  B.statusSteps_f2 = [
    { icon:'file',   t:'Lendo conteúdo com IA avançada (modelo aprimorado)' },
    { icon:'web',    t:'Acessando e lendo links e URLs informados' },
    { icon:'search', t:'Classificando tipo, contexto e audiência do documento' },
    { icon:'layers', t:'Extraindo dados, KPIs e métricas mencionadas' },
    { icon:'target', t:'Analisando implicações estratégicas e riscos' },
    { icon:'spark',  t:'Identificando oportunidades e alertas críticos' },
    { icon:'doc',    t:'Montando a análise estratégica completa' },
  ];

  /* ---------- Etapas de status por ferramenta (transparência) ---------- */
  B.statusSteps = {
    analysis: [
      { icon:'search', t:'Interpretando a solicitação e a categoria informada' },
      { icon:'web',    t:'Pesquisando na web fontes públicas sobre a empresa' },
      { icon:'layers', t:'Cruzando dados: site, redes, registros e notícias' },
      { icon:'chart',  t:'Estruturando números e indicadores de mercado' },
      { icon:'doc',    t:'Gerando o relatório detalhado e validando fontes' },
    ],
    compare: [
      { icon:'search', t:'Interpretando o objetivo da comparação' },
      { icon:'web',    t:'Pesquisando dados públicos de cada empresa' },
      { icon:'layers', t:'Normalizando métricas para comparação justa' },
      { icon:'compare',t:'Calculando vantagens relativas e diferenças' },
      { icon:'doc',    t:'Montando o relatório comparativo' },
    ],
    display: [
      { icon:'search', t:'Lendo o conteúdo e o tema informado' },
      { icon:'layers', t:'Organizando a narrativa em blocos visuais' },
      { icon:'chart',  t:'Construindo gráficos e elementos de design' },
      { icon:'display',t:'Renderizando o material visual' },
    ],
    solve: [
      { icon:'search', t:'Analisando o tema e o contexto' },
      { icon:'spark',  t:'Avaliando caminhos e recomendações' },
    ],
  };

  /* ---------- Base simulada de empresas (para demonstração) ----------
     Quando o nome não está aqui, geramos um perfil plausível marcando
     campos sem fonte como "não disponível" (preserva credibilidade).
  -------------------------------------------------------------------*/
  B.companyDB = {
    'magalu': {
      name:'Magazine Luiza', sector:'Varejo / E-commerce', region:'Brasil (nacional)', hq:'Franca, SP',
      founded:'1957', employees:'~35.000', revenue:'R$ 36,2 bi (2024)', revTrend:[28,31,35,36.2],
      marketShare:14, growth:8.5, nps:62, score:78,
      strengths:['Ecossistema digital + lojas físicas integrado (omnichannel)','Marca forte e ampla base de clientes','Logística própria (Magalog) com boa capilaridade'],
      weaknesses:['Margem pressionada pela concorrência de marketplaces','Endividamento elevado em ciclos de juros altos','Dependência do mercado interno'],
      opportunities:['Expansão de serviços financeiros (Magalu Pay)','Crescimento do marketplace 3P','Publicidade (retail media)'],
      threats:['Concorrência de Mercado Livre, Amazon e Shopee','Sensibilidade a juros e ao consumo','Pressão sobre frete e prazos'],
      clients:'Consumidor final (B2C), pequenos lojistas no marketplace',
      products:'Eletro, móveis, eletrônicos, serviços financeiros, marketplace',
      sources:['site oficial','relatório de resultados (RI)','notícias de mercado'],
    },
    'natura': {
      name:'Natura &Co', sector:'Cosméticos / Beleza', region:'Brasil + América Latina', hq:'São Paulo, SP',
      founded:'1969', employees:'~22.000', revenue:'R$ 26,7 bi (2024)', revTrend:[24,25.5,26,26.7],
      marketShare:11, growth:5.2, nps:70, score:74,
      strengths:['Marca com forte apelo de sustentabilidade','Venda direta com milhões de consultoras','Portfólio multimarcas (Natura, Avon)'],
      weaknesses:['Integração custosa da Avon','Exposição cambial','Reestruturação recente do portfólio'],
      opportunities:['Digitalização da venda direta','Crescimento em mercados latino-americanos','Linhas premium e refis'],
      threats:['Concorrência de marcas globais','Variação cambial','Mudança de hábito de consumo'],
      clients:'Consumidor final, rede de consultoras de beleza',
      products:'Cosméticos, perfumaria, cuidados pessoais',
      sources:['site oficial','relatório de resultados (RI)'],
    },
    'localiza': {
      name:'Localiza', sector:'Locação de veículos / Mobilidade', region:'Brasil + América do Sul', hq:'Belo Horizonte, MG',
      founded:'1973', employees:'~22.000', revenue:'R$ 30,1 bi (2024)', revTrend:[18,24,28,30.1],
      marketShare:35, growth:12.4, nps:68, score:83,
      strengths:['Líder de mercado com escala de frota','Forte gestão de seminovos','Poder de compra junto às montadoras'],
      weaknesses:['Alta necessidade de capital (CAPEX)','Sensível a juros e preço de veículos'],
      opportunities:['Eletrificação da frota','Assinatura de carros','Expansão regional'],
      threats:['Concorrência e novos entrantes','Juros elevados','Volatilidade do mercado de usados'],
      clients:'Pessoa física, empresas (gestão de frotas), agências',
      products:'Aluguel diário, terceirização de frotas, seminovos, assinatura',
      sources:['site oficial','relatório de resultados (RI)'],
    },
  };

  /* normaliza chave de busca */
  B.companyKey = (name) => (name||'').toLowerCase().trim().replace(/\s+/g,' ')
    .replace(/magazine luiza|magalu/, 'magalu')
    .replace(/natura.*/, 'natura')
    .replace(/localiza.*/, 'localiza');

  B.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  B.now = () => new Date();
  B.fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  B.initials = (s) => (s||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();

})(window.Brentor);
