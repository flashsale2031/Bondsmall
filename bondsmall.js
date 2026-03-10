// Product data
        const products = [
            {
                id: 1,
                title: "Men's Hanes Premium Cotton T-Shirt",
                category: "men",
                price: 9.99,
                image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 2,
                title: "Women's Abercrombie & Fitch Sweater",
                category: "women",
                price: 89.99,
                image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 3,
                title: "Women's Dolce & Gabbana Crossbody Bag",
                category: "accessories",
                price: 129.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 4,
                title: "Men's Levi Jeans",
                category: "men",
                price: 39.99,
                image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 5,
                title: "Patio Furniture Set",
                category: "homeandappliances",
                price: 79.99,
                image: "https://images.unsplash.com/photo-1564257577154-75bdec5c3700?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 6,
                title: "Women's Necklace & Bracelet Set",
                category: "jewelry",
                price: 49.99,
                image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 7,
                title: "Men's Dolce & Gabbana Sweater",
                category: "men",
                price: 119.99,
                image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 8,
                title: "Women's PINK Jogging Fit",
                category: "women",
                price: 89.99,
                image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 9,
                title: "Dior Sunglasses",
                category: "accessories",
                price: 89.99,
                image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 10,
                title: "Men's Ralph Lauren Casual Polo Shirt",
                category: "men",
                price: 69.99,
                image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 11,
                title: "Women's Louis Vuitton Sweater",
                category: "women",
                price: 599.99,
                image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 12,
                title: "Modern King Size Bed Set",
                category: "homeandappliances",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 13,
                title: "Classic Backpack",
                category: "accessories",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
             {
                id: 14,
                title: "Apple iMac Pro",
                category: "electronics",
                price: 399.99,
                image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTqIW7TlTKtd6YLCgnfJ48K8msh3WxptIdpuNDWTR8M5MZEwcqHzgWWU42Tn5QA70wtrUyygrHQNmFuTAoFSkX5Qrw444PBMcbmDFsilq9IiXUeAAYPB2YiEg"
            },
            {
                id: 15,
                title: "Men's Ferrari Jacket",
                category: "men",
                price: 199.99,
                image: "https://jackets4racing.com/cdn/shop/files/ferrari-f1-vintage-racing-jacket-classic-edition-6945007_720x.png?v=1759659711"
            },
            {
                id: 16,
                title: "Women's YSL Sweater",
                category: "women",
                price: 79.99,
                image: "https://images.unsplash.com/photo-1564257577154-75bdec5c3700?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 17,
                title: "Gucci Hat & Scarf Set",
                category: "accessories",
                price: 249.99,
                image: "https://di2ponv0v5otw.cloudfront.net/posts/2023/09/24/6510ab99253a8c8f5bdf1f97/m_6510ad733b982a2570ecf0a4.jpg"
            },
            {
                id: 18,
                title: "Men's Bathing Apes Hoodie",
                category: "men",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 19,
                title: "Women's Chanel Handbag",
                category: "accessories",
                price: 2499.99,
                image: "https://atlantaluxurybags.com/cdn/shop/files/Chanel_18160-001.jpg?v=1764948624&width=1080"
            },
            {
                id: 20,
                title: "Ralph Lauren Wallet",
                category: "accessories",
                price: 14.99,
                image: "https://slimages.macysassets.com/is/image/MCY/products/2/optimized/35420612_fpx.tif?op_sharpen=1&wid=500&fit=fit,1&fmt=webp"
            },
            {
                id: 21,
                title: "Men's Marc Jacob Watch",
                category: "jewelry",
                price: 399.99,
                image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcQZlO5Su0nbiyffQ285ZO-LCMMRp8T1_Yh7eQS3BerAVIfyhCGIkaWDTgs-mkbVtvsStXQiAqP5VAtMVOB3MAtaAH_0L7TDvoFc4BhLUsd1YdiJ_nGDsjg"
            },
            {
                id: 22,
                title: "GE Smart Refrigerator",
                category: "homeandappliances",
                price: 599.99,
                image: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRoby_42NL_9PUFVO4y2gjlTlNWXmnqT2yql0GDb7wlqM4Q5-UpQDiG5-WNeS-4hb7CC25AFOZ3uLrbfbjxIBSNk5BMiyCul-JZzCqaLkj8A1mlLXSAuxRNBg"
            },
            {
                id: 23,
                title: "Apple Macbook Pro",
                category: "electronics",
                price: 799.99,
                image: "https://target.scene7.com/is/image/Target/GUEST_65c8c016-bdbe-42ec-ac11-9bae624670d9?wid=800&hei=800&qlt=80"
            },
            {
                id: 24,
                title: "XBOX Series X",
                category: "entertainment",
                price: 399.99,
                image: "https://www.skupkonsol.pl/wp-content/uploads/2021/04/skup-xbox-series-x.jpg"
            },
            {
                id: 25,
                title: "Benjamin Franklin Bust",
                category: "artandcollectibles",
                price: 199.99,
                image: "https://www.nationalarchivesstore.org/cdn/shop/products/Mackenzie_Fisher_-_105506_BUST_6_FRANKLIN_6_1024x1024.jpg?v=1542388876"
            },
            {
                id: 26,
                title: "American Liberty Cowboy Gold $100 Coin",
                category: "artandcollectibles",
                price: 5999.99,
                image: "https://cdn11.bigcommerce.com/s-ojbexn9zb6/images/stencil/1500x1500/products/189262/237437/2021-american-liberty-high-relief-gold-coin-obverse__48730.1767536143.jpg?c=1"
            },
            {
                id: 27,
                title: "American Buffalo Gold $50 Coin",
                category: "artandcollectibles",
                price: 4999.99,
                image: "https://fmrgold.com/wp-content/uploads/2022/05/BG11002-2.png"
            },
            {
                id: 28,
                title: "American Eagle Gold $50 Coin",
                category: "artandcollectibles",
                price: 4999.99,
                image: "https://www.usmint.gov/dw/image/v2/AARB_PRD/on/demandware.static/-/Sites-usm-master-catalog-us/default/dw39628b9a/images/hi-res/coin-programs/American-Eagle/26eb_c.jpg?sw=1200&sh=1200&sm=fit"
            },
            {
                id: 29,
                title: "Wall Art Set",
                category: "artandcollectibles",
                price: 49.99,
                image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcSKgjXsEf-PQBIY5oQdNGIUhUQcnL9F3RvD1oYbKvZYC5N7PRXskbD800lFnYuxoY1sbeWUJI26kUVBpk9JUR3FIK2PN587K0_ZstaHzD5G"
            },
            {
                id: 30,
                title: "Men's Cuban Link Bracelet Set",
                category: "jewelry",
                price: 49.99,
                image: "https://imperiumjewelry.com/cdn/shop/files/Untitleddesign_12_700x.png?v=1766788654"
            },
            {
                id: 31,
                title: "Men's Nike Sports Outfit",
                category: "men",
                price: 59.99,
                image: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTNO0pJpIDMUQAt3_neCb7xnqsfEW7qSpsr_CRaqzHM2fIvVA1f539sUCpW-AlXMxZfm3o44RJHifpbQ1V5RZaMiTsmcV3lRw"
            },
            {
                id: 32,
                title: "Women's Adidas Sweater",
                category: "women",
                price: 29.99,
                image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRHakCWty8aWRjBoF4r6cqx3EGfEubh8qcOuLcmUN6SpDeJYj4gvieNg5kike5L5uGuVyeJ8oTqF5FhxUTejI_9RmvdPVs4YEsvHhfO0c7Y1hyOD1izvQJ4JJM"
            },
            {
                id: 33,
                title: "Men's Gucci Travel Bag",
                category: "accessories",
                price: 1089.99,
                image: "https://www.mytheresa.com/media/1094/1238/100/2f/P01139856.jpg"
            },
            {
                id: 34,
                title: "Men's Ferrari Coat",
                category: "men",
                price: 79.99,
                description: This winter coat by Ferrari is made for intense comfort and luxorious fitting.,
                image: "https://www.rallymerchandise.eu/product-eng-22417-2025-Scuderia-Ferrari-F1-Mens-Team-Padded-Double-Sided-Jacket.html?curr=USD&country=1143020186&selected_size=101&utm_source=iai_ads&utm_medium=google_shopping&gad_source=1&gad_campaignid=19068981115&gbraid=0AAAAApGI3q02LLVKpp0T34qk9Psp9_Fdx&gclid=Cj0KCQjw37nNBhDkARIsAEBGI8NHoVeXVhayjZiTh8p4pMPlFn6jmEJORxAOI-UfbuXdSfhQRaOCg3kaAmjKEALw_wcB"
            },
            {
                id: 35,
                title: "Dining Table Set",
                category: "homeandappliances",
                price: 149.99,
                image: "https://www.zurifurniture.com/common/images/products/large/Modern-Falcone-94-Inch-Dining-Table-Clear-Glass-Polished-Stainless-Zuri.jpg"
            },
            {
                id: 36,
                title: "LED Light Wall Art Set",
                category: "artandcollectibles",
                price: 29.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 37,
                title: "8K Flying Drone",
                category: "electronics",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
             {
                id: 38,
                title: "Albert Einstein Sculpture",
                category: "artandcollectibles",
                price: 29.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 39,
                title: "The Northface Jacket",
                category: "men",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 40,
                title: "Women's Nike Joggers",
                category: "women",
                price: 29.99,
                image: "https://images.unsplash.com/photo-1564257577154-75bdec5c3700?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 41,
                title: "Men's Hermes Belt",
                category: "accessories",
                price: 199.99,
                image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 42,
                title: "Men's Gucci Sweater",
                category: "men",
                price: 1099.99,
                image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 43,
                title: "Women's Prada Handbag",
                category: "accessories",
                price: 1999.99,
                image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 44,
                title: "Men's Louis Vuitton Travel Bag",
                category: "accessories",
                price: 1499.99,
                image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 45,
                title: "Men's Michael Kors Watch",
                category: "jewelry",
                price: 599.99,
                image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 46,
                title: "LG Smart Refrigerator",
                category: "homeandappliances",
                price: 499.99,
                image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 47,
                title: "Apple Macbook Air",
                category: "electronics",
                price: 799.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 48,
                title: "Sony Playstation 5 (Disc Version)",
                category: "entertainment",
                price: 399.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
               {
                id: 49,
                title: "Abraham Lincoln Sculpture",
                category: "artandcollectibles",
                price: 59.99,
                image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 50,
                title: "Nintendo Switch 2",
                category: "entertainment",
                price: 249.99,
                image: "https://i5.walmartimages.com/seo/Nintendo-Switch-2-Mario-Kart-World-Bundle_527bef2f-a6d3-4a7d-a7c6-8cc12d2a1def.048bb537cf3e6d24898c86f2fcbe49aa.png?odnHeight=768&odnWidth=768&odnBg=FFFFFF"
            },
            {
                id: 51,
                title: "Women's Nike Jacket",
                category: "women",
                price: 29.99,
                image: "https://images.unsplash.com/photo-1564257577154-75bdec5c3700?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 52,
                title: "Men's Hermes Wallet",
                category: "accessories",
                price: 99.99,
                image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 53,
                title: "Men's Fendi Sweater",
                category: "men",
                price: 1099.99,
                image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 54,
                title: "Women's Fendi Sweater",
                category: "women",
                price: 1999.99,
                image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 55,
                title: "Men's Hermes Travel Bag",
                category: "accessories",
                price: 1499.99,
                image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 56,
                title: "Women's Michael Kors Watch",
                category: "jewelry",
                price: 599.99,
                image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
            },
            {
                id: 57,
                title: "Hamilton Beach Coffee Maker",
                category: "homeandappliances",
                price: 49.99,
                image: "https://target.scene7.com/is/image/Target/GUEST_57e2d054-fd81-4dac-84d7-3a1fffaa0582?wid=800&hei=800&qlt=80"
            },
            {
                id: 58,
                title: "Samsung Laptop",
                category: "electronics",
                price: 299.99,
                image: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/8e09ff69-4142-48ff-938b-75232dd5da79.jpg;maxHeight=1920;maxWidth=900?format=webp"
            },
            {
                id: 59,
                title: "Sony Playstation 5 (Digital Version)",
                category: "entertainment",
                price: 399.99,
                image: "https://www.target.com/p/playstation-5-dig-825gb-console-fortnite-flowering-chaos-bundle/-/A-94967679?prehydrateClick=true#lnk=sametab"
            },


        ];
        
        
const jsonString = JSON.stringify(products); 

        // Cart functionality
        let cart = [];
        let currentPaymentMethod = 'credit';

        function renderProducts(productsToRender = products) {
            const grid = document.getElementById('productGrid');
            grid.innerHTML = productsToRender.map(product => `
                <div class="product-card" data-category="${product.category}">
                    <img src="${product.image}" alt="${product.title}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <p class="product-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</p>
                        <div class="product-price">$${product.price}</div>
                        <button class="add-to-cart" onclick="addToCart(${product.id})">Add to Cart</button>
                    </div>
                </div>
            `).join('');
        },



        function filterProducts(category) {
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // Filter products
            const filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);
            renderProducts(filteredProducts);
        }

        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            const existingItem = cart.find(item => item.id === productId);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            updateCartCount();
            renderCart();
            
            // Show success feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = '✓ Added!';
            button.style.background = '#34C759';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '#000';
            }, 1000);
        }

        function removeFromCart(productId) {
            cart = cart.filter(item => item.id !== productId);
            updateCartCount();
            renderCart();
        }

        function updateQuantity(productId, change) {
            const item = cart.find(item => item.id === productId);
            if (item) {
                item.quantity += change;
                if (item.quantity <= 0) {
                    removeFromCart(productId);
                } else {
                    updateCartCount();
                    renderCart();
                }
            }
        }

        function updateCartCount() {
            const count = cart.reduce((total, item) => total + item.quantity, 0);
            document.getElementById('cartCount').textContent = count;
        }

        function renderCart() {
            const cartItems = document.getElementById('cartItems');
            const cartTotal = document.getElementById('cartTotal');

            if (cart.length === 0) {
                cartItems.innerHTML = `
                    <div class="empty-cart">
                        <div class="empty-cart-icon">🛒</div>
                        <p>Your cart is empty</p>
                    </div>
                `;
                cartTotal.style.display = 'none';
                return;
            }

            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.title}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                    </div>
                </div>
            `).join('');

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            document.getElementById('totalPrice').textContent = `Total: ${total.toFixed(2)}`;
            document.getElementById('checkoutTotal').textContent = `Total: ${total.toFixed(2)}`;
            cartTotal.style.display = 'block';
        }

        function toggleCart() {
            const modal = document.getElementById('cartModal');
            if (modal.style.display === 'block') {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 400);
            } else {
                modal.style.display = 'block';
                setTimeout(() => modal.classList.add('active'), 10);
            }
            
            // Hide checkout form when opening cart
            hideCheckout();
        }

        function showCheckout() {
            if (cart.length === 0) return;
            
            document.getElementById('cartItems').style.display = 'none';
            document.getElementById('cartTotal').style.display = 'none';
            document.getElementById('checkoutForm').classList.add('active');
        }

        function hideCheckout() {
            document.getElementById('cartItems').style.display = 'block';
            document.getElementById('cartTotal').style.display = 'block';
            document.getElementById('checkoutForm').classList.remove('active');
        }

        function selectPayment(method) {
            currentPaymentMethod = method;
            document.querySelectorAll('.payment-method').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const creditCardForm = document.getElementById('creditCardForm');
            if (method === 'credit') {
                creditCardForm.style.display = 'block';
            } else {
                creditCardForm.style.display = 'none';
            }
        }

        function processOrder(event) {
            event.preventDefault();
            
            if (cart.length === 0) return;
            
            // Get form data
            const formData = new FormData(event.target);
            const orderData = {
                items: cart,
                total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                customer: {
                    name: formData.get('fullName'),
                    email: formData.get('email'),
                    phone: formData.get('phone')
                },
                shipping: {
                    address: formData.get('address'),
                    city: formData.get('city'),
                    zipCode: formData.get('zipCode'),
                    country: formData.get('country')
                },
                payment: {
                    method: currentPaymentMethod
                }
            };
            
            
            // Initiate order processing
            const placeOrderBtn = document.querySelector('.place-order-btn');
            placeOrderBtn.textContent = '🔄 Processing...';
            placeOrderBtn.disabled = true;
            

  document.getElementById('checkoutForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Gather form data
    const formData = new FormData(this);
    const formObject = {};

    formData.forEach((value, key) => {
      formObject[key] = value;
    });

    // Convert to JSON string
    const jsonString = JSON.stringify(formObject);

    // Save JSON string to localStorage
    localStorage.setItem('formData', jsonString);

    // Redirect back to the shop page (e.g., shop.html)
    window.location.href = 'testbondsmall.html';
  });

            setTimeout(() => {
                
                
                // Reset everything
                cart = [];
                updateCartCount();
                renderCart();
                toggleCart();
                event.target.reset();
                
                placeOrderBtn.textContent = 'Place Order';
                placeOrderBtn.disabled = false;
            }, 2000);
        }




        // Format card number input
        document.addEventListener('DOMContentLoaded', function() {
            const cardNumberInput = document.getElementById('cardNumber');
            const expiryInput = document.getElementById('expiryDate');
            const cvvInput = document.getElementById('cvv');
            
            if (cardNumberInput) {
                cardNumberInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                    e.target.value = formattedValue;
                });
            }
            
            if (expiryInput) {
                expiryInput.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 2) {
                        value = value.substring(0,2) + '/' + value.substring(2,4);
                    }
                    e.target.value = value;
                });
            }
            
            if (cvvInput) {
                cvvInput.addEventListener('input', function(e) {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0,4);
                });
            }
        });

        // Close cart when clicking outside
        document.getElementById('cartModal').addEventListener('click', function(e) {
            if (e.target === this) {
                toggleCart();
            }
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            renderProducts();
            updateCartCount();
        });

