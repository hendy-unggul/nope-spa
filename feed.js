// feed.js - Handle feed page functionality

let currentCategory = 'PopCulture';
let allRants = [];

// Initialize feed
function initFeed() {
    // Check auth
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    if (!currentUser || !currentUser.username) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update UI
    document.getElementById('usernameDisplay').textContent = `@${currentUser.username}`;
    
    // Get category from URL hash
    const hash = window.location.hash.substring(1);
    if (hash && ['PopCulture', 'PersonalPain', 'SocialSickness', 'explore'].includes(hash)) {
        currentCategory = hash === 'explore' ? 'PopCulture' : hash;
    }
    
    // Update UI for category
    updateCategoryUI();
    
    // Load and display rants
    loadFeed();
}

function updateCategoryUI() {
    // Update title
    document.getElementById('feedTitle').textContent = currentCategory;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === currentCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update page title
    document.title = `iamME · ${currentCategory}`;
}

function filterFeed(category) {
    currentCategory = category;
    window.location.hash = category;
    updateCategoryUI();
    displayRants();
}

function goBack() {
    window.history.back();
    // Or redirect to home
    // window.location.href = 'home.html';
}

function loadFeed() {
    // Get all rants from localStorage
    const rants = JSON.parse(localStorage.getItem('nope_rants') || '[]');
    
    // Filter by current user (optional - for multi-user support)
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    const userRants = rants; // In real app, filter by user
    
    // For demo, we'll use all rants
    allRants = userRants;
    
    // Display rants
    displayRants();
}

function displayRants() {
    const feedContent = document.getElementById('feedContent');
    
    // Filter rants by current category
    const filteredRants = allRants.filter(rant => 
        rant.category === currentCategory
    ).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
    
    if (filteredRants.length === 0) {
        feedContent.innerHTML = `
            <div class="empty-feed">
                <div class="empty-icon">📭</div>
                <h3>Belum ada rant di ${currentCategory}</h3>
                <p>Mulai tulis rant pertama kamu di halaman Jejak</p>
                <button class="btn-primary" onclick="window.location.href='home.html'">
                    ← Kembali ke Jejak
                </button>
            </div>
        `;
        return;
    }
    
    // Create feed items
    feedContent.innerHTML = filteredRants.map(rant => `
        <div class="feed-item">
            <div class="feed-item-header">
                <div class="feed-category-badge ${rant.category.toLowerCase()}">
                    #${rant.category}
                </div>
                <div class="feed-date">
                    ${formatFeedDate(rant.date)}
                </div>
            </div>
            <div class="feed-item-content">
                ${rant.text}
            </div>
            <div class="feed-item-footer">
                <div class="feed-stats">
                    <span class="word-count">${rant.wordCount} kata</span>
                </div>
                <div class="feed-actions">
                    <button class="feed-action-btn" onclick="copyRant('${rant.id}')">
                        📋 Salin
                    </button>
                    <button class="feed-action-btn" onclick="shareRant('${rant.id}')">
                        ↗️ Bagikan
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function formatFeedDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffHours < 24) {
        return `${diffHours} jam yang lalu`;
    } else if (diffDays < 7) {
        return `${diffDays} hari yang lalu`;
    }
    
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function copyRant(rantId) {
    const rant = allRants.find(r => r.id === rantId);
    if (!rant) return;
    
    navigator.clipboard.writeText(rant.text)
        .then(() => {
            alert('Rant berhasil disalin ke clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
        });
}

function shareRant(rantId) {
    const rant = allRants.find(r => r.id === rantId);
    if (!rant) return;
    
    if (navigator.share) {
        navigator.share({
            title: `Rant dari iamME - ${rant.category}`,
            text: rant.text.substring(0, 100) + '...',
            url: window.location.href
        }).catch(err => console.log('Sharing cancelled:', err));
    } else {
        // Fallback: copy to clipboard
        copyRant(rantId);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initFeed);
