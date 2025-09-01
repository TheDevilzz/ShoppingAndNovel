
// DOM elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const currentYearEl = document.getElementById('currentYear');


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    isLoggedIn();
    currentYearEl.textContent = new Date().getFullYear();
    
    // Password toggle
    passwordToggle.addEventListener('click', () => {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            passwordToggle.innerHTML = '<i class="far fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            passwordToggle.innerHTML = '<i class="far fa-eye"></i>';
        }
    });
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
    
        if (!username || !password) {
            Swal.fire({title:'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', icon:'error'});
            return;
        }
    
        try {
            const response = await fetch('https://lestialv.ddns.net:3001/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
    
            const result = await response.json();
    
            if (response.ok) {
                const user = result.user;
                delete user.password;
    
                // Save user info
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('token', result.token || 'mock-token-' + Date.now());
                sessionStorage.setItem('userId', user.UserID); // เผื่อใช้ sessionStorage สำหรับการเข้าถึงตอนนิยาย
                localStorage.setItem('userId', user.UserID); // เผื่อใช้ sessionStorage สำหรับการเข้าถึงตอนนิยาย
                sessionStorage.setItem('username', user.Username); // เผื่อใช้ sessionStorage สำหรับการเข้าถึงตอนนิยาย
                localStorage.setItem('username', user.Username); // เผื่อใช้ sessionStorage สำหรับการเข้าถึงตอนนิยาย
    
                Swal.fire({title:'เข้าสู่ระบบสำเร็จ', icon:'success'});
    
                setTimeout(() => {
                    if (user.Roles && user.Roles.toLowerCase() === 'admin') {
                        window.location.href = '/dashboard';
                    } else {
                        console.log(user.Roles)
                       window.location.href = '/';
                    }
                }, 1500);
            } else {
                Swal.fire({title: result.error || 'เข้าสู่ระบบล้มเหลว', icon:'error'});
            }
    
        } catch (error) {
            console.error('Login error:', error);
            Swal.fire({title:'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', icon:'error'});
        }
    });
    
});

function isLoggedIn() {
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('currentUser');
    if (token && currentUser) {
        const user = JSON.parse(currentUser);
        if (user.Roles && user.Roles.toLowerCase() === 'admin') {
            window.location.href = '/dashboard';
        }
        else {
            window.location.href = '/';
        }
    }
}
// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
