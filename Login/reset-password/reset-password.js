// DOM elements
const resetPasswordForm = document.getElementById('resetPasswordForm');
const emailInput = document.getElementById('email');
const stepEmail = document.getElementById('stepEmail');
const stepSuccess = document.getElementById('stepSuccess');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const currentYearEl = document.getElementById('currentYear');

// Mock user data
const mockUsers = [
    {
        UserID: "user1",
        username: "user1",
        email: "user1@example.com"
    },
    {
        UserID: "staff1",
        username: "staff1",
        email: "staff1@example.com"
    },
    {
        UserID: "admin1",
        username: "admin1",
        email: "admin1@example.com"
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    isLoggedIn();
    // Set current year in footer
    currentYearEl.textContent = new Date().getFullYear();
    
    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
    
    // Reset password form submission
    resetPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email) {
                Swal.fire({title:'กรุณากรอกอีเมล', icon:'error'});
            return;
        }
        
        fetch('https://lestialv.ddns.net:3001/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            // ไม่ว่าจะสำเร็จหรือไม่ ให้แสดง stepSuccess เสมอ
            stepEmail.style.display = 'none';
            stepSuccess.style.display = 'block';
        })
        .catch(() => {
            stepEmail.style.display = 'none';
            stepSuccess.style.display = 'block';
        });
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
