// Global variables
let currentUser = null;
let favorites = [];
let cart = [];
let coins = 0;
// DOM elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');
const favoriteProducts = document.getElementById('favoriteProducts');
const favoritesSection = document.getElementById('favoritesSection');
const featuredProducts = document.getElementById('featuredProducts');
const categoryContainers = document.getElementById('categoryContainers');
const favCount = document.getElementById('favCount');
const cartCount = document.getElementById('cartCount');
const userDropdownContent = document.getElementById('userDropdownContent');
const currentYearEl = document.getElementById('currentYear');


document.getElementById("shopNowBtn").addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.getElementById("categories");
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1500; // ระยะเวลาเลื่อน (มิลลิวินาที)
    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const ease = easeInOutCubic(progress / duration);
        window.scrollTo(0, startPosition + distance * ease);
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    window.requestAnimationFrame(step);
});

/*document.getElementById("favoritesBtn").addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.getElementById("favoritesSection");
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1500; // ระยะเวลาเลื่อน (มิลลิวินาที)
    let start = null;

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const ease = easeInOutCubic(progress / duration);
        window.scrollTo(0, startPosition + distance * ease);
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    window.requestAnimationFrame(step);
});*/



// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    currentYearEl.textContent = new Date().getFullYear();
    if (window.location.hash === "#favoritesSection") {
        setTimeout(() => {
            const favSection = document.getElementById("favoritesSection");
            if (favSection) {
                favSection.scrollIntoView({ behavior: "smooth" });
            }
        }, 300); // รอ DOM สร้าง section เสร็จ
    }
    // Load user data from localStorage
    loadUserData();
    fetchAndShowCoins();
    // Load favorites and cart from localStorage
    loadFavoritesAndCart();
    
    // Update header
    updateHeader();
    
    // Render products
  //  renderFeaturedProducts();
    syncFavoritesFromBackend();
    renderCategoryProducts();
    renderFavoriteProducts();
    
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
async function updateBadgeCounts() {
    const userId = currentUser?.UserID;
    if (!userId) return;
  
    try {
      const response = await fetch(`https://lestialv.ddns.net:3001/api/user-badge-counts/${userId}`);
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูล Badge ได้");
  
      const { cartCount} = await response.json();
      //  //console.log(cartCount);
      // อัปเดต badge
      const cartCountElement = document.getElementById("cartCount");
      cartCountElement.textContent = cartCount;
      cartCountElement.style.display = cartCount > 0 ? 'block' : 'none';
    } catch (err) {
      console.error("ไม่สามารถโหลด badge count:", err);
    }
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
            <a href="../login"><i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ</a>
            <a href="../register"><i class="fas fa-user-plus"></i> สมัครสมาชิก</a>
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

    
    // Search form submission
    
    
    // Mobile search form submission
    document.getElementById('mobileSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('mobileSearchInput').value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });
}

// Render featured products
function renderFeaturedProducts() {
    if (!featuredProducts) return;
    const productCategories = document.getElementById('product-categories');
    //featuredProducts.innerHTML = '';
    
    // Get the first 4 products as featured

  /*  const featured = mockProducts.slice(0, 4);
    
    featured.forEach(product => {
        featuredProducts.appendChild(createProductCard(product));
    });*/

}



function renderCategoryProducts() {
    if (!categoryContainers) return;

    categoryContainers.innerHTML = '';

    fetch('https://lestialv.ddns.net:3001/api/products')
        .then(response => response.json())
        .then(data => {
            // ดึง category แบบไม่ซ้ำ
            

            data.forEach(categoryName => {
                //console.log(categoryName);

                const categoryDiv = document.createElement('div');
                const categoryContainer = document.createElement('div');
                categoryContainer.className = 'category-container';

                categoryContainer.innerHTML = `
                    <div class="section-header">
                        <h2>${categoryName.name}</h2>
                        <a href="#" class="view-all">ดูทั้งหมด <i class="fas fa-arrow-right"></i></a>
                    </div>
                `;

                const productGrid = document.createElement('div');
                productGrid.className = 'product-grid';

                // เพิ่มสินค้าแค่ 4 รายการแรก
                categoryName.products.slice(0, 4).forEach(product => {
                    productGrid.appendChild(createProductCard(product));
                });

                categoryContainer.appendChild(productGrid);
                categoryDiv.appendChild(categoryContainer);
                categoryContainers.appendChild(categoryDiv);

                // หา <a> ดูทั้งหมด
                const viewAllLink = categoryContainer.querySelector('.view-all');

                viewAllLink.addEventListener('click', (e) => {
                    e.preventDefault(); // ป้องกันไม่ให้ลิงก์โหลดหน้าใหม่
                    toggleCategoryProducts(categoryName.name, productGrid, viewAllLink, categoryName.products);
                });
            });
        })
        .catch(error => console.error('Error fetching data:', error));
}

// Render favorite products
function renderFavoriteProducts() {
    const userId = currentUser?.UserID;
    if (!userId) {
        const favBtn = document.getElementById('favoritesBtn');
        if (favBtn) favBtn.style.display = 'none'; 
        return;
    }
    fetch(`https://lestialv.ddns.net:3001/api/Favorites?userId=${userId}`)
        .then(response => response.json())
        .then(products => {
            const favoritesSection = document.getElementById('favoritesSection');
            const favoriteProducts = document.getElementById('favoriteProducts');
            if (!products || products.length === 0) {
                favoritesSection.style.display = 'none';
             //   document.getElementById('favoritesBtn').style.display = 'none';
                return;
            }
            //document.getElementById('favoritesBtn').style.display = 'block';
            favoritesSection.style.display = 'block';
            favoriteProducts.innerHTML = '';

            products.forEach(product => {
                favoriteProducts.appendChild(createProductCard(product));
            });
        })
        .catch(error => console.error('Error loading favorite products:', error));
}

// Create product card
function toggleCategoryProducts(categoryName, productGrid, button, initialProducts) {
    //console.log(categoryName);
    if (button.textContent.includes('ดูทั้งหมด')) {
        fetch(`https://lestialv.ddns.net:3001/api/category/${encodeURIComponent(categoryName)}`)
            .then(response => response.json())
            .then(products => {
                
                productGrid.innerHTML = ""; // ล้างสินค้าเดิม
                
                products.forEach(product => {
                    productGrid.appendChild(createProductCard(product));
                });
                button.innerHTML = 'ย่อ <i class="fas fa-arrow-up"></i>'; // เปลี่ยนปุ่ม
            })
            .catch(error => console.error('Error loading category products:', error));
    } else {
        productGrid.innerHTML = "";
        initialProducts.slice(0, 4).forEach(product => {
            productGrid.appendChild(createProductCard(product));
        });
        button.innerHTML = 'ดูทั้งหมด <i class="fas fa-arrow-right"></i>';
    }
}
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    //console.log(product.Product_status);
    // Fallback ถ้าไม่มี Product_status หรือ Product_count
    const status = product.Product_status || product.status || '';
    const count = typeof product.Product_count !== 'undefined' ? product.Product_count : (product.count || 0);

    let badgeHtml = '';
    if (status === 'pre-order') {
        badgeHtml = '<span class="product-badge pre-order">พรีออเดอร์</span>';
    } else if (status === 'out-of-stock' || count <= 0) {
        badgeHtml = '<span class="product-badge out-of-stock">สินค้าหมด</span>';
    }

    // Check if product is favorited
    const isFavorite = favorites.includes(product.Product_id);
    
    card.innerHTML = `
        <a href="product.html?id=${product.Product_id}" class="product-image-container">
            <img src="../Server/${product.Product_img}" alt="${product.Product_name}" class="product-image">
            ${badgeHtml}
            <button class="product-favorite ${isFavorite ? 'active' : ''}" data-id="${product.Product_id}">
                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </a>
        <div class="product-info">
            <a href="product.html?id=${product.Product_id}" class="product-name">${product.Product_name}</a>
            <div class="product-price">฿${product.Product_price.toLocaleString()}</div>
            <div class="product-actions">
                <button class="btn-primary btn-sm add-to-cart" data-id="${product.Product_id}" ${product.Product_status === 'out-of-stock' || product.Product_count <= 0 ? 'disabled' : ''}>
                    ${product.Product_status === 'out-of-stock' || product.Product_count <= 0 ? 'สินค้าหมด' : '<i class="fas fa-cart-plus"></i> เพิ่มลงตะกร้า'}
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
        addToCart(product);
    });
    
    return card;
}


// Toggle favorite
function toggleFavorite(productId) {
    // Check if user is logged in
    //const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
       Swal.fire({title:'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงรายการโปรด', showDenyButton: true, denyButtonText: 'ยกเลิก', confirmButtonText: 'เข้าสู่ระบบ'}).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '../login';
            }
        }
        );
        return;
    }
    
    const index = favorites.indexOf(productId);
    const userId = currentUser.UserID;
    //console.log(userId);
    if (index === -1) {
        // Add to favorites
        favorites.push(productId);
        fetch('https://lestialv.ddns.net:3001/api/Favorite', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({UserID: userId, Product_id: productId})
        })
        .then(res => res.json())
        .then(data => {
            syncFavoritesFromBackend(); // อัปเดต favorites ใหม่
            updateFavoriteButtons();
            Swal.fire({title:'เพิ่มสินค้าลงรายการโปรดแล้ว', icon:'success'}).then(() => {
            window.location.reload();
            });
        });
    } else {
        // Remove from favorites
        favorites.splice(index, 1);
        Swal.fire({title:'นำสินค้าออกจากรายการโปรดแล้ว', icon:'info'}).then(() => {
            fetch('https://lestialv.ddns.net:3001/api/Favorite', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({UserID: userId, Product_id: productId})
            })
            .then(res => res.json())
            .then(data => {
                favorites = favorites.filter(id => id !== productId);
                updateFavoriteButtons();
                window.location.reload();
            });
        });
    }
    
    // Save to localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Update badge count
    updateBadgeCounts();
    
    // Re-render favorite products section
    renderFavoriteProducts();
    
    // Update favorite buttons on all product cards
    updateFavoriteButtons();
}

function syncFavoritesFromBackend() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    if (!userId) return;
    fetch(`https://lestialv.ddns.net:3001/api/Favorites?userId=${userId}`)
        .then(res => res.json())
        .then(products => {
            favorites = products.map(p => p.Product_id); // อัปเดต favorites เป็น array ของ Product_id
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavoriteButtons();
        });
}

// เรียก syncFavoritesFromBackend() หลัง login หรือหลังเพิ่ม/ลบ favorite


// Add to cart
async function addToCart(product) {
    // ตรวจสอบผู้ใช้ล็อกอิน
    //console.log(currentUser);
    if (!currentUser) {
        Swal.fire({title:'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า', showDenyButton: true, denyButtonText: 'ยกเลิก', confirmButtonText: 'เข้าสู่ระบบ'}).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '../login';
            }
        }
        );
        return;
    }

    if (!product) {
        Swal.fire({title:'ไม่พบสินค้า', icon:'error'});
        return;
    }

    if (product.Product_status === 'Out-of-stock') {
        Swal.fire({title:'สินค้าหมด', icon:'error'});
        return;
    }

    const productId = product.Product_id;
    const userId = currentUser.UserID;
    //console.log(productId);

    try {
        // เรียก API เช็คว่ามีสินค้านี้ในตะกร้าหรือยัง
        const checkRes = await fetch(`https://lestialv.ddns.net:3001/api/carts/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Product_id: productId, UserID: userId })
        });

        const checkData = await checkRes.json();

        if (checkData.exists) {
            // ถ้ามีอยู่แล้ว เพิ่มจำนวน
            await fetch(`https://lestialv.ddns.net:3001/api/carts/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Product_id: productId, UserID: userId, quantity: checkData.quantity + 1 })
            });

            Swal.fire({title:'เพิ่มจำนวนสินค้าในตะกร้าแล้ว', icon:'success'});
        } else {
            // ถ้าไม่มี เพิ่มใหม่
            await fetch(`https://lestialv.ddns.net:3001/api/carts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Product_id: productId, UserID: userId, quantity: 1 })
            });

            Swal.fire({title:'เพิ่มสินค้าลงตะกร้าแล้ว', icon:'success'});
        }

        updateBadgeCounts();

    } catch (err) {
        console.error('❌ Error adding to cart:', err);
        Swal.fire({title:'เกิดข้อผิดพลาด', icon:'error'});
    }
}

/*function 6ik, 5t6 {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    fetch(`https://lestialv.ddns.net:3001/api/Favorite?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
            favorites = data.map(p => p.Product_id);
            updateFavoriteButtons();
        });
}*/

// Update favorite buttons on all product cards
function updateFavoriteButtons() {
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

// Check user coins
async function fetchAndShowCoins() {
    if (!currentUser || !currentUser.UserID) return;
    try {
        const res = await fetch(`https://lestialv.ddns.net:3001/api/users/coins/${currentUser.UserID}`);
        const data = await res.json();
        if (res.ok && typeof data.coins === 'number') {
            coins = data.coins;
            // อัปเดตใน currentUser ด้วย (ถ้ามี)
            currentUser.coins = coins;
            // อัปเดตแสดงผล
            const userCoinsDiv = document.querySelector('.user-coins');
            if (userCoinsDiv) {
                userCoinsDiv.innerHTML = `<i class="fas fa-coins"></i> ${coins.toLocaleString()} เหรียญ`;
            }
        }
    } catch (err) {
        console.error('ไม่สามารถโหลด coins:', err);
    }
}