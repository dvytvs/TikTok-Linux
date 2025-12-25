const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

// Оптимизация для GPU (полезно для видео TikTok)
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');
app.commandLine.appendSwitch('enable-zero-copy');

// Поддержка Wayland (если система поддерживает, Electron попытается использовать)
if (process.env.XDG_SESSION_TYPE === 'wayland') {
    app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 400,
        minHeight: 600,
        title: "TikTok",
        icon: path.join(__dirname, 'build', 'icons', 'linux', 'icon.png'), // Убедись, что тут лежит файл, например 512x512.png
        backgroundColor: '#000000', // Черный фон при загрузке (приятнее для глаз)
        show: false, // Не показывать окно, пока оно не загрузится
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            // Включаем аппаратное ускорение
            webgl: true,
            plugins: true 
        }
    });

    // Подмена User-Agent на обычный Chrome под Linux.
    // Это критически важно, чтобы TikTok не блокировал доступ и не урезал функционал.
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    mainWindow.webContents.setUserAgent(userAgent);

    // Убираем стандартное меню (File, Edit...), чтобы выглядело как нативное приложение
    mainWindow.setMenuBarVisibility(false);

    // Загрузка TikTok
    mainWindow.loadURL('https://www.tiktok.com/');

    // Показываем окно только когда контент готов (избегает белого экрана)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // ОБРАБОТКА ССЫЛОК:
    // Если ссылка ведет не на tiktok.com, открываем её в системном браузере
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.includes('tiktok.com')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    // Обработка закрытия
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Блокировка повторного запуска (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Если пользователь пытается запустить вторую копию, фокусируемся на первой
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();

        // Опционально: Очистка кэша при старте (если нужно),
        // но лучше не включать это постоянно, чтобы не логиниться каждый раз.
        // session.defaultSession.clearCache(); 
        
        app.on('activate', function () {
            if (mainWindow === null) createWindow();
        });
    });
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
