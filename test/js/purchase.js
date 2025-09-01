
// Purchase page functionality
/*document.addEventListener('DOMContentLoaded', function() {
  // Handle buy now buttons
  const buyNowButtons = document.querySelectorAll('.btn-primary');
  
  buyNowButtons.forEach(button => {
    button.addEventListener('click', function() {
      const shopName = this.closest('.purchase-group').querySelector('.shop-name').textContent;
      showNotification(`กำลังดำเนินการสั่งซื้อสินค้าจาก ${shopName}`, 'success');
      
      // Redirect to checkout page
      setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 1000);
    });
  });
  
  // Handle contact seller buttons
  const contactSellerButtons = document.querySelectorAll('.btn-outline');
  
  contactSellerButtons.forEach(button => {
    button.addEventListener('click', function() {
      const shopName = this.closest('.purchase-group').querySelector('.shop-name').textContent;
      showNotification(`กำลังติดต่อผู้ขาย ${shopName}`, 'info');
    });
  });
  
  // Handle order item clicks for navigation
  const orderItems = document.querySelectorAll('.order-item');
  
  orderItems.forEach(item => {
    item.addEventListener('click', function() {
      const orderId = this.querySelector('.order-id').textContent.replace('คำสั่งซื้อ #', '');
      window.location.href = `order-detail.html?id=${orderId}`;
    });
  });
  
  // Handle shop links
  const shopLinks = document.querySelectorAll('.shop-link');
  
  shopLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.stopPropagation();
      const shopName = this.closest('.shop-info').querySelector('.shop-name').textContent;
      showNotification(`กำลังไปที่ร้านค้า ${shopName}`, 'info');
    });
  });
  
  // Handle recommended product clicks
  const productItems = document.querySelectorAll('.product-item');
  
  productItems.forEach(item => {
    item.addEventListener('click', function() {
      const productName = this.querySelector('.product-title').textContent;
      showNotification(`กำลังดูรายละเอียดสินค้า: ${productName}`, 'info');
      // In a real app, this would navigate to a product detail page
    });
  });
});*/
document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  const container = document.querySelector(".purchase-page .container");
  if (!container) {
    console.error("❌ ไม่พบ .purchase-page .container ใน DOM");
    return;
  }

  fetch(`https://lestialv.ddns.net:3001/api/user-orders/${userId}`)
    .then(res => res.json())
    .then(data => {
      //console.log("Fetched order data:", data);
      container.innerHTML = '';

      // ตรวจสอบว่า data.orders เป็น array ก่อน
      if (!Array.isArray(data.orders) || data.orders.length === 0) {
        container.innerHTML = '<p class="error">⚠ ไม่พบคำสั่งซื้อใดๆ</p>';
        return;
      }

      data.orders.forEach(order => {
        const group = document.createElement("div");
        group.classList.add("purchase-group");

        const productCards = Array.isArray(order.Product) && order.Product.length > 0
          ? order.Product.map(product =>
            //console.log("Product:", product) ||`
            <div class="product-card show-shop">
              <div class="shop-info">
                <div class="shop-name">รหัสคำสั่งซื้อ: ${order.OrderID}</div>
                <div class="shop-badge">${order.Post_Tracking || '-'}</div>
                <div class="shop-link">${order.Status || '-'}</div>
              </div>
              <div class="product-info">
                <div class="product-image">
                  <img src="../Server/${product.Product_img}" alt="${product.Product_name}" onerror="this.src=''">
                </div>
                <div class="product-details">
                  <h3 class="product-name">${product.Product_name}</h3>
                  <div class="product-variant">${product.Product_description || ''}</div>
                  <div class="product-quantity">x${product.quantity || 1}</div>
                </div>
                <div class="product-price">
                  <div class="price-info">
                    <span class="current-price">฿${product.Product_price}</span>
                  </div>
                  <div class="delivery-status">
                    <span class="status-text">${order.Status || 'รอดำเนินการ'}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('') 
          : `<div class="error">⚠ ไม่พบรายการสินค้า</div>`;

        const summary = `
          <div class="purchase-summary">
            <div class="total-price">
              <span>ราคารวมสั่งซื้อ:</span>
              <span class="price">฿${order.Total}</span>
            </div>
          </div>
        `;

        group.innerHTML = productCards + summary;
        container.appendChild(group);
      });
    })
    .catch(err => {
      console.error('เกิดข้อผิดพลาดในการโหลดคำสั่งซื้อ:', err);
      container.innerHTML = `<p class="error">⚠ ไม่สามารถโหลดข้อมูลได้</p>`;
    });
});
