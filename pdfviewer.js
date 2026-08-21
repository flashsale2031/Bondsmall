/*
 * Standalone PDF.js viewer utility.
 *
 * This file is intentionally unconnected to seller.html, classifiedads.js,
 * and every other Bonds Mall flow. It renders ordinary PDF documents only.
 * Load PDF.js separately before using this module:
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs" type="module"></script>
 *
 * The caller supplies a PDF.js-compatible `pdfjsLib` object and a container.
 */
(function (global) {
  'use strict';

  function requirePdfJs(pdfjsLib) {
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
      throw new Error('A PDF.js-compatible library object is required.');
    }
    return pdfjsLib;
  }

  function ensureContainer(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('A DOM container element is required.');
    }
    return container;
  }

  function createPageShell(container, pageNumber) {
    const shell = document.createElement('section');
    shell.className = 'pdf-viewer-page';
    shell.dataset.pageNumber = String(pageNumber);
    shell.style.position = 'relative';
    shell.style.margin = '0 auto 24px';
    shell.style.background = '#fff';
    shell.style.overflow = 'hidden';
    shell.setAttribute('aria-label', `PDF page ${pageNumber}`);
    container.appendChild(shell);
    return shell;
  }

  function applyViewportTransform(element, transform, viewport) {
    const [a, b, c, d, e, f] = transform;
    const [va, vb, vc, vd, ve, vf] = viewport.transform;
    const matrix = [
      va * a + vc * b,
      vb * a + vd * b,
      va * c + vc * d,
      vb * c + vd * d,
      va * e + vc * f + ve,
      vb * e + vd * f + vf
    ];
    element.style.transformOrigin = '0 0';
    element.style.transform = `matrix(${matrix.map(value => Number(value.toFixed(6))).join(',')})`;
  }

  async function renderTextLayer(pdfjsLib, page, viewport, shell) {
    const textContent = await page.getTextContent();
    const layer = document.createElement('div');
    layer.className = 'pdf-viewer-text-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.width = `${viewport.width}px`;
    layer.style.height = `${viewport.height}px`;
    layer.style.overflow = 'hidden';
    layer.style.pointerEvents = 'none';
    layer.style.transformOrigin = '0 0';

    for (const item of textContent.items || []) {
      if (!item.str) continue;
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.position = 'absolute';
      span.style.whiteSpace = 'pre';
      span.style.transformOrigin = '0 0';
      span.style.color = 'transparent';
      span.style.userSelect = 'text';
      span.style.pointerEvents = 'auto';
      span.style.fontSize = '1px';
      span.style.lineHeight = '1';

      // PDF.js text items provide a six-value text matrix. Applying it
      // through the viewport transform preserves rotation and skew instead
      // of assuming that every text run is horizontal.
      applyViewportTransform(span, item.transform, viewport);
      layer.appendChild(span);
    }

    shell.appendChild(layer);
    return { layer, itemCount: layer.childElementCount };
  }

  async function renderPage(pdfjsLib, pdf, pageNumber, options = {}) {
    const scale = Number(options.scale || 1.25);
    const rotation = Number(options.rotation || 0);
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale, rotation });
    const shell = createPageShell(options.container, pageNumber);
    shell.style.width = `${viewport.width}px`;
    shell.style.height = `${viewport.height}px`;

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-viewer-canvas';
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.display = 'block';
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    shell.appendChild(canvas);

    const context = canvas.getContext('2d', { alpha: false });
    await page.render({ canvasContext: context, viewport }).promise;
    const text = await renderTextLayer(pdfjsLib, page, viewport, shell);
    return { pageNumber, viewport, canvas, textLayer: text.layer, textItemCount: text.itemCount };
  }

  async function renderDocument({ pdfjsLib, source, container, scale = 1.25, rotation = 0, clear = true } = {}) {
    const lib = requirePdfJs(pdfjsLib);
    const target = ensureContainer(container);
    if (clear) target.replaceChildren();

    const loadingTask = lib.getDocument(source);
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      pages.push(await renderPage(lib, pdf, pageNumber, { container: target, scale, rotation }));
    }
    return { pdf, pageCount: pdf.numPages, pages };
  }

  global.BondsPdfViewer = Object.freeze({ renderDocument, renderPage, renderTextLayer });
})(typeof window !== 'undefined' ? window : globalThis);
