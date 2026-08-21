/*
 * ClassifiedAds browser adapter.
 * Ported from the safe listing-preparation portions of classifiedads.py.
 * It does not solve CAPTCHA, collect credentials, bypass safeguards, or auto-submit Publish.
 */
(function (global) {
  'use strict';

  const BASE_URL = 'https://www.classifiedads.com';
  const POST_AD_URL = `${BASE_URL}/post_ad`;
  const LOGIN_URL = `${BASE_URL}/users/sign_in`;

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
    title: ['input[name="title"]', '#title', 'input[id*="title" i]', 'input[placeholder*="title" i]'],
    description: ['textarea[name="description"]', '#description', 'textarea[id*="description" i]', 'textarea[placeholder*="description" i]'],
    price: ['input[name="price"]', '#price', 'input[id*="price" i]', 'input[placeholder*="price" i]'],
    zip: ['input[name="zip"]', 'input[name="zipcode"]', '#zip', 'input[id*="zip" i]'],
    category: ['select[name="category"]', '#category', 'select[id*="category" i]'],
    photos: ['input[type="file"]'],
    publish: ['input[value*="Publish" i]', 'button[name="publish"]', '[data-testid="publish"]', 'button[type="submit"]', 'input[type="submit"]']
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
      publish_automation: false
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

  function fillDraft(root, product) {
    const draft = normalizeListing(product);
    const fields = {
      title: draft.title,
      description: draft.description,
      price: draft.price,
      zip: draft.zip_code
    };
    const filled = {};
    for (const [field, value] of Object.entries(fields)) {
      const match = firstMatch(root, SELECTORS[field]);
      if (match.element && 'value' in match.element) {
        match.element.value = value;
        filled[field] = match.selector;
      } else {
        filled[field] = '';
      }
    }
    const categoryMatch = firstMatch(root, SELECTORS.category);
    if (categoryMatch.element && categoryMatch.element.options) {
      const option = [...categoryMatch.element.options].find(item => item.textContent.trim().toLowerCase() === draft.category.toLowerCase());
      if (option) categoryMatch.element.value = option.value;
    }
    return { draft, filled };
  }

  global.ClassifiedAdsAdapter = Object.freeze({
    BASE_URL, POST_AD_URL, LOGIN_URL, CATEGORY_MAPPING, SELECTORS,
    getCategory, normalizeListing, discoverControls, buildDraft, fillDraft, prepareImageUpload,
    canPublish: () => false,
    publishNotice: 'Live Publish requires the user to review the form and explicitly submit it in the authenticated browser.'
  });
})(window);
