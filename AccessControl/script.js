const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show');
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show');
});
document.addEventListener('DOMContentLoaded', () => {
    checkroles()
    const tableBody = document.getElementById('orders-table-body');
    const searchInput = document.getElementById('searchUserId');
    const searchBtn = document.getElementById('searchUserBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    let allUsers = [];

    function renderUsers(users) {
        tableBody.innerHTML = '';
        users.forEach(user => {
            const isAdmin = user.username === 'admin';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.UserID}</td>
                <td >${user.username}</td>
                <td >${user.name}</td>
                <td >${user.lastname}</td>
                <td >${user.email}</td>
                <td>
                    <select data-field="Roles" ${isAdmin ? 'disabled' : ''}>
                        <option value="admin" ${user.Roles === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                        <option value="user" ${user.Roles === 'user' ? 'selected' : ''}>ผู้ใช้</option>
                        <option value="staff" ${user.Roles === 'staff' ? 'selected' : ''}>พนักงาน</option>
                    </select>
                </td>
                <td contenteditable="true" data-field="coins">${user.coins}</td>
                <td>
                    ${user.Roles !== 'admin' ? `<button data-id="${user.UserID}" class="delete-btn">ลบผู้ใช้</button>` : ''}
                </td>
            `;
            row.querySelectorAll('[contenteditable=true], select').forEach(el => {
                el.addEventListener('blur', () => updateUser(user.UserID, row));
            });
            if (!isAdmin) {
                row.querySelector('[data-field="Roles"]').addEventListener('change', () => updateUser(user.UserID, row));
            }
            if (user.Roles !== 'admin') {
                row.querySelector('.delete-btn').addEventListener('click', () => deleteUser(user.UserID));
            }
            tableBody.appendChild(row);
        });
    }

    function fetchUsers() {
        fetch('https://lestialv.ddns.net:3001/users')
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    console.error('Unexpected response:', data);
                    return;
                }
                allUsers = data;
                renderUsers(allUsers);
            });
    }

    // ฟังก์ชันค้นหา (ค้นหาทั้ง UserID และ Username)
    searchBtn.addEventListener('click', function() {
        const keyword = searchInput.value.trim().toLowerCase();
        if (keyword === "") {
            renderUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter(user =>
            String(user.UserID).toLowerCase().includes(keyword) ||
            String(user.username).toLowerCase().includes(keyword)
        );
        renderUsers(filtered);
    });

    // ล้างการค้นหา
    clearBtn.addEventListener('click', function() {
        searchInput.value = "";
        renderUsers(allUsers);
    });

    // Enter เพื่อค้นหา
    searchInput.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') searchBtn.click();
    });

    const addRegisterForm = document.getElementById("addRegisterForm");
    const closeModalButton = document.getElementById("closeModal");
    const addRegister = document.getElementById("addRegister");
    closeModalButton.addEventListener("click", function () {
        addRegister.style.display = "none";
    });
    addRegisterForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const email = document.getElementById("email").value;
        const name = document.getElementById("name").value;
        const lastname = document.getElementById("lastname").value;
        const rePassword = document.getElementById("re-password").value;
        if (password !== rePassword) {
            Swal.fire({title:'รหัสผ่านไม่ตรงกัน!', icon:'error'});
            return;
          }
        try {
            const response = await fetch("https://lestialv.ddns.net:3001/register", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                  },
                body: JSON.stringify({ 
                    username, 
                    password, 
                    email,
                    name,
                    lastname
                  })
            });

            if (response.ok) {
                Swal.fire({title:"สำเสร็จ", icon:'success'}).then(() => {
                    window.location.reload();
                addRegister.style.display = "none";
                addRegisterForm.reset();
                });
                
            } else {
                Swal.fire({title:"เกิดข้อผิดพลาด กรุณาลองใหม่", icon:'warning'});
                console.error("Error:", response.statusText);
            }
        } catch (error) {
            console.error("Error:", error);
            Swal.fire({title:"เกิดข้อผิดพลาด กรุณาลองใหม่", icon:'warning'});

        }

    });
    document.getElementById('addRegisterButton').addEventListener('click', function() {
        document.getElementById('addRegister').style.display = 'flex';
    });
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('addRegister').style.display = 'none';
    });
    

    function updateUser(UserID, row) {
        const roleField = row.querySelector('[data-field="Roles"]');
        const coinsField = row.querySelector('[data-field="coins"]');
        
        if (!roleField || !coinsField) {
            console.error("Missing input fields for Roles or coins");
            return;
        }
    
        const updatedData = {
            Roles: roleField.value,
            coins: parseInt(coinsField.innerText.trim()) || 0
        };
    
        fetch(`https://lestialv.ddns.net:3001/users/${UserID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log("✅ User updated:", data);
            Swal.fire({title:"อัปเดตผู้ใช้สำเร็จ!", icon: "success"});
        })
        .catch(err => {
            console.error("❌ Fetch Error:", err);
            alert({title:"เกิดข้อผิดพลาดในการอัปเดตผู้ใช้", icon:"error"});
        });
    }
    

    function deleteUser(UserID) {
        Swal.fire({
            title: 'คุณแน่ใจหรือไม่?',
            text: "คุณต้องการลบผู้ใช้นี้หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
            Swal.fire({
                title: 'โปรดยืนยันอีกครั้ง',
                input: 'text',
                inputLabel: 'พิมพ์ "ยืนยัน" เพื่อดำเนินการลบ',
                inputPlaceholder: 'ยืนยัน',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
                cancelButtonText: 'ยกเลิก',
                preConfirm: (value) => {
                if (value !== 'ยืนยัน') {
                    Swal.showValidationMessage('กรุณาพิมพ์ "ยืนยัน" ให้ถูกต้อง');
                }
                return value;
                }
            }).then((confirmResult) => {
                if (confirmResult.isConfirmed && confirmResult.value === 'ยืนยัน') {
                fetch(`https://lestialv.ddns.net:3001/users/${UserID}`, { method: 'DELETE' })
                    .then(() => {
                    Swal.fire('ลบสำเร็จ!', 'ผู้ใช้ถูกลบแล้ว', 'success');
                    fetchUsers();
                    });
                }
            });
            }
        });
    }
    
    fetchUsers();
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
function checkroles() {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');        //console.log(userId)
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

// Optional: ปิด sidebar เมื่อคลิกนอก