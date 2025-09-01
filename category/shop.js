document.addEventListener("DOMContentLoaded", function () {
    const category = window.location.pathname.split("/").pop(); // ดึง category จาก URL
    const productContainer = document.getElementById("product-categories");

    fetch(`https://lestialv.ddns.net:3001/api/category/${category}`)
        .then(response => response.json())
        .then(products => {
            productContainer.innerHTML = ""; // ล้างข้อมูลเดิม
            products.forEach(product => {
                const productCard = `
                    <div class="product-card">
                        <img src="${product.Product_img}" alt="${product.Product_name}" class="product-img">
                        <h3 class="product-title">${product.Product_name}</h3>
                        <p class="product-price">${product.Product_price} บาท</p>
                        <p class="product-description">${product.Product_description}</p>
                        <button class="add-to-cart">เพิ่มลงตะกร้า</button>
                    </div>
                `;
                productContainer.innerHTML += productCard;
            });
        })
        .catch(error => console.error("Error fetching products:", error));
});

function checkroles() {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');        //console.log(userId)
        fetch(`https://lestialv.ddns.net:3001/api/checkroles/${userId}`)
        .then(response => response.json())
        .then(user => {
            if (!user || !user.Roles) {
                 window.location.href = '/login';
            }
          
            const userRole = user.Roles;
            if (userRole === 'admin') {
                window.location.href = '../adminpanel'; // Redirect to profile
            }
            else if( userRole === 'user'){
                 window.location.href = '../profiles';
            }
            else if (userRole !== 'admin' && userRole !== 'user' ){
                window.location.href = '/login'; // Redirect to profile
            }
          
        })
    .catch(error => console.error('Error fetching user data:', error));
}

function addToCart(product) {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    
    if (!userId) {
        showToast("กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าในตะกร้า!", 'warning');
        return;
    }
    
    fetch('https://lestialv.ddns.net:3001/updatecart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            UserID: userId,
            Product_id: product.Product_id,
            quantity: 1
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast("เกิดข้อผิดพลาด: " + data.error, 'error');
        } else {
            showToast(`${product.Product_name} ถูกเพิ่มลงในตะกร้า!`, 'success');
            updateCartCount(); // อัปเดตจำนวนสินค้าตะกร้า
        }
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        showToast("เกิดข้อผิดพลาด โปรดลองอีกครั้ง!", 'error');
    });
}



function updateCartCount() {
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    if (!userId) return; // Don't fetch if not logged in

    fetch('https://lestialv.ddns.net:3001/api/cartcount/' + userId) // New route for cart count
        .then(response => response.json())
        .then(data => {
            const cartCountElement = document.getElementById('cart-count'); // Element to display count
            if (cartCountElement) {
                cartCountElement.textContent = data.count || 0; // Update with count or 0 if empty
            }
        })
        .catch(error => console.error("Error fetching cart count:", error));
}
