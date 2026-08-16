(function () {
  'use strict';
  const LANGUAGES = {
    en: { label: 'English', locale: 'en-US' }, es: { label: 'Español', locale: 'es-ES' },
    fr: { label: 'Français', locale: 'fr-FR' }, de: { label: 'Deutsch', locale: 'de-DE' },
    pt: { label: 'Português', locale: 'pt-BR' }, it: { label: 'Italiano', locale: 'it-IT' },
    ja: { label: '日本語', locale: 'ja-JP' }, zh: { label: '中文', locale: 'zh-CN' },
    ko: { label: '한국어', locale: 'ko-KR' }, ar: { label: 'العربية', locale: 'ar-SA' }, hi: { label: 'हिन्दी', locale: 'hi-IN' }
  };
  const CURRENCIES = {
    USD: { label: 'US Dollar', symbol: '$', rate: 1, locale: 'en-US' },
    EUR: { label: 'Euro', symbol: '€', rate: 0.92, locale: 'de-DE' },
    GBP: { label: 'British Pound', symbol: '£', rate: 0.79, locale: 'en-GB' },
    CAD: { label: 'Canadian Dollar', symbol: 'CA$', rate: 1.36, locale: 'en-CA' },
    AUD: { label: 'Australian Dollar', symbol: 'A$', rate: 1.52, locale: 'en-AU' },
    JPY: { label: 'Japanese Yen', symbol: '¥', rate: 150.2, locale: 'ja-JP' },
    CNY: { label: 'Chinese Yuan', symbol: 'CN¥', rate: 7.18, locale: 'zh-CN' },
    INR: { label: 'Indian Rupee', symbol: '₹', rate: 83.2, locale: 'en-IN' },
    MXN: { label: 'Mexican Peso', symbol: 'MX$', rate: 18.1, locale: 'es-MX' }
  };
  const REGION_CURRENCY = { US:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'AUD',JP:'JPY',CN:'CNY',HK:'CNY',IN:'INR',MX:'MXN',DE:'EUR',FR:'EUR',ES:'EUR',IT:'EUR',PT:'EUR',NL:'EUR',BE:'EUR',AT:'EUR',IE:'EUR',FI:'EUR',GR:'EUR',BR:'USD',KR:'USD',SA:'USD' };
  const LANG_KEY = 'bondsmall_language';
  const CURRENCY_KEY = 'bondsmall_currency';
  const CURRENCY_MANUAL_KEY = 'bondsmall_currency_manual';
  const AUTO_KEY = 'bondsmall_preferences_initialized';
  const getBaseLanguage = (value) => String(value || '').toLowerCase().split('-')[0].split('_')[0];
  function detectLanguage() {
    const candidates = (navigator.languages || [navigator.language || 'en']).map(getBaseLanguage);
    return candidates.find((x) => LANGUAGES[x]) || 'en';
  }
  function detectRegion() {
    const raw = String((navigator.languages && navigator.languages[0]) || navigator.language || '').replace('_','-');
    const match = raw.match(/-([A-Za-z]{2}|[0-9]{3})$/);
    if (match) return match[1].toUpperCase();
    try { return new Intl.Locale(raw).region || ''; } catch (_) { return ''; }
  }
  function detectCurrency(language) {
    const region = detectRegion();
    return REGION_CURRENCY[region] || ({ ja:'JPY', zh:'CNY', hi:'INR' }[language] || 'USD');
  }
  const storedLanguage = localStorage.getItem(LANG_KEY);
  const storedCurrency = localStorage.getItem(CURRENCY_KEY);
  const storedCurrencyManual = localStorage.getItem(CURRENCY_MANUAL_KEY) === '1';
  const firstVisit = !localStorage.getItem(AUTO_KEY);
  let state = {
    language: LANGUAGES[storedLanguage] ? storedLanguage : (firstVisit ? detectLanguage() : 'en'),
    currency: CURRENCIES[storedCurrency] ? storedCurrency : (firstVisit ? detectCurrency(storedLanguage || detectLanguage()) : 'USD'),
    currencyManual: storedCurrencyManual
  };
  if (!state.currencyManual) state.currency = detectCurrency(state.language);
  localStorage.setItem(AUTO_KEY, '1');
  if (!storedLanguage) localStorage.setItem(LANG_KEY, state.language);
  localStorage.setItem(CURRENCY_KEY, state.currency);
  localStorage.setItem(CURRENCY_MANUAL_KEY, state.currencyManual ? '1' : '0');
  const dictionaries = {
    es: { 'Cart':'Carrito','Account':'Cuenta','Search products...':'Buscar productos...','Shop All':'Comprar todo','Accessories':'Accesorios','Electronics':'Electrónica','Entertainment':'Entretenimiento','Jewelry':'Joyería','Add to Cart':'Añadir al carrito','Browse':'Explorar','Shop by Category':'Comprar por categoría','No products matched your search.':'No hay productos que coincidan con tu búsqueda.','Language':'Idioma','Currency':'Moneda','Automatic':'Automático' },
    fr: { 'Cart':'Panier','Account':'Compte','Search products...':'Rechercher des produits...','Shop All':'Tout voir','Accessories':'Accessoires','Electronics':'Électronique','Entertainment':'Divertissement','Jewelry':'Bijoux','Add to Cart':'Ajouter au panier','Browse':'Parcourir','Shop by Category':'Acheter par catégorie','Language':'Langue','Currency':'Devise','Automatic':'Automatique' },
    de: { 'Cart':'Warenkorb','Account':'Konto','Search products...':'Produkte suchen...','Shop All':'Alles ansehen','Accessories':'Accessoires','Electronics':'Elektronik','Entertainment':'Unterhaltung','Jewelry':'Schmuck','Add to Cart':'In den Warenkorb','Browse':'Durchsuchen','Shop by Category':'Nach Kategorie einkaufen','Language':'Sprache','Currency':'Währung','Automatic':'Automatisch' },
    pt: { 'Cart':'Carrinho','Account':'Conta','Search products...':'Pesquisar produtos...','Shop All':'Ver tudo','Accessories':'Acessórios','Electronics':'Eletrônicos','Entertainment':'Entretenimento','Jewelry':'Joias','Add to Cart':'Adicionar ao carrinho','Browse':'Explorar','Shop by Category':'Comprar por categoria','Language':'Idioma','Currency':'Moeda','Automatic':'Automático' },
    ja: { 'Cart':'カート','Account':'アカウント','Search products...':'商品を検索…','Shop All':'すべて見る','Accessories':'アクセサリー','Electronics':'電子機器','Entertainment':'エンターテインメント','Jewelry':'ジュエリー','Add to Cart':'カートに追加','Browse':'見る','Shop by Category':'カテゴリーから探す','Language':'言語','Currency':'通貨','Automatic':'自動' },
    zh: { 'Cart':'购物车','Account':'账户','Search products...':'搜索商品…','Shop All':'查看全部','Accessories':'配饰','Electronics':'电子产品','Entertainment':'娱乐','Jewelry':'珠宝','Add to Cart':'加入购物车','Browse':'浏览','Shop by Category':'按类别购物','Language':'语言','Currency':'货币','Automatic':'自动' }
  };
  function formatMoney(usd) {
    const c = CURRENCIES[state.currency] || CURRENCIES.USD;
    const value = Number(usd || 0) * c.rate;
    const zeroDecimal = ['JPY','KRW'].includes(state.currency);
    return new Intl.NumberFormat((LANGUAGES[state.language] || LANGUAGES.en).locale, { style:'currency', currency:state.currency, minimumFractionDigits:zeroDecimal ? 0 : 2, maximumFractionDigits:zeroDecimal ? 0 : 2 }).format(value);
  }
  function translateDom() {
    const dict = dictionaries[state.language] || {};
    document.documentElement.lang = state.language;
    document.querySelectorAll('input[placeholder], [aria-label], [title]').forEach((el) => ['placeholder','aria-label','title'].forEach((attr) => { if (dict[el.getAttribute(attr)]) el.setAttribute(attr, dict[el.getAttribute(attr)]); }));
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes=[]; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => { const key=node.nodeValue.trim(); if (dict[key] && node.parentElement && !['SCRIPT','STYLE','OPTION'].includes(node.parentElement.tagName)) node.nodeValue=node.nodeValue.replace(key,dict[key]); });
    document.querySelectorAll('[data-locale-label]').forEach((el) => { const key = el.dataset.localeLabel === 'language' ? 'Language' : 'Currency'; el.textContent = dict[key] || key; });
  }
  function renderControls() {
    if (document.getElementById('bondsmall-locale-controls')) return;
    const host = document.querySelector('.header-actions') || document.body;
    const wrap=document.createElement('div'); wrap.id='bondsmall-locale-controls'; wrap.className='bondsmall-locale-controls';
    wrap.innerHTML='<button type="button" class="bondsmall-locale-toggle" id="bondsmall-locale-toggle" aria-expanded="false" aria-controls="bondsmall-locale-panel" aria-label="Language and currency settings">EN</button><div class="bondsmall-locale-panel" id="bondsmall-locale-panel" hidden><label><span data-locale-label="language">Language</span><select id="bondsmall-language"></select></label><label><span data-locale-label="currency">Currency</span><select id="bondsmall-currency"></select></label><span class="bondsmall-locale-auto" id="bondsmall-locale-auto"></span></div>';
    host.appendChild(wrap);
    const toggle=wrap.querySelector('#bondsmall-locale-toggle'), panel=wrap.querySelector('#bondsmall-locale-panel');
    const close = () => { panel.hidden=true; wrap.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); };
    toggle.addEventListener('click', () => { const open = panel.hidden; panel.hidden=!open; wrap.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); if (open) wrap.querySelector('select')?.focus(); });
    document.addEventListener('click', (event) => { if (!wrap.contains(event.target)) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    const ls=wrap.querySelector('#bondsmall-language'), cs=wrap.querySelector('#bondsmall-currency');
    Object.entries(LANGUAGES).forEach(([k,v])=>ls.add(new Option(v.label,k))); Object.entries(CURRENCIES).forEach(([k,v])=>cs.add(new Option(`${k} — ${v.label}`,k)));
    ls.value=state.language; cs.value=state.currency;
    ls.addEventListener('change',()=>{state.language=ls.value;localStorage.setItem(LANG_KEY,state.language);if(!state.currencyManual){state.currency=detectCurrency(state.language);localStorage.setItem(CURRENCY_KEY,state.currency);}apply();close();});
    cs.addEventListener('change',()=>{state.currency=cs.value;state.currencyManual=true;localStorage.setItem(CURRENCY_KEY,state.currency);localStorage.setItem(CURRENCY_MANUAL_KEY,'1');apply();close();});
  }
  function apply(){ const ls=document.getElementById('bondsmall-language'),cs=document.getElementById('bondsmall-currency'),toggle=document.getElementById('bondsmall-locale-toggle'),auto=document.getElementById('bondsmall-locale-auto'); if(ls)ls.value=state.language;if(cs)cs.value=state.currency;if(toggle){toggle.textContent=state.language.toUpperCase();toggle.setAttribute('aria-label',`${LANGUAGES[state.language].label} language, ${CURRENCIES[state.currency].label} currency`);}if(auto)auto.textContent=state.currencyManual?'':'Automatic currency'; translateDom(); document.dispatchEvent(new CustomEvent('bondsmall-locale-change',{detail:{...state,formatMoney}})); }
  window.BondsmallLocale={formatMoney,get language(){return state.language;},get currency(){return state.currency;},languages:LANGUAGES,currencies:CURRENCIES,setLanguage:(x)=>{if(LANGUAGES[x]){state.language=x;localStorage.setItem(LANG_KEY,x);if(!state.currencyManual){state.currency=detectCurrency(state.language);localStorage.setItem(CURRENCY_KEY,state.currency);}apply();}},setCurrency:(x)=>{if(CURRENCIES[x]){state.currency=x;state.currencyManual=true;localStorage.setItem(CURRENCY_KEY,x);localStorage.setItem(CURRENCY_MANUAL_KEY,'1');apply();}},detectLanguage,detectCurrency};
  document.addEventListener('DOMContentLoaded',()=>{renderControls();apply();});
})();
