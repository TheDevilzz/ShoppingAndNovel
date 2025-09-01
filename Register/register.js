
// DOM elements
const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const nameInput = document.getElementById('name');
const lastnameInput = document.getElementById('lastname');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordToggle = document.getElementById('passwordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
const termsCheckbox = document.getElementById('terms');
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.getElementById('strengthText');
const lengthCheck = document.getElementById('length');
const lowercaseCheck = document.getElementById('lowercase');
const uppercaseCheck = document.getElementById('uppercase');
const numberCheck = document.getElementById('number');
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
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {

    isLoggedIn();

    currentYearEl.textContent = new Date().getFullYear();
    
    // Password toggles
    passwordToggle.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, passwordToggle);
    });
    
    confirmPasswordToggle.addEventListener('click', () => {
        togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle);
    });
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
    
    // Password strength checker
    passwordInput.addEventListener('input', checkPasswordStrength);
    
    // Registration form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        if (!validateForm()) return;
    
        const newUser = {
            username: usernameInput.value.trim(),
            password: passwordInput.value,
            name: nameInput.value.trim(),
            lastname: lastnameInput.value.trim(),
            email: emailInput.value.trim(),
        };
    
        try {
            const response = await fetch('https://lestialv.ddns.net:3001/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser)
            });
    
            const result = await response.json();
    
            if (response.ok) {
                Swal.fire({title:'สมัครสมาชิกสำเร็จ', icon:'success'}).then(() => {
                    window.location.href = '/login';
                });
            } else {
                Swal.fire({title:result.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก', icon:'error'});
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({title:'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', icon:'error'});
        }
    });
});

// Toggle password visibility
function togglePasswordVisibility(input, button) {
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="far fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i class="far fa-eye"></i>';
    }
}

// Check password strength
function checkPasswordStrength() {
    const password = passwordInput.value;
    let strength = 0;
    let status = '';
    
    // Check length
    if (password.length >= 8) {
        strength += 25;
        lengthCheck.classList.add('pass');
    } else {
        lengthCheck.classList.remove('pass');
    }
    
    // Check lowercase letters
    if (password.match(/[a-z]/)) {
        strength += 25;
        lowercaseCheck.classList.add('pass');
    } else {
        lowercaseCheck.classList.remove('pass');
    }
    
    // Check uppercase letters
    if (password.match(/[A-Z]/)) {
        strength += 25;
        uppercaseCheck.classList.add('pass');
    } else {
        uppercaseCheck.classList.remove('pass');
    }
    
    // Check numbers
    if (password.match(/[0-9]/)) {
        strength += 25;
        numberCheck.classList.add('pass');
    } else {
        numberCheck.classList.remove('pass');
    }
    
    // Update strength meter
    strengthMeter.style.width = strength + '%';
    
    // Update strength text
    if (strength < 25) {
        status = 'อ่อนมาก';
        strengthMeter.style.backgroundColor = '#ea384c';
    } else if (strength < 50) {
        status = 'อ่อน';
        strengthMeter.style.backgroundColor = '#f59e0b';
    } else if (strength < 75) {
        status = 'ปานกลาง';
        strengthMeter.style.backgroundColor = '#3bb3a9';
    } else if (strength < 100) {
        status = 'ดี';
        strengthMeter.style.backgroundColor = '#10b981';
    } else {
        status = 'ยอดเยี่ยม';
        strengthMeter.style.backgroundColor = '#10b981';
    }
    
    strengthText.textContent = 'ความปลอดภัยของรหัสผ่าน: ' + status;
}

// Validate form
function validateForm() {
    let isValid = true;
    
    // Check username
    const username = usernameInput.value.trim();
    if (!username) {
        showError(usernameInput, 'usernameError', 'กรุณากรอกชื่อผู้ใช้');
        isValid = false;
    } else if (mockUsers.some(u => u.username === username)) {
        showError(usernameInput, 'usernameError', 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว');
        isValid = false;
    } else {
        clearError(usernameInput, 'usernameError');
    }
    
    // Check email
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showError(emailInput, 'emailError', 'กรุณากรอกอีเมล');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showError(emailInput, 'emailError', 'กรุณากรอกอีเมลให้ถูกต้อง');
        isValid = false;
    } else if (mockUsers.some(u => u.email === email)) {
        showError(emailInput, 'emailError', 'อีเมลนี้มีผู้ใช้งานแล้ว');
        isValid = false;
    } else {
        clearError(emailInput, 'emailError');
    }
    
    // Check password
    const password = passwordInput.value;
    if (password.length < 8 || !password.match(/[a-z]/) || !password.match(/[A-Z]/) || !password.match(/[0-9]/)) {
        showError(passwordInput, null, 'รหัสผ่านไม่เป็นไปตามเงื่อนไข');
        isValid = false;
    }
    
    // Check password confirmation
    const confirmPassword = confirmPasswordInput.value;
    if (password !== confirmPassword) {
        showError(confirmPasswordInput, 'confirmPasswordError', 'รหัสผ่านไม่ตรงกัน');
        isValid = false;
    } else {
        clearError(confirmPasswordInput, 'confirmPasswordError');
    }
    
    // Check terms
    if (!termsCheckbox.checked) {
        Swal.fire({title:'กรุณายอมรับเงื่อนไขการใช้งานและนโยบายความเป็นส่วนตัว', icon:'error'});
        isValid = false;
    }
    
    return isValid;
}

// Show error
function showError(inputElement, errorId, message) {
    inputElement.classList.add('is-invalid');
    if (errorId) {
        const errorElement = document.getElementById(errorId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Clear error
function clearError(inputElement, errorId) {
    inputElement.classList.remove('is-invalid');
    if (errorId) {
        const errorElement = document.getElementById(errorId);
        errorElement.textContent = '';
        errorElement.style.display = 'none';
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