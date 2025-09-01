let currentUser = null;
const userDropdownContent = document.getElementById('userDropdownContent');
const userBtn = document.getElementById('userBtn');
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateHeader();
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
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
    if (window.location.hash === "#favoritesSection") {
        setTimeout(() => {
            const favSection = document.getElementById("favoritesSection");
            if (favSection) {
                favSection.scrollIntoView({ behavior: "smooth" });
            }
        }, 300); // รอ DOM สร้าง section เสร็จ
    }
    
    // Cart button click
    document.getElementById('cartBtn').addEventListener('click', () => {
        window.location.href = '../carts';
    });
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
    //console.log('Current User:', currentUser);
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
            ${currentUser.Roles !== 'admin'?'<a href="../profiles"><i class="fas fa-user"></i> โปรไฟล์</a>':''}
            ${currentUser.Roles !== 'admin'?'<a href="../topup"><i class="fas fa-plus-circle"></i> เติมเหรียญ</a>' :''}
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