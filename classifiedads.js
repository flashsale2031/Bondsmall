/*
 * ClassifiedAds browser adapter.
 * Ported from the safe listing-preparation portions of classifiedads.py.
 * It does not solve CAPTCHA, collect credentials, bypass safeguards, or auto-submit Publish.
 * The adapter records selectors and prepares drafts; it never stores user-entered CAPTCHA or contact values.
 */
(function (global) {
  'use strict';

  const BASE_URL = 'https://www.classifiedads.com';
  const POST_AD_URL = `${BASE_URL}/post.php`;
  const LOGIN_URL = `${BASE_URL}/login.php`;

  const CATEGORY_MAPPING = {
    antiques: 'Antiques & Collectibles', appliances: 'Appliances', art: 'Arts & Crafts', paintings: 'Arts & Crafts',
    automotive: 'Auto Parts & Accessories', bicycles: 'Bicycles', books: 'Books, Movies & Music', business: 'Business & Office',
    cars: 'Cars & Trucks', clothing: 'Clothing & Accessories', collectibles: 'Antiques & Collectibles', coins: 'Antiques & Collectibles',
    computers: 'Computers & Laptops', electronics: 'Electronics', cameras: 'Electronics', farm: 'Farm & Garden', garden: 'Farm & Garden',
    free: 'Free Stuff', furniture: 'Furniture', garage: 'Garage Sales', health: 'Health & Beauty', household: 'Household Items',
    jewelry: 'Jewelry & Watches', watches: 'Jewelry & Watches', motorcycles: 'Motorcycles', instruments: 'Musical Instruments',
    photography: 'Photography', rvs: 'RVs & Campers', trailers: 'Trailers', 'sporting goods': 'Sporting Goods', sports: 'Sporting Goods',
    tickets: 'Tickets & Events', tools: 'Tools & Hardware', toys: 'Toys & Games', 'video games': 'Video Games & Consoles',
    men: 'Clothing & Accessories', women: 'Clothing & Accessories', accessories: 'Clothing & Accessories',
    artandcollectibles: 'Antiques & Collectibles', 'art and collectibles': 'Antiques & Collectibles',
    homeandappliances: 'Household Items', 'home and appliances': 'Household Items', entertainment: 'Books, Movies & Music'
  };

  const SELECTORS = Object.freeze({
    form: ['form[action*="post"]', 'form', '[data-testid="post-ad-form"]'],
    category: ['#category', 'select[name="category"]', 'select[id*="category" i]'],
    subcategory: ['#subcategory', 'select[name="subcategory"]', 'select[id*="subcategory" i]'],
    location: ['#location', 'input[placeholder="City or Zip"]', 'input[name="location"]'],
    locationSuggestion: ['li[lid]', 'ul li[tabindex="4"]'],
    title: ['input[name="title"]', '#title', 'input[id*="title" i]', 'input[placeholder*="title" i]'],
    description: ['textarea#post_desc', 'textarea[name="description"]', '#description', 'textarea[id*="description" i]', 'textarea[placeholder*="description" i]'],
    descriptionFrame: ['iframe.cke_wysiwyg_frame', 'iframe[title*="Rich Text Editor" i]'],
    price: ['input[name="price"]', '#price', 'input[id*="price" i]', 'input[placeholder*="price" i]'],
    name: ['input[name="fname"]', '#fname', 'input[id*="name" i]'],
    email: ['input[name="email"]', '#email', 'input[type="email"]', 'input[id*="email" i]'],
    emailConfirm: ['input[name="email2"]', 'input[name="email_again"]', 'input[name="email_confirm"]', '#email2', '#email_again', 'input[id*="email" i][id*="again" i]'],
    phone: ['input[name="phone"]', '#phone', 'input[id*="phone" i]'],
    city: ['input[name="city"]', '#city', 'input[id*="city" i]'],
    zip: ['input[name="zip"]', 'input[name="zipcode"]', '#zip', 'input[id*="zip" i]'],
    captcha: ['input[name="captchacode"]', 'input[name="captcha"]', '#captcha', 'input[id*="captcha" i]', 'input[autocomplete="off"]'],
    photos: ['input[name="uploadedfile"]', 'input[type="file"]'],
    terms: ['#checkbox_terms', 'input[name="terms"]', 'input[type="checkbox"][required]'],
    publish: ['input[type="submit"][value="Post this ad"]', 'input[value*="Publish" i]', 'button[name="publish"]', '[data-testid="publish"]', 'button[type="submit"]', 'input[type="submit"]']
  });

  function getCategory(categoryName) {
    const raw = String(categoryName || '').trim().toLowerCase();
    const compact = raw.replace(/\s+/g, '');
    for (const [key, value] of Object.entries(CATEGORY_MAPPING)) {
      if (key.replace(/\s+/g, '') === compact || key === raw || key.includes(raw) || raw.includes(key)) return value;
    }
    return 'Miscellaneous';
  }

  function normalizeListing(product) {
    const source = product || {};
    const images = Array.isArray(source.images) && source.images.length
      ? source.images
      : (Array.isArray(source.photo_paths) ? source.photo_paths : (source.image ? [source.image] : []));
    const price = source.salePrice ?? source['sale price'] ?? source.retailPrice ?? source['retail price'] ?? source.price ?? '';
    return {
      id: source.id,
      sku: source.sku,
      title: source.name || source.title || '',
      description: source.description || '',
      category: getCategory(source.category),
      price: String(price),
      zip_code: source.zip_code || '',
      images,
      source_url: source.source_url || source.sourceUrl || ''
    };
  }

  function firstMatch(root, candidates) {
    for (const selector of candidates || []) {
      try {
        const element = root.querySelector(selector);
        if (element) return { element, selector };
      } catch (_) { /* ignore invalid selectors supplied by a remote page */ }
    }
    return { element: null, selector: '' };
  }

  function discoverControls(root) {
    const result = {};
    for (const [name, candidates] of Object.entries(SELECTORS)) {
      const match = firstMatch(root, candidates);
      result[name] = { found: Boolean(match.element), selector: match.selector };
    }
    return result;
  }

  function buildDraft(product) {
    const listing = normalizeListing(product);
    return {
      platform: 'classifiedads',
      destination: BASE_URL,
      post_url: POST_AD_URL,
      login_url: LOGIN_URL,
      listing,
      controls: SELECTORS,
      requires_user_confirmation: true,
      publish_automation: 'client-only-with-explicit-confirmation'
    };
  }

  async function prepareImageUpload(root, productOrImages) {
    const sources = Array.isArray(productOrImages)
      ? productOrImages
      : normalizeListing(productOrImages).images;
    const match = firstMatch(root, SELECTORS.photos);
    if (!match.element) return { prepared: false, selector: '', files: [], reason: 'No file input found.' };
    if (!sources.length) return { prepared: false, selector: match.selector, files: [], reason: 'No image sources provided.' };
    if (typeof File === 'undefined' || typeof DataTransfer === 'undefined') {
      return { prepared: false, selector: match.selector, files: [], reason: 'Browser File/DataTransfer APIs unavailable.' };
    }

    const transfer = new DataTransfer();
    const files = [];
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      if (source instanceof File) {
        transfer.items.add(source);
        files.push({ name: source.name, size: source.size, type: source.type });
        continue;
      }
      if (source instanceof Blob) {
        const file = new File([source], `product-image-${index + 1}`, { type: source.type || 'image/jpeg' });
        transfer.items.add(file);
        files.push({ name: file.name, size: file.size, type: file.type });
        continue;
      }
      if (typeof source !== 'string') continue;
      const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`Image fetch failed (${response.status}) for source ${index + 1}.`);
      const blob = await response.blob();
      const extension = (blob.type.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
      const file = new File([blob], `product-image-${index + 1}.${extension}`, { type: blob.type || 'image/jpeg' });
      transfer.items.add(file);
      files.push({ name: file.name, size: file.size, type: file.type });
    }

    match.element.files = transfer.files;
    match.element.dispatchEvent(new Event('input', { bubbles: true }));
    match.element.dispatchEvent(new Event('change', { bubbles: true }));
    return { prepared: files.length > 0, selector: match.selector, files };
  }

  function dispatchFieldEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function setField(root, field, value, { required = true } = {}) {
    const match = firstMatch(root, SELECTORS[field]);
    if (!match.element || !('value' in match.element)) {
      if (required) throw new Error(`ClassifiedAds field not found: ${field}`);
      return { field, selector: '', set: false };
    }
    match.element.value = String(value ?? '');
    dispatchFieldEvents(match.element);
    return { field, selector: match.selector, set: true };
  }

  function chooseOption(select, valueOrText) {
    const wanted = String(valueOrText ?? '').trim().toLowerCase();
    const option = [...select.options].find(item => item.value.toLowerCase() === wanted || item.textContent.trim().toLowerCase() === wanted);
    if (!option) throw new Error(`ClassifiedAds option not found: ${valueOrText}`);
    select.value = option.value;
    dispatchFieldEvents(select);
    return option;
  }

  function selectCategoryAndSubcategory(root, category, subcategory) {
    const categoryMatch = firstMatch(root, SELECTORS.category);
    const subcategoryMatch = firstMatch(root, SELECTORS.subcategory);
    if (!categoryMatch.element || !subcategoryMatch.element) throw new Error('ClassifiedAds category controls not found.');
    chooseOption(categoryMatch.element, category);
    chooseOption(subcategoryMatch.element, subcategory);
    return { category: categoryMatch.selector, subcategory: subcategoryMatch.selector };
  }

  function normalizeLocation(location) {
    if (location && typeof location === 'object') {
      const city = String(location.city || location.city_name || '').trim();
      const state = String(location.state || '').trim();
      const zip = String(location.zip || location.zip_code || '').trim();
      return { city, state, zip, label: String(location.label || [city, state, zip].filter(Boolean).join(', ')).trim() };
    }
    const label = String(location || '').trim();
    return { city: label, state: '', zip: '', label };
  }

  async function selectLocation(root, location, { timeoutMs = 8000 } = {}) {
    const target = normalizeLocation(location);
    const locationMatch = firstMatch(root, SELECTORS.location);
    if (!locationMatch.element) throw new Error('ClassifiedAds location field not found.');
    locationMatch.element.style.display = '';
    locationMatch.element.value = target.city || target.label;
    dispatchFieldEvents(locationMatch.element);
    const wantedCity = target.city.toLowerCase();
    const wantedLabel = target.label.toLowerCase();
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const candidates = [...root.querySelectorAll(SELECTORS.locationSuggestion.join(','))];
      const suggestion = candidates.find(item => {
        const text = item.textContent.trim().toLowerCase();
        return text === wantedLabel || text === wantedCity || (wantedCity && text.includes(wantedCity) && (!target.state || text.includes(target.state.toLowerCase())));
      });
      if (suggestion) {
        suggestion.click();
        await new Promise(resolve => setTimeout(resolve, 250));
        return { inputSelector: locationMatch.selector, suggestionSelector: 'li[lid]', selected: suggestion.textContent.trim(), city: target.city, state: target.state, zip: target.zip };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`ClassifiedAds location suggestion not found: ${target.label}`);
  }

  function setRichDescription(root, description) {
    const text = String(description || '');
    const textarea = firstMatch(root, SELECTORS.description).element;
    if (textarea) {
      textarea.value = text;
      dispatchFieldEvents(textarea);
    }
    const frame = firstMatch(root, SELECTORS.descriptionFrame).element;
    if (frame && frame.contentDocument?.body) {
      frame.contentDocument.body.innerHTML = `<p>${text.replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</p>`;
      dispatchFieldEvents(frame.contentDocument.body);
    }
    if (!textarea && !frame) throw new Error('ClassifiedAds description editor not found.');
    return { textarea: Boolean(textarea), iframe: Boolean(frame) };
  }

  function fillDraft(root, product) {
    const draft = normalizeListing(product);
    const filled = {};
    setField(root, 'title', draft.title); filled.title = firstMatch(root, SELECTORS.title).selector;
    setField(root, 'price', draft.price); filled.price = firstMatch(root, SELECTORS.price).selector;
    if (draft.zip_code) { setField(root, 'zip', draft.zip_code); filled.zip = firstMatch(root, SELECTORS.zip).selector; }
    filled.description = setRichDescription(root, draft.description);
    return { draft, filled };
  }

  function fillUserFields(root, contact = {}) {
    const results = [];
    if (contact.name != null) results.push(setField(root, 'name', contact.name, { required: false }));
    results.push(setField(root, 'email', contact.email));
    results.push(setField(root, 'emailConfirm', contact.emailConfirm ?? contact.email));
    results.push(setField(root, 'phone', contact.phone));
    if (contact.city != null) results.push(setField(root, 'city', contact.city, { required: false }));
    if (contact.zip != null) results.push(setField(root, 'zip', contact.zip, { required: false }));
    return results;
  }

  function acceptTerms(root) {
    const match = firstMatch(root, SELECTORS.terms);
    if (!match.element) throw new Error('ClassifiedAds terms checkbox not found.');
    if (!match.element.checked) match.element.click();
    if (!match.element.checked) {
      try { match.element.checked = true; } catch (_) { /* read-only controls remain invalid */ }
    }
    ['input', 'change'].forEach(type => {
      try { match.element.dispatchEvent(new Event(type, { bubbles: true })); } catch (_) { /* older embedded documents */ }
    });
    const checked = Boolean(match.element.checked);
    if (!checked) throw new Error('ClassifiedAds terms checkbox could not be checked.');
    return { selector: match.selector, checked, submittedWithFlow: true };
  }

  function getPublicListingUrl(url = global.location.href) {
    const parsed = new URL(url, BASE_URL);
    return /classifiedads\.com$/i.test(parsed.hostname) && /^\/(?!post)/.test(parsed.pathname) ? parsed.href : '';
  }

  function submitGuestPost(root, { confirmPublish = false, termsAccepted = null } = {}) {
    if (!confirmPublish) throw new Error('Explicit confirmation is required before submitting ClassifiedAds.');
    const terms = termsAccepted?.checked ? termsAccepted : acceptTerms(root);
    const match = firstMatch(root, SELECTORS.publish);
    if (!match.element) throw new Error('ClassifiedAds publish control not found.');
    match.element.click();
    return { selector: match.selector, termsSelector: terms.selector, termsChecked: terms.checked, submitted: true };
  }

  async function runGuestPostFlow({ root = document, product, category = 'Items for Sale', subcategory = 'Collectibles', location = 'Charleston, SC', contact = {}, captcha, prepareImages = true, confirmPublish = false } = {}) {
    if (!product) throw new Error('A public product listing is required.');
    if (!contact.email || !contact.phone || !captcha) throw new Error('Runtime email, phone, and CAPTCHA are required; none are stored by this adapter.');
    const normalizedLocation = normalizeLocation(location);
    const log = [];
    log.push({ step: 'category', result: selectCategoryAndSubcategory(root, category, subcategory) });
    log.push({ step: 'location', result: await selectLocation(root, normalizedLocation) });
    log.push({ step: 'draft', result: fillDraft(root, product) });
    if (prepareImages) log.push({ step: 'images', result: await prepareImageUpload(root, product) });
    log.push({ step: 'contact', result: fillUserFields(root, { ...contact, city: contact.city ?? normalizedLocation.city, zip: contact.zip ?? normalizedLocation.zip, captcha: undefined }) });
    setField(root, 'captcha', captcha);
    log.push({ step: 'captcha', result: { selector: firstMatch(root, SELECTORS.captcha).selector, entered: true } });
    const termsResult = acceptTerms(root);
    log.push({ step: 'terms', result: termsResult });
    if (confirmPublish) log.push({ step: 'submit', result: submitGuestPost(root, { confirmPublish, termsAccepted: termsResult }) });
    return { log, submitted: confirmPublish, publicListingUrl: confirmPublish ? getPublicListingUrl() : '' };
  }

  async function runGuestPostLocations({ root = document, product, locations = [], ...options } = {}) {
    if (!Array.isArray(locations) || !locations.length) throw new Error('At least one selected ClassifiedAds location is required.');
    const results = [];
    for (const location of locations) {
      results.push(await runGuestPostFlow({ root, product, location, ...options }));
    }
    return results;
  }

  const GUEST_POST_FLOW = Object.freeze([
    { step: 1, action: 'navigate', url: `${BASE_URL}/post.php` },
    { step: 2, action: 'selectCategory', selectors: ['category', 'subcategory'] },
    { step: 3, action: 'selectLocation', selectors: ['location', 'locationSuggestion'], accepts: 'city/state/ZIP location object' },
    { step: 4, action: 'fillDraft', selectors: ['title', 'price', 'description', 'zip'] },
    { step: 5, action: 'prepareImageUpload', selector: 'photos' },
    { step: 6, action: 'fillRuntimeContact', selectors: ['email', 'emailConfirm', 'phone', 'city', 'zip'] },
    { step: 7, action: 'fillRuntimeCaptcha', selector: 'captcha', userProvided: true },
    { step: 8, action: 'acceptTerms', selector: 'terms' },
    { step: 9, action: 'acceptTermsAndSubmit', selectors: ['terms', 'publish'], termsRequired: true, requiresExplicitConfirmation: true },
    { step: 10, action: 'verifyPublicListing', result: 'publicListingUrl' }
  ]);

  global.ClassifiedAdsAdapter = Object.freeze({
    BASE_URL, POST_AD_URL, LOGIN_URL, CATEGORY_MAPPING, SELECTORS, GUEST_POST_FLOW,
    getCategory, normalizeListing, discoverControls, buildDraft, fillDraft, prepareImageUpload,
    selectCategoryAndSubcategory, normalizeLocation, selectLocation, setRichDescription, fillUserFields, acceptTerms,
    submitGuestPost, runGuestPostFlow, runGuestPostLocations,
    canPublish: () => true,
    publishNotice: 'The adapter can submit only when the caller provides runtime CAPTCHA/contact values and confirmPublish: true; it never solves CAPTCHA or stores private values.'
  });
})(window);
