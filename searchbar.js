import { products } from './products.js';

const searchInput = document.getElementById('searchInput');
const dropdown = document.getElementById('dropdown');
const productDisplay = document.getElementById('productDisplay');

let filteredProducts = [];
let dropdownOpen = false;

// Helper: render dropdown list of product names
function renderDropdown(products) {
  if (products.length === 0) {
    dropdown.style.display = 'none';
    dropdownOpen = false;
    return;
  }
  dropdown.innerHTML = '';
  products.forEach(product => {
    const div = document.createElement('div');
    div.textContent = product.name;
    div.addEventListener('click', () => {
      // On click: set input value, close dropdown, display matching products
      searchInput.value = product.name;
      dropdown.style.display = 'none';
      dropdownOpen = false;
      filteredProducts = products.filter(p => p.name.toLowerCase() === product.name.toLowerCase());
      renderProductDisplay(filteredProducts);
    });
    dropdown.appendChild(div);
  });
  dropdown.style.display = 'block';
  dropdownOpen = true;
}

// Helper: render product display area
function renderProductDisplay(products) {
  productDisplay.innerHTML = '';
  if (products.length === 0) {
    productDisplay.textContent = 'No products found.';
    return;
  }
  products.forEach(product => {
    const card = document.createElement('div');
    card.classList.add('product-card');

    const img = document.createElement('img');
    img.src = product.imageUrl;
    img.alt = product.name;

    const name = document.createElement('div');
    name.classList.add('name');
    name.textContent = product.name;

    const desc = document.createElement('div');
    desc.classList.add('description');
    desc.textContent = product.description;

    const price = document.createElement('div');
    price.classList.add('price');
    price.textContent = `$${product.price.toFixed(2)}`;

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(price);

    productDisplay.appendChild(card);
  });
}

// Initial display shows all products
renderProductDisplay(products);

// Event listener for input typing
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  if (query === '') {
    dropdown.style.display = 'none';
    dropdownOpen = false;
    filteredProducts = products;
    renderProductDisplay(filteredProducts);
    return;
  }

  filteredProducts = products.filter(p => p.name.toLowerCase().includes(query));
  renderDropdown(filteredProducts);
  renderProductDisplay(filteredProducts);
});

// Close dropdown if clicking outside
document.addEventListener('click', (e) => {
  if (!dropdown.contains(e.target) && e.target !== searchInput && dropdownOpen) {
    dropdown.style.display = 'none';
    dropdownOpen = false;
  }
});


