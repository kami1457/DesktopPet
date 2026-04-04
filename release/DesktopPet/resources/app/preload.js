'use strict'

const { ipcRenderer } = require('electron')
const { contextBridge } = require('electron')

const INTERACTIVE_SELECTORS = [
  '#pet-container',
  '#settings-panel',
  '#context-menu',
  '#pomodoro-panel',
  '#todo-panel',
  '#pomodoro-mini',
  '#show-pet',
  'button',
  'input',
  'label',
  'select',
  'textarea',
  '.menu-item',
  '.btn',
  '.btn-icon',
  '.toggle',
  '.todo-item',
]

function isVisible(element) {
  if (!element) return false

  let current = element
  while (current && current !== document.documentElement) {
    if (current.classList && current.classList.contains('hidden')) return false
    const style = window.getComputedStyle(current)
    if (
      style.display === 'none' ||
      style.visibility === 'hidden'
    ) {
      return false
    }
    current = current.parentElement
  }

  return true
}

function isInteractiveTarget(target) {
  if (!target || target === document.documentElement || target === document.body) return false
  const selector = INTERACTIVE_SELECTORS.join(', ')
  const interactiveParent = target.closest(selector)
  return Boolean(interactiveParent && isVisible(interactiveParent))
}

window.addEventListener('DOMContentLoaded', () => {
  let lastShouldIgnore = null
  const petContainer = document.getElementById('pet-container')
  const FOCUSABLE_INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]'
  const INTERACTIVE_RECT_IDS = [
    'pet-container',
    'pet-speech',
    'pet-status-bar',
    'settings-panel',
    'context-menu',
    'pomodoro-panel',
    'todo-panel',
    'pomodoro-mini',
    'show-pet',
  ]
  const NUMBER_SPINNER_HIT_RATIO = 0.32
  const NUMBER_SPINNER_HIT_MIN = 16
  const NUMBER_SPINNER_HIT_MAX = 26
  let isPointerDownInteractive = false
  let fullShapeUntil = 0
  const hasFocusableInputFocused = () => {
    const active = document.activeElement
    return active instanceof Element && Boolean(active.closest(FOCUSABLE_INPUT_SELECTOR))
  }

  const isPointInVisibleElement = (element, clientX, clientY) => {
    if (!(element instanceof Element) || !isVisible(element)) return false
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  const isPointInKnownInteractiveRects = (clientX, clientY) => {
    for (const id of INTERACTIVE_RECT_IDS) {
      if (isPointInVisibleElement(document.getElementById(id), clientX, clientY)) return true
    }
    return false
  }

  const syncIgnoreMouse = (shouldIgnore) => {
    const nextIgnore = shouldIgnore && !hasFocusableInputFocused()
    if (lastShouldIgnore === nextIgnore) return
    lastShouldIgnore = nextIgnore
    ipcRenderer.send('desktop-pet:set-ignore-mouse', nextIgnore)
  }

  const updateByPoint = (clientX, clientY) => {
    if (isPointerDownInteractive) {
      syncIgnoreMouse(false)
      return
    }
    if (hasFocusableInputFocused()) {
      syncIgnoreMouse(false)
      return
    }
    if (isPointInKnownInteractiveRects(clientX, clientY)) {
      syncIgnoreMouse(false)
      return
    }
    const target = document.elementFromPoint(clientX, clientY)
    syncIgnoreMouse(!isInteractiveTarget(target))
  }

  ipcRenderer.on('desktop-pet:cursor-point', (_event, point) => {
    if (!point || typeof point.clientX !== 'number' || typeof point.clientY !== 'number') return
    updateByPoint(point.clientX, point.clientY)
  })

  window.addEventListener('mousemove', (event) => {
    updateByPoint(event.clientX, event.clientY)
  }, true)

  window.addEventListener('mousedown', (event) => {
    const target = event.target
    const isInteractiveClick =
      isPointInKnownInteractiveRects(event.clientX, event.clientY) ||
      (target instanceof Element && isInteractiveTarget(target))
    if (!isInteractiveClick && !hasFocusableInputFocused()) {
      syncIgnoreMouse(true)
      return
    }

    isPointerDownInteractive = isInteractiveClick
    if (isPointerDownInteractive) {
      fullShapeUntil = performance.now() + FULL_SHAPE_GRACE_MS
      sendFullWindowHitRegion()
    }

    if (target instanceof Element && target.closest(FOCUSABLE_INPUT_SELECTOR)) {
      const inputTarget = target instanceof HTMLInputElement ? target : target.closest('input')
      const isNumberSpinnerClick = inputTarget instanceof HTMLInputElement &&
        inputTarget.type === 'number' &&
        (() => {
          const rect = inputTarget.getBoundingClientRect()
          const spinnerHitWidth = Math.min(
            NUMBER_SPINNER_HIT_MAX,
            Math.max(NUMBER_SPINNER_HIT_MIN, rect.width * NUMBER_SPINNER_HIT_RATIO),
          )
          return event.clientX >= rect.right - spinnerHitWidth
        })()

      if (!isNumberSpinnerClick) {
        const targetId = target.id || ''
        const shouldFocusInput = targetId === 'todo-input' ||
          targetId === 'pomodoro-work-min' ||
          targetId === 'pomodoro-break-min'
        if (shouldFocusInput) ipcRenderer.send('desktop-pet:focus')
      }
    }
    syncIgnoreMouse(false)
  }, true)

  window.addEventListener('mouseup', (event) => {
    if (isPointerDownInteractive) {
      isPointerDownInteractive = false
      fullShapeUntil = performance.now() + FULL_SHAPE_GRACE_MS
      scheduleHitRegionSync(true)
    }
    updateByPoint(event.clientX, event.clientY)
  }, true)

  window.addEventListener('mouseleave', () => {
    if (hasFocusableInputFocused() || isPointerDownInteractive) return
    syncIgnoreMouse(true)
  }, true)

  window.addEventListener('blur', () => {
    if (hasFocusableInputFocused()) return
    syncIgnoreMouse(true)
  })

  document.addEventListener('focusin', (event) => {
    const target = event.target
    if (target instanceof Element && target.closest(FOCUSABLE_INPUT_SELECTOR)) {
      syncIgnoreMouse(false)
    }
  }, true)

  document.addEventListener('focusout', () => {
    const active = document.activeElement
    if (!(active instanceof Element) || !active.closest(FOCUSABLE_INPUT_SELECTOR)) {
      ipcRenderer.send('desktop-pet:release-focus')
      syncIgnoreMouse(true)
    } else {
      syncIgnoreMouse(false)
    }
  }, true)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isPointerDownInteractive = false
      fullShapeUntil = 0
      ipcRenderer.send('desktop-pet:release-focus')
      syncIgnoreMouse(true)
    } else {
      updateByPoint(window.innerWidth / 2, window.innerHeight / 2)
    }
  })

  let shapeSyncTimer = null
  let shapeHeartbeatTimer = null
  let lastRegionSignature = ''
  const SHAPE_SYNC_INTERVAL_MS = 180
  const SHAPE_SYNC_DEBOUNCE_MS = 80
  const FULL_SHAPE_GRACE_MS = 260
  const MAX_SHAPE_RECTS = 96

  const shouldKeepFullShape = () => {
    if (isPointerDownInteractive) return true
    if (performance.now() < fullShapeUntil) return true
    return petContainer instanceof Element && (
      petContainer.classList.contains('dragging') ||
      petContainer.classList.contains('physics-active')
    )
  }

  const getRectInWindow = (element) => {
    if (!(element instanceof Element) || !isVisible(element)) return null
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    const x = Math.max(0, Math.floor(rect.left))
    const y = Math.max(0, Math.floor(rect.top))
    const right = Math.min(window.innerWidth, Math.ceil(rect.right))
    const bottom = Math.min(window.innerHeight, Math.ceil(rect.bottom))
    const width = right - x
    const height = bottom - y
    if (width <= 0 || height <= 0) return null
    return { x, y, width, height }
  }

  const addRect = (list, element) => {
    if (list.length >= MAX_SHAPE_RECTS) return
    const rect = getRectInWindow(element)
    if (rect) list.push(rect)
  }

  const collectHitRegions = () => {
    const regions = []
    addRect(regions, document.getElementById('pet-container'))
    addRect(regions, document.getElementById('pet-speech'))
    addRect(regions, document.getElementById('pet-status-bar'))
    addRect(regions, document.getElementById('show-pet'))
    addRect(regions, document.getElementById('pomodoro-mini'))

    const panelIds = ['settings-panel', 'context-menu', 'pomodoro-panel', 'todo-panel']
    panelIds.forEach((id) => addRect(regions, document.getElementById(id)))

    return regions.length > 0 ? regions : [{ x: 0, y: 0, width: 1, height: 1 }]
  }

  const getRegionSignature = (regions) => {
    return regions.map((rect) => `${rect.x},${rect.y},${rect.width},${rect.height}`).join(';')
  }

  const sendFullWindowHitRegion = () => {
    const fullRegion = [{
      x: 0,
      y: 0,
      width: Math.max(1, Math.ceil(window.innerWidth)),
      height: Math.max(1, Math.ceil(window.innerHeight)),
    }]
    const signature = getRegionSignature(fullRegion)
    if (signature === lastRegionSignature) return
    lastRegionSignature = signature
    ipcRenderer.send('desktop-pet:set-hit-regions', fullRegion)
  }

  const syncHitRegions = () => {
    if (shouldKeepFullShape()) {
      sendFullWindowHitRegion()
      return
    }
    const regions = collectHitRegions()
    const signature = getRegionSignature(regions)
    if (signature === lastRegionSignature) return
    lastRegionSignature = signature
    ipcRenderer.send('desktop-pet:set-hit-regions', regions)
  }

  const scheduleHitRegionSync = (immediate = false) => {
    if (shapeSyncTimer) {
      clearTimeout(shapeSyncTimer)
      shapeSyncTimer = null
    }
    shapeSyncTimer = window.setTimeout(() => {
      shapeSyncTimer = null
      syncHitRegions()
    }, immediate ? 0 : SHAPE_SYNC_DEBOUNCE_MS)
  }

  const watchDomChanges = () => {
    const observer = new MutationObserver((mutations) => {
      let shouldSync = false
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          shouldSync = true
          break
        }
        if (mutation.type !== 'attributes') continue
        if (mutation.attributeName === 'style' && mutation.target instanceof Element) {
          const target = mutation.target
          const skipStyleTarget = target.id === 'pet-container' ||
            target.id === 'pomodoro-mini' ||
            target.classList.contains('dragging')
          if (skipStyleTarget) continue
        }
        shouldSync = true
        break
      }
      if (shouldSync) scheduleHitRegionSync()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'style'],
    })
  }

  watchDomChanges()
  window.addEventListener('resize', scheduleHitRegionSync, true)
  shapeHeartbeatTimer = window.setInterval(syncHitRegions, SHAPE_SYNC_INTERVAL_MS)
  syncHitRegions()

  syncIgnoreMouse(true)
})

contextBridge.exposeInMainWorld('desktopPetAPI', {
  exitApp: () => ipcRenderer.send('desktop-pet:exit-app'),
  setIgnoreMouse: (shouldIgnore) => ipcRenderer.send('desktop-pet:set-ignore-mouse', Boolean(shouldIgnore)),
})
