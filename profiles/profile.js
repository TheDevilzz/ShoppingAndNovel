document.addEventListener('DOMContentLoaded', function() {
    const fields = document.querySelectorAll('.form-grid div');
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    checkRoles();
    isLoggedIn();
    if (userId) {
        fetchUserData(userId);
    } else {
        //console.log('User ID not found.');
    }

    
});

async function save() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const name = document.getElementById('name').value;
    const lastname = document.getElementById('lastname').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;

    if (!userId) {
        Swal.fire('ไม่พบรหัสผู้ใช้', '', 'error');
        return;
    }

    const result = await Swal.fire({
        title: 'ยืนยันการแก้ไขข้อมูล',
        text: 'คุณต้องการบันทึกการเปลี่ยนแปลงหรือไม่?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
        const updateResponse = await fetch(`https://lestialv.ddns.net:3001/usersProfile/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, lastname, email, username })
        });

        if (!updateResponse.ok) throw new Error('Failed to update user data');

        Swal.fire('บันทึกสำเร็จ', '', 'success');
    } catch (error) {
        Swal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    }
}


function resetpassword() {
    document.getElementById('resetpassword').style.display = 'block';
}
function closepassword() {
    document.getElementById('resetpassword').style.display = 'none';
}
document.getElementById('reset-password-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;

    const data = {
        oldPassword: oldPassword,
        newPassword: newPassword,
        userId: sessionStorage.getItem('userId')
    };

    fetch('https://lestialv.ddns.net:3001/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            closepassword();
        } else {
        }
    })
    .catch(error => {
    });
});

async function fetchUserData(userId) {
    try {
        const response = await fetch(`https://lestialv.ddns.net:3001/api/users/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        displayUserData(userData);
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}
/*function staff(roles){
    //console.log(roles);
    if (roles === "staff") {
        const navSection = document.querySelector(".nav-section-staff");
        navSection.innerHTML = `
        <h1>พนักงาน</h1>
                <a href="../staffproduct" class="nav-item">
                    <i class='bx bxs-box'></i>
                    <span>ข้อมูลสินค้า</span>
                </a>
                <a href="../stafforder/" class="nav-item">
                    <i class='bx bxs-dashboard'></i>
                    <span>ข้อมูลคำสั่งซื้อ</span>
                </a>`;
        
    }
}*/

function displayUserData(userData) {
    
    document.getElementById('coins').innerText = userData.coins;
    document.getElementById('username').value = userData.username || '';
    document.getElementById('name').value = userData.name || '';
    document.getElementById('lastname').value = userData.lastname || '';
    document.getElementById('email').value = userData.email || '';
}

function checkRoles() {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    fetch(`https://lestialv.ddns.net:3001/api/checkroles/${userId}`)
        .then(response => response.json())
        .then(user => {
            staff(user.Roles);
            //console.log(user.Roles);
            if (!user || !user.Roles) {
                window.location.href = '/login';
            }
            if (user.Roles === 'admin') {
                window.location.href = '../adminpanel';
            } else if (user.Roles !== 'admin' && user.Roles !== 'user' && user.Roles !== 'staff') {
                window.location.href = '/login';
            }
        })
        .catch(error => console.error('Error fetching roles:', error));
}



function logout() {
    sessionStorage.removeItem('userId');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    window.location.href = '../Shop';
}
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
    // Reset favorites and cart
    favorites = [];
    cart = [];
    
    // Show logout message

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
function isLoggedIn() {
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('currentUser');
    if (token && currentUser) {
        const user = JSON.parse(currentUser);
        if (user.Roles && user.Roles.toLowerCase() === 'admin') {
            window.location.href = '/dashboard';
        }
    } else if (!token && !currentUser) {
        window.location.href = '/login';
    }
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

