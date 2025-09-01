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
    checkroles();


    const addProductForm = document.getElementById("addProductForm");
    const productImageInput = document.getElementById("productImage");
    const previewImage = document.getElementById("previewImage");
    const closeModalButton = document.getElementById("closeModal");
    const addProductModal = document.getElementById("addProductModal");
    const Productcategory = document.getElementById("category");
    closeModalButton.addEventListener("click", function () {
    addProductModal.style.display = "none";
    });

    addProductForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", document.getElementById("productName").value);
    formData.append("price", document.getElementById("price").value);
    formData.append("quantity", document.getElementById("quantity").value);
    formData.append("status", document.getElementById("status").value);
    formData.append("details", document.getElementById("details").value);
    formData.append("category", document.getElementById("category").value);
    if (productImageInput.files[0]) {
        formData.append("image", productImageInput.files[0]);
    }

    try {
        const response = await fetch("https://lestialv.ddns.net:3001/api/uploadproducts", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            window.location.reload();
            addProductModal.style.display = "none";
            addProductForm.reset();
            previewImage.style.display = "none";
        } else {
            Swal.fire({title:"เกิดข้อผิดพลาด กรุณาลองใหม่", icon:"warning"});
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire({title:"เกิดข้อผิดพลาด กรุณาลองใหม่", icon:"error"});
    }

});

    });
    document.getElementById('productImage').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = e.target.result;
        previewImage.style.display = "block"; // แสดงรูปเมื่อโหลดเสร็จ
    };
    reader.readAsDataURL(file);
    }
    });
    document.getElementById('addProductButton').addEventListener('click', function() {
    document.getElementById('addProductModal').style.display = 'flex';
     });
    document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('addProductModal').style.display = 'none';
    });
    
    function fetchProducts() {
        fetch('https://lestialv.ddns.net:3001/products')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(products => {
                const tableBody = document.querySelector('#productTable tbody');
                tableBody.innerHTML = ''; // Clear current table content
    
                if (!Array.isArray(products)) {
                     console.error("Fetched data is not an array:", products);
                     // Handle error display if needed
                     return;
                }
    
                products.forEach(product => {
                    const row = document.createElement('tr');
                    // กำหนด data-id ให้กับแถว เพื่อให้เข้าถึงข้อมูลได้ง่ายขึ้น (ถ้าต้องการ)
                    row.dataset.productId = product.Product_id;
    
                    row.innerHTML = `
                        <td><input type="checkbox" class="productCheckbox" data-id="${product.Product_id}"></td>
                        <td>${product.Product_id}</td>
                        <td>
                            <div class="product-info">
                                <img src="../Server/${product.Product_img || 'placeholder.jpg'}" alt="${product.Product_name}" class="product-image" onerror="this.onerror=null;this.src='../Server/placeholder.jpg';"> ${product.Product_name}
                            </div>
                        </td>
                        <td>${product.Product_type}</td>
                        <td class="${product.Product_status === 'out-of-stock' ? 'status-out' : ''}">${product.Product_status}</td>
                        <td>${product.Product_price}</td>
                        <td>${product.Product_count}</td>
                        <td>
                            <button class="button button-icon edit-product-btn" data-id="${product.Product_id}" title="แก้ไข">
                                <i class='bx bx-edit-alt'></i>
                            </button>
                            </td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                 console.error('Error fetching products:', error);
                 // Display error message to user, e.g., replace table body content
                 const tableBody = document.querySelector('#productTable tbody');
                 tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">ไม่สามารถโหลดข้อมูลสินค้าได้: ${error.message}</td></tr>`;
            });
    }
 /*   document.addEventListener('click', function (event) {
if (event.target.classList.contains('product-image')) {
    // ค้นหา checkbox ที่ใกล้ที่สุด
    const checkbox = event.target.closest('tr')?.querySelector('.productCheckbox');

    if (!checkbox) {
        console.error("❌ ไม่พบ .productCheckbox");
        return;
    }

    const productId = checkbox.dataset.id; // ดึงค่า Product ID
    //console.log("🆔 Product ID:", productId);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', function () {
        const file = input.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('productId', productId);

            fetch('https://lestialv.ddns.net:3001/updateProductImage', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    event.target.src = `../Server/${data.newImage}`; // อัปเดตรูป
                } else {
                    alert('อัปโหลดรูปไม่สำเร็จ');
                }
            })
            .catch(error => {
                console.error('Error updating image:', error);
                alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
            });
        }
    });

    input.click();
}
});*/

    // Delete selected products
    function deleteProducts() {
        const selectedCheckboxes = document.querySelectorAll('.productCheckbox:checked');
        const productIdsToDelete = Array.from(selectedCheckboxes).map(checkbox => checkbox.dataset.id);

        if (productIdsToDelete.length > 0) {
            Swal.fire({
                title: 'คุณแน่ใจหรือไม่?',
                text: 'การลบสินค้าจะไม่สามารถกู้คืนได้! พิมพ์ "ยืนยัน" เพื่อดำเนินการ',
                icon: 'warning',
                input: 'text',
                inputPlaceholder: 'พิมพ์ "ยืนยัน"',
                showCancelButton: true,
                confirmButtonText: 'ลบ',
                cancelButtonText: 'ยกเลิก',
                preConfirm: (inputValue) => {
                    if (inputValue !== 'ยืนยัน') {
                        Swal.showValidationMessage('กรุณาพิมพ์ "ยืนยัน" เพื่อยืนยันการลบ');
                    }
                    return inputValue;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value === 'ยืนยัน') {
                    fetch('https://lestialv.ddns.net:3001/deleteProducts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productIds: productIdsToDelete })
                    })
                    .then(response => response.json())
                    .then(data => {
                        fetchProducts(); // Re-fetch products to refresh the table
                        Swal.fire({title:'ลบสินค้าสำเร็จ', icon:'success'}).then(() => {
                            window.location.reload(); // Reload the page to reflect changes
                        });
                    })
                    .catch(error => {
                        console.error('Error deleting products:', error);
                        Swal.fire({title:'เกิดข้อผิดพลาดในการลบสินค้า', icon:'error'});
                    });
                }
            });
        } else {
            Swal.fire({title:'กรุณาเลือกสินค้า', icon:'warning'});
        }
    }
    
function checkroles() {
    const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
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

    // Toggle select all checkboxes
    function toggleSelectAll(checkbox) {
        const checkboxes = document.querySelectorAll('.productCheckbox');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
    }

    // Initialize the table on page load
    function editCell(cell, columnName, productId) {
const oldValue = cell.innerText;
const input = document.createElement('input');
input.type = 'text';
input.value = oldValue;
input.onblur = function () {
    updateProduct(productId, columnName, input.value, cell, oldValue);
};
input.onkeydown = function (event) {
    if (event.key === 'Enter') {
        input.blur();
    } else if (event.key === 'Escape') {
        cell.innerText = oldValue;
    }
};
cell.innerHTML = '';
cell.appendChild(input);
input.focus();
}
// --- เพิ่ม Event Listener สำหรับปุ่ม Edit (ใช้ Event Delegation) ---
const productTableBody = document.querySelector('#productTable tbody');
productTableBody.addEventListener('click', (event) => {
    // ตรวจสอบว่า element ที่คลิกหรือ parent ของมันคือปุ่มแก้ไขหรือไม่
    const editButton = event.target.closest('.edit-product-btn');
    if (editButton) {
        const productId = editButton.dataset.id;
        openEditModal(productId);
    }
});

// --- ฟังก์ชันเปิดและเติมข้อมูล Edit Modal ---
async function openEditModal(productId) {
    
    const modal = document.getElementById('editProductModal');
    const form = document.getElementById('editProductForm');
    const previewImage = document.getElementById('editPreviewImage');

    try {
        // 1. ดึงข้อมูลสินค้าชิ้นนั้นๆ จาก Backend
        const response = await fetch(`https://lestialv.ddns.net:3001/products/${productId}`);
        if (!response.ok) {
            throw new Error(`ไม่สามารถดึงข้อมูลสินค้า ID ${productId} ได้`);
        }
        const product = await response.json();
        //console.log('Fetched product:', product); // Log the fetched product for debugging
        if (!product) {
             throw new Error(`ไม่พบข้อมูลสินค้า ID ${productId}`);
        }

        // 2. เติมข้อมูลลงในฟอร์ม
        document.getElementById('editProductId').value = product.Product_id || ''; // สำคัญมาก
        document.getElementById('editProductName').value = product.Product_name || ''; // ใช้ || '' เพื่อป้องกัน undefined
        document.getElementById('editPrice').value = product.Product_price || '';
        document.getElementById('editQuantity').value = product.Product_count || '';
        document.getElementById('editCategory').value = product.Product_type || '';
        document.getElementById('editStatus').value = product.Product_status || ''; // ตรวจสอบว่า value ตรงกับ DB
        document.getElementById('editDetails').value = product.Product_description || '';

        // 3. แสดงรูปภาพปัจจุบัน
        if (product.Product_img) {
             previewImage.src = `../Server/${product.Product_img}`;
             previewImage.style.display = 'block';
        } else {
             previewImage.src = ''; // หรือรูป placeholder
             previewImage.style.display = 'none';
        }
        // Reset file input (เผื่อผู้ใช้เปิด modal หลายครั้ง)
        document.getElementById('editProductImage').value = null;


        // 4. แสดง Modal
        modal.style.display = 'flex';

    } catch (error) {
        console.error('Error opening edit modal:', error);
        Swal.fire({title:`เกิดข้อผิดพลาดในการเปิดหน้าต่างแก้ไข: ${error.message}`, icon:'error'});
    }
}

// --- เพิ่ม Event Listener สำหรับปุ่มปิด Edit Modal ---
document.getElementById('editCloseModal').addEventListener('click', function() {
    document.getElementById('editProductModal').style.display = 'none';
});

// --- เพิ่ม Event Listener สำหรับ Submit ฟอร์มแก้ไข ---
document.getElementById('editProductForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // ป้องกันการโหลดหน้าใหม่

    const productId = document.getElementById('editProductId').value;
    const imageFile = document.getElementById('editProductImage').files[0]; // ดึงไฟล์รูป (ถ้ามี)
    //console.log(`Selected file: ${imageFile ? imageFile.name : 'No file selected'}`); // Log the selected file name
    // รวบรวมข้อมูลจากฟอร์มเป็น FormData เพื่อให้ส่งไฟล์ได้
    const formData = new FormData();
    formData.append('productId', productId); // ส่ง ID ไปด้วย (แม้จะอยู่ใน URL ของ PUT ก็ตาม)
    formData.append('userId', sessionStorage.getItem('userId')); // ส่งไฟล์รูปภาพ (ถ้ามี)
    formData.append('Product_name', document.getElementById('editProductName').value);
    formData.append('Product_price', document.getElementById('editPrice').value);
    formData.append('Product_count', document.getElementById('editQuantity').value);
    formData.append('Product_type', document.getElementById('editCategory').value);
    formData.append('Product_status', document.getElementById('editStatus').value);
    formData.append('Product_description', document.getElementById('editDetails').value);

    // เพิ่มไฟล์รูปภาพลงใน FormData ถ้ามีการเลือกไฟล์ใหม่เท่านั้น
    if (imageFile) {
        formData.append('productImage', imageFile); // ชื่อ field นี้ต้องตรงกับที่ backend (multer) คาดหวัง
    }

    //console.log(`Submitting edit for product ID: ${productId}`);
    // Log FormData content (for debugging, files won't show directly)
    for (let [key, value] of formData.entries()) {
        //console.log(`${key}: ${value}`);
    }


    try {
        // ส่งข้อมูลไปอัปเดตที่ Backend (ใช้ PUT หรือ POST ตามที่ Backend กำหนด)
        // ใช้ PUT และส่ง ID ใน URL เป็นมาตรฐาน RESTful ที่ดีกว่า
        const response = await fetch(`https://lestialv.ddns.net:3001/products/${productId}`, {
            method: 'PUT', // หรือ 'POST' ถ้า endpoint เป็น /products/update
            body: formData // ส่งเป็น FormData (ไม่ต้องตั้ง Content-Type header เอง)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error updating product' })); //พยายามอ่าน error จาก json
             throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Failed to update'}`);
        }

        const result = await response.json();
        //console.log('Update result:', result);

        // ปิด Modal
        document.getElementById('editProductModal').style.display = 'none';

        // โหลดข้อมูลตารางใหม่
        fetchProducts();

        // แจ้งเตือน (Optional)
        Swal.fire({title:'แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว!', icon:'success'});

    } catch (error) {
        console.error('Error updating product:', error);
        Swal.fire({title:`เกิดข้อผิดพลาดในการแก้ไขสินค้า: ${error.message}`, icon:'error'});
    }
});

// --- Preview รูปภาพสำหรับ Edit Modal ---
document.getElementById('editProductImage').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const previewImage = document.getElementById('editPreviewImage');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewImage.style.display = "block";
        };
        reader.readAsDataURL(file);
    } else {
         // ถ้าผู้ใช้ยกเลิกการเลือกไฟล์ ให้แสดงรูปเดิม (ถ้ามี) หรือซ่อนไปเลย
         // อาจจะต้องดึง src เดิมมาเก็บไว้ก่อน แต่ตอนนี้แค่ซ่อนถ้าไม่มีไฟล์
         // previewImage.src = 'URL รูปเดิม'; // ต้องหาวิธีเก็บ URL รูปเดิมไว้
         // previewImage.style.display = 'block';
         // หรือ ซ่อนไปก่อน
          previewImage.style.display = 'none';
          previewImage.src = '';
    }
});


// --- อย่าลืมเรียก fetchProducts() ครั้งแรกเมื่อโหลดหน้า ---
document.addEventListener('DOMContentLoaded', fetchProducts);

function updateProduct(productId, columnName, newValue, cell, oldValue) {
fetch(`https://lestialv.ddns.net:3001/updateProduct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, columnName, newValue })
})
.then(response => response.json())
.then(data => {
    if (data.success) {
        cell.innerText = newValue;
    } else {
        cell.innerText = oldValue;
        Swal.fire({title:'ไม่สามารถอัปเดตข้อมูลได้',icon: 'error'});
    }
})
.catch(error => {
    console.error('Error updating product:', error);
    cell.innerText = oldValue;
    Swal.fire({title:'เกิดข้อผิดพลาด กรุณาลองใหม่', icon:'error'});
});
}

    document.addEventListener('DOMContentLoaded', fetchProducts);
    function logout() {
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
    document.querySelector('.search-input').addEventListener('input', function () {
        const query = this.value.trim();
        const tbody = document.querySelector('#productTable tbody');
    
        if (!query) {
            // โหลดข้อมูลทั้งหมดเมื่อช่องค้นหาว่าง
            loadAllProducts();
            return;
        }
    
        fetch(`https://lestialv.ddns.net:3001/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                tbody.innerHTML = '';
    
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">ไม่พบสินค้าที่ค้นหา</td></tr>`;
                    return;
                }
    
                data.forEach(product => {
                    const row = document.createElement('tr');
                    // กำหนด data-id ให้กับแถว เพื่อให้เข้าถึงข้อมูลได้ง่ายขึ้น (ถ้าต้องการ)
                    row.dataset.productId = product.Product_id;
    
                    row.innerHTML = `
                        <td><input type="checkbox" class="productCheckbox" data-id="${product.Product_id}"></td>
                        <td>${product.Product_id}</td>
                        <td>
                            <div class="product-info">
                                <img src="../Server/${product.Product_img || 'placeholder.jpg'}" alt="${product.Product_name}" class="product-image" onerror="this.onerror=null;this.src='../Server/placeholder.jpg';"> ${product.Product_name}
                            </div>
                        </td>
                        <td>${product.Product_type}</td>
                        <td class="${product.Product_status === 'out-of-stock' ? 'status-out' : ''}">${product.Product_status}</td>
                        <td>${product.Product_price}</td>
                        <td>${product.Product_count}</td>
                        <td>
                            <button class="button button-icon edit-product-btn" data-id="${product.Product_id}" title="แก้ไข">
                                <i class='bx bx-edit-alt'></i>
                            </button>
                            </td>
                    `;
                    tbody.appendChild(row);
                });
            })
            .catch(err => {
                console.error('❌ Error searching products:', err);
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">เกิดข้อผิดพลาดในการค้นหา</td></tr>`;
            });
    });
    
    // โหลดข้อมูลสินค้าทั้งหมดเมื่อหน้าโหลด หรือเมื่อ query ว่าง
    function loadAllProducts() {
        fetch('https://lestialv.ddns.net:3001/products') // สมมุติว่า endpoint นี้ใช้โหลดสินค้าทั้งหมด
            .then(res => res.json())
            .then(data => {
                const tbody = document.querySelector('#productTable tbody');
                tbody.innerHTML = '';
    
                data.forEach(product => {
                    const row = document.createElement('tr');
                    // กำหนด data-id ให้กับแถว เพื่อให้เข้าถึงข้อมูลได้ง่ายขึ้น (ถ้าต้องการ)
                    row.dataset.productId = product.Product_id;
    
                    row.innerHTML = `
                        <td><input type="checkbox" class="productCheckbox" data-id="${product.Product_id}"></td>
                        <td>${product.Product_id}</td>
                        <td>
                            <div class="product-info">
                                <img src="../Server/${product.Product_img || 'placeholder.jpg'}" alt="${product.Product_name}" class="product-image" onerror="this.onerror=null;this.src='../Server/placeholder.jpg';"> ${product.Product_name}
                            </div>
                        </td>
                        <td>${product.Product_type}</td>
                        <td class="${product.Product_status === 'out-of-stock' ? 'status-out' : ''}">${product.Product_status}</td>
                        <td>${product.Product_price}</td>
                        <td>${product.Product_count}</td>
                        <td>
                            <button class="button button-icon edit-product-btn" data-id="${product.Product_id}" title="แก้ไข">
                                <i class='bx bx-edit-alt'></i>
                            </button>
                            </td>
                    `;
                    tbody.appendChild(row);
                });
            })
            .catch(err => {
                console.error('❌ Error loading all products:', err);
            });
    }
    function home(){
        window.location.href = "/";
    }
    
    // เรียกเมื่อโหลดหน้าเว็บ
    window.addEventListener('DOMContentLoaded', loadAllProducts);