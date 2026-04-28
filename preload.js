/**
 * LUMINA AI — Preload Script
 * Exposes safe IPC methods to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kodama', {
    chat: (messages, userText) =>
        ipcRenderer.invoke('chat', { messages, userText }),

    listModels: () => ipcRenderer.invoke('list-models'),
    switchModel: (model) => ipcRenderer.invoke('switch-model', model),
    saveChat: (chat) => ipcRenderer.invoke('save-chat', chat),

    getHistory: () =>
        ipcRenderer.invoke('get-history'),

    deleteChat: (id) =>
        ipcRenderer.invoke('delete-chat', id),

    checkStatus: () =>
        ipcRenderer.invoke('check-status'),

    reportBug: (bugData) =>
        ipcRenderer.invoke('report-bug', bugData),



    generatePDF: (topic) =>
        ipcRenderer.invoke('generate-pdf', topic),

    loadConfig: () =>
        ipcRenderer.invoke('load-config'),

    saveConfig: (config) =>
        ipcRenderer.invoke('save-config', config),

    openFile: (path) =>
        ipcRenderer.invoke('open-file', path),
});
