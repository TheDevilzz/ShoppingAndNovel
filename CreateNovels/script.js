let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer
 
  // Load user data from localStorage
  loadUserData();
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

function previewCover(event) {
    const file = event.target.files[0];
    if (file) {
      const img = document.getElementById('coverPreview');
      img.src = URL.createObjectURL(file);
      img.style.display = 'block';
      img.onload = () => URL.revokeObjectURL(img.src);
    }
  }

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

  async function submitStory() {
    const title = document.getElementById('title').value.trim();
    const author = document.getElementById('author').value.trim() || currentUser.username;
    const description = document.getElementById('editor').innerHTML.trim();
    const file = document.querySelector('input[type="file"]').files[0];
  
    if (!title || description.length < 1) {
      Swal.fire({title:'กรุณากรอกชื่อเรื่องและเรื่องย่ออย่างน้อย 1 ตัวอักษร', icon:'error'});
      return;
    }
  
    // ดึง userId และ username จาก sessionStorage หรือที่เก็บไว้
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    
 const username = currentUser.username;
    //console.log(userId, username);
  
    if (!userId || !username) {
      Swal.fire({title:'ไม่สามารถระบุผู้ใช้ได้ กรุณาเข้าสู่ระบบ', icon:'warning'});
      return;
    }
  
    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    formData.append('description', description);
    formData.append('userId', userId);
    formData.append('username', username);
    if (file) formData.append('image', file); // เปลี่ยนจาก 'cover' เป็น 'image'
  
    const response = await fetch('https://lestialv.ddns.net:3001/upload-novel', {
      method: 'POST',
      body: formData
    });
  
    const result = await response.json();
    if (result.success) {
      Swal.fire({title: result.message || 'บันทึกสำเร็จ', icon: 'success'}).then(() => {
        window.location.href = '../adminnovel';
      });
    } else {
      Swal.fire({title: result.message || 'เกิดข้อผิดพลาด', icon: 'error'});
    }
  }
