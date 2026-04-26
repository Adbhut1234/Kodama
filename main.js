/**
 * KODAMA AI — Electron Main Process
 * Manages window, IPC communication, and Python subprocess bridge.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ── Paths ────────────────────────────────────────────────────────────────────
const isPackaged = app.isPackaged;
const PYTHON_PATH = isPackaged 
    ? path.join(process.resourcesPath, 'api_bridge.exe')
    : path.join(__dirname, 'llm-env', 'Scripts', 'python.exe');
const CONFIG_PATH = path.join(app.getPath('userData'), 'kodama_config.json');
const HISTORY_PATH = path.join(app.getPath('userData'), 'kodama_history.json');
let mainWindow;

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1000,
        minHeight: 650,
        backgroundColor: '#0a0a10',
        title: 'KODAMA AI',
        icon: path.join(__dirname, 'assets', 'logo_dark.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile('index.html');
    mainWindow.setMenuBarVisibility(false);
}

// ── Python Bridge ────────────────────────────────────────────────────────────
function callPython(request) {
    return new Promise((resolve, reject) => {
        const args = isPackaged ? [] : ['api_bridge.py'];
        const proc = spawn(PYTHON_PATH, args, {
            cwd: isPackaged ? process.resourcesPath : __dirname,
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                KODAMA_DATA_DIR: app.getPath('userData')
            },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => (stdout += d.toString()));
        proc.stderr.on('data', (d) => (stderr += d.toString()));

        proc.on('close', (code) => {
            if (code === 0) {
                // Get the last line (skip any stray prints from libraries)
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                try {
                    resolve(JSON.parse(lastLine));
                } catch (e) {
                    reject(new Error(`JSON parse failed: ${lastLine}`));
                }
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });

        proc.on('error', (err) => reject(err));

        proc.stdin.write(JSON.stringify(request));
        proc.stdin.end();
    });
}

// ── Config ───────────────────────────────────────────────────────────────────
function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function saveConfig(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

// Chat
ipcMain.handle('chat', async (event, { messages, userText }) => {
    return callPython({ action: 'chat', messages, user_text: userText });
});

// List Agents
ipcMain.handle('list-models', async () => {
    return callPython({ action: 'list_models' });
});

ipcMain.handle('switch-model', async (event, model) => {
    return callPython({ action: 'switch_model', model });
});

// Chat History Registry
function getHistory() {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    try {
        const data = fs.readFileSync(HISTORY_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveHistory(chat) {
    const history = getHistory();
    const index = history.findIndex(c => c.id === chat.id);
    if (index !== -1) {
        history[index] = chat;
    } else {
        history.unshift(chat);
    }
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
    return { success: true };
}

function deleteHistory(id) {
    const history = getHistory();
    const newHistory = history.filter(c => c.id !== id);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(newHistory, null, 2));
    return { success: true };
}

// Chat History IPC
ipcMain.handle('save-chat', async (event, chat) => {
    return saveHistory(chat);
});

ipcMain.handle('get-history', async () => {
    return { history: getHistory() };
});

ipcMain.handle('delete-chat', async (event, id) => {
    return deleteHistory(id);
});

// Status check
ipcMain.handle('check-status', async () => {
    return callPython({ action: 'status' });
});



// PDF generation
ipcMain.handle('generate-pdf', async (event, topic) => {
    return callPython({ action: 'generate_pdf', topic });
});

// Config
ipcMain.handle('load-config', async () => {
    if (!fs.existsSync(CONFIG_PATH)) return { setup_complete: false };
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return { setup_complete: false };
    }
});

ipcMain.handle('save-config', async (event, config) => {
    try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('open-file', async (event, path) => {
    if (!path) return;
    return shell.openPath(path);
});

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
