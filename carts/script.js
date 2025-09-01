let currentUser = null;
let favorites = [];
let cart = [];
let coins = 0;

const API_URL = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json';
let provinceData = [];


document.addEventListener('DOMContentLoaded', () => {
    isLoggedIn();
    loadThaiAddressData();
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    if (!userId) {
        window.location.href = "../login/";
    }
    document.getElementById('province').addEventListener('change', function() {
        const amphureSelect = document.getElementById('district');
        amphureSelect.innerHTML = '<option value="">เลือกอำเภอ</option>';
        document.getElementById('sub_district').innerHTML = '<option value="">เลือกตำบล</option>';
        const selectedProvince = provinceData.find(p => p.name_th === this.value);

        if (selectedProvince) {
            selectedProvince.amphure.forEach(a => {
                amphureSelect.removeAttribute('disabled');
                amphureSelect.innerHTML += `<option value="${a.name_th}">${a.name_th}</option>`;
            });
        }
    });

    document.getElementById('district').addEventListener('change', function() {
        const subDistrictSelect = document.getElementById('sub_district');
        subDistrictSelect.innerHTML = '<option value="">เลือกตำบล</option>';
        const provinceName = document.getElementById('province').value;
        const amphureName = this.value;
        const selectedProvince = provinceData.find(p => p.name_th === provinceName);
        if (selectedProvince) {
            const selectedAmphure = selectedProvince.amphure.find(a => a.name_th === amphureName);
            if (selectedAmphure) {
                selectedAmphure.tambon.forEach(t => {
                    subDistrictSelect.removeAttribute('disabled');
                    subDistrictSelect.innerHTML += `<option value="${t.name_th}">${t.name_th}</option>`;
                });
            }
        }
    });

    document.getElementById('sub_district').addEventListener('change', function() {
        const provinceName = document.getElementById('province').value;
        const amphureName = document.getElementById('district').value;
        const tambonName = this.value;
        const postalInput = document.getElementById('postal');
        const selectedProvince = provinceData.find(p => p.name_th === provinceName);
        if (selectedProvince) {
            const selectedAmphure = selectedProvince.amphure.find(a => a.name_th === amphureName);
            if (selectedAmphure) {
                const selectedTambon = selectedAmphure.tambon.find(t => t.name_th === tambonName);
                if (selectedTambon) {
                    postalInput.value = selectedTambon.zip_code;
                }
            }
        }
    });
});

async function loadThaiAddressData() {
    try {
        const res = await fetch(API_URL);
        provinceData = await res.json();
        renderProvinces();
    } catch (err) {
        console.error("โหลดข้อมูลจังหวัดล้มเหลว", err);
    }
}

function renderProvinces() {
    const provinceSelect = document.getElementById('province');
    provinceSelect.innerHTML = '<option value="">เลือกจังหวัด</option>';
    provinceData.forEach(prov => {
        provinceSelect.innerHTML += `<option value="${prov.name_th}">${prov.name_th}</option>`;
    });
}


// เรียกใช้เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', loadThaiAddressData);

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
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer

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
    if (window.location.hash === "#favoritesSection") {
        setTimeout(() => {
            const favSection = document.getElementById("favoritesSection");
            if (favSection) {
                favSection.scrollIntoView({ behavior: "smooth" });
            }
        }, 300); // รอ DOM สร้าง section เสร็จ
    }
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
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 10000);
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



document.addEventListener('DOMContentLoaded', function() {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    
 const cartContainer = document.getElementById("cart-items");

    if (!cartContainer) {
    console.error("Error: Element with ID 'cart-items' not found.");
    } else if (!userId) {
    window.location.href = "../login/";
    console.error("Error: userId not found in sessionStorage.");
    } else {
    loadCart();
    }
});

/*document.addEventListener("DOMContentLoaded", async () => {
  const userId = currentUser.id || sessionStorage.getItem('userId') || localStorage.getItem('userId');
  const addressContainer = document.getElementById("addressContainer");

  if (!userId || !addressContainer) {
    console.error("⚠️ ไม่พบ userId หรือ addressContainer");
    return;
  }

  fetch(`https://lestialv.ddns.net:3001/api/addresses/${userId}`)
    .then(res => res.json())
    .then(addresses => {
      addressContainer.innerHTML = ''; // เคลียร์ของเก่า

      addresses.forEach((addr, index) => {
        // ✅ เช็คว่าข้อมูลสำคัญไม่เป็น null หรือว่าง
        if (
          !addr.firstName || !addr.lastName ||
          !addr.address || !addr.province ||
          !addr.district || !addr.sub_district ||
          !addr.postal
        ) {
          return; // ข้ามข้อมูลนี้ไป
        }

        const id = `address${index}`;
        const fullName = `${addr.firstName} ${addr.lastName}`;
        const fullAddress = `${addr.address} ${addr.sub_district} ${addr.district} ${addr.province} ${addr.postal}`;
        const isDefault = addr.defaultAddress === 1;

        const card = `
          <div class="address-card ${isDefault ? 'selected' : ''}">
            <div class="address-radio">
              <input type="radio" name="address" id="${id}" value="${JSON.stringify(addr).replace(/"/g, '&quot;')}" ${isDefault ? 'checked' : ''}>
              <label for="${id}"></label>
            </div>
            <div class="address-content">
              <div class="address-name">${fullName} ${isDefault ? '(ค่าเริ่มต้น)' : ''}</div>
              <div class="address-phone">${addr.telephone ?? ''}</div>
              <div class="address-full">${fullAddress}</div>
            </div>
          </div>
        `;

        addressContainer.innerHTML += card;
      });

      // กรณีไม่มีที่อยู่แสดง
      if (addressContainer.innerHTML.trim() === '') {
        addressContainer.innerHTML = '<p>ยังไม่มีที่อยู่ที่สามารถใช้งานได้</p>';
      }
    })
    .catch(err => {
      console.error("⚠️ Error loading addresses:", err);
      addressContainer.innerHTML = '<p>ไม่สามารถโหลดที่อยู่ได้</p>';
    });
});*/
document.addEventListener("DOMContentLoaded", async () => {
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  const addressContainer = document.getElementById("addressContainer");

  if (!userId || !addressContainer) {
    console.error("⚠️ ไม่พบ userId หรือ addressContainer");
    return;
  }

  fetch(`https://lestialv.ddns.net:3001/api/addresses/${userId}`)
    .then(res => res.json())
    .then(addresses => {
      addressContainer.innerHTML = ''; // เคลียร์ของเก่า

      addresses.forEach((addr, index) => {
        if (
          !addr.firstName || !addr.lastName ||
          !addr.address || !addr.province ||
          !addr.district || !addr.sub_district ||
          !addr.postal
        ) {
          return; // ข้ามข้อมูลนี้ไป
        }

        const id = `address${index}`;
        const fullName = `${addr.firstName} ${addr.lastName}`;
        const fullAddress = `${addr.address} ${addr.sub_district} ${addr.district} ${addr.province} ${addr.postal}`;
        const isDefault = addr.defaultAddress === 1;

        const card = `
          <div class="address-card ${isDefault ? 'selected' : ''}" data-address-id="${addr.id}">
            <div class="address-radio">
              <input type="radio" name="address" id="${id}" value="${JSON.stringify(addr).replace(/"/g, '&quot;')}" ${isDefault ? 'checked' : ''}>
              <label for="${id}"></label>
            </div>
            <div class="address-content">
              <div class="address-name">${fullName} ${isDefault ? '(ค่าเริ่มต้น)' : ''}</div>
              <div class="address-phone">${addr.telephone ?? ''}</div>
              <div class="address-full">${fullAddress}</div>
            </div>
            <button class="delete-address-btn" data-address-id="${addr.id}" style="color:red;">ลบที่อยู่</button>
          </div>
        `;

        addressContainer.innerHTML += card;
      });

      // กรณีไม่มีที่อยู่แสดง
      if (addressContainer.innerHTML.trim() === '') {
        addressContainer.innerHTML = '<p>ยังไม่มีที่อยู่ที่สามารถใช้งานได้</p>';
        return;
      }

      // ✅ รองรับการคลิกเพื่อเลือก address card
      document.querySelectorAll(".address-card").forEach(card => {
        card.addEventListener("click", () => {
          document.querySelectorAll(".address-card").forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");

          const radio = card.querySelector("input[type='radio']");
          if (radio) radio.checked = true;
        });
      });

      // ✅ แสดงการ์ดที่เลือก (default)
      const selectedCard = document.querySelector(".address-card.selected");
      //console.log("📦 Selected address card:", selectedCard);

      // เพิ่มฟังก์ชันลบที่อยู่
      document.querySelectorAll(".delete-address-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const addressId = btn.getAttribute("data-address-id");
      
          // ใช้ SweetAlert2 แทน confirm
          const result = await Swal.fire({
            title: "ต้องการลบที่อยู่นี้ใช่หรือไม่?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ใช่, ลบเลย",
            cancelButtonText: "ยกเลิก"
          });
      
          if (result.isConfirmed) {
            try {
              const res = await fetch(`https://lestialv.ddns.net:3001/api/addresses/${addressId}`, { method: "DELETE" });
              const data = await res.json();
      
              if (data.success) {
                btn.closest(".address-card").remove();
                Swal.fire({
                  title: "ลบที่อยู่สำเร็จ",
                  icon: "success",
                  showConfirmButton: false,
                  timer: 1500
                });
              } else {
                Swal.fire({
                  title: "ลบที่อยู่ไม่สำเร็จ",
                  icon: "error",
                  showConfirmButton: false,
                  timer: 1500
                });
              }
            } catch (error) {
              console.error("Delete error:", error);
              Swal.fire({
                title: "เกิดข้อผิดพลาด",
                text: "ไม่สามารถลบที่อยู่ได้",
                icon: "error"
              });
            }
          }
        });
      });
      

    })
    .catch(err => {
      console.error("⚠️ Error loading addresses:", err);
      addressContainer.innerHTML = '<p>ไม่สามารถโหลดที่อยู่ได้</p>';
    });
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-add-address").addEventListener("click", addAddress);
});
async function addAddress() {
    const form = document.querySelector(".form-grid");
    form.style.display = "grid";
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    if (!userId) {
        console.error("❌ userId not found in sessionStorage");
        return;
    }

    const submitButton = document.getElementById("submit-button");
    submitButton.addEventListener("click", async () => {
      const addressData = {
        firstName: document.getElementById("first-name").value.trim(),
        lastName: document.getElementById("last-name").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        address: document.getElementById("address").value.trim(),
        province: document.getElementById("province").value.trim(),
        district: document.getElementById("district").value.trim(),
        sub_district: document.getElementById("sub_district").value.trim(),
        postal: document.getElementById("postal").value.trim()
      };

      // ตรวจสอบว่ามีช่องไหนว่างหรือไม่
      if (Object.values(addressData).some(val => val === "")) {
        Swal.fire({title:"กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน", icon: "error"});
        return;
      }

      try {
        const res = await fetch(`https://lestialv.ddns.net:3001/api/addresses/${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(addressData)
        });
        if (!res.ok) throw new Error("Failed to add address");

        const newAddress = await res.json();
        //console.log("✅ Address added:", newAddress);
        window.location.reload(); // รีเฟรชหน้าเพื่อโหลดที่อยู่ใหม่
        // เพิ่ม DOM แสดงที่อยู่ใหม่ตามปกติ...
      } catch (error) {
        console.error("❌ Error adding address:", error);
      }
    });
  }

  function checkCartStock(cartItems) {
    return cartItems.map(item => ({
        Product_id: item.Product_id,
        hasStockIssue: item.Product_status !== "pre-order" &&
            (item.Product_count === 0 || item.quantity > item.Product_count)
    }));
}

async function loadCart() {
    const cartContainer = document.getElementById("cart-items");
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');

    try {
        const res = await fetch(`https://lestialv.ddns.net:3001/api/cart/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch cart data");

        const cartItems = await res.json();
        let totalPrice = 0;
        let hasNonPreorder = null;
        cartContainer.innerHTML = cartItems.map(item => {
            totalPrice += item.Product_price * item.quantity;
            const isOutOfStock = item.Product_count === 0;
            const isMaxQuantity = item.quantity >= item.Product_count;
            const disableMinus = item.quantity <= 1;
            hasNonPreorder = item.Product_status !== "pre-order";
            return `
                <div class="cart-item" data-product-id="${item.Product_id}">
                    <img src="../Server/${item.Product_img}" alt="${item.Product_name}" class="item-image">
                    <div class="item-details">
                        <div class="item-top">
                            <div>
                                <h3>${item.Product_name}</h3>
                                <p style="color: #585858; font-size: 0.875rem;" class="description">${item.Product_description}</p>
                            </div>
                            <p class="price">${item.Product_price} THB</p>
                        </div>
                        <div class="item-bottom">
                            <div class="quantity-controls">
                                <button 
                                    class="quantity-button" 
                                    onclick="updateQuantity(${item.Product_id}, ${item.quantity - 1})"
                                    ${disableMinus || isOutOfStock ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                    -
                                </button>
                                <span>${item.quantity}</span>
                                <button 
                                    class="quantity-button" 
                                    onclick="updateQuantity(${item.Product_id}, ${item.quantity + 1})"
                                    ${(isMaxQuantity || isOutOfStock)&& item.Product_status !== "pre-order" ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                    +
                                </button>
                            </div>
                            <button onclick="delecteCart(${item.Product_id})">🗑️</button>
                        </div>
                        ${(isOutOfStock && item.Product_status !== "pre-order") 
                            ? '<p style="color:red; font-size:0.8rem;">สินค้าหมด</p>' 
                            : ''}
                          
                          ${(item.quantity > item.Product_count && item.Product_status !== "pre-order") 
                            ? '<p style="color:red; font-size:0.8rem;">จำนวนสินค้าเกินสต๊อก</p>' 
                            : ''}                          
                    </div>
                </div>
            `;
        }).join("");

        document.getElementById("total").innerText = `${totalPrice.toFixed(2)}`;
        sessionStorage.setItem("totalPrice", totalPrice);

        // เช็ค stock แล้วปรับปุ่ม submit
        const submitBtn = document.querySelector(".submit-button");
        const stockStatusList = checkCartStock(cartItems);
        const hasStockProblem = stockStatusList.some(item => item.hasStockIssue);

if (hasStockProblem && hasNonPreorder) {
    submitBtn.disabled = true;
    submitBtn.style.background = "#ccc";
    submitBtn.style.cursor = "not-allowed";
} else {
    submitBtn.disabled = false;
    submitBtn.style.background = "";
    submitBtn.style.cursor = "";
}
    } catch (error) {
        console.error("Error loading cart:", error);
    }
}


async function updateQuantity(productId, quantity) {
    userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");
    try {
        const res = await fetch("https://lestialv.ddns.net:3001/api/cart/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, productId, quantity })
        });
        if (!res.ok) throw new Error("Failed to update cart");

        loadCart();
    } catch (error) {
        console.error("Error updating cart:", error);
    }
}
async function delecteCart(productId) {
    const userId = sessionStorage.getItem("userId") || localStorage.getItem("userId");

    Swal.fire({
        title: "ลบสินค้านี้จากตะกร้าหรือไม่?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ใช่",
        cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const res = await fetch("https://lestialv.ddns.net:3001/api/cart/delete", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ UserID: userId, Product_id: productId })
                });

                if (!res.ok) throw new Error("Failed to delete cart item");

                loadCart();
                Swal.fire({
                    title: "ลบสินค้าสำเร็จ",
                    icon: "success",
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error("Error deleting cart item:", error);
                Swal.fire({
                    title: "เกิดข้อผิดพลาด",
                    text: "ไม่สามารถลบสินค้าได้",
                    icon: "error",
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        } else {
            Swal.fire({
                title: "ยกเลิกการลบสินค้า",
                icon: "info",
                showConfirmButton: false,
                timer: 1500
            });
        }
    });
}


async function coins_and_promptpay() {
    //console.log('Selection');

 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    
 const paymentMethod = document.getElementById("payment-method").value;
    const totalElement = document.getElementById("total");
    let total = parseFloat(totalElement.innerText);

    if (paymentMethod === 'coins_and_promptpay') {
        //console.log('Coins and PromptPay selected');

        try {
            // เรียก API และใช้ await เพื่อให้ได้ค่าจริง ๆ
            const userCoins = await getUserCoins(userId);
            document.getElementById("productPrice").style.display = "flex";
        document.getElementById("UserCoin").style.display = "flex";
        document.getElementById("total1").innerText = total.toFixed(2); 
        document.getElementById("total2").innerText = userCoins.toFixed(2);

            if (isNaN(userCoins)) {
                console.error("❌ Error: Coins data is not a valid number.");
                return;
            }

            let totalAfterCoins = total - userCoins;
            if (totalAfterCoins <= 0) {
                totalElement.innerText = "0.00";
            } else {

                document.getElementById("total").innerText = totalAfterCoins.toFixed(2);
                totalElement.innerText = totalAfterCoins.toFixed(2);
            }
        } catch (error) {
            console.error("❌ Error fetching user coins:", error);
        }
    }
}
async function promptpay() {
   
    document.getElementById("productPrice").style.display = "none";
    document.getElementById("UserCoin").style.display = "none";
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    const paymentMethod = document.getElementById("payment-method").value;
    const totalElement = document.getElementById("total");
    let total = parseFloat(sessionStorage.getItem("totalPrice"));

    totalElement.innerText = total.toFixed(2);
}
async function coin() {
    document.getElementById("productPrice").style.display = "none";
    document.getElementById("UserCoin").style.display = "none";
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    const paymentMethod = document.getElementById("payment-method").value;
    const totalElement = document.getElementById("total");
    let total = parseFloat(sessionStorage.getItem("totalPrice"));

    totalElement.innerText = total.toFixed(2);
}

document.querySelector(".submit-button").addEventListener("click", async () => {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    
    const paymentMethod = document.getElementById("payment-method").value; // Get selected payment method
    const total = parseFloat(sessionStorage.getItem("totalPrice")); 
    let totalAfterCoins = total;
    
    if (!userId) {
        Swal.fire({title:"กรุณาเข้าสู่ระบบก่อนทำการชำระเงิน.", icon:"error"});
        return;
    }

    let address = {};
const selectedCard = document.querySelector(".address-card.selected");
    if (!selectedCard) {
        Swal.fire({title:"กรุณาเลือกที่อยู่จัดส่ง", icon:"error"});
        return;
    }
    

if (selectedCard) {
    // ✅ ใช้ที่อยู่ที่เลือกจากการ์ด
    const name = selectedCard.querySelector(".address-name")?.innerText.trim();
    const phone = selectedCard.querySelector(".address-phone")?.innerText.trim();
    const full_address = selectedCard.querySelector(".address-full")?.innerText.trim();

    if (!name || !phone || !full_address) {
        Swal.fire({title:"ข้อมูลที่อยู่ที่เลือกไม่สมบูรณ์ กรุณาเลือกใหม่หรือกรอกข้อมูลเอง", icon:"error"});
        return;
    }

    address = { name, phone, full_address };
} else {
    // ✅ ใช้ข้อมูลจาก input
    /*address = {
        firstName: document.querySelector("input[name='first-name']").value.trim(),
        lastName: document.querySelector("input[name='last-name']").value.trim(),
        email: document.querySelector("input[name='email']").value.trim(),
        phone: document.querySelector("input[name='phone']").value.trim(),
        address: document.querySelector("input[name='address']").value.trim(),
        province: document.querySelector("input[name='province']").value.trim(),
        district: document.querySelector("input[name='district']").value.trim(),
        sub_district: document.querySelector("input[name='sub_district']").value.trim(),
        postal: document.querySelector("input[name='postal']").value.trim(),
    };*/

        Swal.fire({title:'กรุณากรอกข้อมูลให้ครบถ้วน หรือเลือกที่อยู่ที่เคยบันทึกไว้' , icon:'error'});
        return;

}


    // ดึงข้อมูลสินค้าจากตะกร้า
    const products = [...document.querySelectorAll(".cart-item")].map(item => ({
        product_id: parseInt(item.getAttribute("data-product-id")),
        name: item.querySelector("h3").innerText,
        quantity: parseInt(item.querySelector(".quantity-controls span").innerText),
        img: item.querySelector("img").src,
        price: parseFloat(item.querySelector(".price").innerText),
        description: item.querySelector(".description").innerText,
    }));
    if (products.length === 0) {
        Swal.fire({title:"ไม่มีสินค้าในตะกร้า", icon:"error"});
        return;
    }
    const now = new Date();
    const orderDate = now.toISOString().slice(0, 19).replace("T", " ");
    const orderData = {
        products: products,
        order_date: orderDate,
        total: total,
        address: address,
    };
    // ตรวจสอบการชำระเงิน
    if (paymentMethod === 'coins_and_promptpay') {
        const userCoins = await getUserCoins(userId);
        document.getElementById("productPrice").style.display = "block";
        document.getElementById("UserCoin").style.display = "block";
        document.getElementById("total1").innerText = total.toFixed(2); 
        document.getElementById("total2").innerText = userCoins.toFixed(2);
        //console.log('User coins:', userCoins);
        totalAfterCoins = total - userCoins;
        //console.log(totalAfterCoins + " " + total + " " + userCoins);
        if (totalAfterCoins <= 0) {
            document.getElementById("total").innerText = "0.00";
            const res = await fetch("https://lestialv.ddns.net:3001/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, products, address, total: total,totalAfterCoins: 0,order_date: orderDate,status: "รอพนักงานรับคำสั่งซื้อ",payby: "coins_and_promptpay" }),
            });
        
            const data = await res.json();
            if (res.ok) {
                Swal.fire({title:data.message,icon:"success",showConfirmButton:!1,timer:1500}).then(() => {
                    window.location.href = "./"; // ย้ายไปหน้าอื่นหลังจากสำเร็จ
                });
            } else {
                Swal.fire({title:"เกิดข้อผิดพลาด: " + data.message,icon:"error",showConfirmButton:!1,timer:1500});
            }
        } else {
            //console.log("Coins",totalAfterCoins);
            try {
        // 1️⃣ สร้างคำสั่งซื้อก่อน
        const orderResponse = await fetch('https://lestialv.ddns.net:3001/api/coins_and_promptpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: sessionStorage.getItem("userId"),
                products: products, // ต้องมีตัวแปรนี้เก็บรายการสินค้า
                address: address,   // ต้องมีตัวแปรนี้เก็บที่อยู่จัดส่ง
                total: total,
                coins : userCoins,
                totalAfterCoins: totalAfterCoins,
                order_date: orderDate,
                payby: "coins_and_promptpay",
                status: "รอการชำระเงิน"
            }),
        });

        if (!orderResponse.ok) {
            throw new Error("❌ Failed to create order.");
        }

        const orderData = await orderResponse.json();
        const orderId = orderData.orderId; // ดึง OrderID จาก API

        // 2️⃣ นำ OrderID ไปยังหน้า PromptPay
        window.location.href = `./promptpay.html?coins=${totalAfterCoins}&orderId=${orderId}`;
    } catch (error) {
        console.error("❌ Error creating order:", error);
        Swal.fire({title:"เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง" , icon:"error"});
    }
    }
    } else if (paymentMethod === 'promptpay') {
        document.getElementById("total").innerText = total.toFixed(2);
        try {
            
        // 1️⃣ สร้างคำสั่งซื้อก่อน
        const orderResponse = await fetch('https://lestialv.ddns.net:3001/api/promptpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: sessionStorage.getItem("userId"),
                products: products, // ต้องมีตัวแปรนี้เก็บรายการสินค้า
                address: address,   // ต้องมีตัวแปรนี้เก็บที่อยู่จัดส่ง
                total: total,
                totalAfterCoins: 0,
                order_date: orderDate,
                payby: "promptpay",
                status: "รอการชำระเงิน"
            }),
        });

        if (!orderResponse.ok) {
            throw new Error("❌ Failed to create order.");
        }

        const orderData = await orderResponse.json();
        const orderId = orderData.orderId; // ดึง OrderID จาก API

        // 2️⃣ นำ OrderID ไปยังหน้า PromptPay
        window.location.href = `./promptpay.html?coins=${total}&orderId=${orderId}`;
    } catch (error) {
        console.error("❌ Error creating order:", error);
        Swal.fire({title:"เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง", icon:"error"});
    }
    } else if (paymentMethod === 'coins') {
        document.getElementById("total").innerText = total.toFixed(2);
        const res = await fetch("https://lestialv.ddns.net:3001/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, products, address, total: total,totalAfterCoins: 0, order_date: orderDate,status: "รอพนักงานรับคำสั่งซื้อ",payby: "coins" }),
        });

        const data = await res.json();
        if (res.ok) {
            Swal.fire({title:data.message, icon:"success"}).then(() => {
                window.location.href = "./";
            });
         // ย้ายไปหน้าอื่นหลังจากสำเร็จ
        } else {
            Swal.fire({title:"เกิดข้อผิดพลาด: " + data.message, icon:"error",showConfirmButton:!1,timer:1500});
     }
        return;
    }

    // สร้างคำสั่งซื้อ
    

    // ส่งข้อมูลไปยัง API
    
});

async function getUserCoins(userId) {
    try {
        const response = await fetch(`https://lestialv.ddns.net:3001/api/users/coins/${userId}`);
        if (!response.ok) throw new Error("Failed to fetch user coins.");
        const data = await response.json();
        return data.coins || 0; // ถ้าไม่มี coins ให้ return 0
    } catch (error) {
        console.error("❌ API Error:", error);
        return 0;
    }
}
async function fetchAndShowCoins() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
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

function isLoggedIn() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    if (!userId) {
        window.location.href = "../login/";
    }
}

// เรียกใช้ฟังก์ชันเมื่อมีการเปลี่ยนแปลงการเลือกช่องทางชำระเงิน
document.getElementById("payment-method").addEventListener("change", coins_and_promptpay);
document.getElementById("payment-method").addEventListener("change", promptpay);
document.getElementById("payment-method").addEventListener("change", coin);