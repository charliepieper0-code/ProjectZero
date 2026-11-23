const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const GITHUB_OWNER = 'charliepieper0-code';
const GITHUB_REPO = 'ProjectZero';
let gameWindow = null;
let updateWindow = null;
let updatePromptOpen = false;
let quittingForInstall = false;

function createGameWindow() {
  if (gameWindow && !gameWindow.isDestroyed()) {
    gameWindow.focus();
    return;
  }

  gameWindow = new BrowserWindow({
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

  gameWindow.loadFile(path.join(__dirname, 'index.html'));
  gameWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  gameWindow.on('closed', () => { gameWindow = null; });
}

function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 520,
    height: 230,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'PROJECT ZERO UPDATER',
    backgroundColor: '#080a0b',
    webPreferences: { contextIsolation: true, sandbox: true }
  });

  const page = `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:30px;background:#080a0b;color:#d5d0c4;font:12px Consolas,monospace}
    h1{font:800 30px Arial,sans-serif;letter-spacing:2px;margin:0 0 12px;color:#e5e0d5}
    p{color:#aaa69a;line-height:1.7} .track{height:9px;background:#292b29;margin-top:24px;border:1px solid #55544e}
    #bar{height:100%;width:0;background:#a83b34;transition:width .15s}#status{margin-top:10px;color:#d5d0c4;font-size:11px}
  </style></head><body><h1>PROJECT ZERO</h1><p id="message">Downloading update. Please keep this window open.</p>
  <div class="track"><div id="bar"></div></div><div id="status">Preparing download...</div>
  <script>window.setProgress=(p,t)=>{document.getElementById('bar').style.width=Math.max(0,Math.min(100,p))+'%';document.getElementById('status').textContent=t||Math.round(p)+'%'};
  window.setMessage=(m)=>document.getElementById('message').textContent=m;</script></body></html>`;
  updateWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page));
}

function updateProgress(percent, status) {
  if (!updateWindow || updateWindow.isDestroyed()) return;
  updateWindow.webContents.executeJavaScript(`window.setProgress(${Number(percent) || 0}, ${JSON.stringify(status || '')})`).catch(() => {});
}

async function askToUpdate(version) {
  if (updatePromptOpen) return;
  updatePromptOpen = true;
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'PROJECT ZERO UPDATE AVAILABLE',
    message: `Project Zero ${version} is ready to install.`,
    detail: 'Choose UPDATE NOW to download and install the update. Choose LATER to launch your currently installed version. You will be asked again the next time you open the game.',
    buttons: ['UPDATE NOW', 'LATER'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });
  updatePromptOpen = false;

  if (result.response === 1) {
    createGameWindow();
    return;
  }

  createUpdateWindow();
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    if (updateWindow && !updateWindow.isDestroyed()) updateWindow.close();
    await dialog.showMessageBox({
      type: 'error',
      title: 'UPDATE FAILED',
      message: 'The update could not be downloaded.',
      detail: `${error.message || error}\n\nYour current installation has not been changed. You can try again next launch.`,
      buttons: ['OK']
    });
    createGameWindow();
  }
}

function configureUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent || 0);
    const mb = ((progress.transferred || 0) / 1024 / 1024).toFixed(1);
    const total = ((progress.total || 0) / 1024 / 1024).toFixed(1);
    updateProgress(percent, `Downloading ${percent}%  |  ${mb} MB / ${total} MB`);
  });

  autoUpdater.on('update-downloaded', async (info) => {
    if (updateWindow && !updateWindow.isDestroyed()) updateWindow.close();
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'UPDATE READY',
      message: `Project Zero ${info.version} has downloaded successfully.`,
      detail: 'Restart the game to finish installing the update. Your saved campaign data is stored separately from the game installation.',
      buttons: ['RESTART AND INSTALL', 'LATER'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    });

    if (result.response === 0) {
      quittingForInstall = true;
      autoUpdater.quitAndInstall(false, true);
    } else {
      createGameWindow();
    }
  });

  autoUpdater.on('error', async (error) => {
    console.error('Project Zero updater error:', error);
    if (updateWindow && !updateWindow.isDestroyed()) updateWindow.close();
    if (!gameWindow) createGameWindow();
  });
}

app.whenReady().then(async () => {
  app.setAppUserModelId('com.projectzero.game');

  if (!app.isPackaged) {
    createGameWindow();
    return;
  }

  configureUpdater();
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.isUpdateAvailable) {
      await askToUpdate(result.updateInfo.version);
    } else {
      createGameWindow();
    }
  } catch (error) {
    console.error('Could not check for Project Zero updates:', error);
    createGameWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createGameWindow();
  });
});

app.on('before-quit', () => {
  if (quittingForInstall) return;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
