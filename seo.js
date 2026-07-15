import { products } from './products.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inject styles for the SEO product listing and popup
  const style = document.createElement('style');
  style.textContent = `
    #seo-product-list {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      max-width: 960px;
      margin: 30px auto;
      justify-content: center;
      font-family: Arial, sans-serif;
    }
    .seo-product-item {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      width: 220px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      background-color: #fff;
      transition: box-shadow 0.3s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .seo-product-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .seo-product-item img {
      width: 100%;
      max-height: 180px;
      object-fit: contain;
      border-radius: 6px;
      margin-bottom: 12px;
      transition: transform 0.3s ease;
    }
    .seo-product-item img:hover {
      transform: scale(1.05);
    }
    .seo-product-title {
      font-size: 1.1rem;
      color: #0073e6;
      margin: 0 0 8px 0;
      text-align: center;
      text-decoration: underline;
    }
    .seo-product-price {
      font-weight: bold;
      color: #333;
      font-size: 1rem;
      margin: 0;
    }
    /* Popup styles */
    #product-preview-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #fff;
      border: 1px solid #ccc;
      padding: 25px 30px 30px 30px;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(0,0,0,0.35);
      display: none;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 12px;
      font-family: Arial, sans-serif;
      width: 600px;
    }
    #product-preview-popup button.close-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      background: #0073e6;
      border: none;
      color: white;
      padding: 6px 14px;
      font-size: 0.9rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }
    #product-preview-popup button.close-btn:hover {
      background-color: #005bb5;
    }
    #preview-main-image {
      width: 100%;
      max-height: 350px;
      object-fit: contain;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    #preview-thumbnails {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      margin-bottom: 20px;
      padding-bottom: 5px;
      border-bottom: 1px solid #eee;
    }
    #preview-thumbnails img {
      width: 70px;
      height: 70px;
      object-fit: contain;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 0.3s ease;
    }
    #preview-thumbnails img.selected {
      border-color: #0073e6;
    }
    #preview-title a {
      font-size: 1.4rem;
      color: #0073e6;
      text-decoration: underline;
      cursor: pointer;
    }
    #preview-price {
      font-weight: 700;
      font-size: 1.2rem;
      margin: 0 0 20px 0;
      color: #444;
    }
    #preview-description {
      font-size: 1rem;
      line-height: 1.5;
      color: #555;
      white-space: pre-wrap;
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'seo-product-list';
  document.body.appendChild(container);

  const previewPopup = createPreviewPopup();
  document.body.appendChild(previewPopup);

  products.forEach(product => {
    const productElement = createProductListItem(product);
    container.appendChild(productElement);
  });

  function createProductListItem(product) {
    const item = document.createElement('div');
    item.className = 'seo-product-item';

    const img = document.createElement('img');
    img.src = product.images[0];
    img.alt = product.title;

    const title = document.createElement('h2');
    title.className = 'seo-product-title';
    title.textContent = product.title;

    const price = document.createElement('p');
    price.className = 'seo-product-price';
    price.textContent = product.price;

    [img, title].forEach(el => {
      el.addEventListener('click', () => openPreview(product));
    });

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(price);

    return item;
  }

  function createPreviewPopup() {
    const popup = document.createElement('div');
    popup.id = 'product-preview-popup';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => {
      popup.style.display = 'none';
      clearPreviewContent();
    });
    popup.appendChild(closeBtn);

    const mainImg = document.createElement('img');
    mainImg.id = 'preview-main-image';
    popup.appendChild(mainImg);

    const thumbnails = document.createElement('div');
    thumbnails.id = 'preview-thumbnails';
    popup.appendChild(thumbnails);

    const previewTitle = document.createElement('h2');
    previewTitle.id = 'preview-title';
    popup.appendChild(previewTitle);

    const previewPrice = document.createElement('p');
    previewPrice.id = 'preview-price';
    popup.appendChild(previewPrice);

    const previewDescription = document.createElement('p');
    previewDescription.id = 'preview-description';
    popup.appendChild(previewDescription);

    return popup;
  }

  function openPreview(product) {
    const popup = document.getElementById('product-preview-popup');
    const mainImg = document.getElementById('preview-main-image');
    const thumbnails = document.getElementById('preview-thumbnails');
    const title = document.getElementById('preview-title');
    const price = document.getElementById('preview-price');
    const description = document.getElementById('preview-description');

    mainImg.src = product.images[0];
    mainImg.alt = product.title;

    thumbnails.innerHTML = '';

    product.images.forEach((imgSrc, index) => {
      const thumb = document.createElement('img');
      thumb.src = imgSrc;
      thumb.alt = `product.titleimage{product.title} imageproduct.titleimage{index + 1}`;
      if (index === 0) {
        thumb.classList.add('selected');
      }
      thumb.addEventListener('click', () => {
        mainImg.src = imgSrc;
        mainImg.alt = `product.titleimage{product.title} imageproduct.titleimage{index + 1}`;
        Array.from(thumbnails.children).forEach(t => t.classList.remove('selected'));
        thumb.classList.add('selected');
      });
      thumbnails.appendChild(thumb);
    });

    // Make the title a clickable link
    title.innerHTML = '';
    const link = document.createElement('a');
    link.href = `https://bondsmall.com/product-${product.id}`;
    link.textContent = product.title;
    link.target = '_blank'; // Opens in a new tab
    link.rel = 'noopener noreferrer'; // Security best practice
    title.appendChild(link);

    price.textContent = product.price;
    description.textContent = product.description;

    popup.style.display = 'block';
  }

  function clearPreviewContent() {
    const mainImg = document.getElementById('preview-main-image');
    const thumbnails = document.getElementById('preview-thumbnails');
    const title = document.getElementById('preview-title');
    const price = document.getElementById('preview-price');
    const description = document.getElementById('preview-description');

    mainImg.src = '';
    mainImg.alt = '';
    thumbnails.innerHTML = '';
    title.textContent = '';
    price.textContent = '';
    description.textContent = '';
  }
});


