const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startLights: (settings) => ipcRenderer.invoke("start-lights", settings),
  stopLights: () => ipcRenderer.invoke("stop-lights"),
  getLightsStatus: () => ipcRenderer.invoke("get-lights-status"),
  onSettingsUpdate: (callback) => ipcRenderer.on("update-settings", callback),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  loadSettings: () => ipcRenderer.invoke("load-settings"),
});
