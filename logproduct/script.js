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

async function loadProductLogs(productId = null) {
  let url = 'https://lestialv.ddns.net:3001/api/product-edit-logs';
  if (productId) url += `?productId=${productId}`;
  const res = await fetch(url);
  const logs = await res.json();
  const tbody = document.querySelector('#logTable tbody');
  tbody.innerHTML = '';
  logs.forEach(log => {
    let oldData = {};
    let newData = {};
    try { oldData = JSON.parse(log.old_data || '{}'); } catch {}
    try { newData = JSON.parse(log.new_data || '{}'); } catch {}

    const fields = [
      { key: 'Product_name', label: 'ชื่อสินค้า' },
      { key: 'Product_price', label: 'ราคา' },
      { key: 'Product_count', label: 'จำนวน' },
      { key: 'Product_type', label: 'ประเภท' },
      { key: 'Product_status', label: 'สถานะ' },
      { key: 'Product_description', label: 'รายละเอียด' },
      { key: 'Product_img', label: 'รูปภาพ' }
    ];

    // ฟังก์ชันแสดงค่า ถ้าเปลี่ยนจะทำสีเหลือง
    const renderFields = (data, compareData, isNew) => fields.map(f => {
      const val = data[f.key] !== undefined ? data[f.key] : '-';
      const compareVal = compareData[f.key] !== undefined ? compareData[f.key] : '-';
      // ถ้าเปลี่ยน ให้ทำสีเหลือง
      if (val !== compareVal) {
        return `<b>${f.label}:</b> <span style="background:yellow">${val}</span>`;
      }
      return `<b>${f.label}:</b> ${val}`;
    }).join('<br>');

    tbody.innerHTML += `
      <tr>
        <td>${new Date(log.edited_at).toLocaleString('th-TH')}</td>
        <td>${log.product_id}</td>
        <td>${log.user_id}</td>
        <td>${log.action}</td>
        <td>${renderFields(oldData, newData, false)}</td>
        <td>${renderFields(newData, oldData, true)}</td>
      </tr>
    `;
  });
}
// เรียกใช้เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => loadProductLogs());
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