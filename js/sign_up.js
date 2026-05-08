// sign_up.js - Complete working version

let currentStep = 1;
let selectedAccountType = 'breeder';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sign up page loaded');
    
    // Initialize any existing values
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    
    if (fullNameInput && fullNameInput.value === '') {
        fullNameInput.value = '';
    }
    if (emailInput && emailInput.value === '') {
        emailInput.value = '';
    }
});

function nextStep(step) {
    if (step === 2) {
        const name = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        
        if (!name || !name.trim()) {
            showToast('Please enter your full name', 'error');
            return;
        }
        if (!email || !email.trim()) {
            showToast('Please enter your email address', 'error');
            return;
        }
        if (!Validators.email(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
    }

    // Hide current step
    const currentFormStep = document.getElementById(`formStep${currentStep}`);
    if (currentFormStep) {
        currentFormStep.classList.remove('active');
    }
    
    // Show new step
    const newFormStep = document.getElementById(`formStep${step}`);
    if (newFormStep) {
        newFormStep.classList.add('active');
    }
    
    // Update step indicators
    const currentStepIndicator = document.getElementById(`step${currentStep}`);
    const newStepIndicator = document.getElementById(`step${step}`);
    
    if (currentStepIndicator) {
        currentStepIndicator.classList.remove('active');
        currentStepIndicator.classList.add('completed');
    }
    if (newStepIndicator) {
        newStepIndicator.classList.add('active');
    }
    
    // Update progress bar
    const progress = ((step - 1) / 2) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // Update header text
    const texts = ['', "Let's start with the basics", 'What describes you best?', 'Secure your account'];
    const stepText = document.getElementById('stepText');
    if (stepText) {
        stepText.textContent = texts[step];
    }
    
    currentStep = step;
}

function prevStep(step) {
    // Hide current step
    const currentFormStep = document.getElementById(`formStep${currentStep}`);
    if (currentFormStep) {
        currentFormStep.classList.remove('active');
    }
    
    // Show previous step
    const prevFormStep = document.getElementById(`formStep${step}`);
    if (prevFormStep) {
        prevFormStep.classList.add('active');
    }
    
    // Update step indicators
    const currentStepIndicator = document.getElementById(`step${currentStep}`);
    const prevStepIndicator = document.getElementById(`step${step}`);
    
    if (currentStepIndicator) {
        currentStepIndicator.classList.remove('active');
    }
    if (prevStepIndicator) {
        prevStepIndicator.classList.remove('completed');
        prevStepIndicator.classList.add('active');
    }
    
    // Update progress bar
    const progress = ((step - 1) / 2) * 100;
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
    
    // Update header text
    const texts = ['', "Let's start with the basics", 'What describes you best?', 'Secure your account'];
    const stepText = document.getElementById('stepText');
    if (stepText) {
        stepText.textContent = texts[step];
    }
    
    currentStep = step;
}

function selectType(element, type) {
    // Remove selected class from all account types
    const accountTypes = document.querySelectorAll('.account-type');
    accountTypes.forEach(el => {
        el.classList.remove('selected');
    });
    
    // Add selected class to clicked element
    element.classList.add('selected');
    selectedAccountType = type;
    
    console.log('Selected account type:', selectedAccountType);
}

function updatePasswordStrength(passwordInput, strengthIndicator) {
    const password = passwordInput.value;
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) strength++;
    
    const seg1 = document.getElementById('seg1');
    const seg2 = document.getElementById('seg2');
    const seg3 = document.getElementById('seg3');
    const text = document.getElementById('strengthText');
    
    // Reset classes
    if (seg1) seg1.className = 'strength-segment';
    if (seg2) seg2.className = 'strength-segment';
    if (seg3) seg3.className = 'strength-segment';
    
    const texts = ['⚪ Enter a password', '🔴 Weak password', '🟡 Fair password', '🟢 Strong password'];
    const colors = ['var(--text-muted)', 'var(--pass)', 'var(--wheat)', 'var(--green-primary)'];
    
    if (text) {
        text.innerHTML = `<span style="color: ${colors[strength]}">${texts[strength].split(' ')[0]}</span> ${texts[strength].split(' ').slice(1).join(' ')}`;
    }
    
    if (strength >= 1 && seg1) seg1.classList.add('weak');
    if (strength >= 2 && seg2) seg2.classList.add('medium');
    if (strength >= 3 && seg3) seg3.classList.add('strong');
}

function validatePasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}

// Main create account function
async function createAccount() {
    console.log('createAccount function called');
    
    // Get form values
    const name = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    console.log('Form values:', { name, email, phone, accountType: selectedAccountType });
    
    // Validation
    if (!name) {
        showToast('Please enter your full name', 'error');
        return;
    }
    
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (!Validators.email(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!password) {
        showToast('Please create a password', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!terms) {
        showToast('Please accept the Terms of Service', 'error');
        return;
    }
    
    const btn = document.getElementById('createBtn');
    if (btn) {
        btn.textContent = 'Creating account...';
        btn.disabled = true;
    }
    
    try {
        // Check if User object exists
        if (typeof User === 'undefined') {
            throw new Error('Authentication system not loaded. Please refresh the page.');
        }
        
        if (typeof User.signup !== 'function') {
            throw new Error('Signup function not available. Please refresh the page.');
        }
        
        console.log('Calling User.signup with:', { name, email, accountType: selectedAccountType });
        
        // Call the signup method
        const user = await User.signup({
            name: name,
            email: email,
            password: password,
            accountType: selectedAccountType,
            phone: phone
        });
        
        console.log('Signup successful:', user);
        
        // Show success state
        const formStep3 = document.getElementById('formStep3');
        const progressBar = document.querySelector('.progress-bar');
        const signupHeader = document.querySelector('.signup-header');
        const logoContainer = document.querySelector('.logo-container');
        const successState = document.getElementById('successState');
        
        if (formStep3) formStep3.classList.remove('active');
        if (progressBar) progressBar.style.display = 'none';
        if (signupHeader) signupHeader.style.display = 'none';
        if (logoContainer) logoContainer.style.display = 'none';
        if (successState) successState.classList.add('active');
        
        showToast(`Welcome to BreedLink, ${user.name}! 🎉`, 'success');
        
        // Redirect to profile page after 2 seconds
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 2000);
        
    } catch (error) {
        console.error('Signup error:', error);
        showToast(error.message || 'Account creation failed. Please try again.', 'error');
        
        // Reset button
        if (btn) {
            btn.textContent = 'Create Account';
            btn.disabled = false;
        }
    }
}

// Helper function to toggle password visibility (if not already defined in auth.js)
if (typeof window.togglePassword === 'undefined') {
    window.togglePassword = function(inputId, buttonElement) {
        const input = document.getElementById(inputId);
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                buttonElement.textContent = '🙈';
            } else {
                input.type = 'password';
                buttonElement.textContent = '👁️';
            }
        }
    };
}

// Make sure showToast is available (fallback)
if (typeof window.showToast === 'undefined') {
    window.showToast = function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> ${message}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: ${type === 'error' ? 'linear-gradient(135deg, #ff6b6b, #ff4757)' : 'linear-gradient(135deg, #2e6b4e, #3c8d63)'};
            color: white;
            padding: 16px 28px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 3000;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    };
}

// Make sure Validators is available (fallback)
if (typeof window.Validators === 'undefined') {
    window.Validators = {
        email: function(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        password: function(password) {
            return password.length >= 8;
        }
    };
}

// Log that script is loaded
console.log('sign_up.js loaded successfully');
