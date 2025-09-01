
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
            showToast('กรุณากรอกอีเมล', 'error');
            return;
        }
        
        // Check if email exists
        const user = mockUsers.find(u => u.email === email);
        
        if (user) {
            // In a real app, this would send a reset password link to the user's email
            //console.log(`Reset password link would be sent to ${email} for user ${user.username}`);
            
            // Show success step
            stepEmail.style.display = 'none';
            stepSuccess.style.display = 'block';
        } else {
            // For security reasons, always show success message even if email doesn't exist
            // This prevents user enumeration
            stepEmail.style.display = 'none';
            stepSuccess.style.display = 'block';
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
