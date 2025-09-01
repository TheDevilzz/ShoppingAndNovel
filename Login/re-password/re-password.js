// DOM elements
const resetPasswordForm = document.getElementById('resetPasswordForm');
const emailInput = document.getElementById('email');
const stepEmail = document.getElementById('stepEmail');
const stepSuccess = document.getElementById('stepSuccess');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const currentYearEl = document.getElementById('currentYear');
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.getElementById('strengthText');
const lengthCheck = document.getElementById('length');
const lowercaseCheck = document.getElementById('lowercase');
const uppercaseCheck = document.getElementById('uppercase');
// Mock user data


// Initialize
// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const newPasswordInput = document.getElementById('newpassword'); // ย้ายมาที่นี่

    currentYearEl.textContent = new Date().getFullYear();

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

    // ตรวจสอบความแข็งแรงของรหัสผ่านขณะพิมพ์
    newPasswordInput.addEventListener('input', function () {
        checkPasswordStrength(
            newPasswordInput,
            strengthMeter,
            strengthText
        );
    });

    // Reset password form submission
    resetPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('password').value.trim();
        const reNewPassword = document.getElementById('re-newpassword').value.trim();
        const newPassword = newPasswordInput.value.trim(); // ดึงค่าจาก newPasswordInput

        const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');

        if (!oldPassword || !newPassword || !reNewPassword) {
            Swal.fire({ title: 'กรุณากรอกข้อมูลให้ครบถ้วน', icon: 'error' });
            return;
        }

        if (newPassword !== reNewPassword) {
            Swal.fire({ title: 'รหัสผ่านใหม่และยืนยันรหัสไม่ตรงกัน', icon: 'error' });
            return;
        }

        fetch('https://lestialv.ddns.net:3001/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, oldPassword, newPassword, reNewPassword })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    stepEmail.style.display = 'none';
                    stepSuccess.style.display = 'block';
                } else {
                    Swal.fire({ title: data.error || 'เกิดข้อผิดพลาด', icon: 'error' });
                }
            })
            .catch(() => {
                Swal.fire({ title: 'เกิดข้อผิดพลาด', icon: 'error' });
            });
    });
});


// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

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
function checkPasswordStrength(passwordInput, strengthMeter, strengthText) {
    const password = passwordInput.value;
    let strength = 0;
    let status = '';

    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;

    if (strengthMeter) strengthMeter.style.width = strength + '%';

    if (strength < 25) {
        status = 'อ่อนมาก';
        if (strengthMeter) strengthMeter.style.backgroundColor = '#ea384c';
    } else if (strength < 50) {
        status = 'อ่อน';
        if (strengthMeter) strengthMeter.style.backgroundColor = '#f59e0b';
    } else if (strength < 75) {
        status = 'ปานกลาง';
        if (strengthMeter) strengthMeter.style.backgroundColor = '#3bb3a9';
    } else if (strength < 100) {
        status = 'ดี';
        if (strengthMeter) strengthMeter.style.backgroundColor = '#10b981';
    } else {
        status = 'ยอดเยี่ยม';
        if (strengthMeter) strengthMeter.style.backgroundColor = '#10b981';
    }

    if (strengthText) strengthText.textContent = 'ความปลอดภัยของรหัสผ่าน: ' + status;
}
