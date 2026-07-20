/**
 * convert-to-google-shopping.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts the Bonds Mall product catalog (products.js) into a Google
 * Shopping / Merchant Center RSS 2.0 XML feed.
 *
 * Usage (Node.js):
 *   node convert-to-google-shopping.js
 *   node convert-to-google-shopping.js > feed.xml
 *
 * The script reads `products` from products.js (same directory), maps every
 * product card exactly as productpopup.js enriches it, then calls
 * convertToGoogleShoppingXML() to produce a valid <rss> feed.
 *
 * Field mapping (productpopup.js → Google Shopping):
 *   product.id                          → g:id
 *   product.name                        → g:title
 *   product.description                 → g:description
 *   https://bondsmall.com/?product={id} → g:link
 *   product.image (first image)         → g:image_link
 *   product.images[1..] (up to 9 more)  → g:additional_image_link
 *   salePrice (enriched)                → g:price  (USD)
 *   product.brand / inferred            → g:brand
 *   product.specifications.condition    → g:condition
 *   product.category                    → g:product_type
 *   "in stock"                          → g:availability
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. Load the product catalog ──────────────────────────────────────────────

const fs   = require("fs");
const path = require("path");
const vm   = require("vm");

// Execute products.js in this module's context so `products` is available here.
// This mirrors how a browser loads products.js as a plain <script> tag before
// productpopup.js runs — no module system, just a shared global scope.
const productsPath = path.join(__dirname, "products.js");
const productsCode = fs.readFileSync(productsPath, "utf8");
vm.runInThisContext(productsCode); // exposes `products` array into this scope

// ── 2. Helper utilities (mirrors productpopup.js logic) ──────────────────────

/**
 * Infer a brand name from the product's display name when no explicit brand
 * is set — identical logic to inferBrandFromName() in productpopup.js.
 * @param {string} name
 * @returns {string}
 */
function inferBrandFromName(name) {
  if (!name) return "";
  const stripped = String(name).replace(/^(Men's|Women's)\s+/i, "").trim();
  const beforeAmpersand = stripped.split("&")[0].trim();
  const words = beforeAmpersand.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).join(" ");
}

/**
 * Enrich a raw catalog product with derived fields — mirrors enrichForPopup()
 * in productpopup.js so the converter uses the same prices and brand logic
 * that the popup UI displays to shoppers.
 * @param {Object} product
 * @returns {Object}
 */
function enrichForFeed(product) {
  const imgs = [...new Set(
    [product.image, ...(product.images || [])].filter(Boolean)
  )];

  let retailPrice = product["retail price"] || product.retailPrice || 0;
  if (!retailPrice) {
    retailPrice = (typeof product.price === "number" ? product.price : 0) * 1.1;
  }

  let salePrice = product["sale price"] || product.salePrice || retailPrice;
  if (!salePrice) {
    salePrice = typeof product.price === "number" ? product.price : retailPrice;
  }

  const brand =
    (product.specifications && product.specifications.brand &&
      product.specifications.brand.trim()) ||
    product.brand ||
    inferBrandFromName(product.name) ||
    "";

  const specifications = Object.assign(
    { brand, model: "", year: "", condition: "New", color: "", material: "" },
    product.specifications || {}
  );
  specifications.brand = brand;

  return {
    ...product,
    mainPhoto: imgs[0] || "",
    images: imgs,
    salePrice,
    retailPrice,
    brand,
    productType: product.productType || product.category,
    specifications
  };
}

/**
 * Escape characters that are special in XML text content.
 * (CDATA sections handle descriptions; this covers all other text fields.)
 * @param {string|number} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Format a numeric price as "0.00 USD" for the g:price field.
 * @param {number} value
 * @returns {string}
 */
function formatPrice(value) {
  return `${Number(value).toFixed(2)} USD`;
}

// ── 3. Core converter (as specified in the brief) ────────────────────────────

/**
 * Convert an array of Bonds Mall product objects into a Google Shopping
 * RSS 2.0 XML feed string.
 *
 * @param {Object[]} productsArray  Raw entries from products.js
 * @returns {string}  Complete XML feed
 */
function convertToGoogleShoppingXML(productsArray) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`;
  xml += `<channel>\n`;
  xml += `  <title>Bonds Mall</title>\n`;
  xml += `  <link>https://www.bondsmall.com</link>\n`;
  xml += `  <description>Google Shopping Product Feed — Bonds Mall</description>\n\n`;

  productsArray.forEach(rawProduct => {
    // Enrich with the same logic productpopup.js uses so prices and brand
    // values match exactly what shoppers see in the product popup.
    const product = enrichForFeed(rawProduct);

    // Build the canonical product URL (matches the JSON-LD in productpopup.js)
    const productUrl = `https://www.bondsmall.com/?product=${encodeURIComponent(product.id)}`;

    // Condition: Google accepts "new", "refurbished", or "used"
    const rawCondition = (product.specifications.condition || "New").toLowerCase();
    let gCondition = "new";
    if (rawCondition.includes("pre") || rawCondition.includes("used")) {
      gCondition = "used";
    } else if (rawCondition.includes("refurb")) {
      gCondition = "refurbished";
    }

    // Additional images (indices 1–9, Google allows up to 10 total)
    const additionalImages = product.images.slice(1, 10);

    xml += `  <item>\n`;
    xml += `    <g:id>${escapeXml(product.id)}</g:id>\n`;
    xml += `    <g:title>${escapeXml(product.name)}</g:title>\n`;
    xml += `    <g:description><![CDATA[${product.description || ""}]]></g:description>\n`;
    xml += `    <g:link>${escapeXml(productUrl)}</g:link>\n`;
    xml += `    <g:image_link>${escapeXml(product.mainPhoto)}</g:image_link>\n`;

    // Optional: additional images
    additionalImages.forEach(imgUrl => {
      xml += `    <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>\n`;
    });

    xml += `    <g:price>${escapeXml(formatPrice(product.salePrice))}</g:price>\n`;

    // Include retail price as g:sale_price when it differs from sale price
    if (product.retailPrice && product.retailPrice !== product.salePrice) {
      xml += `    <g:sale_price>${escapeXml(formatPrice(product.salePrice))}</g:sale_price>\n`;
    }

    xml += `    <g:availability>in stock</g:availability>\n`;
    xml += `    <g:condition>${gCondition}</g:condition>\n`;
    xml += `    <g:brand>${escapeXml(product.brand)}</g:brand>\n`;

    // Product type / category
    if (product.productType) {
      xml += `    <g:product_type>${escapeXml(product.productType)}</g:product_type>\n`;
    }

    // Optional specification fields
    if (product.specifications.model) {
      xml += `    <g:mpn>${escapeXml(product.specifications.model)}</g:mpn>\n`;
    }
    if (product.specifications.color) {
      xml += `    <g:color>${escapeXml(product.specifications.color)}</g:color>\n`;
    }
    if (product.specifications.material) {
      xml += `    <g:material>${escapeXml(product.specifications.material)}</g:material>\n`;
    }

    xml += `  </item>\n\n`;
  });

  xml += `</channel>\n`;
  xml += `</rss>`;

  return xml;
}

// ── 4. Run the conversion and output the feed ─────────────────────────────────

const xmlOutput = convertToGoogleShoppingXML(products);
console.log(xmlOutput);
