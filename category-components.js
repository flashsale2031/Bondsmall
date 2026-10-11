/* Loads independent category cards from their own HTML, CSS, and JS files. */
(() => {
  'use strict';
  const categories = ['accessories','artandcollectibles','electronics','entertainment','homeandappliances','jewelry','men','women'];
  const root = document.getElementById('category-showcase');
  if (!root) return;
  const loadStyle = (href) => new Promise((resolve) => {
    if (document.querySelector('link[data-category-style="' + href + '"]')) return resolve();
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.dataset.categoryStyle = href;
    link.onload = resolve; link.onerror = resolve; document.head.appendChild(link);
  });
  const loadScript = (src) => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = resolve;
    document.body.appendChild(script);
  });
  async function loadCategory(key) {
    const base = 'categories/' + key + '/' + key;
    try {
      const response = await fetch(base + '.html', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const template = document.createElement('template');
      template.innerHTML = (await response.text()).trim();
      const card = template.content.firstElementChild;
      if (!card || card.dataset.categoryFeature !== key) throw new Error('Invalid category component markup');
      root.appendChild(card);
      await loadStyle(base + '.css');
      await loadScript(base + '.js');
    } catch (error) {
      const fallback = document.createElement('article');
      fallback.className = 'category-feature category-feature--error';
      fallback.innerHTML = '<p class="category-component-error">This category could not be loaded. <button type="button" class="category-retry">Try again</button></p>';
      fallback.querySelector('button').addEventListener('click', () => { fallback.remove(); loadCategory(key); });
      root.appendChild(fallback);
      console.error('[Bonds Mall] Failed to load category "' + key + '".', error);
    }
  }
  Promise.all(categories.map(loadCategory)).then(() => {
    root.querySelector('.category-components-loading')?.remove();
    document.dispatchEvent(new CustomEvent('bondsmall-category-components-ready'));
  });
})();
