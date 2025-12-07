// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Application State
let appState = {
    cart: [],
    wishlist: [],
    products: [],
    currentUser: null,
    orders: [],
    currentProduct: null,
    currentProductQty: 1
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadCart();
    loadWishlist();
    setupEventListeners();
    console.log('Shopping site initialized');
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('checkoutForm')?.addEventListener('submit', submitCheckout);
    document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
    document.getElementById('passwordForm')?.addEventListener('submit', changePassword);
}

// ============ PRODUCTS ============

async function loadProducts() {
    try {
        // Load products from API
        const productsResponse = await fetch(`${API_BASE_URL}/product`);
        const products = await productsResponse.json();
        
        // Transform API products to shop products format
        appState.products = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            originalPrice: p.price * 1.2,
            description: p.description || 'Quality product',
            category: 'electronics',
            rating: 4.5,
            reviews: 128,
            image: p.image_path || '📦',
            image_id: p.image_id,
            inStock: true
        }));
        
        console.log('Loaded products with images:', appState.products);
        displayProducts(appState.products);
    } catch (error) {
        console.error('Error loading products:', error);
        showToast('Error loading products', 'error');
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No products found</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const hasImage = product.image && product.image.startsWith('/');
        const imageUrl = hasImage ? `${API_BASE_URL}${product.image}` : null;
        
        return `
            <div class="product-card" onclick="openProductModal(${product.id})">
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${product.name}" class="product-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\"font-size: 4rem; text-align: center; padding: 2rem; background: #f7fafc;\">📦</div>'">` 
                    : `<div style="font-size: 4rem; text-align: center; padding: 2rem; background: #f7fafc;">📦</div>`
                }
                <div class="product-body">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${escapeHtml(product.name)}</h3>
                    <div class="product-rating">
                        <span class="stars">${'⭐'.repeat(Math.round(product.rating))}</span>
                        <span>(${product.reviews})</span>
                    </div>
                    <div class="product-price">
                        <span class="price">$${product.price.toFixed(2)}</span>
                        <span class="original-price">$${product.originalPrice.toFixed(2)}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); addToCartDirect(${product.id})">Add to Cart</button>
                        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); toggleWishlist(${product.id})">❤️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(productId) {
    const product = appState.products.find(p => p.id === productId);
    if (!product) return;
    
    appState.currentProduct = product;
    appState.currentProductQty = 1;
    
    // Display image
    const imageContainer = document.getElementById('modalProductImage');
    if (product.image && product.image.startsWith('/')) {
        const imageUrl = `${API_BASE_URL}${product.image}`;
        imageContainer.innerHTML = `<img src="${imageUrl}" alt="${product.name}" style="max-width: 100%; max-height: 400px; object-fit: contain;" onerror="this.parentElement.innerHTML='<div style=\"font-size: 6rem; text-align: center; padding: 3rem; background: #f7fafc;\">📦</div>'">`;
    } else {
        imageContainer.innerHTML = `<div style="font-size: 6rem; text-align: center; padding: 3rem; background: #f7fafc;">${product.image || '📦'}</div>`;
    }
    
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductRating').textContent = '⭐'.repeat(Math.round(product.rating));
    document.getElementById('modalProductReviews').textContent = `(${product.reviews} reviews)`;
    document.getElementById('modalProductDescription').textContent = product.description;
    document.getElementById('modalProductPrice').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('modalProductOriginalPrice').textContent = `$${product.originalPrice.toFixed(2)}`;
    document.getElementById('modalProductStock').textContent = product.inStock ? 
        '<span style="color: #48bb78; font-weight: 600;">✓ In Stock</span>' : 
        '<span style="color: #f56565; font-weight: 600;">Out of Stock</span>';
    document.getElementById('modalProductQty').value = 1;
    
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function increaseQty() {
    const input = document.getElementById('modalProductQty');
    input.value = parseInt(input.value) + 1;
}

function decreaseQty() {
    const input = document.getElementById('modalProductQty');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

// ============ CART ============

function addToCartFromModal() {
    const qty = parseInt(document.getElementById('modalProductQty').value);
    addToCart(appState.currentProduct, qty);
    closeProductModal();
}

function addToCartDirect(productId, qty = 1) {
    const product = appState.products.find(p => p.id === productId);
    if (product) {
        addToCart(product, qty);
    }
}

function addToCart(product, qty = 1) {
    const existingItem = appState.cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.qty += qty;
    } else {
        appState.cart.push({...product, qty});
    }
    
    saveCart();
    updateCartCount();
    showToast(`${product.name} added to cart!`, 'success');
}

function removeFromCart(productId) {
    appState.cart = appState.cart.filter(item => item.id !== productId);
    saveCart();
    displayCart();
    updateCartCount();
    showToast('Item removed from cart', 'success');
}

function updateCartQty(productId, qty) {
    const item = appState.cart.find(p => p.id === productId);
    if (item) {
        item.qty = Math.max(1, qty);
        saveCart();
        displayCart();
    }
}

function displayCart() {
    const cartContainer = document.getElementById('cartItems');
    if (!cartContainer) return;
    
    if (appState.cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <h3>Your cart is empty</h3>
                <p>Add some products to get started!</p>
                <button class="btn btn-primary" onclick="showSection('products')">Continue Shopping</button>
            </div>
        `;
        document.getElementById('subtotal').textContent = '$0.00';
        document.getElementById('shipping').textContent = '$0.00';
        document.getElementById('tax').textContent = '$0.00';
        document.getElementById('total').textContent = '$0.00';
        return;
    }
    
    cartContainer.innerHTML = appState.cart.map(item => {
        const imageUrl = item.image && (item.image.startsWith('http') || item.image.startsWith('/uploads'))
            ? `${API_BASE_URL}${item.image}`
            : null;
        
        return `
            <div class="cart-item">
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f7fafc%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2236%22%3E📦%3C/text%3E%3C/svg%3E'">` 
                    : `<div style="width: 100px; height: 100px; font-size: 3rem; text-align: center; display: flex; align-items: center; justify-content: center; background: #f7fafc; border-radius: 8px;">📦</div>`
                }
                <div class="cart-item-details">
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>$${item.price.toFixed(2)} each</p>
                </div>
                <div class="cart-item-controls">
                    <div class="item-price">$${(item.price * item.qty).toFixed(2)}</div>
                    <div class="quantity-selector">
                        <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.qty - 1})">-</button>
                        <input type="number" value="${item.qty}" onchange="updateCartQty(${item.id}, this.value)" class="qty-input" min="1">
                        <button class="qty-btn" onclick="updateCartQty(${item.id}, ${item.qty + 1})">+</button>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = appState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 10) : 0;
    const tax = subtotal * 0.1;
    const total = subtotal + shipping + tax;
    
    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('shipping').textContent = `$${shipping.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    
    // Update checkout summary
    const checkoutItems = document.getElementById('checkoutItems');
    if (checkoutItems) {
        checkoutItems.innerHTML = appState.cart.map(item => `
            <div class="checkout-item">
                <span>${escapeHtml(item.name)} x${item.qty}</span>
                <span>$${(item.price * item.qty).toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    if (document.getElementById('checkoutTotal')) {
        document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
    }
}

function updateCartCount() {
    const count = appState.cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cartCount').textContent = count;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(appState.cart));
}

function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        appState.cart = JSON.parse(saved);
        updateCartCount();
    }
}

function proceedToCheckout() {
    if (appState.cart.length === 0) {
        showToast('Add items to cart first', 'warning');
        return;
    }
    updateCartSummary();
    showSection('checkout');
}

// ============ CHECKOUT ============

async function submitCheckout(e) {
    e.preventDefault();
    
    const orderData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        zipCode: document.getElementById('zipCode').value,
        items: appState.cart,
        total: parseFloat(document.getElementById('checkoutTotal').textContent.replace('$', ''))
    };
    
    try {
        // In a real app, this would send to backend
        console.log('Order submitted:', orderData);
        
        // Clear cart and show confirmation
        appState.cart = [];
        saveCart();
        updateCartCount();
        document.getElementById('checkoutForm').reset();
        
        showToast('Order placed successfully! ✓', 'success');
        setTimeout(() => showSection('home'), 1500);
    } catch (error) {
        showToast('Error placing order', 'error');
    }
}

// ============ WISHLIST ============

function toggleWishlist(productId) {
    const index = appState.wishlist.indexOf(productId);
    if (index > -1) {
        appState.wishlist.splice(index, 1);
        showToast('Removed from wishlist', 'success');
    } else {
        appState.wishlist.push(productId);
        showToast('Added to wishlist!', 'success');
    }
    saveWishlist();
}

function addToWishlist() {
    toggleWishlist(appState.currentProduct.id);
    closeProductModal();
}

function displayWishlist() {
    const wishlistProducts = appState.products.filter(p => appState.wishlist.includes(p.id));
    const grid = document.getElementById('wishlistGrid');
    if (grid) {
        displayProducts(wishlistProducts);
    }
}

function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(appState.wishlist));
}

function loadWishlist() {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
        appState.wishlist = JSON.parse(saved);
    }
}

// ============ SEARCH & FILTER ============

function searchProducts() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const filtered = appState.products.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
    displayProducts(filtered);
}

function filterProducts() {
    const category = document.getElementById('categoryFilter').value;
    const filtered = category ? 
        appState.products.filter(p => p.category === category) : 
        appState.products;
    displayProducts(filtered);
}

function sortProducts() {
    const sortBy = document.getElementById('sortFilter').value;
    let sorted = [...appState.products];
    
    switch(sortBy) {
        case 'price-low':
            sorted.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sorted.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            sorted.sort((a, b) => b.reviews - a.reviews);
            break;
        default:
            sorted.sort((a, b) => b.id - a.id);
    }
    
    displayProducts(sorted);
}

// ============ ACCOUNT ============

function switchAccountTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.account-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');
    
    // Load data for tab
    if (tabName === 'wishlist') {
        displayWishlist();
    } else if (tabName === 'orders') {
        displayOrders();
    }
}

function displayOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;
    
    const mockOrders = [
        {
            number: 'ORD-001234',
            date: '2025-11-20',
            status: 'delivered',
            total: '$299.99',
            items: 3
        },
        {
            number: 'ORD-001233',
            date: '2025-11-15',
            status: 'processing',
            total: '$149.99',
            items: 2
        },
        {
            number: 'ORD-001232',
            date: '2025-11-10',
            status: 'pending',
            total: '$89.99',
            items: 1
        }
    ];
    
    container.innerHTML = mockOrders.map(order => `
        <div class="order-item">
            <div class="order-header">
                <span class="order-number">${order.number}</span>
                <span class="order-status ${order.status}">${order.status.toUpperCase()}</span>
            </div>
            <p>Date: ${order.date} | Items: ${order.items} | Total: ${order.total}</p>
        </div>
    `).join('');
}

async function updateProfile(e) {
    e.preventDefault();
    showToast('Profile updated successfully!', 'success');
}

async function changePassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    showToast('Password changed successfully!', 'success');
    document.getElementById('passwordForm').reset();
}

// ============ SECTION NAVIGATION ============

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Hide all nav links active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Set nav link active state
    event?.target?.classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'cart') {
        displayCart();
    } else if (sectionId === 'products') {
        loadProducts();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// ============ UTILITIES ============

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    appState.cart = [];
    appState.wishlist = [];
    localStorage.clear();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 1500);
}

// Close modal when clicking outside
document.getElementById('productModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'productModal') {
        closeProductModal();
    }
});
