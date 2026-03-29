'use strict'

const path = require('path')
const { app, BrowserWindow, ipcMain, screen } = require('electron')

let mainWindow = null
let ignoreMouse = false

function getVirtualBounds() {
  const displays = screen.getAllDisplays()
  return displays.reduce((acc, display) => {
    const { x, y, width, height } = display.bounds
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
  win.setBounds({
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  })
}

function setIgnoreMouse(win, shouldIgnore) {
  if (!win || win.isDestroyed() || ignoreMouse === shouldIgnore) return
  ignoreMouse = shouldIgnore
  win.setIgnoreMouseEvents(shouldIgnore, { forward: shouldIgnore })
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
    skipTaskbar: false,
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
  mainWindow.setMenuBarVisibility(false)
  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  applyWindowBounds(mainWindow)
  mainWindow.loadFile(path.join(__dirname, 'index.html'))

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  app.setName('DesktopPet')
  createWindow()

  screen.on('display-added', () => mainWindow && applyWindowBounds(mainWindow))
  screen.on('display-removed', () => mainWindow && applyWindowBounds(mainWindow))
  screen.on('display-metrics-changed', () => mainWindow && applyWindowBounds(mainWindow))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.on('desktop-pet:set-ignore-mouse', (_event, shouldIgnore) => {
  if (!mainWindow) return
  setIgnoreMouse(mainWindow, Boolean(shouldIgnore))
})

ipcMain.on('desktop-pet:focus', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isFocused()) mainWindow.focus()
})

app.on('window-all-closed', () => {
  app.quit()
})
