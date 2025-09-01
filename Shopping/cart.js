
// DOM elements
const cartContent = document.getElementById('cartContent');
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
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYearEl.textContent = new Date().getFullYear();
    
    // Load user data from localStorage
    loadUserData();
    
    // Load favorites and cart from localStorage
    loadFavoritesAndCart();
    
    // Update header
    updateHeader();
    
    // Render cart items
    renderCartItems();
    
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

// Render cart items
function renderCartItems() {
    // Check if user is logged in
    if (!currentUser) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="fas fa-sign-in-alt"></i>
                </div>
                <h3>กรุณาเข้าสู่ระบบ</h3>
                <p>คุณต้องเข้าสู่ระบบก่อนจึงจะสามารถดูตะกร้าสินค้าได้</p>
                <div class="mt-4">
                    <a href="login.html" class="btn-primary">เข้าสู่ระบบ</a>
                    <a href="register.html" class="btn-secondary ml-2">สมัครสมาชิก</a>
                </div>
            </div>
        `;
        return;
    }
    
    // Check if cart is empty
    if (cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <h3>ตะกร้าสินค้าของคุณว่างเปล่า</h3>
                <p>เพิ่มสินค้าลงในตะกร้าเพื่อดำเนินการสั่งซื้อ</p>
                <div class="mt-4">
                    <a href="products.html" class="btn-primary">เลือกซื้อสินค้า</a>
                </div>
            </div>
        `;
        return;
    }
    
    // Create cart items and calculate total
    let cartItems = '';
    let subtotal = 0;
    let hasOutOfStockItems = false;
    
    cart.forEach(item => {
        const product = mockProducts.find(p => p.Product_id === item.Product_id);
        
        if (!product) return;
        
        const itemTotal = product.Product_price * item.quantity;
        subtotal += itemTotal;
        
        const isOutOfStock = product.Product_status === 'Out-of-stock';
        const isPreOrder = product.Product_status === 'Pre-order';
        
        if (isOutOfStock) {
            hasOutOfStockItems = true;
        }
        
        const maxQuantity = product.Product_status === 'In-stock' ? product.Product_count : 999;
        
        cartItems += `
            <div class="cart-item" data-id="${product.Product_id}">
                <div class="cart-item-image">
                    <img src="${product.Product_img}" alt="${product.Product_name}">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title"><a href="product.html?id=${product.Product_id}">${product.Product_name}</a></h3>
                    <div class="cart-item-price">฿${product.Product_price.toLocaleString()}</div>
                    ${isOutOfStock ? '<div class="cart-item-out-of-stock">สินค้าหมด</div>' : ''}
                    ${isPreOrder ? '<div class="cart-item-pre-order">พรีออเดอร์</div>' : ''}
                </div>
                <div class="cart-item-quantity">
                    <div class="quantity-input">
                        <button class="decrease-quantity" ${isOutOfStock ? 'disabled' : ''} data-id="${product.Product_id}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="item-quantity" value="${item.quantity}" min="1" max="${maxQuantity}" 
                            ${isOutOfStock ? 'disabled' : ''} data-id="${product.Product_id}">
                        <button class="increase-quantity" ${isOutOfStock ? 'disabled' : ''} data-id="${product.Product_id}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">
                    ฿${itemTotal.toLocaleString()}
                </div>
                <div class="cart-item-remove">
                    <button class="remove-item" data-id="${product.Product_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    // Calculate discount and total
    const shipping = 50; // Fixed shipping cost for now
    const total = subtotal + shipping;
    
    // Render complete cart
    cartContent.innerHTML = `
        <div class="cart-container">
            <div class="cart-items">
                <div class="cart-header">
                    <div class="cart-header-item">สินค้า</div>
                    <div class="cart-header-price">ราคาต่อชิ้น</div>
                    <div class="cart-header-quantity">จำนวน</div>
                    <div class="cart-header-total">รวม</div>
                    <div class="cart-header-action"></div>
                </div>
                ${cartItems}
            </div>
            <div class="cart-summary">
                <h3>สรุปรายการสั่งซื้อ</h3>
                <div class="cart-summary-item">
                    <span>ยอดรวม</span>
                    <span>฿${subtotal.toLocaleString()}</span>
                </div>
                <div class="cart-summary-item">
                    <span>ค่าจัดส่ง</span>
                    <span>฿${shipping.toLocaleString()}</span>
                </div>
                <div class="cart-summary-total">
                    <span>ยอดรวมทั้งหมด</span>
                    <span>฿${total.toLocaleString()}</span>
                </div>
                <div class="cart-actions">
                    <button id="checkoutBtn" class="btn-primary btn-block"
                        ${hasOutOfStockItems ? 'disabled' : ''}>
                        ${hasOutOfStockItems ? 'มีสินค้าที่หมดสต็อก' : 'ดำเนินการสั่งซื้อ'}
                    </button>
                    <a href="products.html" class="btn-outline btn-block mt-3">
                        เลือกซื้อสินค้าเพิ่มเติม
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners for cart item actions
    document.querySelectorAll('.decrease-quantity').forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.dataset.id);
            updateQuantity(productId, -1);
        });
    });
    
    document.querySelectorAll('.increase-quantity').forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.dataset.id);
            updateQuantity(productId, 1);
        });
    });
    
    document.querySelectorAll('.item-quantity').forEach(input => {
        input.addEventListener('change', (e) => {
            const productId = parseInt(e.target.dataset.id);
            let quantity = parseInt(e.target.value);
            
            if (isNaN(quantity) || quantity < 1) {
                quantity = 1;
                e.target.value = 1;
            }
            
            const product = mockProducts.find(p => p.Product_id === productId);
            if (product && product.Product_status === 'In-stock' && quantity > product.Product_count) {
                quantity = product.Product_count;
                e.target.value = product.Product_count;
                showToast(`มีสินค้าในสต็อกเพียง ${product.Product_count} ชิ้น`, 'warning');
            }
            
            setQuantity(productId, quantity);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', () => {
            const productId = parseInt(button.dataset.id);
            removeFromCart(productId);
        });
    });
    
    // Add checkout button event listener
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}

// Update quantity of a cart item
function updateQuantity(productId, change) {
    const item = cart.find(item => item.Product_id === productId);
    
    if (!item) return;
    
    const product = mockProducts.find(p => p.Product_id === productId);
    
    if (!product) return;
    
    // Calculate new quantity
    let newQuantity = item.quantity + change;
    
    // Validate new quantity
    if (newQuantity < 1) {
        newQuantity = 1;
    } else if (product.Product_status === 'In-stock' && newQuantity > product.Product_count) {
        newQuantity = product.Product_count;
        showToast(`มีสินค้าในสต็อกเพียง ${product.Product_count} ชิ้น`, 'warning');
    }
    
    // Update quantity if different
    if (newQuantity !== item.quantity) {
        item.quantity = newQuantity;
        
        // Save to localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Update UI
        document.querySelector(`.item-quantity[data-id="${productId}"]`).value = newQuantity;
        
        // Update item total
        const itemTotal = product.Product_price * newQuantity;
        document.querySelector(`.cart-item[data-id="${productId}"] .cart-item-total`).textContent = 
            `฿${itemTotal.toLocaleString()}`;
        
        // Update cart summary
        updateCartSummary();
        
        // Update badge counts
        updateBadgeCounts();
    }
}

// Set quantity of a cart item
function setQuantity(productId, quantity) {
    const item = cart.find(item => item.Product_id === productId);
    
    if (!item) return;
    
    const product = mockProducts.find(p => p.Product_id === productId);
    
    if (!product) return;
    
    // Update quantity
    item.quantity = quantity;
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update item total
    const itemTotal = product.Product_price * quantity;
    document.querySelector(`.cart-item[data-id="${productId}"] .cart-item-total`).textContent = 
        `฿${itemTotal.toLocaleString()}`;
    
    // Update cart summary
    updateCartSummary();
    
    // Update badge counts
    updateBadgeCounts();
}

// Remove item from cart
function removeFromCart(productId) {
    // Filter out the item to remove
    cart = cart.filter(item => item.Product_id !== productId);
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Show toast
    showToast('นำสินค้าออกจากตะกร้าแล้ว', 'info');
    
    // Update badge counts
    updateBadgeCounts();
    
    // Re-render cart items
    renderCartItems();
}

// Update cart summary
function updateCartSummary() {
    let subtotal = 0;
    
    // Calculate subtotal
    cart.forEach(item => {
        const product = mockProducts.find(p => p.Product_id === item.Product_id);
        if (product) {
            subtotal += product.Product_price * item.quantity;
        }
    });
    
    // Calculate total
    const shipping = 50;
    const total = subtotal + shipping;
    
    // Update summary in DOM
    const summaryItems = document.querySelectorAll('.cart-summary-item span:last-child');
    if (summaryItems.length >= 2) {
        summaryItems[0].textContent = `฿${subtotal.toLocaleString()}`;
        summaryItems[1].textContent = `฿${shipping.toLocaleString()}`;
    }
    
    const totalElement = document.querySelector('.cart-summary-total span:last-child');
    if (totalElement) {
        totalElement.textContent = `฿${total.toLocaleString()}`;
    }
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
