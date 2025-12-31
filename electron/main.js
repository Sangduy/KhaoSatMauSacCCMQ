const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../public/favicon.ico'), // Nếu có icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Cho phép đơn giản hóa việc giao tiếp nếu cần sau này
    },
    autoHideMenuBar: true, // Ẩn thanh menu mặc định của Electron
  });

  // Trong môi trường Dev thì load từ localhost, Prod thì load file html đã build
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Mở công cụ Dev để debug
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

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