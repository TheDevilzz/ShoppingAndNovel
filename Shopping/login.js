
// DOM elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const currentYearEl = document.getElementById('currentYear');

// Mock user data
const mockUsers = [
    {
        UserID: "user1",
        username: "user1",
        password: "Password1",
        Roles: "user",
        name: "ทดสอบ",
        lastname: "ผู้ใช้",
        email: "user1@example.com",
        IsVerified: "TRUE",
        coins: 100
    },
    {
        UserID: "staff1",
        username: "staff1",
        password: "Password1",
        Roles: "staff",
        name: "พนักงาน",
        lastname: "ทดสอบ",
        email: "staff1@example.com",
        IsVerified: "TRUE",
        coins: 0
    },
    {
        UserID: "admin1",
        username: "admin1",
        password: "Password1",
        Roles: "admin",
        name: "แอดมิน",
        lastname: "ทดสอบ",
        email: "admin1@example.com",
        IsVerified: "TRUE",
        coins: 0
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
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
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) {
            showToast('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
            return;
        }
        
        // Check if user exists
        const user = mockUsers.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Save user to localStorage (normally this would be handled with secure tokens)
            const userToStore = { ...user };
            delete userToStore.password; // Don't store password in localStorage
            localStorage.setItem('currentUser', JSON.stringify(userToStore));
            
            // Simulate token
            localStorage.setItem('token', 'mock-token-' + Date.now());
            
            showToast('เข้าสู่ระบบสำเร็จ', 'success');
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showToast('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    });
});

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
