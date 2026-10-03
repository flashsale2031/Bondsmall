(() => {
  "use strict";

  const PRODUCT_ID = 123;
  const PRODUCT_IMAGES = [
    "https://static.jmbullion.com/image/upload/v1761315577/GCAB109_4_obverse",
    "https://d3h9wgial7chxw.cloudfront.net/products/6334/zoom/2009-gold-1-ounce-buffalo-coin-single-united-states-of-america-reverse.jpg?format=webp",
    "https://www.images-apmex.com/images/products/2009-1-oz-gold-buffalo-bu_56068_Obv.jpg?height=900&v=20191025091623&width=900",
    "https://thecastlejewelry.com/cdn/shop/files/buffalodown.jpg?v=1773252959&width=1024",
    "https://images.silvergold.media/cdn-cgi/image/quality%3D80%2Cformat%3Dauto/https%3A/silvergold.media/media/products/2597/pp-2597-3.png"
  ];
  const PRODUCT_IMAGE = PRODUCT_IMAGES[0];

  function patchProduct(product) {
    if (!product || Number(product.id) !== PRODUCT_ID) return product;
    product.image = PRODUCT_IMAGE;
    product.images = PRODUCT_IMAGES.slice();
    product.preOwnedImage = PRODUCT_IMAGE;
    product.image_views = {
      front_main: PRODUCT_IMAGES[0],
      back: PRODUCT_IMAGES[1],
      left: PRODUCT_IMAGES[2],
      right: PRODUCT_IMAGES[3],
      top: PRODUCT_IMAGES[4]
    };
    return product;
  }

  function patchCollections() {
    if (Array.isArray(window.products)) window.products.forEach(patchProduct);
    const authority = window.BondsmallCatalogAuthority;
    if (authority && Array.isArray(authority.records)) authority.records.forEach(patchProduct);
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
    window.BondsmallCatalog.getProductById = async (id) => patchProduct(await originalGetProductById(id));
  }

  const observer = new MutationObserver(() => patchVisibleProductCardImages());
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });

  window.BondsmallProduct123Images = PRODUCT_IMAGES.slice();
})();
