let allChapters = [];
let ownedChapters = [];
let sortAsc = true; // true = น้อย→มาก (↑), false = มาก→น้อย (↓)

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const novelId = params.get("id");
  const ul = document.querySelector('.chapter-list ul');
  const sortLabel = document.getElementById('sortOrderLabel');
  const sortArrow = document.getElementById('sortArrow');
  const novelAddBtn = document.getElementById("NovelAdd");

  // เมนูมือถือ (ถ้ามี)
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navMenu = document.querySelector('.nav-menu');
  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      navMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(event) {
      if (!navMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  if (!novelId) {
    showPopup("ไม่พบรหัสนิยายใน URL");
    return;
  }

  // โหลดข้อมูลเจ้าของตอน
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  if (userId && novelId) {
    try {
      const res = await fetch(`https://lestialv.ddns.net:3001/check-owner?userId=${userId}&novelId=${novelId}`);
      const data = await res.json();
      if (data.success) {
        ownedChapters = data.ownedChapters;
      }
    } catch (err) {
      console.error('โหลดข้อมูลเจ้าของตอนล้มเหลว:', err);
    }
  }

  // โหลดข้อมูลนิยาย
  try {
    const res = await fetch(`https://lestialv.ddns.net:3001/novel/${novelId}`);
    const data = await res.json();
    console.log(data);
    if (!data.success) return;
    const novel = data.data;
    if (novelAddBtn) novelAddBtn.href = "../CreateChapters/?id=" + novelId;
    document.getElementById("imgcover").src = ("../Server" + novel.cover_image) || "default-cover.jpg";
    document.getElementById("Novelname").textContent = novel.title;
    document.getElementById("status").textContent = (`สถานะ: ${novel.status}`);
    document.querySelector(".author").textContent =  novel.author;
    document.querySelector(".chapters").textContent = `${novel.Count ?? 0} ตอน`;
    document.querySelector(".updated-date").textContent = new Date(novel.created_at).toLocaleDateString();
    document.querySelector(".description").textContent = novel.description;
  } catch (err) {
    console.error("❌ Load novel failed:", err);
  }

  // โหลดตอนนิยาย
  try {
    const res = await fetch(`https://lestialv.ddns.net:3001/get-chapters?id=${novelId}`);
    const data = await res.json();
    if (!data.success || !data.chapters) {
      ul.innerHTML = '<li>ไม่พบตอนนิยาย</li>';
      return;
    }
    allChapters = data.chapters;
    renderChapterList(allChapters);
  } catch (err) {
    console.error('โหลดตอนล้มเหลว:', err);
    ul.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
  }

  // Event: กด label เพื่อสลับเรียงลำดับ
  if (sortLabel && sortArrow) {
    sortLabel.addEventListener('click', () => {
      sortAsc = !sortAsc;
      sortArrow.textContent = sortAsc ? '↑' : '↓';
      sortAndRenderChapters(sortAsc);
    });
  }

  // เรียงและแสดงตอน
  function sortAndRenderChapters(asc) {
    const sorted = [...allChapters].sort((a, b) =>
      asc ? a.chapter - b.chapter : b.chapter - a.chapter
    );
    renderChapterList(sorted);
  }

  // ฟังก์ชัน render จริงๆ
  function renderChapterList(chapters) {
    ul.innerHTML = '';
    chapters.forEach((item) => {
      const li = document.createElement('li');
      const bought = ownedChapters.includes(item.chapter);
      const priceText = bought ? 'ซื้อแล้ว' : `${item.price} coins`;
      li.innerHTML = `ตอนที่ ${item.chapter} - ${item.title}
        <span class="date">${priceText}</span>`;
      li.addEventListener('click', () => {
        window.location.href = `../novelcontent/?id=${novelId}&chapter=${item.chapter}`;
      });
      ul.appendChild(li);
    });
  }
});
async function addToFavorite() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const params = new URLSearchParams(window.location.search);
    const novelId = params.get("id");

    if (!userId) {
        Swal.fire({ title: 'กรุณาเข้าสู่ระบบก่อน', icon: 'warning' });
        return;
    }
    if (!novelId) {
        Swal.fire({ title: 'ไม่พบนิยาย', icon: 'error' });
        return;
    }

    try {
        const res = await fetch('https://lestialv.ddns.net:3001/api/add-favorite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, novelId })
        });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ title: 'เพิ่มในรายการโปรดแล้ว', icon: 'success' });
        } else {
            Swal.fire({ title: data.message || 'เพิ่มไม่สำเร็จ', icon: 'info' });
        }
    } catch (err) {
        Swal.fire({ title: 'เกิดข้อผิดพลาด', text: err.message, icon: 'error' });
    }
}

// ฟังก์ชันอื่นๆ (showPopup, editer, addToFavorite, getChapter, Saveupdate, closeEdit, closeEditChapter, closePopup) ... ตามเดิม