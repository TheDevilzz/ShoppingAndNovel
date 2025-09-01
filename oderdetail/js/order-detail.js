document.addEventListener("DOMContentLoaded", async () => {
  checkroles();
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) return;

  try {
    const res = await fetch(`https://lestialv.ddns.net:3001/api/order/${orderId}`);
    const data = await res.json();

    document.querySelector(".page-title").textContent = `รายละเอียดคำสั่งซื้อ #${data.orderId}`;
    document.querySelector(".status-badge").textContent = data.status;
    document.querySelector(".status-info p").textContent = `วันเวลาที่สั่งซื้อ: ${new Date(data.orderDate).toLocaleString("th-TH")}`;

    const productList = document.querySelector(".product-list");
    productList.innerHTML = "";

    data.products.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <div class="product-info">
          <div class="product-image small-image responsive-image">
            <img src="../Server/${product.Product_img}" onerror="this.src='img/placeholder.svg'">
          </div>
          <div class="product-details">
            <h2 class="product-name">ชื่อสินค้า: ${product.Product_name}</h2>
            <div class="product-variant">รหัสสินค้า: ${product.Product_id}</div>
            <div class="product-variant">ประเภทสินค้า: ${product.Product_type}</div>
            <div class="product-variant">รายละเอียดสินค้า: ${product.Product_description}</div>
            <div class="product-quantity">จำนวนคำสั่งซื้อ ${product.quantity}</div>
          </div>
          <div class="product-price">
            <span class="current-price">ราคาสินค้า ฿${product.Product_price}</span>
          </div>
        </div>
      `;
      productList.appendChild(card);
    });

    // แสดงข้อมูลที่ backend ส่งมาโดยตรง
    document.querySelector(".address-name").textContent = data.address.name || "ไม่ระบุ";
    document.querySelector(".address-phone").textContent = data.address.phone || "ไม่ระบุ";
    document.querySelector(".address-full").textContent = data.address.full_address || data.address.full || "ไม่ระบุ";

    const summary = document.querySelector(".order-summary");
    summary.innerHTML = `
      <div class="summary-item"><span>ราคาสินค้าทั้งหมด</span><span>฿${data.total}</span></div>
      <div class="summary-total"><span>ยอดรวมทั้งสิ้น</span><span>฿${data.total}</span></div>
    `;
  } catch (error) {
    console.error("โหลดคำสั่งซื้อผิดพลาด", error);
  }
});

function submitOrderUpdate() {
  const tracking = document.getElementById('trackingInput').value.trim();
  const status = document.getElementById('statusSelect').value;
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');

  if (status === "พนักงานจัดส่ง" && tracking === "") {
    Swal.fire({title:"กรุณากรอกเลขพัสดุก่อนเปลี่ยนสถานะเป็นพนักงานจัดส่ง", icon:'warning'});
    return;
  }

  fetch("https://lestialv.ddns.net:3001/api/update-order-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, tracking, status, userId }) // ส่ง userId ไปด้วย
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      Swal.fire({title:"อัปเดตข้อมูลเรียบร้อยแล้ว", icon:'success'}).then(() => {
        window.location.href = `../adminorders`;
      });

    } else {
      Swal.fire({title:"เกิดข้อผิดพลาด: " + data.message, icon:'error'});
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
              if (userRole !== 'admin' && userRole !== 'staff') {
                  window.location.href = './'; // Redirect to profile
              } 
        
          })
    .catch(error => console.error('Error fetching user data:', error));
}