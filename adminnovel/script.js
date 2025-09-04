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
  checkroles();
  const searchInput = document.querySelector('input[type="text"]');
  function formatText(command) {
    document.execCommand(command, false, null);
  }
  function showPopup(message) {
      document.getElementById('popup-message').textContent = message;
      document.getElementById('popup').classList.remove('hidden');
  }

  function closePopup() {
      document.getElementById('popup').classList.add('hidden');
  }
  function showPopup(message) {
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup').classList.remove('hidden');
  }

  function closePopup() {
    document.getElementById('popup').classList.add('hidden');
  }
  function fetchNovels(searchTerm = '') {
    fetch(`https://lestialv.ddns.net:3001/novels?search=${encodeURIComponent(searchTerm)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          renderNovels(data.data);
        } else {
          showPopup('โหลดข้อมูลล้มเหลว');
        }
      });
  }
  

  function renderNovels(novels) {
    const tbody = document.getElementById("orders-table-body");
    tbody.innerHTML = '';

    if (novels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">ไม่พบนิยาย</td></tr>';
      return;
    }

    novels.forEach(novel => {
      //console.log(novel);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${novel.id}</td>
        <td>${novel.title}</td>
        <td>${novel.Count ?? '-'}</td>
        <td>${new Date(novel.created_at).toLocaleDateString()}</td>
        <td>${novel.author}</td>
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

  // โหลดข้อมูลเริ่มต้น
  fetchNovels();

  // ค้นหาเมื่อพิมพ์
  searchInput.addEventListener('input', () => {
    fetchNovels(searchInput.value);
  });
});
function logout() {
  // ลบข้อมูลผู้ใช้จาก sessionStorage
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
function home(){
  window.location.href = "../";
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
          Swal.fire('ลบข้อมูลสำเร็จ', '', 'success').then(() => {
            window.location.reload(); // Reload the page after deletion
          }); // Reload novels after deletion
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

      //console.log(userId)
      fetch(`https://lestialv.ddns.net:3001/api/checkroles/${userId}`)
      .then(response => response.json())
      .then(user => {
          if (!user || !user.Roles) {
                  window.location.href = '/login';
              }
        
              const userRole = user.Roles;
              if (userRole === 'user') {
                  window.location.href = '../profiles'; // Redirect to profile
              } else if (userRole === 'staff') {
                  window.location.href = '/stafforder'; // Redirect to profile
              } else if (userRole !== 'admin' && userRole !== 'user' ){
                  window.location.href = '/login'; // Redirect to profile
              } 
        
          })
    .catch(error => console.error('Error fetching user data:', error));
}
