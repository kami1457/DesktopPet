'use strict'

const { ipcRenderer } = require('electron')

const INTERACTIVE_SELECTORS = [
  '#pet-container',
  '#settings-panel',
  '#context-menu',
  '#pomodoro-panel',
  '#todo-panel',
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
      style.visibility === 'hidden' ||
      style.pointerEvents === 'none' ||
      style.opacity === '0'
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
  const FOCUSABLE_INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

  const syncIgnoreMouse = (shouldIgnore) => {
    if (lastShouldIgnore === shouldIgnore) return
    lastShouldIgnore = shouldIgnore
    ipcRenderer.send('desktop-pet:set-ignore-mouse', shouldIgnore)
  }

  const updateByPoint = (clientX, clientY) => {
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
    if (target instanceof Element && target.closest(FOCUSABLE_INPUT_SELECTOR)) {
      ipcRenderer.send('desktop-pet:focus')
    }
    syncIgnoreMouse(false)
  }, true)

  window.addEventListener('mouseup', (event) => {
    updateByPoint(event.clientX, event.clientY)
  }, true)

  window.addEventListener('mouseleave', () => {
    syncIgnoreMouse(true)
  }, true)

  window.addEventListener('blur', () => {
    syncIgnoreMouse(true)
  })

  document.addEventListener('visibilitychange', () => {
    syncIgnoreMouse(document.hidden)
  })

  syncIgnoreMouse(true)
})
