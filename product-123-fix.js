(() => {
  "use strict";

  const PRODUCT_ID = 123;
  const PRODUCT_IMAGE = "images/products/product-123-buffalo.webp?v=20261003-123";

  function patchProduct(product) {
    if (!product || Number(product.id) !== PRODUCT_ID) return product;
    product.image = PRODUCT_IMAGE;
    product.images = [PRODUCT_IMAGE];
    product.preOwnedImage = PRODUCT_IMAGE;
    product.image_views = {
      front_main: "images[0]",
      back: "images[0]",
      left_side: "images[0]",
      right_side: "images[0]",
      case_photo: "images[0]"
    };
    return product;
  }

  function patchCollections() {
    if (Array.isArray(window.products)) {
      window.products.forEach(patchProduct);
    }
    const authority = window.BondsmallCatalogAuthority;
    if (authority && Array.isArray(authority.records)) {
      authority.records.forEach(patchProduct);
    }
  }

  function patchVisibleProductCardImages() {
    document.querySelectorAll('img.product-image[data-id="123"], img.popup-search-result-img').forEach((img) => {
      const id = Number(img.dataset.id || img.closest("[data-id]")?.dataset.id);
      if (id === PRODUCT_ID) {
        img.src = PRODUCT_IMAGE;
        img.removeAttribute("srcset");
      }
    });
  }

  patchCollections();

  document.addEventListener("bondsmall-catalog-chunk-loaded", (event) => {
    const records = event.detail && event.detail.records;
    if (Array.isArray(records)) records.forEach(patchProduct);
    patchCollections();
    patchVisibleProductCardImages();
  });

  document.addEventListener("bondsmall-catalog-page-ready", () => {
    patchCollections();
    patchVisibleProductCardImages();
  });

  document.addEventListener("bondsmall-category-page-loaded", () => {
    patchCollections();
    patchVisibleProductCardImages();
  });

  const originalGetProductById =
    window.BondsmallCatalog && typeof window.BondsmallCatalog.getProductById === "function"
      ? window.BondsmallCatalog.getProductById.bind(window.BondsmallCatalog)
      : null;

  if (originalGetProductById) {
    window.BondsmallCatalog.getProductById = async (id) => {
      const product = await originalGetProductById(id);
      return patchProduct(product);
    };
  }

  const observer = new MutationObserver(() => patchVisibleProductCardImages());
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });

  window.BondsmallProduct123Image = PRODUCT_IMAGE;
})();
