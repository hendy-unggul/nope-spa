// ==== SESSION MANAGEMENT ====

// Check authentication on home page
function checkAuth() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    
    if (!currentUser || !currentUser.username) {
        // Redirect to login
        window.location.href = 'index.html';
        return null;
    }
    
    // Verify user data exists
    const userKey = currentUser.key || `nope_user_${currentUser.username}`;
    const userData = JSON.parse(localStorage.getItem(userKey));
    
    if (!userData) {
        // User data corrupted, redirect to login
        localStorage.removeItem('current_user');
        window.location.href = 'index.html';
        return null;
    }
    
    return userData;
}

// Update last active timestamp
function updateLastActive() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser) return;
    
    const userKey = currentUser.key;
    const userData = JSON.parse(localStorage.getItem(userKey));
    
    if (userData) {
        userData.stats.lastActive = new Date().toISOString();
        
        // Update streak
        const lastActive = userData.stats.lastActive ? new Date(userData.stats.lastActive) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (lastActive) {
            lastActive.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                // Consecutive day
                userData.stats.streak += 1;
            } else if (diffDays > 1) {
                // Streak broken
                userData.stats.streak = 1;
            } else if (diffDays === 0 && userData.stats.streak === 0) {
                // First time today
                userData.stats.streak = 1;
            }
        } else {
            // First time active
            userData.stats.streak = 1;
        }
        
        localStorage.setItem(userKey, JSON.stringify(userData));
    }
}

// Logout function
function logout() {
    // Clear session but keep user data
    localStorage.removeItem('current_user');
    
    // Optional: Clear all data (uncomment if you want full logout)
    // localStorage.clear();
    
    // Redirect to login
    window.location.href = 'index.html';
}

// Add logout button to header (modify header in home.html)
function addLogoutButton() {
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = '🚪';
        logoutBtn.title = 'Keluar';
        logoutBtn.onclick = function() {
            if (confirm('Yakin mau keluar? Jejakmu tetap tersimpan di perangkat ini.')) {
                logout();
            }
        };
        headerRight.appendChild(logoutBtn);
    }
}

// ==== UPDATE initApp() FUNCTION ====
function initApp() {
    // Check authentication first
    const userData = checkAuth();
    if (!userData) return;
    
    // Update UI with username
    document.getElementById('usernameDisplay').textContent = `@${userData.username}`;
    
    // Update last active
    updateLastActive();
    
    // Add logout button
    addLogoutButton();
    
    // Load user data
    loadUserData(userData);
    
    // Load content
    loadArtefaks();
    loadRants();
    updateUploadTimer();
}

// New function to load user data
function loadUserData(userData) {
    // Display streak if exists
    if (userData.stats && userData.stats.streak > 0) {
        const streakBadge = document.createElement('div');
        streakBadge.className = 'streak-badge';
        streakBadge.innerHTML = `🔥 ${userData.stats.streak} hari`;
        document.querySelector('.header-right').prepend(streakBadge);
    }
    
    // Update stats in UI if needed
    if (userData.stats) {
        // Update any stats display
        console.log('User stats loaded:', userData.stats);
    }
}

// ==== UPDATE app.js EVENT LISTENERS ====
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupImageUpload();
    
    // PWA Install Prompt
    let deferredPrompt;
    const installPrompt = document.createElement('div');
    installPrompt.className = 'pwa-install-prompt';
    installPrompt.id = 'installPrompt';
    installPrompt.innerHTML = `
        <div class="pwa-prompt-content">
            <div class="pwa-icon">📱</div>
            <div class="pwa-text">
                <h4>Install NOPE App</h4>
                <p>Untuk experience terbaik, install sebagai aplikasi</p>
            </div>
            <div class="pwa-actions">
                <button class="btn-pwa btn-pwa-later" onclick="hideInstallPrompt()">Nanti</button>
                <button class="btn-pwa btn-pwa-install" onclick="installPWA()">Install</button>
            </div>
        </div>
    `;
    document.body.appendChild(installPrompt);
    
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show the install prompt
        setTimeout(() => {
            installPrompt.style.display = 'block';
        }, 3000);
    });
    
    // Event listeners
    document.getElementById('uploadArteBtn').addEventListener('click', openArtefakModal);
    document.getElementById('confirmUpload').addEventListener('click', uploadArtefak);
    
    // ... rest of your existing event listeners
});

// PWA Install functions
function installPWA() {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted install');
        } else {
            console.log('User dismissed install');
        }
        deferredPrompt = null;
        hideInstallPrompt();
    });
}

function hideInstallPrompt() {
    document.getElementById('installPrompt').style.display = 'none';
}
