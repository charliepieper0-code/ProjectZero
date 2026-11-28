const { app, BrowserWindow, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow = null;
let updateCheckStarted = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    backgroundColor: '#080a0b',
    autoHideMenuBar: true,
    title: 'PROJECT ZERO',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function configureUpdater() {
  // Development runs from source and should not attempt to install updates.
  if (!app.isPackaged || updateCheckStarted) return;

  updateCheckStarted = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Updater] Update available: ${info.version}`);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`[Updater] Already up to date: ${info.version}`);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log(`[Updater] Download complete: ${info.version}`);

    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'PROJECT ZERO Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart PROJECT ZERO now to install the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (result.response === 0) {
      // The second argument asks the Windows installer to relaunch the app.
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Update error:', error);

    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'PROJECT ZERO Update Failed',
        message: 'The update could not be completed.',
        detail: `${error.message}\n\nYou can continue using your current installation.`,
        buttons: ['OK'],
        noLink: true
      });
    }
  });

  // Wait until the game window has been created before checking GitHub.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[Updater] Could not check for updates:', error);
    });
  }, 3000);
}

app.whenReady().then(() => {
  createWindow();
  configureUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
