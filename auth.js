// auth.js - Handle login/registration

// DOM Elements
const usernameInput = document.getElementById('usernameInput');
const usernameHelper = document.getElementById('usernameHelper');
const loginBtn = document.getElementById('loginBtn');

// Username validation
function validateUsername(username) {
    if (username.length < 3) {
        return { valid: false, message: "Minimal 3 karakter" };
    }
    
    if (username.length > 20) {
        return { valid: false, message: "Maksimal 20 karakter" };
    }
    
    // Alphanumeric + underscore only
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(username)) {
        return { valid: false, message: "Hanya huruf, angka, underscore (_)" };
    }
    
    // Check if username already exists (in local storage)
    const existingUsers = JSON.parse(localStorage.getItem('nope_users') || '{}');
    if (existingUsers[username]) {
        return { 
            valid: true, 
            message: `Welcome back, @${username}!`, 
            isReturning: true 
        };
    }
    
    return { valid: true, message: "Username tersedia", isReturning: false };
}

// Real-time username validation
usernameInput.addEventListener('input', function() {
    const username = this.value.trim();
    
    if (username.length === 0) {
        usernameHelper.textContent = "";
        usernameHelper.className = "input-helper";
        loginBtn.disabled = true;
        return;
    }
    
    const validation = validateUsername(username);
    
    usernameHelper.textContent = validation.message;
    usernameHelper.className = `input-helper ${validation.valid ? 'valid' : 'invalid'}`;
    loginBtn.disabled = !validation.valid;
    
    // Update button text for returning users
    if (validation.isReturning) {
        document.querySelector('.btn-text').textContent = "Lanjutkan Jejak";
    } else {
        document.querySelector('.btn-text').textContent = "Mulai Jejak";
    }
});

// Enter key to submit
usernameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !loginBtn.disabled) {
        registerUser();
    }
});

// Main registration/login function
function registerUser() {
    const username = usernameInput.value.trim();
    const validation = validateUsername(username);
    
    if (!validation.valid) {
        alert("Username tidak valid: " + validation.message);
        return;
    }
    
    // Track users (just for returning user detection)
    let users = JSON.parse(localStorage.getItem('nope_users') || '{}');
    users[username] = {
        lastLogin: new Date().toISOString(),
        createdAt: users[username] ? users[username].createdAt : new Date().toISOString()
    };
    localStorage.setItem('nope_users', JSON.stringify(users));
    
    // Create or load user data
    let userData;
    const userKey = `nope_user_${username}`;
    
    if (validation.isReturning) {
        // Load existing user data
        userData = JSON.parse(localStorage.getItem(userKey));
        if (!userData) {
            // Fallback: create new data if somehow missing
            userData = createNewUserData(username);
        }
    } else {
        // Create new user data
        userData = createNewUserData(username);
    }
    
    // Save to both specific key and current session
    localStorage.setItem(userKey, JSON.stringify(userData));
    localStorage.setItem('current_user', JSON.stringify({
        username: username,
        key: userKey,
        timestamp: Date.now()
    }));
    
    // Add to login history
    const loginHistory = JSON.parse(localStorage.getItem('nope_login_history') || '[]');
    loginHistory.push({
        username: username,
        timestamp: new Date().toISOString(),
        isReturning: validation.isReturning
    });
    localStorage.setItem('nope_login_history', JSON.stringify(loginHistory));
    
    // Redirect to home
    window.location.href = 'home.html';
}

function createNewUserData(username) {
    return {
        username: username,
        createdAt: new Date().toISOString(),
        lastArtefakUpload: null,
        stats: {
            totalRants: 0,
            totalArtefaks: 0,
            rantCategories: {
                PopCulture: 0,
                PersonalPain: 0,
                SocialSickness: 0
            },
            streak: 0,
            lastActive: null
        },
        settings: {
            theme: 'dark',
            notifications: false,
            autoCategorize: true
        }
    };
}

// Check if user is already logged in
function checkExistingSession() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    
    if (currentUser && currentUser.username) {
        // Check if session is still valid (less than 24 hours old)
        const sessionAge = Date.now() - currentUser.timestamp;
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxSessionAge) {
            // Auto-redirect to home
            window.location.href = 'home.html';
        } else {
            // Clear expired session
            localStorage.removeItem('current_user');
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkExistingSession();
    
    // Auto-focus username input
    usernameInput.focus();
    
    // Add some fun username suggestions
    const suggestions = [
        "jiwa_petualang", "pencari_makna", "si_pengamat", 
        "ruang_hening", "echo_dalam", "monolog_sunyi"
    ];
    
    // Show a random suggestion as placeholder sometimes
    if (Math.random() > 0.5) {
        const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
        usernameInput.placeholder = `contoh: ${suggestion}`;
    }
});
