// --- Keep your DOM Element selections and other initializations ---
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
// ... (other elements) ...
const pieChartCtx = document.getElementById('monthly-pie-chart').getContext('2d');
const monthlySalesCtx = document.getElementById('monthly-sales-chart').getContext('2d'); // Get context for sales chart too

toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show');
});

document.addEventListener('DOMContentLoaded', () => {
    loadMembersTable();
    checkroles();
    const newLinkInput = document.getElementById('newLinkInput');
    const updateLinkButton = document.getElementById('updateLinkButton');
    const updateStatus = document.getElementById('updateStatus');
    const apiUrl = 'https://lestialv.ddns.net:3001/api/links/1'; // URL ของ Backend API

    // เมื่อกดปุ่ม Update
    updateLinkButton.addEventListener('click', () => {
        const newLinkValue = newLinkInput.value.trim(); // อ่านค่าและตัดช่องว่างหน้า/หลัง

        // ตรวจสอบว่ามีค่าใน input ไหม
        if (!newLinkValue) {
            updateStatus.textContent = 'กรุณากรอกลิงก์ที่ต้องการอัปเดต';
            updateStatus.className = 'status-message status-error'; // เปลี่ยน class เป็นสีแดง
            return; // หยุดการทำงานถ้าไม่มีค่า
        }

        // แสดงสถานะว่ากำลังทำงาน
        updateStatus.textContent = 'กำลังอัปเดต...';
        updateStatus.className = 'status-message'; // สีปกติ

        // ส่ง Request ไปยัง Backend
        fetch(apiUrl, {
            method: 'PUT', // ใช้ HTTP Method PUT
            headers: {
                'Content-Type': 'application/json', // บอกว่าเราส่งข้อมูลแบบ JSON
            },
            body: JSON.stringify({ link: newLinkValue }) // แปลงข้อมูลเป็น JSON string
        })
        .then(response => {
            // ตรวจสอบว่า response สำเร็จหรือไม่ (status code 200-299)
            // และอ่านข้อมูล JSON ที่ backend ส่งกลับมา
            return response.json().then(data => ({ ok: response.ok, status: response.status, data }));
        })
        .then(({ ok, status, data }) => {
            // แสดงข้อความจาก Backend
            updateStatus.textContent = data.message || `สถานะ: ${status}`;

            if (ok && data.success) {
                // ถ้าสำเร็จ
                updateStatus.className = 'status-message status-success'; // เปลี่ยน class เป็นสีเขียว
                newLinkInput.value = ''; // ล้างค่าใน input (optional)
                Swal.fire({title:'อัปเดตลิงก์สำเร็จ', icon:'success'}); // แสดงข้อความสำเร็จ
                //console.log('Update successful:', data);
            } else {
                // ถ้าไม่สำเร็จ (รวมถึง 404 Not Found หรือ error อื่นๆ)
                updateStatus.className = 'status-message status-error'; // เปลี่ยน class เป็นสีแดง
                console.error('Update failed:', data);
            }
        })
        .catch(error => {
            // จัดการข้อผิดพลาดตอนส่ง Request (เช่น Network error)
            console.error('Error sending update request:', error);
            updateStatus.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
            updateStatus.className = 'status-message status-error';
        });
    });
});
let iconimgedit = null; // Declare iconimgedit variable globally
let imgedit = null; // Declare imgedit variable globally
// แสดงฟอร์มแก้ไข member
function editMember(id) {
    fetch(`https://lestialv.ddns.net:3001/api/members/${id}`)
        .then(res => res.json())
        .then(member => {
            document.getElementById('name').value = member.Name;
            document.getElementById('description').value = member.description;
            document.getElementById('x').value = member.X;
            document.getElementById('tiktok').value = member.Tiktok;
            document.getElementById('youtube').value = member.Youtube;
            document.getElementById('bgColor').value = member.bgColor;
            document.getElementById('iconimg-old').value = member.iconimg;
            document.getElementById('img-old').value = member.img;

            // แสดงรูป preview
            document.getElementById('iconimg-preview').src = "../Server" + member.iconimg;
            document.getElementById('img-preview').src = "../Server" + member.img;

            document.getElementById('socialForm').dataset.editId = id;
            document.getElementById('memberFormContainer').classList.remove('hidden');
        });
}


// เมื่อ submit ฟอร์ม (เพิ่ม/แก้ไข)
document.getElementById('socialForm').addEventListener('submit', function(e) { 
    e.preventDefault();
    const id = this.dataset.editId;
    const formData = new FormData(this);
    const url = id
        ? `https://lestialv.ddns.net:3001/api/members/${id}`
        : `https://lestialv.ddns.net:3001/api/members`;
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
        method,
        body: formData
    })
    .then(res => res.json())
    .then(result => {
        Swal.fire({title: result.message || 'สำเร็จ', icon: result.success ? 'success' : 'error'}).then(() => {
            if (result.success) {
                loadMembersTable(); // โหลดตารางใหม่
                document.getElementById('memberFormContainer').classList.add('hidden'); // ซ่อนฟอร์ม
                document.getElementById('socialForm').reset(); // ล้างฟอร์ม
                delete this.dataset.editId; // ลบ id ที่เก็บไว้
            } else {
                // แสดงข้อความผิดพลาดจากเซิร์ฟเวอร์
                Swal.fire({title: result.error || 'เกิดข้อผิดพลาด', icon: 'error'});
            }
        });
        
    });
});

document.getElementById('addMemberBtn').addEventListener('click', function() {
    // แสดงฟอร์มเพิ่มสมาชิก
    document.getElementById('memberFormContainer').classList.remove('hidden');
    //document.getElementById('socialForm').reset(); // ล้างฟอร์ม
   // delete document.getElementById('socialForm').dataset.editId; // ลบ id ที่เก็บไว้
});

// ลบ member
function deleteMember(id) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    }).then(result => {
        if (result.isConfirmed) {
            fetch(`https://lestialv.ddns.net:3001/api/members/${id}`, {
                method: 'DELETE'
            })
            .then(res => res.json())
            .then(result => {
                Swal.fire({title: result.message || 'ลบแล้ว', icon: result.success ? 'success' : 'error'}).then(() => {
                    if (result.success) {
                        loadMembersTable(); // โหลดตารางใหม่
                    } else {
                        // แสดงข้อความผิดพลาดจากเซิร์ฟเวอร์
                        Swal.fire({title: result.error || 'เกิดข้อผิดพลาด', icon: 'error'});
                    }
                });
            });
        }
    });
}

// --- Initialize Chart Instances (Keep these) ---
let monthlySalesChart = new Chart(monthlySalesCtx, { // Use 'let' if you might reassign, or keep 'const' if only updating data
    type: 'bar', // Or 'line' based on your previous example? Choose one type. Let's assume 'line' based on updateChart code.
    data: {
        labels: [], // Initial empty data
        datasets: [{
            label: 'Monthly Revenue', // Consistent label
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)', // Line chart color
            backgroundColor: 'rgba(75, 192, 192, 0.2)', // Optional fill color for line chart
            fill: false, // or true if you want area fill
            tension: 0.1 // Optional line tension
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // Good for responsiveness
        scales: {
            y: {
                beginAtZero: true
                // Add ticks callback if needed for formatting
            }
        }
        // Add other options like plugins if needed
    }
});

// Declare pie chart instance variable (initially null)
let monthlyPieChartInstance = null; // Changed from 'pieChart' to avoid confusion

// --- Keep sidebar toggles, month population etc. ---

// --- Your fetchDashboardData and other fetches ---
// Make sure fetchDashboardData updates elements like totalOrdersEl correctly.
// It seems you have two fetch calls at the start, consolidate if possible.
window.addEventListener('DOMContentLoaded', () => {
    // Fetch general stats first
     fetch('https://lestialv.ddns.net:3001/api/dashboard-data')
       .then(res => res.json())
       .then(data => {
         //console.log('Dashboard Stats:', data);
         if (data && data.stats) {
            // Make sure IDs match your HTML
            document.getElementById('total-orders').textContent = data.stats.totalOrders?.toLocaleString() || 'N/A';
            document.getElementById('total-revenue').textContent = '฿' + (data.stats.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00');
             // document.getElementById('total-novels').textContent = data.stats.totalNovels?.toLocaleString() || 'N/A';
             // document.getElementById('canceled-orders').textContent = data.stats.canceledOrders?.toLocaleString() || 'N/A';
         }
       })
       .catch(error => console.error('Error fetching dashboard stats:', error));

    // Then fetch data specifically for the charts
    fetchMonthlyRevenue(); // Call the function to load chart data
});


// --- Fetch Monthly Revenue Data (Mostly fine, adjusted the call to updateChart) ---
async function fetchMonthlyRevenue() {
    try {
        const response = await fetch('https://lestialv.ddns.net:3001/api/monthly-revenue');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return;

        fullMonthlyData = data;

        // สร้าง options เดือน/ปี
        const monthSelector = document.getElementById('month-selector');
        monthSelector.innerHTML = '';

        // เพิ่ม option "ทั้งหมด"
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'ทั้งหมด';
        monthSelector.appendChild(allOption);

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.month;
            option.textContent = item.month;
            monthSelector.appendChild(option);
        });

        // อัปเดต chart ด้วย "ทั้งหมด" เป็นค่าเริ่มต้น
        updateChart('all', data);

        // Event: เปลี่ยนเดือน/ปี
        monthSelector.addEventListener('change', () => {
            const selectedMonth = monthSelector.value;
            updateChart(selectedMonth, fullMonthlyData);
        });

    } catch (error) {
        console.error('Error fetching monthly revenue:', error);
    }
}

function loadMembersTable() {
    fetch('https://lestialv.ddns.net:3001/api/members')
        .then(res => res.json())
        .then(members => {
            const tbody = document.querySelector('.max-w-8xl table tbody');
            if (!tbody) return;
            tbody.innerHTML = members.map(m =>
                 `
                
                <tr>
                    <td class="px-4 py-2">${m.Name}</td>
                    <td class="px-4 py-2">${m.description}</td>
                    <td class="px-4  py-2"><a href="${m.X}" target="_blank">${m.X}</a></td>
                    <td class="px-4 py-2"><a href="${m.Tiktok}" target="_blank">${m.Tiktok}</a></td>
                    <td class="px-4 py-2"><a href="${m.Youtube}" target="_blank">${m.Youtube}</a></td>
                    <td class="px-4 py-2">
                      <img src="../Server${m.iconimg}" alt="icon" class="w-8 h-8 rounded-full object-cover" id="iconimgedit" />
                    </td>
                    <td class="px-4 py-2">
                        <img src="../Server${m.img}" alt="img" class="w-12 h-8 rounded object-cover" id="imgedit" />
                    </td>
                    <td class="px-4 py-2">
                        <span class="inline-block w-6 h-6 rounded" style="background:${m.bgColor}"></span>
                    </td>
                    <td class="px-4 py-2 text-center">
                        <button class="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded transition text-sm flex items-center justify-center" onclick="editMember(${m.ID})">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                    <td class="px-4 py-2 text-center">
                        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition text-sm flex items-center justify-center" onclick="deleteMember(${m.ID})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            iconimgedit = members.map(m => {m.iconimg});
            imgedit = members.map(m => {m.img});
        });
}

// เพิ่มฟังก์ชัน editMember, deleteMember ตามต้องการ

// อัปเดต chart เฉพาะเดือน/ปีที่เลือก
function updateChart(selectedMonth, data) {
    // ถ้าเลือก "ทั้งหมด" ให้แสดงทุกเดือน
    const selectedData = selectedMonth === 'all'
        ? data
        : data.filter(item => item.month === selectedMonth);

    // อัปเดต Sales Chart
    if (monthlySalesChart) {
        monthlySalesChart.data.labels = selectedData.map(item => item.month);
        monthlySalesChart.data.datasets[0].data = selectedData.map(item => item.total_revenue);
        monthlySalesChart.update();
    }

    // อัปเดต Pie Chart
    if (monthlyPieChartInstance) {
        monthlyPieChartInstance.data.labels = selectedData.map(item => item.month);
        monthlyPieChartInstance.data.datasets[0].data = selectedData.map(item => item.total_revenue);
        monthlyPieChartInstance.update();
    }
}

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
    //console.log(userId);
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
document.getElementById('iconimg').addEventListener('change', function(e) {
    const [file] = this.files;
    if (file) {
        document.getElementById('iconimg-preview').src = URL.createObjectURL(file);
    }
});
document.getElementById('img').addEventListener('change', function(e) {
    const [file] = this.files;
    if (file) {
        document.getElementById('img-preview').src = URL.createObjectURL(file);
    }
});