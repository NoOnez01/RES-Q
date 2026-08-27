const { app, BrowserWindow } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'ResQ',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // Same permission prompts a real browser would show -- the app already
  // asks for camera/mic/geolocation itself, this just lets Electron's
  // Chromium actually grant them instead of silently denying every request.
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['camera', 'microphone', 'geolocation', 'notifications'].includes(permission))
  })
  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
