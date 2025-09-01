
// DOM elements
const productDetail = document.getElementById('productDetail');
const relatedProducts = document.getElementById('relatedProducts');
const productBreadcrumb = document.getElementById('productBreadcrumb');
const productName = document.getElementById('productName');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');
const favCount = document.getElementById('favCount');
const cartCount = document.getElementById('cartCount');
const userDropdownContent = document.getElementById('userDropdownContent');
const currentYearEl = document.getElementById('currentYear');

// Global variables
let currentUser = null;
let favorites = [];
let cart = [];
let currentProduct = null;

// Mock data for products
const mockProducts = [
    {
        Product_id: 1,
        Product_name: "กระเป๋าหนังแท้รุ่นพิเศษ",
        Product_price: 1290,
        Product_count: 15,
        Product_type: "กระเป๋า",
        Product_img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop",
        Product_description: "กระเป๋าหนังแท้คุณภาพสูง ดีไซน์ทันสมัย เหมาะสำหรับทุกโอกาส",
        Product_status: "In-stock"
    },
    {
        Product_id: 2,
        Product_name: "เสื้อยืดคอกลมรุ่นลิมิเต็ด",
        Product_price: 590,
        Product_count: 30,
        Product_type: "เสื้อผ้า",
        Product_img: "https://images.unsplash.com/photo-1588099768523-f4e6a5300f5b?w=800&auto=format&fit=crop",
        Product_description: "เสื้อยืดคอกลมทรงหลวม ผลิตจากผ้าคอตตอน 100% นุ่มสบาย",
        Product_status: "In-stock"
    },
    {
        Product_id: 3,
        Product_name: "รองเท้าวิ่งรุ่นลิมิเต็ด",
        Product_price: 2490,
        Product_count: 10,
        Product_type: "รองเท้า",
        Product_img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&auto=format&fit=crop",
        Product_description: "รองเท้าวิ่งรุ่นพิเศษ น้ำหนักเบา พื้นรองเท้าออกแบบมาเพื่อการวิ่งโดยเฉพาะ",
        Product_status: "In-stock"
    },
    {
        Product_id: 4,
        Product_name: "นาฬิกาข้อมือสมาร์ทวอทช์",
        Product_price: 4990,
        Product_count: 5,
        Product_type: "อิเล็กทรอนิกส์",
        Product_img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop",
        Product_description: "นาฬิกาข้อมือสมาร์ทวอทช์ วัดอัตราการเต้นของหัวใจ นับก้าว แจ้งเตือนข้อความ",
        Product_status: "Pre-order"
    },
    {
        Product_id: 10,
        Product_name: "เสื้อเชิ้ตลายสก็อต",
        Product_price: 790,
        Product_count: 25,
        Product_type: "เสื้อผ้า",
        Product_img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop",
        Product_description: "เสื้อเชิ้ตลายสก็อต ผลิตจากผ้าคอตตอนคุณภาพสูง สวมใส่สบาย",
        Product_status: "In-stock"
    },
    {
        Product_id: 11,
        Product_name: "กางเกงยีนส์ทรงสลิม",
        Product_price: 1290,
        Product_count: 20,
        Product_type: "เสื้อผ้า",
        Product_img: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&auto=format&fit=crop",
        Product_description: "กางเกงยีนส์ทรงสลิม ผลิตจากผ้ายีนส์คุณภาพดี ทนทาน",
        Product_status: "In-stock"
    },
    {
        Product_id: 12,
        Product_name: "เสื้อยืดโอเวอร์ไซส์",
        Product_price: 490,
        Product_count: 50,
        Product_type: "เสื้อผ้า",
        Product_img: "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=800&auto=format&fit=crop",
        Product_description: "เสื้อยืดโอเวอร์ไซส์ ทรงหลวม ใส่สบาย เหมาะกับทุกโอกาส",
        Product_status: "In-stock"
    },
    {
        Product_id: 20,
        Product_name: "รองเท้าผ้าใบสีขาว",
        Product_price: 1490,
        Product_count: 15,
        Product_type: "รองเท้า",
        Product_img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop",
        Product_description: "รองเท้าผ้าใบสีขาว ดีไซน์เรียบง่าย ใส่ได้กับทุกชุด",
        Product_status: "In-stock"
    },
    {
        Product_id: 21,
        Product_name: "รองเท้าแตะสวมใส่สบาย",
        Product_price: 590,
        Product_count: 30,
        Product_type: "รองเท้า",
        Product_img: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&auto=format&fit=crop",
        Product_description: "รองเท้าแตะสวมใส่สบาย พื้นนุ่ม เหมาะสำหรับใส่ในบ้านหรือออกนอกบ้าน",
        Product_status: "In-stock"
    },
    {
        Product_id: 22,
        Product_name: "รองเท้าหนังทางการ",
        Product_price: 2490,
        Product_count: 10,
        Product_type: "รองเท้า",
        Product_img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop",
        Product_description: "รองเท้าหนังทางการ ดีไซน์คลาสสิค เหมาะสำหรับโอกาสพิเศษ",
        Product_status: "Out-of-stock"
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYearEl.textContent = new Date().getFullYear();
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    
    // Load user data from localStorage
    loadUserData();
    
    // Load favorites and cart from localStorage
    loadFavoritesAndCart();
    
    // Update header
    updateHeader();
    
    // Load product details
    loadProductDetails(productId);
    
    // Event listeners
    setupEventListeners();
});

// Load user data from localStorage
function loadUserData() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
        } catch (error) {
            console.error('Failed to parse user data:', error);
            currentUser = null;
        }
    }
}

// Load favorites and cart from localStorage
function loadFavoritesAndCart() {
    // Load favorites
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
        try {
            favorites = JSON.parse(storedFavorites);
        } catch (error) {
            console.error('Failed to parse favorites data:', error);
            favorites = [];
        }
    }
    
    // Load cart
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
        } catch (error) {
            console.error('Failed to parse cart data:', error);
            cart = [];
        }
    }
    
    // Update badge counts
    updateBadgeCounts();
}

// Update badge counts
function updateBadgeCounts() {
    favCount.textContent = favorites.length;
    favCount.style.display = favorites.length > 0 ? 'block' : 'none';
    
    const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = cartItemCount;
    cartCount.style.display = cartItemCount > 0 ? 'block' : 'none';
}

// Update header based on user state
function updateHeader() {
    if (currentUser) {
        let roleText = '';
        switch (currentUser.Roles) {
            case 'admin':
                roleText = '<span class="badge" style="background-color: #ea384c;">แอดมิน</span>';
                break;
            case 'staff':
                roleText = '<span class="badge" style="background-color: #10b981;">พนักงาน</span>';
                break;
            default:
                roleText = '';
        }
        
        userDropdownContent.innerHTML = `
            <div class="user-info">
                <div class="username">${currentUser.name} ${currentUser.lastname} ${roleText}</div>
                <div class="user-coins"><i class="fas fa-coins"></i> ${currentUser.coins.toLocaleString()} เหรียญ</div>
            </div>
            ${currentUser.Roles !== 'admin' ? '<a href="../profiles"><i class="fas fa-user"></i> โปรไฟล์</a>' : ''}
            ${currentUser.Roles !== 'admin' ? '<a href="../topup"><i class="fas fa-plus-circle"></i> เติมเหรียญ</a>' : ''}
            <a href="../novelfavorite"><i class="fas fa-book"></i> นิยายโปรด</a>
            <a href="../historyread"><i class="fas fa-history"></i> ประวัติการอ่าน</a>
            <a href="../shop#favoritesSection" id="gotoFavorites"><i class="fas fa-shopping-cart"></i> รายการโปรด</a>
            <a href="../orders"><i class="fas fa-box"></i> คำสั่งซื้อของฉัน</a>
            
            ${currentUser.Roles === 'admin' ? '<a href="/dashboard"><i class="fas fa-chart-line"></i> แดชบอร์ดแอดมิน</a>' : ''}
           ${currentUser.Roles === 'staff' ? '<a href="/stafforder"><i class="fas fa-tasks"></i> แดชบอร์ดพนักงาน</a>' : ''}
            <hr>
            <button id="logoutBtn"><i class="fas fa-sign-out-alt"></i> ออกจากระบบ</button>
        `;
        
        // Add logout event listener
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } else {
        userDropdownContent.innerHTML = `
            <a href="login.html"><i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ</a>
            <a href="register.html"><i class="fas fa-user-plus"></i> สมัครสมาชิก</a>
        `;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
    
    // User dropdown toggle
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userDropdown.classList.contains('active') && !e.target.closest('#userDropdown') && e.target !== userBtn) {
            userDropdown.classList.remove('active');
        }
    });
    
    // Cart button click
    document.getElementById('cartBtn').addEventListener('click', () => {
        window.location.href = '../carts';
    });
    
    // Favorites button click
    document.getElementById('favoritesBtn').addEventListener('click', () => {
        window.location.href = 'favorites.html';
    });
    
    // Search form submission
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });
    
    // Mobile search form submission
    document.getElementById('mobileSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('mobileSearchInput').value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });
}

// Load product details
function loadProductDetails(productId) {
    // Find product by ID
    const product = mockProducts.find(p => p.Product_id === productId);
    
    if (!product) {
        // Product not found
        productDetail.innerHTML = `
            <div class="product-not-found">
                <h2>ไม่พบสินค้า</h2>
                <p>ไม่พบสินค้าที่คุณกำลังค้นหา</p>
                <a href="index.html" class="btn-primary">กลับสู่หน้าแรก</a>
            </div>
        `;
        return;
    }
    
    // Set current product
    currentProduct = product;
    
    // Update page title
    document.title = `${product.Product_name} - ThaiShop`;
    
    // Update breadcrumb
    productName.textContent = product.Product_name;
    
    // Add category to breadcrumb
    if (product.Product_type) {
        const categoryItem = document.createElement('li');
        categoryItem.innerHTML = `<a href="products.html?category=${encodeURIComponent(product.Product_type)}">${product.Product_type}</a>`;
        productBreadcrumb.insertBefore(categoryItem, productName);
    }
    
    // Check if product is favorited
    const isFavorite = favorites.includes(product.Product_id);
    
    // Status indicator
    let stockStatus = '';
    if (product.Product_status === 'In-stock') {
        stockStatus = `<span class="stock-status in-stock">มีสินค้า (${product.Product_count} ชิ้น)</span>`;
    } else if (product.Product_status === 'Pre-order') {
        stockStatus = `<span class="stock-status pre-order">พรีออเดอร์</span>`;
    } else {
        stockStatus = `<span class="stock-status out-of-stock">สินค้าหมด</span>`;
    }
    
    // Render product details
    productDetail.innerHTML = `
        <div class="product-detail-grid">
            <div class="product-images">
                <div class="product-main-image">
                    <img src="${product.Product_img}" alt="${product.Product_name}" id="mainProductImage">
                </div>
            </div>
            <div class="product-info">
                <h1 class="product-title">${product.Product_name}</h1>
                <div class="product-meta">
                    <div class="product-category">หมวดหมู่: <a href="products.html?category=${encodeURIComponent(product.Product_type)}">${product.Product_type}</a></div>
                    <div class="product-availability">${stockStatus}</div>
                </div>
                <div class="product-price-container">
                    <div class="product-price">฿${product.Product_price.toLocaleString()}</div>
                </div>
                <div class="product-description">
                    <p>${product.Product_description}</p>
                </div>
                <div class="product-form">
                    <div class="quantity-selector">
                        <label for="quantity">จำนวน:</label>
                        <div class="quantity-input">
                            <button id="decreaseQuantity" ${product.Product_status === 'Out-of-stock' ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" id="quantity" value="1" min="1" ${product.Product_status === 'Out-of-stock' ? 'disabled' : ''} 
                                max="${product.Product_status === 'In-stock' ? product.Product_count : ''}" />
                            <button id="increaseQuantity" ${product.Product_status === 'Out-of-stock' ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button id="addToCart" class="btn-primary" ${product.Product_status === 'Out-of-stock' ? 'disabled' : ''}>
                            ${product.Product_status === 'Out-of-stock' ? 'สินค้าหมด' : '<i class="fas fa-cart-plus"></i> เพิ่มลงตะกร้า'}
                        </button>
                        <button id="toggleFavorite" class="btn-outline favorite-btn ${isFavorite ? 'active' : ''}">
                            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load related products
    loadRelatedProducts(product.Product_type, product.Product_id);
    
    // Add event listeners for product actions
    document.getElementById('decreaseQuantity').addEventListener('click', () => {
        const quantityInput = document.getElementById('quantity');
        let quantity = parseInt(quantityInput.value);
        if (quantity > 1) {
            quantityInput.value = quantity - 1;
        }
    });
    
    document.getElementById('increaseQuantity').addEventListener('click', () => {
        const quantityInput = document.getElementById('quantity');
        let quantity = parseInt(quantityInput.value);
        const max = product.Product_status === 'In-stock' ? product.Product_count : 999;
        if (quantity < max) {
            quantityInput.value = quantity + 1;
        }
    });
    
    document.getElementById('quantity').addEventListener('change', (e) => {
        let quantity = parseInt(e.target.value);
        
        if (isNaN(quantity) || quantity < 1) {
            e.target.value = 1;
        } else if (product.Product_status === 'In-stock' && quantity > product.Product_count) {
            e.target.value = product.Product_count;
        }
    });
    
    document.getElementById('addToCart').addEventListener('click', () => {
        addToCart(product.Product_id, parseInt(document.getElementById('quantity').value));
    });
    
    document.getElementById('toggleFavorite').addEventListener('click', () => {
        toggleFavorite(product.Product_id);
    });
}

// Load related products
function loadRelatedProducts(category, currentProductId) {
    if (!relatedProducts) return;
    
    relatedProducts.innerHTML = '';
    
    // Get products in the same category
    let related = mockProducts.filter(p => p.Product_type === category && p.Product_id !== currentProductId);
    
    // If not enough related products, add random products
    if (related.length < 4) {
        const otherProducts = mockProducts.filter(p => p.Product_type !== category && p.Product_id !== currentProductId);
        const randomProducts = otherProducts.sort(() => 0.5 - Math.random()).slice(0, 4 - related.length);
        related = [...related, ...randomProducts];
    }
    
    // Display up to 4 related products
    related.slice(0, 4).forEach(product => {
        relatedProducts.appendChild(createProductCard(product));
    });
}

// Create product card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Status badge
    let badgeHtml = '';
    if (product.Product_status === 'Pre-order') {
        badgeHtml = '<span class="product-badge pre-order">พรีออเดอร์</span>';
    } else if (product.Product_status === 'Out-of-stock') {
        badgeHtml = '<span class="product-badge out-of-stock">สินค้าหมด</span>';
    }
    
    // Check if product is favorited
    const isFavorite = favorites.includes(product.Product_id);
    
    card.innerHTML = `
        <a href="product.html?id=${product.Product_id}" class="product-image-container">
            <img src="${product.Product_img}" alt="${product.Product_name}" class="product-image">
            ${badgeHtml}
            <button class="product-favorite ${isFavorite ? 'active' : ''}" data-id="${product.Product_id}">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </a>
        <div class="product-info">
            <a href="product.html?id=${product.Product_id}" class="product-name">${product.Product_name}</a>
            <div class="product-price">฿${product.Product_price.toLocaleString()}</div>
            <div class="product-actions">
                <button class="btn-primary btn-sm add-to-cart" data-id="${product.Product_id}" ${product.Product_status === 'Out-of-stock' ? 'disabled' : ''}>
                    ${product.Product_status === 'Out-of-stock' ? 'สินค้าหมด' : '<i class="fas fa-cart-plus"></i> เพิ่มลงตะกร้า'}
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners for favorite button
    card.querySelector('.product-favorite').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product.Product_id);
    });
    
    // Add event listeners for add to cart button
    card.querySelector('.add-to-cart').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product.Product_id, 1);
    });
    
    return card;
}

// Toggle favorite
function toggleFavorite(productId) {
    // Check if user is logged in
    if (!currentUser) {
        showModal('เข้าสู่ระบบ', `
            <p>กรุณาเข้าสู่ระบบเพื่อเพิ่มรายการโปรด</p>
            <div class="mt-4 text-center">
                <a href="login.html" class="btn-primary">เข้าสู่ระบบ</a>
                <button class="btn-secondary ml-2 close-modal">ยกเลิก</button>
            </div>
        `);
        return;
    }
    
    const index = favorites.indexOf(productId);
    
    if (index === -1) {
        // Add to favorites
        favorites.push(productId);
        showToast('เพิ่มสินค้าลงรายการโปรดแล้ว', 'success');
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        showToast('นำสินค้าออกจากรายการโปรดแล้ว', 'info');
    }
    
    // Save to localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update badge count
    updateBadgeCounts();
    
    // Update favorite buttons on page
    updateFavoriteButtons();
}

// Add to cart
function addToCart(productId, quantity) {
    // Check if user is logged in
    if (!currentUser) {
        showModal('เข้าสู่ระบบ', `
            <p>กรุณาเข้าสู่ระบบเพื่อเพิ่มสินค้าลงตะกร้า</p>
            <div class="mt-4 text-center">
                <a href="login.html" class="btn-primary">เข้าสู่ระบบ</a>
                <button class="btn-secondary ml-2 close-modal">ยกเลิก</button>
            </div>
        `);
        return;
    }
    
    const product = mockProducts.find(p => p.Product_id === productId);
    
    if (!product) {
        showToast('ไม่พบสินค้า', 'error');
        return;
    }
    
    if (product.Product_status === 'Out-of-stock') {
        showToast('สินค้าหมด', 'error');
        return;
    }
    
    // Check if quantity is valid
    if (isNaN(quantity) || quantity < 1) {
        quantity = 1;
    }
    
    // For in-stock products, check if quantity is available
    if (product.Product_status === 'In-stock' && quantity > product.Product_count) {
        showToast(`มีสินค้าในสต็อกเพียง ${product.Product_count} ชิ้น`, 'warning');
        quantity = product.Product_count;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.Product_id === productId);
    
    if (existingItem) {
        // Update quantity
        existingItem.quantity += quantity;
        showToast('เพิ่มจำนวนสินค้าในตะกร้าแล้ว', 'success');
    } else {
        // Add new item
        cart.push({
            Product_id: productId,
            quantity: quantity,
            UserID: currentUser.UserID
        });
        showToast('เพิ่มสินค้าลงตะกร้าแล้ว', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update badge count
    updateBadgeCounts();
}

// Update favorite buttons on page
function updateFavoriteButtons() {
    // Update main product favorite button
    const toggleFavoriteBtn = document.getElementById('toggleFavorite');
    const isFavorite = favorites.includes(currentProduct.Product_id);
    
    if (toggleFavoriteBtn) {
        if (isFavorite) {
            toggleFavoriteBtn.classList.add('active');
            toggleFavoriteBtn.querySelector('i').className = 'fas fa-heart';
        } else {
            toggleFavoriteBtn.classList.remove('active');
            toggleFavoriteBtn.querySelector('i').className = 'far fa-heart';
        }
    }
    
    // Update favorite buttons on related products
    const favoriteButtons = document.querySelectorAll('.product-favorite');
    
    favoriteButtons.forEach(button => {
        const productId = parseInt(button.dataset.id);
        const isFavorite = favorites.includes(productId);
        
        if (isFavorite) {
            button.classList.add('active');
            button.querySelector('i').className = 'fas fa-heart';
        } else {
            button.classList.remove('active');
            button.querySelector('i').className = 'far fa-heart';
        }
    });
}

// Handle logout
function handleLogout() {
    // Remove user data from localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userId');
    localStorage.removeItem('userId');
    localStorage.removeItem('favorites');
    sessionStorage.clear();
    localStorage.clear();
    // Reset current user
    currentUser = null;
    
    // Update header
    updateHeader();
    
    // Show success message
    Swal.fire({title:'ออกจากระบบสำเร็จ', icon:'success'}).then(() => {
        window.location.href = '../index.html';
    });
    
    // Close dropdown
    userDropdown.classList.remove('active');
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show modal
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <h3 class="mb-3">${title}</h3>
        ${content}
    `;
    
    modal.classList.add('show');
    
    // Close modal when clicking on close button or outside
    const closeModal = () => modal.classList.remove('show');
    modal.querySelector('.close-button').addEventListener('click', closeModal);
    
    // Close modal when clicking on elements with close-modal class
    modal.querySelectorAll('.close-modal').forEach(el => {
        el.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}
