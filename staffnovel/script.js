const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show');
});
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector('input[type="text"]');
  const userId = localStorage.getItem('userId');
  checkroles();
  if (!userId) {
    alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
    return;
  }

  function fetchNovels(searchTerm = '') {
    fetch(`https://lestialv.ddns.net:3001/api/novel?search=${encodeURIComponent(searchTerm)}&userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          renderNovels(data.data);
        } else {
          showPopup(data.message || 'โหลดข้อมูลล้มเหลว');
        }
      })
      .catch(() => showPopup("เกิดข้อผิดพลาดในการเชื่อมต่อ"));
  }

  function renderNovels(novels) {
    const tbody = document.getElementById("orders-table-body");
    tbody.innerHTML = '';

    if (novels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">ไม่พบนิยายของคุณ</td></tr>';
      return;
    }

    novels.forEach(novel => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${novel.id}</td>
        <td>${novel.title}</td>
        <td>${novel.Count ?? '-'}</td>
        <td>${new Date(novel.created_at).toLocaleDateString()}</td>
        <td>${novel.author ?? '-'}</td>
        <td>
          <button class="delete-novel-btn" title="ลบ" data-id="${novel.id}" onclick="event.stopPropagation(); deleteNovel(${novel.id});">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      `;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        window.location.href = `../novelsedit/?id=${novel.id}`;
      });
      tbody.appendChild(row);
    });
  }

  function showPopup(message) {
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup').classList.remove('hidden');
  }

  function closePopup() {
    document.getElementById('popup').classList.add('hidden');
  }

  fetchNovels(); // โหลดตอนเริ่มต้น

  searchInput.addEventListener('input', () => {
    fetchNovels(searchInput.value);
  });
});
function logout() {
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
    window.location.href = "../login/";
}
function deleteNovel(novelid) {
  Swal.fire({
    title: 'คุณแน่ใจหรือไม่?',
    text: "คุณต้องการลบนิยายนี้หรือไม่?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`https://lestialv.ddns.net:3001/api/novels/${novelid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          Swal.fire('ลบข้อมูลสำเร็จ', '', 'success').then(()=>{
            window.location.reload(); // โหลดข้อมูลใหม่หลังจากลบ
          });// โหลดข้อมูลใหม่หลังจากลบ
        } else {
          Swal.fire('ลบข้อมูลล้มเหลว', '', 'error');
        }
      })
      .catch(error => {
        console.error('Error deleting novel:', error);
        Swal.fire('เกิดข้อผิดพลาด', '', 'error');
      });
    }
  });
}

function checkroles() {
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    fetch(`https://lestialv.ddns.net:3001/api/checkroles/${userId}`)
        .then(response => response.json())
        .then(user => {
            if (!user || !user.Roles) {
                window.location.href = '/login';
            }
            if (user.Roles === 'admin') {
                window.location.href = '/dashboard'; // Redirect to admin dashboard
            } else if (user.Roles === 'user') {
                window.location.href = '../profiles'; // Redirect to user profile
            }
             else if (user.Roles !== 'admin' && user.Roles !== 'user' && user.Roles !== 'staff') {
                window.location.href = '/login';
            }
        })
        .catch(error => console.error('Error fetching roles:', error));
}
function home(){
  window.location.href = "../";
}