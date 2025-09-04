// Example of basic JavaScript functionality
let currentUser = null;
// Get the "Load More" button
document.addEventListener("DOMContentLoaded", () => {
  checkroles();
    const params = new URLSearchParams(window.location.search);
    const novelId = params.get("id");
    loadUserData();
    function formatText(command) {
        document.execCommand(command, false, null);
      }

        if (!novelId) {
        Swal.fire({title:"ไม่พบรหัสนิยายใน URL", icon:'error'});
        return;
     }
    
  
    fetch(`https://lestialv.ddns.net:3001/novel/${novelId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
  
        const novel = data.data;
        //console.log(novel);
        document.getElementById("NovelAdd").href = "../CreateChapters/?id=" + novelId;
        document.getElementById("imgcover").src = ("../Server" + novel.cover_image) || "default-cover.jpg";
        document.getElementById("Novelname").textContent = novel.title;
        document.getElementById("status").textContent = (`สถานะ: ${novel.status}`);
        document.querySelector(".chapters").textContent = `${novel.Count ?? 0} ตอน`;
        document.querySelector(".updated-date").textContent = new Date(novel.created_at).toLocaleDateString();
        document.querySelector(".description").innerHTML = novel.description;
      })
      .catch(err => {
        console.error("❌ Load novel failed:", err);
    });
    
});
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show');
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

function editer(){
    const params = new URLSearchParams(window.location.search);
    const novelId = params.get("id");
    fetch(`https://lestialv.ddns.net:3001/novels/${novelId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) return alert(data.message);

      const novel = data.novel;
      document.getElementById('title').value = novel.title;
      document.getElementById('editor').innerHTML = novel.description;
      document.getElementById('Novelstatus').value = novel.status;
      document.querySelector('.editpopup').classList.remove('hidden');
      
      // เก็บ id สำหรับใช้ตอนบันทึก
      document.querySelector('.editpopup').dataset.novelId = novel.id;
    })
    .catch(err => console.error('Fetch error:', err));
}



function submitStory() {
    const title = document.getElementById('title').value;
    const description = document.getElementById('editor').innerHTML;
    const status = document.getElementById('Novelstatus').value;
    const novelId = document.querySelector('.editpopup').dataset.novelId;
    
    fetch('https://lestialv.ddns.net:3001/update-novel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: novelId, title, description, status})
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire({title:data.message, icon:'success'}).then(() => {
          closeEdit();
        });
         // 1 วินาทีก่อนโหลดใหม่ (ปรับตามที่ต้องการ)
    })
    .catch(err => console.error('Submit error:', err));
  }
async function closeEdit() {
    document.querySelector('.editpopup').classList.add('hidden');
    
}
function showPopup(message) {
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup').classList.remove('hidden');
  }
function closeEditChapter(){
    document.querySelector('.editChapter').classList.add('hidden');
}

  function closePopup() {
    document.getElementById('popup').classList.add('hidden');
    window.location.reload();
  }
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const novelId = urlParams.get('id');
  
    const ul = document.querySelector('.chapter-list ul');
    const novelAddBtn = document.getElementById("NovelAdd");
    if (novelId) novelAddBtn.href = `../CreateChapters/?id=${novelId}`;
  
    try {
      const res = await fetch(`https://lestialv.ddns.net:3001/get-chapters?id=${novelId}`);
      const data = await res.json();
  
      if (!data.success || !data.chapters) {
        ul.innerHTML = '<li>ไม่พบตอนนิยาย</li>';
        return;
      }
  
      ul.innerHTML = ''; // Clear list
  
      // ...existing code...
data.chapters.forEach((item) => {
  const li = document.createElement('li');
  li.innerHTML = `
      ตอนที่ ${item.chapter} ${item.title}
      <div>
      <span class="date">${new Date(item.created_at).toLocaleDateString()}</span>
      <button class="edit-chapter-btn" title="แก้ไขตอนนี้" onclick="event.stopPropagation(); getChapter(${item.id}); document.querySelector('.editChapter').classList.remove('hidden');">
        <img class="fas fa-pen" alt="Edit" style="width:18px;height:18px;vertical-align:middle;" >
      </button>
      <button class="delete-chapter-btn" title="ลบตอนนี้" onclick="deleteChapter(${item.id});" style="padding-left: 5px; padding-right: 5px; background-color: transparent; border: none; cursor: pointer;">
        <i class="fas fa-trash" style="color:red;"></i>
      </button>
      <div>
  `;
  /*li.addEventListener('click', () => {
      document.querySelector(".editChapter").classList.remove('hidden');
      getChapter(item.id);
  });*/
  ul.appendChild(li);
});
// ...existing code...
  
    } catch (err) {
      console.error('โหลดตอนล้มเหลว:', err);
      ul.innerHTML = '<li>เกิดข้อผิดพลาดในการโหลดข้อมูล</li>';
    }
  });
function getChapter(id){
    fetch(`https://lestialv.ddns.net:3001/Chapters/${id}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) return alert(data.message);

      const chapter = data.chapter;
      document.getElementById('chapterName').value = chapter.title;
      document.getElementById('Novel_Number').value = chapter.chapter;
      document.getElementById('content').innerHTML = chapter.content;
      document.getElementById('price').value = chapter.price;
      
      // เก็บ id สำหรับใช้ตอนบันทึก
      document.querySelector('.editChapter').dataset.chapterId = chapter.id;
    })
    .catch(err => console.error('Fetch error:', err));
}
function Saveupdate() {
    const title = document.getElementById('chapterName').value;
    const NovelNumber = document.getElementById('Novel_Number').value;
    const content = document.getElementById('content').value;
    const price = document.getElementById('price').value;
    const chapterId = document.querySelector('.editChapter').dataset.chapterId;
    
    fetch('https://lestialv.ddns.net:3001/update-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chapterId, title, content, price, NovelNumber})
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire({title:data.message, icon:'success'}).then(()=>{
          closeEditChapter();
        }); // 1 วินาทีก่อนโหลดใหม่ (ปรับตามที่ต้องการ)
    })
    .catch(err => console.error('Submit error:', err));
  }


/*const loadMoreButton = document.querySelector('.load-more-button');
let chapterList = document.querySelector('.chapter-list ul');
let chapterCount = chapterList.children.length; // Initial number of chapters

if (loadMoreButton) {
    loadMoreButton.addEventListener('click', function() {
        // Simulate fetching more chapters (replace with actual API call)
        for (let i = 0; i < 5; i++) {
            let newLi = document.createElement('li');
            newLi.innerHTML = `<a href="#">ตอนที่ ${chapterCount + i + 1} (โหลดเพิ่มเติม)</a> <span class="date">${new Date().toLocaleDateString()}</span>`;
            chapterList.appendChild(newLi);
        }
        chapterCount += 5;
        if (chapterCount > 20) { // Example condition to hide button
            loadMoreButton.style.display = 'none';
        }
    });
}*/

// You would add more JavaScript for other interactive elements
// like handling the "อ่าน" and "เพิ่มลงชั้นหนังสือ" button clicks,
// or any dropdown menus or dynamic content loading.
async function deleteChapter(chapterId) {
  const result = await Swal.fire({
    title: 'คุณต้องการลบตอนนี้จริงหรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก'
  });
  if (!result.isConfirmed) return;
  try {
    const res = await fetch(`https://lestialv.ddns.net:3001/chapters/${chapterId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      Swal.fire({title: 'ลบตอนสำเร็จ', icon: 'success'}).then(() => {
        window.location.reload()
      });
    } else {
      Swal.fire({title: data.message || 'ลบไม่สำเร็จ', icon: 'error'});
    }
  } catch (err) {
    Swal.fire({title: 'เกิดข้อผิดพลาด', icon: 'error'});
  }
}
function home(){
  window.location.href = "../";
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
                  document.getElementById('dashboard').classList.add('hidden');
                  document.getElementById('AccessControl').classList.add('hidden');
                  document.getElementById('dashboard1').classList.add('hidden');
                  document.getElementById('AccessControl1').classList.add('hidden'); // Redirect to profile
              } else if (userRole !== 'admin' && userRole !== 'user' ){
                  window.location.href = '/login'; // Redirect to profile
              } 
        
          })
    .catch(error => console.error('Error fetching user data:', error));
}