
// Purchase page functionality
/*document.addEventListener('DOMContentLoaded', function() {
  // Handle buy now buttons
  const buyNowButtons = document.querySelectorAll('.btn-primary');
  
  buyNowButtons.forEach(button => {
    button.addEventListener('click', function() {
      const shopName = this.closest('.purchase-group').querySelector('.shop-name').textContent;
      showNotification(`กำลังดำเนินการสั่งซื้อสินค้าจาก ${shopName}`, 'success');
      
      // Redirect to checkout page
      setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 1000);
    });
  });
  
  // Handle contact seller buttons
  const contactSellerButtons = document.querySelectorAll('.btn-outline');
  
  contactSellerButtons.forEach(button => {
    button.addEventListener('click', function() {
      const shopName = this.closest('.purchase-group').querySelector('.shop-name').textContent;
      showNotification(`กำลังติดต่อผู้ขาย ${shopName}`, 'info');
    });
  });
  
  // Handle order item clicks for navigation
  const orderItems = document.querySelectorAll('.order-item');
  
  orderItems.forEach(item => {
    item.addEventListener('click', function() {
      const orderId = this.querySelector('.order-id').textContent.replace('คำสั่งซื้อ #', '');
      window.location.href = `order-detail.html?id=${orderId}`;
    });
  });
  
  // Handle shop links
  const shopLinks = document.querySelectorAll('.shop-link');
  
  shopLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.stopPropagation();
      const shopName = this.closest('.shop-info').querySelector('.shop-name').textContent;
      showNotification(`กำลังไปที่ร้านค้า ${shopName}`, 'info');
    });
  });
  
  // Handle recommended product clicks
  const productItems = document.querySelectorAll('.product-item');
  
  productItems.forEach(item => {
    item.addEventListener('click', function() {
      const productName = this.querySelector('.product-title').textContent;
      showNotification(`กำลังดูรายละเอียดสินค้า: ${productName}`, 'info');
      // In a real app, this would navigate to a product detail page
    });
  });
});*/
let currentUser = null;
let favorites = [];
let cart = [];
let coins = 0;

// DOM elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const userBtn = document.getElementById('userBtn');
const userDropdown = document.getElementById('userDropdown');


const featuredProducts = document.getElementById('featuredProducts');
const categoryContainers = document.getElementById('categoryContainers');
const favCount = document.getElementById('favCount');
const cartCount = document.getElementById('cartCount');
const userDropdownContent = document.getElementById('userDropdownContent');
const container = document.querySelector(".purchase-page .container");

document.addEventListener("DOMContentLoaded", () => {
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  if (!userId){
    window.location.href = "../login";
    return;
  } 

  
  if (!container) {
    console.error("❌ ไม่พบ .purchase-page .container ใน DOM");
    return;
  }

  fetch(`https://lestialv.ddns.net:3001/api/user-orders/${userId}`)
    .then(res => res.json())
    .then(data => {
      //console.log("Fetched order data:", data);
      container.innerHTML = '';
    
      if (!Array.isArray(data.orders) || data.orders.length === 0) {
        container.innerHTML = '<p class="error">⚠ ไม่พบคำสั่งซื้อใดๆ</p>';
        return;
      }
    
      // ✅ จัดกลุ่มตาม OrderID
      const groupedOrders = {};
      data.orders.forEach(order => {
        if (!groupedOrders[order.OrderID]) {
          groupedOrders[order.OrderID] = {
            orderInfo: order,      // ใช้รายการแรกสุดเป็น info
            products: []           // เก็บสินค้าทั้งหมดใน order เดียวกัน
          };
        }
        groupedOrders[order.OrderID].products.push(...order.Product);
      });
    
      // ✅ แปลงเป็น array และเรียงลำดับตามเวลาจาก order ล่าสุด
      const uniqueOrderGroups = Object.values(groupedOrders).sort((a, b) => {
        return new Date(b.orderInfo.order_date) - new Date(a.orderInfo.order_date);
      });
    
      // ✅ แสดงผล
      uniqueOrderGroups.forEach(({ orderInfo, products }) => {
        const group = document.createElement("div");
        group.classList.add("purchase-group");
        //console.log("Order Info:", orderInfo);
        // ✅ ส่วนหัวคำสั่งซื้อ (แสดงครั้งเดียว)
        const orderHeader = `
          <div class="shop-info">
            <div class="shop-name">รหัสคำสั่งซื้อ: ${orderInfo.OrderID}</div>
            <div class="shop-date">วันที่สั่งซื้อ: ${new Date(orderInfo.order_date).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}</div>
            <div class="shop-badge">รหัสพัสดุ: ${orderInfo.Post_Tracking || '-'}</div>
            ${
              orderInfo.Status === "รอการชำระเงิน" && orderInfo.payby === "promptpay"
              ? `<div class="shop-link" onclick="window.location.href='../carts/promptpay.html?coins=${orderInfo.Total - orderInfo.totalAfterCoins}&orderId=${orderInfo.OrderID}'">ชำระเงิน</div>`
              : ""
            }
            ${
              orderInfo.Status === "รอการชำระเงิน" && orderInfo.payby === "coins_and_promptpay"
              ? `<div class="shop-link" onclick="window.location.href='../carts/promptpay.html?coins=${orderInfo.totalAfterCoins}&orderId=${orderInfo.OrderID}'">ชำระเงิน</div>`
              : ""
            }</div>
        `;
      
        // ✅ รายการสินค้า
        const productCards = products.map(product => `
          <div class="product-card show-shop">
            <div class="product-info">
              <div class="product-image">
                <img src="${product.img}" alt="${product.name}" ">
              </div>
              <div class="product-details">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-variant">${product.description || ''}</div>
                <div class="product-quantity">x${product.quantity || 1}</div>
              </div>
              <div class="product-price">
                <div class="price-info">
                  <span class="current-price">฿${product.price}</span>
                </div>
                <div class="delivery-status">
                  <span class="status-text">${orderInfo.Status || 'รอดำเนินการ'}</span>
                </div>
              </div>
            </div>
          </div>
        `).join('');
      
        // ✅ สรุปราคารวม
        const summary = `
    <div class="purchase-summary">
      <div class="total-price">
        <span>ราคารวมสั่งซื้อ:</span>
        <span class="price">฿${orderInfo.Total}</span>
      </div>
      <div class="action-buttons">
        ${(orderInfo.Status === 'รอพนักงานรับคำสั่งซื้อ' || orderInfo.Status === 'รอการชำระเงิน') 
          ? `<button class="btn btn-primary cancel-btn" data-orderid="${orderInfo.OrderID}">ยกเลิกคำสั่งซื้อแล้ว</button>` 
          : ''}
      </div>
    </div>
  `;

      
        // ✅ รวมทั้งหมดเข้าไปใน group เดียว
        group.innerHTML = orderHeader + productCards + summary;
        container.appendChild(group);
        const cancelButton = group.querySelector('.cancel-btn');
        if (cancelButton) {
          cancelButton.addEventListener('click', () => {
            const orderId = cancelButton.getAttribute('data-orderid');
            cancelOrder(orderId);
          });
        }
      });
      
    })
    
    .catch(err => {
      console.error('เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ:', err);
      container.innerHTML = `<p class="error">⚠ ไม่สามารถโหลดข้อมูลได้</p>`;
    });
});

async function cancelOrder(orderId) {
  //console.log('Canceling order:', orderId);
  const result = await Swal.fire({
    title: 'คุณแน่ใจหรือไม่?',
    text: 'คุณต้องการยกเลิกคำสั่งซื้อนี้หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ยกเลิก',
    cancelButtonText: 'ไม่ใช่'
  });
  if (!result.isConfirmed) return;

  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  if (!userId) return Swal.fire({title:'กรุณาเข้าสู่ระบบ', icon:'error'});
  
  const res = await fetch('https://lestialv.ddns.net:3001/api/cancel-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, userId })
  });

  const data = await res.json();
  if (data.success) {
    window.location.reload();
  } else {
    Swal.fire({title:data.message || 'เกิดข้อผิดพลาด', icon:'error'});
  }
}


document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    if (window.location.hash === "#favoritesSection") {
      setTimeout(() => {
          const favSection = document.getElementById("favoritesSection");
          if (favSection) {
              favSection.scrollIntoView({ behavior: "smooth" });
          }
      }, 300); // รอ DOM สร้าง section เสร็จ
  }
    fetchAndShowCoins();
    // Load user data from localStorage
    loadUserData();
    
    // Load favorites and cart from localStorage
    loadFavoritesAndCart();
    
    // Update header
    updateHeader();
    
    // Render products
  //  renderFeaturedProducts();

    
    // Event listeners
    setupEventListeners();
});
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
  /*  document.getElementById('mobileSearchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('mobileSearchInput').value.trim();
        if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
    });*/
}
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
async function updateBadgeCounts() {
    const userId = currentUser.UserID;
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
  async function fetchAndShowCoins() {
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!userId) return;
    try {
        const res = await fetch(`https://lestialv.ddns.net:3001/api/users/coins/${userId}`);
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