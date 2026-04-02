'use strict'

const path = require('path')
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')

const APP_ID = 'com.local.desktoppet'

let mainWindow = null
let tray = null
let appIcon = null
let ignoreMouse = false
let cursorSyncTimer = null

const CURSOR_SYNC_INTERVAL_MS = 120
const WINDOW_EDGE_GAP_PX = 2

function getVirtualBounds() {
  const displays = screen.getAllDisplays()
  return displays.reduce((acc, display) => {
    const area = display.workArea || display.bounds
    const { x, y, width, height } = area
    acc.left = Math.min(acc.left, x)
    acc.top = Math.min(acc.top, y)
    acc.right = Math.max(acc.right, x + width)
    acc.bottom = Math.max(acc.bottom, y + height)
    return acc
  }, {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  })
}

function applyWindowBounds(win) {
  const bounds = getVirtualBounds()
  const width = Math.max(320, bounds.right - bounds.left - WINDOW_EDGE_GAP_PX * 2)
  const height = Math.max(180, bounds.bottom - bounds.top - WINDOW_EDGE_GAP_PX * 2)
  win.setBounds({
    x: bounds.left + WINDOW_EDGE_GAP_PX,
    y: bounds.top + WINDOW_EDGE_GAP_PX,
    width,
    height,
  })
}

function setIgnoreMouse(win, shouldIgnore) {
  if (!win || win.isDestroyed() || ignoreMouse === shouldIgnore) return
  ignoreMouse = shouldIgnore
  win.setIgnoreMouseEvents(shouldIgnore, { forward: shouldIgnore })
}

function sendCursorPoint(win) {
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) return

  const cursor = screen.getCursorScreenPoint()
  const bounds = win.getBounds()
  win.webContents.send('desktop-pet:cursor-point', {
    clientX: cursor.x - bounds.x,
    clientY: cursor.y - bounds.y,
  })
}

function startCursorSync(win) {
  if (cursorSyncTimer) {
    clearInterval(cursorSyncTimer)
    cursorSyncTimer = null
  }

  cursorSyncTimer = setInterval(() => {
    sendCursorPoint(win)
  }, CURSOR_SYNC_INTERVAL_MS)

  if (typeof cursorSyncTimer.unref === 'function') {
    cursorSyncTimer.unref()
  }

  sendCursorPoint(win)
}

function stopCursorSync() {
  if (!cursorSyncTimer) return
  clearInterval(cursorSyncTimer)
  cursorSyncTimer = null
}

function createAppIcon() {
  if (appIcon) return appIcon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect x="4" y="4" width="56" height="56" rx="14" fill="#6c5ce7"/>
    <circle cx="24" cy="29" r="4" fill="#ffffff"/>
    <circle cx="40" cy="29" r="4" fill="#ffffff"/>
    <path d="M24 42c2.5 3 13.5 3 16 0" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none"/>
  </svg>`
  appIcon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
  return appIcon
}

function createTray() {
  if (tray) return
  const trayIcon = createAppIcon().resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('DesktopPet')
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示桌宠',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return
        mainWindow.show()
      },
    },
    { label: '退出 DesktopPet', click: () => app.quit() },
  ]))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    movable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: false,
    icon: createAppIcon(),
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  mainWindow.removeMenu()
  mainWindow.setSkipTaskbar(false)
  mainWindow.setIcon(createAppIcon())
  mainWindow.setMenuBarVisibility(false)
  mainWindow.setAlwaysOnTop(true, 'floating')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  applyWindowBounds(mainWindow)
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.show()
    mainWindow.blur()
    startCursorSync(mainWindow)
  })

  mainWindow.on('closed', () => {
    stopCursorSync()
    mainWindow = null
  })
}

const isPrimary = app.requestSingleInstanceLock()
if (!isPrimary) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.show()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID)
    app.setName('DesktopPet')
    createTray()
    createWindow()

    screen.on('display-added', () => {
      if (!mainWindow) return
      applyWindowBounds(mainWindow)
      sendCursorPoint(mainWindow)
    })
    screen.on('display-removed', () => {
      if (!mainWindow) return
      applyWindowBounds(mainWindow)
      sendCursorPoint(mainWindow)
    })
    screen.on('display-metrics-changed', () => {
      if (!mainWindow) return
      applyWindowBounds(mainWindow)
      sendCursorPoint(mainWindow)
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

ipcMain.on('desktop-pet:set-ignore-mouse', (_event, shouldIgnore) => {
  if (!mainWindow) return
  setIgnoreMouse(mainWindow, Boolean(shouldIgnore))
})

ipcMain.on('desktop-pet:focus', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setFocusable(true)
  if (!mainWindow.isFocused()) mainWindow.focus()
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.blur()
    mainWindow.setFocusable(false)
  }, 120)
})

ipcMain.on('desktop-pet:exit-app', () => {
  app.quit()
})

app.on('window-all-closed', () => {
  app.quit()
})
