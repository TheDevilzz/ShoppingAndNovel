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
    fetchOrders();
    checkroles();
});
function fetchOrders() {
    fetch('https://lestialv.ddns.net:3001/adminorders')
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('orders-table-body');
            tbody.innerHTML = '';

            data.forEach(order => {
                const row = document.createElement('tr');
                const name = order.Address.firstName && order.Address.lastName
                    ? `${order.Address.firstName} ${order.Address.lastName}`
                    : (order.Address.name || '-');
                const fullAddress = order.Address.address && order.Address.sub_district && order.Address.district && order.Address.province && order.Address.postal 
                    ? `${order.Address.address} ${order.Address.sub_district} ${order.Address.district} ${order.Address.province} ${order.Address.postal}`
                    : (order.Address.full_address || '-');

                // จุดแดงถ้า is_read = 0
                const unreadDot = order.is_read === 0
                    ? `<span style="display:inline-block;width:8px;height:8px;background:#e53e3e;border-radius:50%;margin-left:6px;vertical-align:middle;"></span>`
                    : '';

                row.innerHTML = `
                    <td>${order.OrderID}${unreadDot}</td>
                    <td>${order.Product}</td>
                    <td>${name} </br> (${fullAddress} ${order.Address.phone})</td>
                    <td data-order-date="${new Date(order.OrderDate).toISOString()}">
                        ${new Date(order.OrderDate).toLocaleDateString('th-TH')}
                    </td>
                    <td>฿ ${order.Price.toFixed(2)}</td>
                    <td>
                        ${order.Status}
                    </td>
                    <td>${order.PostTracking}</td>
                `;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    markOrderAsRead(order.OrderID);
                    if (order.Status === 'ยกเลิกคำสั่งซื้อ') {
                        window.location.reload();
                        return;
                    }
                    window.location.href = `../oderdetail/?id=${order.OrderID}`;
                });
                tbody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching orders:', error));
}

function fetchOrdersByMonthAndYear(month, year) {
    if (month === '0') {
        // ถ้าเลือก "แสดงข้อมูลทั้งหมด" จะเรียกดึงข้อมูลทั้งหมดจาก backend
        fetch('https://lestialv.ddns.net:3001/adminorders')
            .then(response => response.json())
            .then(data => updateOrdersTable(data))
            .catch(error => console.error('Error fetching orders:', error));
    } else {
        // ถ้าเลือกเดือนที่เฉพาะเจาะจง ให้ดึงข้อมูลตามเดือนและปี
        fetch(`https://lestialv.ddns.net:3001/adminorders/month/${month}/year/${year}`)
            .then(response => response.json())
            .then(data => updateOrdersTable(data))
            .catch(error => console.error('Error fetching orders:', error));
    }
}

function fetchOrdersWithFilters() {
    const month = document.getElementById('month-select').value;
    const year = document.getElementById('year-select').value;
    const status = document.getElementById('status-select').value;

    let url = '';
    if (month === '0') {
        url = 'https://lestialv.ddns.net:3001/adminorders';
    } else {
        url = `https://lestialv.ddns.net:3001/adminorders/month/${month}/year/${year}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // ถ้ามีการเลือกสถานะ ให้ filter ในฝั่ง client
            let filtered = data;
            if (status) {
                filtered = data.filter(order => order.Status === status);
            }
            updateOrdersTable(filtered);
        })
        .catch(error => console.error('Error fetching orders:', error));
}
function fetchOrdersWithReadFilters() {
    const month = document.getElementById('month-select').value;
    const year = document.getElementById('year-select').value;
    const read = document.getElementById('read-select').value;

    let url = '';
    if (month === '0') {
        url = 'https://lestialv.ddns.net:3001/adminorders';
    } else {
        url = `https://lestialv.ddns.net:3001/adminorders/month/${month}/year/${year}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // ถ้ามีการเลือกสถานะ ให้ filter ในฝั่ง client
            let filtered = data;
            if (read) {
                
                
                filtered = data.filter(order => order.is_read === Number(read));

            }
            updateOrdersTable(filtered);
            
        })
        .catch(error => console.error('Error fetching orders:', error));
}

// ให้ select เดือน/ปี เรียก fetchOrdersWithFilters แทนเดิม
document.getElementById('month-select').onchange = fetchOrdersWithFilters;
document.getElementById('year-select').onchange = fetchOrdersWithFilters;

// ฟังก์ชันอัปเดตตารางแสดงผล
function updateOrdersTable(data) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    if (data.message) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${data.message}</td></tr>`;
        return;
    }

    data.forEach(order => {
        const row = document.createElement('tr');
        // ใช้ order.Address.firstName และ order.Address.lastName ถ้ามี, ถ้าไม่มีก็ใช้ order.Address.name
        const name = order.Address.firstName && order.Address.lastName
            ? `${order.Address.firstName} ${order.Address.lastName}`
            : (order.Address.name || '-');
        const fullAddress = order.Address.address && order.Address.sub_district && order.Address.district && order.Address.province && order.Address.postal 
            ? `${order.Address.address} ${order.Address.sub_district} ${order.Address.district} ${order.Address.province} ${order.Address.postal}`
            : (order.Address.full_address || '-');
        row.innerHTML = `
            <td>${order.OrderID}</td>
            <td>${order.Product}</td>
            <td>${name} <br> (${fullAddress} ${order.Address.phone})</td>
            <td data-order-date="${new Date(order.OrderDate).toISOString()}">
                ${new Date(order.OrderDate).toLocaleDateString('th-TH')}
                    </td>
            <td>฿ ${order.Price.toFixed(2)}</td>
            <td>
            ${order.Status}
            </td>
            <td>${order.PostTracking}</td>
        `;
        row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                markOrderAsRead(order.OrderID);
                if (order.Status === 'ยกเลิกคำสั่งซื้อ') {
                    window.location.reload();
                    return;
                }
                // เรียกฟังก์ชันเพื่อทำเครื่องหมายว่าอ่านแล้ว
                window.location.href = `../oderdetail/?id=${order.OrderID}`;
            });
        tbody.appendChild(row);
    });
}

async function itemShow(Product_id) {
    const cartContainer = document.getElementById("cart-items");
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    //console.log("🔍 ก่อนแปลง Product_id:", Product_id, "Type:", typeof Product_id);

    let productIds = Array.isArray(Product_id) 
        ? Product_id 
        : typeof Product_id === "string" 
            ? Product_id.split(',') 
            : [Product_id];

    //console.log("📩 ส่งค่าไป Backend:", { userId, productIds });

    if (!userId || !productIds.length) {
        console.error("❌ User ID หรือ Product ID หายไป");
        return;
    }

    cartContainer.style.display = 'inline-grid';

    try {
        const res = await fetch(`https://lestialv.ddns.net:3001/api/showorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, productIds }) // ✅ ส่งเป็น Array
        });

        if (!res.ok) throw new Error("❌ Failed to fetch order data");

        const cartItems = await res.json();
        //console.log("🛒 Cart Items:", cartItems);

        if (cartItems.length === 0) {
            cartContainer.innerHTML = "<p>ไม่มีสินค้าในคำสั่งซื้อนี้</p>";
            return;
        }

        let totalPrice = 0;
        cartContainer.innerHTML = cartItems.map(item => {
            totalPrice += item.Product_price * (item.quantity || 1);

            return `
          
                <div class="cart-item" data-product-id="${item.Product_id}" style="background: rgba(250, 248, 248, 1); ">
                    <img src="../Server/${item.Product_img}" alt="${item.Product_name}" class="item-image">
                    <div class="item-details">
                        <div class="item-top">
                            <div>
                                <h3>${item.Product_name}</h3>
                                <p style="color: #585858; font-size: 0.875rem;">${item.Product_description}</p>
                            </div>
                            <p>${item.Product_price} THB</p>
                        </div>
                        <div class="item-bottom">
                            <div class="quantity-controls">
                                <span>${item.quantity || 1}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
            `;
        }).join("");

    } catch (error) {
        console.error("❌ Error loading cart:", error);
        cartContainer.innerHTML = "<p>เกิดข้อผิดพลาดในการโหลดสินค้า</p>";
    }
}
function closeCart() {
    const cartContainer = document.getElementById("cart-items");
    cartContainer.style.display = 'none';
}

function editPostTracking(td, orderID) {
    const currentText = td.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText !== '-' ? currentText : '';
    input.onblur = function() {
        updatePostTracking(orderID, input.value, td);
    };
    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
}

function updatePostTracking(orderID, trackingNumber, td) {
    fetch(`https://lestialv.ddns.net:3001/orders/${orderID}/post-tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ PostTracking: trackingNumber })
    })
    .then(response => response.json())
    .then(() => {
        td.innerText = trackingNumber || '-';
    })
    .catch(error => console.error('Error updating post tracking:', error));
}

function updateStatus(orderID, status) {
    fetch(`https://lestialv.ddns.net:3001/orders/${orderID}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: status })
    })
    .then(response => response.json())
    .catch(error => console.error('Error updating status:', error));
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

function checkroles() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    //console.log(localStorage.getItem('userId'));
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
    window.location.href = '/';
}
let orderDateSortAsc = false; // เริ่มต้นเรียงจากมากไปน้อย
function sortByOrderDate() {
    const tbody = document.getElementById('orders-table-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const dateA = new Date(a.children[3].dataset.orderDate);
        const dateB = new Date(b.children[3].dataset.orderDate);
        return orderDateSortAsc ? dateA - dateB : dateB - dateA;
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));

    orderDateSortAsc = !orderDateSortAsc;
    document.getElementById('orderDateSortIcon').textContent = orderDateSortAsc ? '↑' : '↓';
}
// เรียกเมื่อเปิดดู order detail
function markOrderAsRead(orderId) {
    console.log("Marking order as read:", orderId);
    fetch(`https://lestialv.ddns.net:3001/api/orders/${orderId}/read`, {
        method: 'PUT'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            
        }
    });
}