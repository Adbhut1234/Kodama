/**
 * LUMINA AI — Renderer
 * Refined for Consolidated Stitch Integration.
 */

let conversationHistory = [];
let isProcessing = false;
let userName = 'User';
let currentTheme = 'dark';
let agentsOpen = false;
let currentChatId = null;

// Generate a unique ID (timestamp based)
function generateId() { return 'chat_' + Date.now(); }

async function saveCurrentChat() {
    if (!currentChatId || conversationHistory.length === 0) return;
    
    // Generate a title if not present
    let title = "UNTITLED_THREAD";
    if (conversationHistory.length > 0) {
        const firstMsg = conversationHistory.find(m => m.role === 'user');
        if (firstMsg) {
            title = firstMsg.content.substring(0, 30).toUpperCase() + "...";
        }
    }

    const chatData = {
        id: currentChatId,
        title: title,
        messages: conversationHistory,
        timestamp: Date.now()
    };

    await window.kodama.saveChat(chatData);
    loadHistoryList();
}

async function loadHistoryList() {
    const list = document.getElementById('history-list');
    if (!list) return;

    const result = await window.kodama.getHistory();
    const history = result.history || [];

    if (history.length === 0) {
        list.innerHTML = `<div class="px-4 py-3 text-[9px] opacity-20 font-mono italic">NO_ARCHIVES_FOUND</div>`;
        return;
    }

    list.innerHTML = history.map(chat => {
        const isActive = chat.id === currentChatId;
        const activeClass = isActive ? 'bg-primary/10 border-primary/20 text-primary opacity-100 shadow-sm' : 'opacity-40 hover:opacity-100 hover:bg-surface-variant';
        
        return `
            <div onclick="openHistoryChat('${chat.id}')" 
                 class="group flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all border border-transparent ${activeClass} active:scale-[0.98]">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="material-symbols-outlined text-[16px] shrink-0 ${isActive ? 'text-primary' : 'opacity-30 group-hover:opacity-80'}">chat_bubble</span>
                    <div class="flex flex-col min-w-0 overflow-hidden">
                        <span class="text-[10px] font-bold tracking-tight truncate uppercase">${chat.title}</span>
                        <span class="text-[7.5px] font-mono opacity-40 uppercase tracking-widest">${new Date(chat.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
                <button onclick="deleteChat('${chat.id}', event)" 
                        class="opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:text-red-500 transition-all p-1">
                    <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>
        `;
    }).join('');
}

async function deleteChat(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('PERMANENTLY PURGE THIS NEURAL THREAD?')) return;
    
    await window.kodama.deleteChat(id);
    
    // If the deleted chat was active, neutralize it to prevent re-saving
    if (currentChatId === id) {
        conversationHistory = [];
        currentChatId = null;
        newChat(); 
    } else {
        loadHistoryList();
    }
}

async function openHistoryChat(id) {
    if (isProcessing) return;
    
    // Save current session before switching
    await saveCurrentChat();

    const result = await window.kodama.getHistory();
    const chat = (result.history || []).find(c => c.id === id);
    if (!chat) return;

    currentChatId = chat.id;
    conversationHistory = chat.messages || [];
    
    // Switch UI View Logic
    const messages = document.getElementById('messages');
    const agentView = document.getElementById('agent-view');
    const inputArea = document.querySelector('.p-6.md\\:p-8.z-40');

    if (agentView && !agentView.classList.contains('hidden')) {
        agentView.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => {
            agentView.classList.add('hidden');
            if (messages) messages.classList.remove('hidden');
            if (inputArea) inputArea.classList.remove('hidden');
            setTimeout(() => {
                if (messages) messages.classList.remove('opacity-0', 'translate-y-4');
            }, 10);
        }, 300);
    }
    
    // Clear and Redraw messages
    const container = getMessagesContainer();
    if (container) {
        container.innerHTML = '';
        conversationHistory.forEach(msg => {
            if (msg.role === 'user') addUserMessage(msg.content);
            else if (msg.role === 'assistant') addAIMessage(msg.content);
        });
    }
    
    loadHistoryList();
}

const THINKING_PHRASES = [
    'SYNTHESIZING SPATIAL STRUCTURES...',
    'PROCESSING NEURAL PATHWAYS...',
    'ANALYZING CONTEXT PATTERNS...',
    'GENERATING RESPONSE MATRIX...',
    'COMPILING KNOWLEDGE FRAGMENTS...',
];

async function checkNeuralLink() {
    const statusText = document.getElementById('neural-status-text');
    const statusDot = document.getElementById('neural-status-dot');
    if (!statusText || !statusDot) return;

    try {
        const result = await window.kodama.checkStatus();
        if (result.status === 'online') {
            statusText.textContent = 'NODE_ACTIVE';
            statusDot.className = 'w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_8px_var(--primary-container)]';
        } else {
            statusText.textContent = '...';
            statusDot.className = 'w-1.5 h-1.5 rounded-full bg-outline opacity-40';
        }
    } catch (e) {
        statusText.textContent = '...';
        statusDot.className = 'w-1.5 h-1.5 rounded-full bg-outline opacity-40';
    }
}

// ── Screens ──────────────────────────────────────────────────────────────────
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${name}`);
    if (target) {
        target.classList.add('active');
        if (name === 'name') setTimeout(() => document.getElementById('name-input')?.focus(), 400);
        if (name === 'chat') setTimeout(() => document.getElementById('chat-input')?.focus(), 400);
    }
}
async function completeSetup() {
    const input = document.getElementById('name-input');
    const name = input ? input.value.trim() : '';
    if (name.length < 3) return;

    userName = name;
    
    const config = {
        setup_complete: true,
        user_name: userName,
        theme: currentTheme
    };

    const result = await window.kodama.saveConfig(config);
    if (result.success) {
        updateUserDisplay(userName);
        showScreen('chat');
        currentChatId = generateId();
        addWelcomeMessage();
        loadHistoryList();
    } else {
        alert('SETUP_FAILURE: ' + result.error);
    }
}

function selectTheme(t) {
    currentTheme = t;
    localStorage.setItem('kodama_theme', t); // Quick-access for pre-init
    // Apply to HTML
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    // Sync Logos
    updateLogos();

    // Update Setup UI
    ['dark', 'light'].forEach(mode => {
        const card = document.getElementById(`card-${mode}`);
        if (card) {
            card.classList.remove('inner-glow-active');
            const icon = card.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = 'radio_button_unchecked';
        }
    });

    const activeCard = document.getElementById(`card-${t}`);
    if (activeCard) {
        activeCard.classList.add('inner-glow-active');
        const icon = activeCard.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'check_circle';
    }
}

function updateLogos() {
    const logos = document.querySelectorAll('.kodama-logo');
    const logoSrc = currentTheme === 'dark' ? 'assets/logo_dark.png' : 'assets/logo.png';
    logos.forEach(img => {
        img.src = logoSrc;
    });
}

async function completeSetup() {
    const input = document.getElementById('name-input');
    userName = input.value.trim();

    if (userName.length < 3) {
        // Visual Feedback: Min Length Validation Error (3 chars)
        const container = input.parentElement;
        container.classList.add('border-red-500/50');
        container.classList.add('animate-shake');

        // Remove error after a delay
        setTimeout(() => {
            container.classList.remove('border-red-500/50');
            container.classList.remove('animate-shake');
        }, 600);

        input.focus();
        return;
    }

    await window.kodama.saveConfig({
        user_name: userName,
        setup_complete: true,
        theme: currentTheme
    });
    updateUserDisplay(userName);
    showScreen('chat');
    addWelcomeMessage();
}

function updateUserDisplay(name) {
    const el = document.getElementById('user-display-name');
    if (el) el.textContent = name.toUpperCase();
}

// ── Chat Messages (Ultra-Premium markup) ────────────────────────────────────

function getMessagesContainer() {
    return document.getElementById('messages');
}

function scrollToBottom() {
    const c = getMessagesContainer();
    if (c) c.scrollTop = c.scrollHeight;
}

function addWelcomeMessage() {
    addAIMessage(
        'Kernel expansion complete. Synthesis Console initialized at priority level A. I am ready to facilitate architectural drafting and high-density data modeling.',
        ['Status: Ready', 'Thread: Synchronized']
    );
}

function addAIMessage(text, badges = null, action = null) {
    const badgesHTML = badges
        ? `<div class="mt-4 flex flex-wrap gap-2">${badges.map(b =>
            `<span class="inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-fixed font-mono text-[9px] font-bold tracking-[0.1em] uppercase shadow-[0_0_15px_rgba(0,219,243,0.1)]">${escapeHTML(b)}</span>`
        ).join('')}</div>`
        : '';

    const actionHTML = action
        ? `<div class="mt-6 flex">
            <button onclick="window.kodama.openFile('${action.path.replace(/\\/g, '\\\\')}')" class="px-6 py-3 rounded-2xl bg-primary text-on-primary-fixed font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:translate-x-1 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
                <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                ${escapeHTML(action.label)}
            </button>
           </div>`
        : '';

    const html = `
    <div class="flex gap-6 max-w-4xl self-start group msg-animate">
        <div class="w-11 h-11 rounded-2xl bg-primary-container border border-primary/20 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden transition-transform group-hover:scale-105">
            <div class="absolute inset-0 bg-white/10 animate-pulse"></div>
            <span class="material-symbols-outlined text-on-primary-fixed relative z-10 text-[22px]">auto_awesome</span>
        </div>
        <div class="p-6 rounded-3xl rounded-tl-md bg-surface border border-outline shadow-2xl text-on-surface relative overflow-hidden transition-all hover:border-accent-blue/30">
            <div class="absolute top-0 left-0 w-[40px] h-[3px] bg-accent-blue opacity-80"></div>
            <p class="leading-relaxed tracking-tight text-[15px] whitespace-pre-wrap">${escapeHTML(text)}</p>
            ${badgesHTML}
            ${actionHTML}
        </div>
    </div>`;

    getMessagesContainer()?.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function addUserMessage(text) {
    const html = `
    <div class="flex gap-6 max-w-3xl self-end flex-row-reverse group msg-animate">
        <div class="w-11 h-11 rounded-2xl bg-on-background/10 border border-outline flex items-center justify-center shrink-0 shadow-lg group-hover:border-on-surface/20 transition-colors">
            <span class="material-symbols-outlined opacity-40 text-[22px]">person</span>
        </div>
        <div class="p-6 rounded-3xl rounded-tr-md bg-on-background/5 border border-outline shadow-xl text-on-surface backdrop-blur-sm">
            <p class="leading-relaxed tracking-tight text-[15px]">${escapeHTML(text)}</p>
        </div>
    </div>`;

    getMessagesContainer()?.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function addSystemMsg(text) {
    const html = `<div class="opacity-40 text-[10px] font-mono pl-[68px] uppercase tracking-[0.2em] msg-animate mt-2 mb-2">${escapeHTML(text)}</div>`;
    getMessagesContainer()?.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

let thinkingEl = null;

function showThinking() {
    const phrase = THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
    const html = `
    <div id="thinking-indicator" class="flex gap-6 max-w-4xl self-start items-center msg-animate">
        <div class="w-11 h-11 rounded-2xl bg-surface border border-outline flex items-center justify-center shrink-0 relative overflow-hidden">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--primary),transparent_70%)] opacity-10 animate-pulse"></div>
            <span class="material-symbols-outlined text-primary text-[20px] relative z-10 animate-pulse">graphic_eq</span>
        </div>
        <div class="font-mono text-[12px] opacity-40 tracking-[0.1em] animate-pulse uppercase">${phrase}</div>
    </div>`;

    getMessagesContainer()?.insertAdjacentHTML('beforeend', html);
    thinkingEl = document.getElementById('thinking-indicator');
    scrollToBottom();
}

function hideThinking() {
    if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
}

// ── Send ─────────────────────────────────────────────────────────────────────
async function sendMessage() {
    if (isProcessing) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = '';
    addUserMessage(text);
    conversationHistory.push({ role: 'user', content: text });

    isProcessing = true;
    const btn = document.getElementById('send-btn');
    if (btn) btn.disabled = true;
    showThinking();

    try {
        const result = await window.kodama.chat(conversationHistory, text);
        hideThinking();
        if (result.error) {
            addAIMessage(`⚠️ ERROR: ${result.error}`);
        } else if (result.filename) {
            // Handle Autonomous File Synthesis
            const type = result.filename.endsWith('.pptx') ? 'PowerPoint' : 'PDF';
            addAIMessage(
                `✅ ${type} synthesis complete.\n\nResource Manifested at:\n${result.filename}`, 
                [`${type.toUpperCase()}_GEN_SUCCESS`, 'LINK_ESTABLISHED'],
                { label: `Open ${type}`, path: result.filename }
            );
        } else {
            if (result.searched) addSystemMsg('External Knowledge Retrieval Engaged');
            addAIMessage(result.content);
            conversationHistory.push({ role: 'assistant', content: result.content });
            saveCurrentChat(); // Persist after response
        }
    } catch (err) {
        hideThinking();
        addAIMessage(`⚠️ CRITICAL FAILURE: ${err.message}`);
    } finally {
        isProcessing = false;
        if (btn) btn.disabled = false;
        input.focus();
    }
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
async function newChat() {
    // Save current session if active messages exist
    if (conversationHistory.length > 0) {
        await saveCurrentChat();
    }

    const messages = document.getElementById('messages');
    const agentView = document.getElementById('agent-view');
    const inputArea = document.querySelector('.p-6.md\\:p-8.z-40');
    
    // Switch to Chat if in Agent View
    if (agentView && !agentView.classList.contains('hidden')) {
        agentView.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => {
            agentView.classList.add('hidden');
            if (messages) messages.classList.remove('hidden');
            if (inputArea) inputArea.classList.remove('hidden');
            setTimeout(() => {
                if (messages) messages.classList.remove('opacity-0', 'translate-y-4');
            }, 10);
        }, 300);
    }

    currentChatId = generateId();
    const c = getMessagesContainer();
    if (c) c.innerHTML = '';
    conversationHistory = [];
    thinkingEl = null;
    addWelcomeMessage();
    loadHistoryList();
}

let cachedModels = [];
let activeModel = '';

function toggleAgents() {
    const messages = document.getElementById('messages');
    const agentView = document.getElementById('agent-view');
    const inputArea = document.querySelector('.p-6.md\\:p-8.z-40');
    
    if (!messages || !agentView) return;

    // If already in Agent View, just refresh the list
    if (!agentView.classList.contains('hidden')) {
        loadAgents(true);
        return;
    }

    // Smooth transition to Agents Registry
    messages.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => {
        messages.classList.add('hidden');
        if (inputArea) inputArea.classList.add('hidden');
        agentView.classList.remove('hidden');
        setTimeout(() => {
            agentView.classList.remove('opacity-0', 'translate-y-4');
        }, 10);
        loadAgents(cachedModels.length === 0);
    }, 300);
}

async function loadAgents(force = false) {
    const grid = document.getElementById('agent-grid');
    if (!grid) return;

    if (!force && cachedModels.length > 0) {
        renderAgentGrid(cachedModels);
        return;
    }

    grid.innerHTML = `
        <div class="col-span-full py-32 flex flex-col items-center justify-center gap-6">
            <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <div class="flex flex-col items-center gap-1">
                <span class="text-[12px] font-black tracking-[0.6em] uppercase text-primary">Synchronizing_Registry</span>
                <span class="text-[9px] font-mono opacity-80 uppercase tracking-widest text-on-surface/60">Interrogating Neural Kernel...</span>
            </div>
        </div>
    `;

    try {
        const result = await window.kodama.listModels();

        if (result.error) {
            grid.innerHTML = `<div class="col-span-full py-16 text-center text-red-500/60 uppercase font-mono text-[10px] tracking-widest border border-red-500/10 rounded-3xl bg-red-500/5">AUDIT_CRITICAL_FAILURE: ${result.error}</div>`;
            return;
        }

        cachedModels = result.models || [];
        activeModel = result.active_model || '';
        
        if (cachedModels.length === 0) {
             grid.innerHTML = `<div class="col-span-full py-16 text-center opacity-30 uppercase font-mono text-[11px] tracking-[0.4em]">Zero_Nodes_Found_In_Ollama</div>`;
             return;
        }
        renderAgentGrid(cachedModels, activeModel);
    } catch (e) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center text-red-500/60 uppercase font-mono text-[10px] tracking-widest">KODAMA_KERNEL_DISCONNECT_ERR</div>`;
    }
}

async function switchAgent(modelName, event) {
    if (modelName === activeModel) return;
    
    // Show switching status
    const card = event.currentTarget || event.target.closest('.glass-panel');
    const badge = card.querySelector('.rounded-full');
    const originalBadge = badge.innerHTML;
    badge.innerHTML = 'Switching...';
    
    try {
        const result = await window.kodama.switchModel(modelName);
        if (result.success) {
            activeModel = modelName;
            // Smooth transition back to chat
            setTimeout(() => {
                const agentsBtn = document.querySelector('nav a[onclick="toggleAgents()"]');
                if (agentsBtn) toggleAgents();
                // Update status indicator if it exists
                const statusModel = document.querySelector('.status-model');
                if (statusModel) statusModel.textContent = modelName;
            }, 600);
        } else {
            alert(`Neural Switch Failed: ${result.error}`);
            badge.innerHTML = originalBadge;
        }
    } catch (e) {
        alert(`Kernel Disconnect: ${e.message}`);
        badge.innerHTML = originalBadge;
    }
}

function renderAgentGrid(models, activeModelName) {
    const grid = document.getElementById('agent-grid');
    if (!grid || models.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center opacity-30 uppercase font-mono text-[11px] tracking-[0.4em]">Zero_Nodes_Found</div>`;
        return;
    }

    grid.innerHTML = models.map((m, i) => {
        const isActive = m.name === activeModelName || m.name.split(':')[0] === activeModelName.split(':')[0];
        const sizeGB = (m.size / (1024**3)).toFixed(1);
        const isQwen = m.name.toLowerCase().includes('qwen');
        const icon = isQwen ? 'memory' : 'settings_input_component';
        const modDate = m.modified_at && m.modified_at !== 'None' ? new Date(m.modified_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

        // Smart name processing for long library paths
        let displayName = m.name;
        let displayTag = 'LATEST';
        
        if (m.name.includes(':')) {
            const parts = m.name.split(':');
            displayTag = parts.pop().toUpperCase();
            displayName = parts.join(':');
        }
        
        const shortName = displayName.split('/').pop().toUpperCase();
        
        const activeClass = isActive ? 'border-primary shadow-[0_0_40px_rgba(255,255,255,0.05)] bg-primary/[0.03]' : 'border-outline/50 opacity-60 grayscale-[0.2]';
        const badge = isActive ? '<div class="px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[8px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(255,255,255,0.1)] active-core-badge">Primary_Core</div>' : '<div class="px-3 py-1 rounded-full border border-outline/20 bg-surface-variant/50 text-on-surface/40 text-[8px] font-black tracking-widest uppercase">Archive_Node</div>';

        return `
            <div onclick="switchAgent('${m.name}', event)" class="glass-panel p-6 rounded-[2.5rem] border ${activeClass} hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-500 group relative flex flex-col justify-between min-h-[240px] hover:-translate-y-2 cursor-pointer scale-anim" style="animation: reveal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; animation-delay: ${i * 50}ms; opacity: 0;">
                <div class="absolute -top-4 -right-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl ${isActive ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity"></div>
                
                <div>
                    <div class="flex items-start justify-between mb-6">
                        <div class="w-12 h-12 rounded-2xl ${isActive ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border border-outline'} flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5 transition-all duration-500">
                             <span class="material-symbols-outlined text-[24px] ${isActive ? 'text-primary opacity-100' : 'opacity-40'} group-hover:opacity-100 group-hover:text-primary transition-all">${icon}</span>
                        </div>
                        ${badge}
                    </div>
                    
                    <div class="flex flex-col mb-6">
                        <span class="text-[16px] font-black tracking-tight leading-none uppercase text-on-surface/90 group-hover:text-primary transition-colors line-clamp-2 h-10 mb-1" title="${displayName}">${shortName}</span>
                        <span class="text-[7.5px] font-mono opacity-30 tracking-[0.3em] uppercase truncate" title="${displayTag}">${displayTag} | ${displayName}</span>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col">
                            <span class="text-[8px] font-mono opacity-50 uppercase tracking-widest text-primary">Weight_Class</span>
                            <span class="text-[11px] font-bold opacity-90 italic">${sizeGB} GB</span>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-[8px] font-mono opacity-50 uppercase tracking-widest text-primary">Last_Sync</span>
                            <span class="text-[11px] font-bold opacity-90 italic">${modDate}</span>
                        </div>
                    </div>
                    
                    <div class="h-[1px] w-full bg-gradient-to-r from-transparent via-outline/50 to-transparent"></div>
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                             <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                             <span class="text-[9px] font-mono opacity-70 uppercase tracking-widest group-hover:opacity-100 transition-opacity">Node_Ready</span>
                        </div>
                        <span class="material-symbols-outlined text-[18px] opacity-20 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">chevron_right</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}



async function onMakePDF() {
    if (isProcessing) return;
    const topic = prompt('Enter a topic for the PDF report:');
    if (!topic?.trim()) return;
    isProcessing = true;
    document.getElementById('send-btn').disabled = true;
    addSystemMsg(`COMPILING PDF ARCHIVE: ${topic.trim()}`);
    showThinking();
    try {
        const r = await window.kodama.generatePDF(topic.trim());
        hideThinking();
        if (r.error) addAIMessage(`⚠️ DOCUMENTATION ERROR: ${r.error}`);
        else addAIMessage(`✅ PDF archival complete.\n\nResource located: ${r.filename}`, 
             ['PDF_EXPORT_SUCCESS', 'PRIORITY_LEVEL_A'],
             { label: 'Open PDF', path: r.filename }
        );
    } catch (e) { hideThinking(); addAIMessage(`⚠️ ${e.message}`); }
    finally { isProcessing = false; document.getElementById('send-btn').disabled = false; }
}

function toggleAttachmentMenu() {
    const menu = document.getElementById('attachment-menu');
    if (!menu) return;
    const isOpen = !menu.classList.contains('opacity-0');
    if (isOpen) {
        menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
    } else {
        menu.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
    }
}

// Close menu on click outside
document.addEventListener('mousedown', (e) => {
    const menu = document.getElementById('attachment-menu');
    if (menu && !menu.contains(e.target) && !e.target.closest('button[onclick="toggleAttachmentMenu()"]')) {
        menu.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
    }
});

function triggerFileSelect(type) {
    toggleAttachmentMenu(); // Hide menu after selection
    if (type === 'image') document.getElementById('image-upload').click();
    else if (type === 'doc') document.getElementById('doc-upload').click();
}

function handleFileAttach(event, type) {
    const file = event.target.files[0];
    if (file) {
        addSystemMsg(`RESOURCE_LINKED: ${file.name.toUpperCase()} [${type}]`);
        // Here you would typically handle the upload or reading of the file
    }
    // Clear input so same file can be re-selected if needed
    event.target.value = '';
}

// ── Utils ────────────────────────────────────────────────────────────────────
function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// ── Config Modal ─────────────────────────────────────────────────────────────
function openConfigModal() {
    const modal = document.getElementById('config-modal');
    const content = modal.querySelector('.glass-panel');
    
    // Update live metadata
    const cfgModel = document.getElementById('cfg-active-model');
    const cfgUser = document.getElementById('cfg-user-name');
    
    if (cfgModel) cfgModel.textContent = activeModel ? activeModel.toUpperCase() : 'SEARCHING...';
    if (cfgUser) cfgUser.textContent = userName ? userName.toUpperCase() : 'ANONYMOUS';
    
    updateConfigThemeUI();
    
    // Reset to support tab
    switchConfigTab('support');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.add('opacity-100');
        content.classList.remove('translate-y-12');
    }, 10);
}

function updateConfigThemeUI() {
    const cfgLabel = document.getElementById('cfg-theme-label');
    const cfgIcon = document.getElementById('cfg-theme-icon');
    if (cfgLabel) cfgLabel.textContent = currentTheme ? `${currentTheme.toUpperCase()}_CORE` : 'DARK_CORE';
    if (cfgIcon) cfgIcon.textContent = currentTheme === 'dark' ? 'dark_mode' : 'light_mode';
}

async function togglePlatformTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    selectTheme(newTheme);
    updateConfigThemeUI();
    
    // Persist
    await window.kodama.saveConfig({
        user_name: userName,
        setup_complete: true,
        theme: currentTheme
    });
}

function closeConfigModal() {
    const modal = document.getElementById('config-modal');
    const content = modal.querySelector('.glass-panel');
    modal.classList.remove('opacity-100');
    content.classList.add('translate-y-12');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 500);
}

function switchConfigTab(tabId) {
    // Update Sidebar
    const tabs = document.querySelectorAll('.config-tab');
    tabs.forEach(t => {
        t.classList.remove('bg-white/5', 'border', 'border-white/10', 'text-primary', 'shadow-lg', 'opacity-100');
        t.classList.add('opacity-40');
    });
    
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) {
        activeTab.classList.remove('opacity-40');
        activeTab.classList.add('bg-white/5', 'border', 'border-white/10', 'text-primary', 'shadow-lg', 'opacity-100');
    }
    
    // Update Content
    const contents = document.querySelectorAll('.config-content');
    contents.forEach(c => {
        c.classList.add('hidden', 'opacity-0', 'translate-y-4');
    });
    
    const activeContent = document.getElementById(`content-${tabId}`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
        setTimeout(() => {
            activeContent.classList.remove('opacity-0', 'translate-y-4');
        }, 10);
    }
}

// ── Keyboard ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        if (document.activeElement.id === 'chat-input') {
            e.preventDefault();
            sendMessage();
        } else if (document.activeElement.id === 'name-input') {
            e.preventDefault();
            completeSetup();
        }
    }
});

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
    try {
        // Show splash screen for at least 3 seconds
        const splashDelay = new Promise(resolve => setTimeout(resolve, 3000));
        
        const config = await window.kodama.loadConfig();
        await splashDelay;

        if (config.setup_complete) {
            userName = config.user_name || 'User';
            currentTheme = config.theme || 'dark';
            selectTheme(currentTheme);
            updateLogos(); // Ensure logo syncs immediately
            updateUserDisplay(userName);
            showScreen('chat');
            currentChatId = generateId(); // Start with a fresh ID
            addWelcomeMessage();
            loadHistoryList(); // Load archives
        } else {
            showScreen('welcome');
        }

        // Initial Link Check
        checkNeuralLink();
        // Periodic Heartbeat
        setInterval(checkNeuralLink, 30000);
    } catch (err) {
        console.error('Init error:', err);
        showScreen('welcome');
    }
}

window.addEventListener('DOMContentLoaded', init);
