// ===== GLOBAL STATE =====
let currentUser = null;
let currentPage = 'login';
let deferredPrompt = null;
let allRants = [];
let allArtefaks = [];

// ===== DOM ELEMENTS =====
const pages = {
    login: 'loginPage',
    home: 'homePage',
    popculture: 'popculturePage',
    personalpain: 'personalpainPage',
    socialsickness: 'socialsicknessPage'
};

// ===== PAGE MANAGEMENT =====
function showPage(pageName) {
    // Update current page
    currentPage = pageName;
    
    // Hide all pages
    Object.values(pages).forEach(pageId => {
        const page = document.getElementById(pageId);
        if(page) {
            page.classList.remove('active');
            setTimeout(() => {
                page.style.display = 'none';
            }, 300);
        }
    });
    
    // Show target page
    const targetPage = document.getElementById(pages[pageName]);
    if(targetPage) {
        targetPage.style.display = 'block';
        setTimeout(() => {
            targetPage.classList.add('active');
        }, 10);
        
        // Update browser URL
        window.history.pushState({page: pageName}, '', `#${pageName}`);
        
        // Initialize page specific logic
        initPage(pageName);
    }
}

function initPage(pageName) {
    switch(pageName) {
        case 'login':
            initLoginPage();
            break;
        case 'home':
            initHomePage();
            break;
        case 'popculture':
        case 'personalpain':
        case 'socialsickness':
            initFeedPage(pageName);
            break;
    }
}

// Handle browser back button
window.addEventListener('popstate', function(event) {
    const page = event.state?.page || 'login';
    showPage(page);
});

// ===== AUTHENTICATION =====
function initLoginPage() {
    const usernameInput = document.getElementById('usernameInput');
    const usernameHelper = document.getElementById('usernameHelper');
    const loginBtn = document.getElementById('loginBtn');
    
    if(usernameInput && loginBtn) {
        // Auto-focus
        setTimeout(() => usernameInput.focus(), 100);
        
        // Real-time validation
        usernameInput.addEventListener('input', function() {
            const username = this.value.trim();
            const validation = validateUsername(username);
            
            if(username.length === 0) {
                usernameHelper.textContent = "";
                usernameHelper.className = "input-helper";
                loginBtn.disabled = true;
                return;
            }
            
            usernameHelper.textContent = validation.message;
            usernameHelper.className = `input-helper ${validation.valid ? 'valid' : 'invalid'}`;
            loginBtn.disabled = !validation.valid;
            
            // Update button text
            const btnText = document.querySelector('.btn-text');
            if(btnText) {
                btnText.textContent = validation.isReturning ? "Lanjutkan Jejak" : "Mulai Jejak";
            }
        });
        
        // Enter key support
        usernameInput.addEventListener('keypress', function(e) {
            if(e.key === 'Enter' && !loginBtn.disabled) {
                loginUser();
            }
        });
    }
}

function validateUsername(username) {
    if(username.length < 3) {
        return { valid: false, message: "Minimal 3 karakter" };
    }
    
    if(username.length > 20) {
        return { valid: false, message: "Maksimal 20 karakter" };
    }
    
    // Alphanumeric + underscore only
    const regex = /^[a-zA-Z0-9_]+$/;
    if(!regex.test(username)) {
        return { valid: false, message: "Hanya huruf, angka, underscore (_)" };
    }
    
    // Check if username exists
    const existingUser = localStorage.getItem(`nope_user_${username}`);
    if(existingUser) {
        return { 
            valid: true, 
            message: `Welcome back!`, 
            isReturning: true 
        };
    }
    
    return { valid: true, message: "Username tersedia", isReturning: false };
}

function loginUser() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput?.value.trim();
    
    if(!username || username.length < 3) {
        alert('Username minimal 3 karakter');
        return;
    }
    
    // Create or load user
    const userKey = `nope_user_${username}`;
    let userData = JSON.parse(localStorage.getItem(userKey));
    
    if(!userData) {
        // New user
        userData = {
            username: username,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            lastArtefakUpload: null,
            stats: {
                totalRants: 0,
                totalArtefaks: 0,
                streak: 0,
                lastActive: null
            }
        };
    } else {
        // Returning user
        userData.lastLogin = new Date().toISOString();
    }
    
    // Save user data
    currentUser = userData;
    localStorage.setItem(userKey, JSON.stringify(userData));
    localStorage.setItem('nope_current_user', JSON.stringify({
        username: username,
        key: userKey,
        timestamp: Date.now()
    }));
    
    // Initialize empty data if new user
    if(!localStorage.getItem(`nope_data_${username}`)) {
        localStorage.setItem(`nope_data_${username}`, JSON.stringify({
            artefacts: [],
            rants: [],
            settings: {}
        }));
    }
    
    // Go to home page
    showPage('home');
}

function checkExistingSession() {
    const savedUser = localStorage.getItem('nope_current_user');
    if(savedUser) {
        try {
            const session = JSON.parse(savedUser);
            const sessionAge = Date.now() - session.timestamp;
            const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if(sessionAge < maxSessionAge) {
                // Valid session
                const userKey = session.key || `nope_user_${session.username}`;
                const userData = JSON.parse(localStorage.getItem(userKey));
                
                if(userData) {
                    currentUser = userData;
                    showPage('home');
                    return true;
                }
            } else {
                // Expired session
                localStorage.removeItem('nope_current_user');
            }
        } catch(e) {
            console.error('Session error:', e);
        }
    }
    return false;
}

function logout() {
    if(confirm('Yakin mau keluar? Jejakmu tetap tersimpan di perangkat ini.')) {
        localStorage.removeItem('nope_current_user');
        currentUser = null;
        showPage('login');
    }
}

// ===== HOME PAGE =====
function initHomePage() {
    if(!currentUser) {
        showPage('login');
        return;
    }
    
    // Update UI
    updateUserDisplay();
    
    // Load data
    loadUserData();
    loadArtefaks();
    loadRants();
    updateUploadTimer();
    
    // Setup event listeners
    setupHomeEventListeners();
}

function updateUserDisplay() {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const streakBadge = document.getElementById('streakBadge');
    
    if(usernameDisplay && currentUser) {
        usernameDisplay.textContent = `@${currentUser.username}`;
    }
    
    if(streakBadge && currentUser?.stats?.streak > 0) {
        streakBadge.textContent = `🔥 ${currentUser.stats.streak}`;
        streakBadge.style.display = 'flex';
    }
}

function setupHomeEventListeners() {
    // Upload artefact button
    const uploadBtn = document.getElementById('uploadArteBtn');
    if(uploadBtn) {
        uploadBtn.addEventListener('click', openArtefactModal);
    }
    
    // Image upload setup
    const imageInput = document.getElementById('imageInput');
    const uploadArea = document.getElementById('uploadArea');
    const confirmBtn = document.getElementById('confirmUpload');
    
    if(uploadArea && imageInput) {
        uploadArea.addEventListener('click', () => imageInput.click());
        
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 5 * 1024 * 1024) { // 5MB limit
                    alert('Ukuran file maksimal 5MB');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                    validateUploadForm();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Rant button
    const rantBtn = document.getElementById('rantBtn');
    if(rantBtn) {
        rantBtn.addEventListener('click', submitRant);
    }
    
    // Bottom navigation
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            switchTab(target);
        });
    });
}

// ===== DATA MANAGEMENT =====
function loadUserData() {
    if(!currentUser) return;
    
    const dataKey = `nope_data_${currentUser.username}`;
    const data = JSON.parse(localStorage.getItem(dataKey) || '{"artefacts":[],"rants":[]}');
    
    allArtefaks = data.artefacts || [];
    allRants = data.rants || [];
    
    // Update stats
    if(currentUser.stats) {
        currentUser.stats.totalRants = allRants.length;
        currentUser.stats.totalArtefaks = allArtefaks.length;
        
        // Update streak
        updateStreak();
        
        // Save updated user data
        const userKey = `nope_user_${currentUser.username}`;
        localStorage.setItem(userKey, JSON.stringify(currentUser));
    }
}

function updateStreak() {
    if(!currentUser?.stats) return;
    
    const lastActive = currentUser.stats.lastActive ? new Date(currentUser.stats.lastActive) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if(lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
        
        if(diffDays === 1) {
            // Consecutive day
            currentUser.stats.streak += 1;
        } else if(diffDays > 1) {
            // Streak broken
            currentUser.stats.streak = 1;
        } else if(diffDays === 0 && currentUser.stats.streak === 0) {
            // First time today
            currentUser.stats.streak = 1;
        }
    } else {
        // First time active
        currentUser.stats.streak = 1;
    }
    
    currentUser.stats.lastActive = new Date().toISOString();
    
    // Update UI
    const streakBadge = document.getElementById('streakBadge');
    if(streakBadge) {
        streakBadge.textContent = `🔥 ${currentUser.stats.streak}`;
        streakBadge.style.display = 'flex';
    }
}

// ===== ARTEFAK SYSTEM =====
function loadArtefaks() {
    if(!currentUser || allArtefaks.length === 0) {
        updateArtefactGrid([]);
        return;
    }
    
    // Display latest artefact
    const latestArte = allArtefaks[allArtefaks.length - 1];
    const arteContainer = document.getElementById('latestArtefak');
    
    if(arteContainer) {
        if(latestArte) {
            arteContainer.innerHTML = `
                <img src="${latestArte.image}" alt="Artefak">
                <div class="caption-overlay">${latestArte.caption}</div>
            `;
            
            // Update reactions
            updateReactionCounts(latestArte.reactions || { '🤝': 0, '😢': 0, '🔥': 0 });
        }
    }
    
    // Update grid
    updateArtefactGrid(allArtefaks);
}

function updateArtefactGrid(artefaks) {
    const grid = document.getElementById('artefakGrid');
    if(!grid) return;
    
    // Take last 6 artefacts
    const recentArtefaks = artefaks.slice(-6).reverse();
    
    if(recentArtefaks.length === 0) {
        grid.innerHTML = `
            <div class="grid-empty">
                <p>Artefak kamu akan muncul di sini</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = recentArtefaks.map(arte => `
        <div class="grid-item">
            <img src="${arte.image}" alt="Artefak">
            <div class="caption-overlay">${arte.caption}</div>
        </div>
    `).join('');
    
    // Add empty slots if less than 6
    for(let i = recentArtefaks.length; i < 6; i++) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'grid-item empty-grid';
        emptyItem.innerHTML = `<div class="empty-sign">+</div>`;
        grid.appendChild(emptyItem);
    }
}

function openArtefactModal() {
    // Check 30-day rule
    if(currentUser?.lastArtefakUpload) {
        const lastUpload = new Date(currentUser.lastArtefakUpload);
        const now = new Date();
        const diffTime = now - lastUpload;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if(diffDays < 30) {
            alert(`Kamu bisa upload artefak lagi dalam ${30 - diffDays} hari`);
            return;
        }
    }
    
    document.getElementById('arteModal').style.display = 'flex';
}

function validateCaption() {
    const captionInput = document.getElementById('arteCaption');
    const captionError = document.getElementById('captionError');
    const confirmBtn = document.getElementById('confirmUpload');
    
    if(!captionInput || !confirmBtn) return;
    
    const wordCount = captionInput.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if(wordCount === 4) {
        captionError.style.display = 'none';
        validateUploadForm();
    } else {
        captionError.style.display = 'block';
        confirmBtn.disabled = true;
    }
}

function validateUploadForm() {
    const imageInput = document.getElementById('imageInput');
    const captionInput = document.getElementById('arteCaption');
    const confirmBtn = document.getElementById('confirmUpload');
    
    if(!imageInput || !captionInput || !confirmBtn) return;
    
    const hasImage = imageInput.files.length > 0;
    const wordCount = captionInput.value.trim().split(/\s+/).filter(word => word.length > 0).length;
    const hasValidCaption = wordCount === 4;
    
    confirmBtn.disabled = !(hasImage && hasValidCaption);
}

function uploadArtefak() {
    const imageInput = document.getElementById('imageInput');
    const captionInput = document.getElementById('arteCaption');
    
    if(!imageInput || !captionInput) return;
    
    const file = imageInput.files[0];
    const caption = captionInput.value.trim();
    const wordCount = caption.split(/\s+/).filter(word => word.length > 0).length;
    
    if(!file) {
        alert('Pilih foto terlebih dahulu');
        return;
    }
    
    if(wordCount !== 4) {
        alert('Caption harus tepat 4 kata');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        // Create artefact object
        const artefact = {
            id: 'arte_' + Date.now(),
            image: event.target.result,
            caption: caption,
            reactions: { '🤝': 0, '😢': 0, '🔥': 0 },
            date: new Date().toISOString()
        };
        
        // Save to data
        allArtefaks.push(artefact);
        saveUserData();
        
        // Update user last upload
        if(currentUser) {
            currentUser.lastArtefakUpload = new Date().toISOString();
            const userKey = `nope_user_${currentUser.username}`;
            localStorage.setItem(userKey, JSON.stringify(currentUser));
        }
        
        // Update UI
        closeModal();
        loadArtefaks();
        updateUploadTimer();
        
        alert('Artefak berhasil diunggah!');
    };
    
    reader.readAsDataURL(file);
}

function updateReactionCounts(reactions) {
    document.getElementById('countGueJuga').textContent = reactions['🤝'] || 0;
    document.getElementById('countNangis').textContent = reactions['😢'] || 0;
    document.getElementById('countApi').textContent = reactions['🔥'] || 0;
}

function reactArtefak(emoji) {
    if(allArtefaks.length === 0) return;
    
    const latestArte = allArtefaks[allArtefaks.length - 1];
    if(!latestArte.reactions) {
        latestArte.reactions = { '🤝': 0, '😢': 0, '🔥': 0 };
    }
    
    latestArte.reactions[emoji] = (latestArte.reactions[emoji] || 0) + 1;
    
    // Save data
    saveUserData();
    
    // Update UI
    updateReactionCounts(latestArte.reactions);
    
    // Animation
    const emojiBtn = event.target.closest('.emoji-btn');
    if(emojiBtn) {
        emojiBtn.style.transform = 'scale(1.1)';
        setTimeout(() => { emojiBtn.style.transform = 'scale(1)'; }, 200);
    }
}

function updateUploadTimer() {
    const daysLeftEl = document.getElementById('daysLeft');
    const statusEl = document.getElementById('uploadStatus');
    
    if(!currentUser?.lastArtefakUpload || !daysLeftEl || !statusEl) {
        daysLeftEl.textContent = '30';
        return;
    }
    
    const lastUpload = new Date(currentUser.lastArtefakUpload);
    const now = new Date();
    const diffTime = now - lastUpload;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 30 - diffDays);
    
    daysLeftEl.textContent = daysLeft;
    
    // Update status color
    if(daysLeft === 0) {
        statusEl.style.background = 'rgba(0, 212, 255, 0.2)';
        statusEl.innerHTML = '<span class="status-icon">✨</span>Siap upload!';
    } else if(daysLeft <= 7) {
        statusEl.style.background = 'rgba(255, 107, 139, 0.2)';
    } else {
        statusEl.style.background = 'rgba(0, 212, 255, 0.1)';
    }
}

// ===== RANT SYSTEM =====
function updateCharCount(textarea) {
    const count = textarea.value.length;
    const counter = document.getElementById('charCount');
    const btn = document.getElementById('rantBtn');
    
    if(counter) counter.textContent = count;
    
    // Update button color based on length
    if(btn) {
        if(count > 50) {
            btn.style.background = 'linear-gradient(90deg, #ff6b8b, #ff8e53)';
        } else if(count > 10) {
            btn.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
        } else {
            btn.style.background = 'linear-gradient(90deg, #5d6afb, #764ba2)';
        }
    }
}

function submitRant() {
    const rantInput = document.getElementById('rantInput');
    if(!rantInput) return;
    
    const text = rantInput.value.trim();
    
    if(text.length < 10) {
        alert('Rant minimal 10 karakter');
        return;
    }
    
    if(text.length > 300) {
        alert('Rant maksimal 300 karakter');
        return;
    }
    
    // Auto-categorize
    const category = autoCategorizeRant(text);
    
    // Create rant object
    const rant = {
        id: 'rant_' + Date.now(),
        text: text,
        category: category,
        date: new Date().toISOString(),
        wordCount: text.split(/\s+/).length
    };
    
    // Save to data
    allRants.push(rant);
    saveUserData();
    
    // Update stats
    if(currentUser?.stats) {
        currentUser.stats.totalRants = allRants.length;
        const userKey = `nope_user_${currentUser.username}`;
        localStorage.setItem(userKey, JSON.stringify(currentUser));
    }
    
    // Clear input
    rantInput.value = '';
    document.getElementById('charCount').textContent = '0';
    
    // Update UI
    loadRants();
    
    // Animation feedback
    const rantBtn = document.getElementById('rantBtn');
    if(rantBtn) {
        rantBtn.style.transform = 'scale(1.1)';
        setTimeout(() => { rantBtn.style.transform = 'scale(1)'; }, 200);
    }
    
    alert('Rant telah disimpan!');
}

function autoCategorizeRant(text) {
    const lowerText = text.toLowerCase();
    
    // Keywords for each category
    const popCultureWords = ['film', 'musik', 'meme', 'viral', 'trend', 'youtube', 'tiktok', 'netflix', 'lagu', 'series', 'game'];
    const personalPainWords = ['cemas', 'trauma', 'healing', 'self-care', 'sendiri', 'sedih', 'galau', 'lelah', 'capek', 'bosan', 'stress'];
    const socialSicknessWords = ['toxic', 'fomo', 'lonely', 'kesepian', 'hubungan', 'teman', 'social', 'media', 'dihindari', 'dibenci'];
    
    let popCultureCount = 0;
    let personalPainCount = 0;
    let socialSicknessCount = 0;
    
    popCultureWords.forEach(word => {
        if(lowerText.includes(word)) popCultureCount++;
    });
    
    personalPainWords.forEach(word => {
        if(lowerText.includes(word)) personalPainCount++;
    });
    
    socialSicknessWords.forEach(word => {
        if(lowerText.includes(word)) socialSicknessCount++;
    });
    
    // Return highest scoring category
    const scores = [
        {category: 'PopCulture', score: popCultureCount},
        {category: 'PersonalPain', score: personalPainCount},
        {category: 'SocialSickness', score: socialSicknessCount}
    ];
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].category : 'PersonalPain';
}

function loadRants() {
    const journalPreview = document.getElementById('journalPreview');
    if(!journalPreview) return;
    
    if(allRants.length === 0) {
        journalPreview.innerHTML = `
            <div class="journal-empty">
                <p>Mulai tulis rant pertama kamu...</p>
            </div>
        `;
        return;
    }
    
    // Get 3 most recent rants
    const recentRants = allRants.slice(-3).reverse();
    
    journalPreview.innerHTML = recentRants.map(rant => `
        <div class="journal-entry">
            <p>${rant.text.substring(0, 100)}${rant.text.length > 100 ? '...' : ''}</p>
            <div class="entry-meta">
                <span class="entry-category">#${rant.category}</span>
                <span class="entry-date">${formatDate(rant.date)}</span>
            </div>
        </div>
    `).join('');
}

function viewAllJournal() {
    const journalFull = document.getElementById('journalFull');
    if(!journalFull) return;
    
    if(allRants.length === 0) {
        journalFull.innerHTML = '<p class="empty-state">Belum ada rant</p>';
    } else {
        // Show all rants sorted by date (newest first)
        const sortedRants = [...allRants].reverse();
        
        journalFull.innerHTML = sortedRants.map(rant => `
            <div class="journal-entry">
                <p>${rant.text}</p>
                <div class="entry-meta">
                    <span class="entry-category">#${rant.category}</span>
                    <span class="entry-date">${formatDate(rant.date)}</span>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('journalModal').style.display = 'flex';
}

// ===== FEED PAGES =====
function initFeedPage(feedType) {
    if(!currentUser) {
        showPage('login');
        return;
    }
    
    // Filter rants by category
    const filteredRants = allRants.filter(rant => 
        rant.category.toLowerCase() === feedType.toLowerCase()
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Update stats
    const statsEl = document.getElementById(feedType + 'Stats');
    if(statsEl) {
        statsEl.textContent = `${filteredRants.length} rant`;
    }
    
    // Display rants
    const feedContent = document.getElementById(feedType + 'Content');
    if(feedContent) {
        if(filteredRants.length === 0) {
            feedContent.innerHTML = `
                <div class="feed-empty">
                    <div class="empty-icon">${getFeedIcon(feedType)}</div>
                    <h3>Rant ${feedType}</h3>
                    <p>${getFeedDescription(feedType)}</p>
                    <div class="feed-stats">0 rant</div>
                </div>
            `;
        } else {
            feedContent.innerHTML = filteredRants.map(rant => `
                <div class="feed-item" style="background: var(--bg-card); padding: 20px; border-radius: var(--border-radius); margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: var(--text-secondary);">
                        <span>#${rant.category}</span>
                        <span>${formatDate(rant.date)}</span>
                    </div>
                    <div style="color: var(--text-primary); line-height: 1.5; margin-bottom: 15px;">
                        ${rant.text}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary);">
                        <span>${rant.wordCount} kata</span>
                        <button onclick="copyToClipboard('${rant.text.replace(/'/g, "\\'")}')" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary); padding: 4px 8px; border-radius: 10px; font-size: 10px; cursor: pointer;">
                            📋 Salin
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function getFeedIcon(feedType) {
    const icons = {
        popculture: '🎬',
        personalpain: '💔',
        socialsickness: '🌪️'
    };
    return icons[feedType] || '📝';
}

function getFeedDescription(feedType) {
    const descriptions = {
        popculture: 'Semua rant tentang film, musik, meme, dan tren viral akan muncul di sini.',
        personalpain: 'Semua rant tentang kecemasan, trauma, healing, dan self-care akan muncul di sini.',
        socialsickness: 'Semua rant tentang toxic relationship, FOMO, loneliness akan muncul di sini.'
    };
    return descriptions[feedType] || 'Rant feed';
}

// ===== UTILITY FUNCTIONS =====
function switchTab(tabName) {
    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('nav-active');
    });
    
    const activeNav = document.querySelector(`[data-target="${tabName}"]`);
    if(activeNav) {
        activeNav.classList.add('nav-active');
    }
    
    // Show the corresponding page
    if(tabName === 'home') {
        showPage('home');
    } else {
        showPage(tabName);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if(diffMins < 60) return `${diffMins}m yang lalu`;
    if(diffHours < 24) return `${diffHours}j yang lalu`;
    if(diffDays < 7) return `${diffDays}h yang lalu`;
    
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short' 
    });
}

function closeModal() {
    document.getElementById('arteModal').style.display = 'none';
    
    // Reset form
    const imageInput = document.getElementById('imageInput');
    const captionInput = document.getElementById('arteCaption');
    const preview = document.getElementById('imagePreview');
    const confirmBtn = document.getElementById('confirmUpload');
    
    if(imageInput) imageInput.value = '';
    if(captionInput) captionInput.value = '';
    if(preview) {
        preview.innerHTML = `
            <div class="upload-placeholder">
                <span class="upload-icon">📷</span>
                <p>Tap untuk pilih foto</p>
            </div>
        `;
    }
    if(confirmBtn) confirmBtn.disabled = true;
}

function closeJournalModal() {
    document.getElementById('journalModal').style.display = 'none';
}

function playSqueak() {
    // Create audio context for squeak sound
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
        // Button animation
        const btn = event.target.closest('.btn-squeak');
        if(btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);
        }
    } catch(e) {
        console.log('Audio error:', e);
        // Fallback: just animate the button
        const btn = event.target.closest('.btn-squeak');
        if(btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);
        }
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('Teks berhasil disalin!'))
        .catch(err => console.error('Copy failed:', err));
}

function saveUserData() {
    if(!currentUser) return;
    
    const dataKey = `nope_data_${currentUser.username}`;
    localStorage.setItem(dataKey, JSON.stringify({
        artefacts: allArtefaks,
        rants: allRants,
        settings: {}
    }));
}

// ===== PWA INSTALL =====
function installPWA() {
    if(deferredPrompt) {
        deferredPrompt.prompt();
        
        deferredPrompt.userChoice.then((choiceResult) => {
            if(choiceResult.outcome === 'accepted') {
                console.log('User installed PWA');
                hidePwaPrompt();
            }
            deferredPrompt = null;
        });
    }
}

function hidePwaPrompt() {
    const prompt = document.getElementById('pwaPrompt');
    if(prompt) prompt.style.display = 'none';
}

// ===== INITIALIZATION =====
function initApp() {
    // Check for existing session
    if(checkExistingSession()) {
        // Already logged in
        return;
    }
    
    // Check URL hash for page
    const hash = window.location.hash.substring(1);
    if(hash && pages[hash]) {
        showPage(hash);
    } else {
        showPage('login');
    }
    
    // Setup PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show prompt after 5 seconds
        setTimeout(() => {
            const prompt = document.getElementById('pwaPrompt');
            if(prompt) {
                prompt.style.display = 'block';
            }
        }, 5000);
    });
    
    // Register service worker for PWA
    if('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .catch(err => console.log('SW registration failed:', err));
        });
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
