/**
 * PromptForge License Generator - Admin PWA
 * © 2026 Muhammad Anggi
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    PASSWORD: '180201',
    SECRET_KEY: 'PromptForge-2026-MAnggi-Secret',
    STORAGE_KEYS: {
        AUTHENTICATED: 'pf_admin_auth',
        HISTORY: 'pf_license_history'
    }
};

// ========================================
// Utility Functions
// ========================================
function generateMachineHash(machineId) {
    let hash = 0;
    const combined = machineId + CONFIG.SECRET_KEY;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function generateLicenseKey(machineId, expiryDays) {
    const timestamp = Date.now();
    const hash = generateMachineHash(machineId);

    // Create deterministic segments
    const segment1 = (hash % 10000).toString().padStart(4, '0');
    const segment2 = ((hash >> 4) % 10000).toString().padStart(4, '0');
    const segment3 = ((hash >> 8) % 10000).toString().padStart(4, '0');
    const segment4 = (expiryDays === 0 ? 9999 : expiryDays).toString().padStart(4, '0');
    const segment5 = ((timestamp % 10000) ^ (hash % 10000)).toString().padStart(4, '0');

    return `PF-${segment1}-${segment2}-${segment3}-${segment4}-${segment5}`;
}

function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    }
}

// ========================================
// Authentication
// ========================================
function checkAuth() {
    const isAuth = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTHENTICATED) === 'true';
    if (isAuth) {
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    }
    return isAuth;
}

function authenticate(password) {
    if (password === CONFIG.PASSWORD) {
        sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTHENTICATED, 'true');
        document.getElementById('lockScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        showToast('🔓 Welcome, Admin!', 'success');
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTHENTICATED);
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('lockScreen').style.display = 'flex';
    document.getElementById('passwordInput').value = '';
    document.getElementById('lockError').textContent = '';
}

// ========================================
// History Management
// ========================================
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY) || '[]');
    } catch {
        return [];
    }
}

function saveHistory(item) {
    const history = getHistory();
    history.unshift(item);
    // Keep only last 50 items
    const trimmed = history.slice(0, 50);
    localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
}

function clearHistory() {
    if (confirm('Clear all license history?')) {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
        renderHistory();
        showToast('History cleared', 'success');
    }
}

function renderHistory() {
    const container = document.getElementById('historyList');
    const history = getHistory();

    if (history.length === 0) {
        container.innerHTML = '<p class="empty-history">No licenses generated yet</p>';
        return;
    }

    container.innerHTML = history.map((item, index) => `
    <div class="history-item" data-index="${index}">
      <div class="history-item-key">${item.key}</div>
      <div class="history-item-info">
        <span>${item.customer || 'Anonymous'}</span>
        <span>${item.createdDate}</span>
      </div>
    </div>
  `).join('');

    // Add click handlers
    container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const index = parseInt(el.dataset.index);
            const item = history[index];
            displayLicense(item);
        });
    });
}

// ========================================
// License Generation
// ========================================
function generateAndDisplay() {
    const machineId = document.getElementById('machineIdInput').value.trim();
    const customerName = document.getElementById('customerName').value.trim();
    const expiryDays = parseInt(document.getElementById('expiryDays').value);

    if (!machineId) {
        showToast('Please enter Machine ID', 'error');
        document.getElementById('machineIdInput').focus();
        return;
    }

    // Generate key
    const licenseKey = generateLicenseKey(machineId, expiryDays);
    const now = new Date();
    const expiry = expiryDays === 0
        ? 'Lifetime'
        : formatDate(new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000));

    const licenseData = {
        key: licenseKey,
        machineId: machineId,
        customer: customerName || 'Anonymous',
        createdDate: formatDate(now),
        expiryDate: expiry,
        expiryDays: expiryDays
    };

    // Save to history
    saveHistory(licenseData);
    renderHistory();

    // Display result
    displayLicense(licenseData);

    showToast('✨ License generated!', 'success');
}

function displayLicense(data) {
    document.getElementById('generatedKey').textContent = data.key;
    document.getElementById('infoMachineId').textContent = data.machineId;
    document.getElementById('infoCustomer').textContent = data.customer;
    document.getElementById('infoCreated').textContent = data.createdDate;
    document.getElementById('infoExpires').textContent = data.expiryDate;

    document.getElementById('outputSection').style.display = 'block';
    document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth' });
}

function getShareMessage() {
    const key = document.getElementById('generatedKey').textContent;
    const customer = document.getElementById('infoCustomer').textContent;
    const expires = document.getElementById('infoExpires').textContent;

    return `🔐 *PromptForge License*

Hi ${customer}! 👋

Your license key is ready:
\`${key}\`

📅 Valid until: ${expires}

*How to activate:*
1. Open PromptForge extension
2. Copy your Machine ID
3. Enter the license key above
4. Click "Activate License"

Thank you for using PromptForge! ✨

© Muhammad Anggi`;
}

// ========================================
// Share Functions
// ========================================
function shareWhatsApp() {
    const message = getShareMessage();
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function shareTelegram() {
    const message = getShareMessage();
    const url = `https://t.me/share/url?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

async function copyAll() {
    const message = getShareMessage();
    await copyToClipboard(message);
    showToast('📋 Copied to clipboard!', 'success');
}

// ========================================
// PWA Install Prompt
// ========================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
});

function showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
    <span>📲 Install App</span>
    <button class="btn-install" id="btnInstall">Install</button>
    <button class="btn-dismiss" id="btnDismiss">✕</button>
  `;
    document.body.appendChild(prompt);

    document.getElementById('btnInstall').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('🎉 App installed!', 'success');
            }
            deferredPrompt = null;
        }
        prompt.remove();
    });

    document.getElementById('btnDismiss').addEventListener('click', () => {
        prompt.remove();
    });
}

// ========================================
// Service Worker Registration
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();

    // Render history
    renderHistory();

    // Password input - Enter key
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btnUnlock').click();
        }
    });

    // Unlock button
    document.getElementById('btnUnlock').addEventListener('click', () => {
        const password = document.getElementById('passwordInput').value;
        if (!authenticate(password)) {
            document.getElementById('lockError').textContent = '❌ Wrong password';
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        }
    });

    // Show/hide password
    document.getElementById('btnShowPassword').addEventListener('click', () => {
        const input = document.getElementById('passwordInput');
        const btn = document.getElementById('btnShowPassword');
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
        } else {
            input.type = 'password';
            btn.textContent = '👁️';
        }
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', logout);

    // Paste Machine ID
    document.getElementById('btnPasteMachineId').addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            document.getElementById('machineIdInput').value = text;
            showToast('📋 Pasted!', 'success');
        } catch (err) {
            showToast('Cannot access clipboard', 'error');
        }
    });

    // Generate
    document.getElementById('btnGenerate').addEventListener('click', generateAndDisplay);

    // Copy key
    document.getElementById('btnCopyKey').addEventListener('click', async () => {
        const key = document.getElementById('generatedKey').textContent;
        await copyToClipboard(key);
        showToast('📋 Key copied!', 'success');
    });

    // Share buttons
    document.getElementById('btnShareWhatsApp').addEventListener('click', shareWhatsApp);
    document.getElementById('btnShareTelegram').addEventListener('click', shareTelegram);
    document.getElementById('btnCopyAll').addEventListener('click', copyAll);

    // Clear history
    document.getElementById('btnClearHistory').addEventListener('click', clearHistory);
});
