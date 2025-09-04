document.addEventListener('DOMContentLoaded', function() {
  if (window.location.hash === "#favoritesSection") {
    setTimeout(() => {
        const favSection = document.getElementById("favoritesSection");
        if (favSection) {
            favSection.scrollIntoView({ behavior: "smooth" });
        }
    }, 300); // รอ DOM สร้าง section เสร็จ
}
    // Category selection
    const categories = document.querySelectorAll('.category-item');
    categories.forEach(category => {
        category.addEventListener('click', function() {
            categories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Pagination
    const pageItems = document.querySelectorAll('.page-item');
    pageItems.forEach(item => {
        item.addEventListener('click', function() {
            if(this.textContent !== '...') {
                pageItems.forEach(p => p.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
        
            
            // Novel card highlight on hover
    const novelCards = document.querySelectorAll('.novel-card:not(.highlighted)');
    novelCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
                this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            });
        card.addEventListener('mouseleave', function() {
                this.style.boxShadow = 'none';
             });
    });
});
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

document.addEventListener("DOMContentLoaded", () => {
  fetchAndShowCoins();
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');

  fetch("https://lestialv.ddns.net:3001/api/novels")
    .then(res => res.json())
    .then(novels => {
      fetch(`https://lestialv.ddns.net:3001/api/favorites/${userId}`)
        .then(res => res.json())
        .then(favorites => {
          const favoriteIds = favorites.map(f => f.novelId);

          const container = document.querySelector(".novels-container");
          container.innerHTML = "";

          novels.forEach(novel => {
            const card = document.createElement("div");
            card.className = "novel-card";
            const isFav = favoriteIds.includes(novel.id);

            card.innerHTML = `
              <img src="../Server${novel.cover_image || '/api/placeholder/100/150'}" alt="Novel cover" class="novel-image">
              <h2 class="novel-title">${novel.title}</h2>
              <p class="novel-author">โดย ${novel.author}</p>
              <p class="novel-description">${truncateText(novel.description, 100)}</p>
              <div class="novel-divider"></div>
              <p class="novel-stat">รวมตอน : ${novel.Count ?? 0}</p>
              <p class="novel-stat">สถานะ : ${novel.status}</p>
              <span class="wishlist-icon" style="cursor:pointer; font-size: 24px; color: ${isFav ? 'red' : 'black'}">
                ${isFav ? '♥' : '♡'}
              </span>
            `;

            // เปิดนิยายเมื่อคลิก card ยกเว้นไอคอน
            card.addEventListener("click", (e) => {
              if (!e.target.classList.contains("wishlist-icon")) {
                window.location.href = `../novelpage/?id=${novel.id}`;
              }
            });

            // คลิก favorite
            card.querySelector(".wishlist-icon").addEventListener("click", function (e) {
              e.stopPropagation();

              const icon = this;
              const fav = icon.textContent === "♥";

              fetch("https://lestialv.ddns.net:3001/api/favorites", {
                method: fav ? "DELETE" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, novelId: novel.id })
              })
              .then(res => res.json())
              .then(() => {
                icon.textContent = fav ? "♡" : "♥";
                icon.style.color = fav ? "black" : "red";
              });
            });

            container.appendChild(card);
          });
        });
    });

  function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }
});
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

