// --- Keep your DOM Element selections and other initializations ---
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
// ... (other elements) ...


toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show');
});

async function loadOrderLogs(orderId = null) {
  let url = 'https://lestialv.ddns.net:3001/api/order-edit-logs';
  if (orderId) url += `?orderId=${orderId}`;
  const res = await fetch(url);
  const logs = await res.json();
  const tbody = document.querySelector('#orderLogTable tbody');
  if (!tbody) {
    console.warn('ไม่พบตารางแสดง log (#orderLogTable tbody)');
    return;
  }
  tbody.innerHTML = '';
  logs.forEach(log => {
    // แปลง JSON string เป็น object
    let oldData = {};
    let newData = {};
    try {
      oldData = JSON.parse(log.old_data || '{}');
    } catch {}
    try {
      newData = JSON.parse(log.new_data || '{}');
    } catch {}

    tbody.innerHTML += `
      <tr>
        <td>${new Date(log.edited_at).toLocaleString('th-TH')}</td>
        <td>${log.order_id}</td>
        <td>${log.user_id}</td>
        <td>${log.action}</td>
        <td>
          <b>Status:</b> ${oldData.Status ?? '-'}<br>
          <b>Post_Tracking:</b> ${oldData.Post_Tracking ?? '-'}
        </td>
        <td>
          <b>Status:</b> ${newData.Status ?? '-'}<br>
          <b>Post_Tracking:</b> ${newData.Post_Tracking ?? '-'}
        </td>
      </tr>
    `;
  });
}
// เรียกใช้เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => loadOrderLogs());
document.addEventListener('DOMContentLoaded', () => checkroles());

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


// Remove the window.onload = fetchMonthlyRevenue; line if you are using DOMContentLoaded listener