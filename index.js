const { app, BrowserWindow, screen, ipcMain } = require("electron");
const { updateElectronApp } = require("update-electron-app");
updateElectronApp();

const path = require("path");

if (require("electron-squirrel-startup")) {
  app.quit();
  return;
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.holidaylights");
}

// Enforce single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (controlWindow) {
      if (controlWindow.isMinimized()) controlWindow.restore();
      controlWindow.focus();
      controlWindow.show();
    }
  });

  let lightsWindow = null;
  let controlWindow = null;
  let forceQuit = false;

  const createLightsWindow = () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    lightsWindow = new BrowserWindow({
      width,
      height,
      x: 0,
      y: 0,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, "logo.ico"),
    });

    lightsWindow.setFullScreen(true);
    lightsWindow.setIgnoreMouseEvents(true, { forward: true });
    lightsWindow.webContents.setIgnoreMenuShortcuts(true);
    lightsWindow.loadFile("lights.html");

    lightsWindow.on("closed", () => {
      lightsWindow = null;
    });
  };

  const createControlWindow = () => {
    if (controlWindow) {
      controlWindow.focus();
      return;
    }

    controlWindow = new BrowserWindow({
      width: 550,
      height: 800,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, "logo.ico"),
    });

    controlWindow.loadFile("control.html");

    controlWindow.on("close", (event) => {
      if (!forceQuit && lightsWindow !== null) {
        event.preventDefault();
        controlWindow.hide();
      }
    });

    controlWindow.on("closed", () => {
      controlWindow = null;
    });
  };

  // IPC handlers
  ipcMain.handle("start-lights", async (event, settings) => {
    if (!lightsWindow) {
      createLightsWindow();
      // Wait for the window to finish loading
      await new Promise((resolve) => {
        lightsWindow.webContents.once("did-finish-load", resolve);
      });
    }
    // Send settings to lights window after it's ready
    lightsWindow.webContents.send("update-settings", settings);
  });

  ipcMain.handle("stop-lights", async () => {
    if (lightsWindow) {
      lightsWindow.close();
      lightsWindow = null;
    }
  });

  ipcMain.handle("get-lights-status", () => {
    return lightsWindow !== null;
  });

  // Add tray icon to reopen control window
  app.whenReady().then(() => {
    createControlWindow();

    app.on("activate", () => {
      if (!controlWindow) {
        createControlWindow();
      } else {
        controlWindow.show();
      }
    });

    // Handle the quit event
    app.on("before-quit", () => {
      forceQuit = true;
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
