import { useEffect, useState } from 'react'

// DevTools detection based on window size changes
function isDevToolsOpen() {
  const threshold = 160
  const widthDiff = Math.abs(window.outerWidth - window.innerWidth)
  const heightDiff = Math.abs(window.outerHeight - window.innerHeight)
  return widthDiff > threshold || heightDiff > threshold
}

export function useSecurityGuards({ onDevtoolsDetected } = {}) {
  const [devtools, setDevtools] = useState(false)

  useEffect(() => {
    const handleContext = (e) => e.preventDefault()
    const handleKey = (e) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault()
        e.stopPropagation()
        setDevtools(true)
        onDevtoolsDetected && onDevtoolsDetected()
      }
      // Block Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if ((e.ctrlKey && e.shiftKey && e.key?.toLowerCase() === 'i') || (e.metaKey && e.altKey && e.key?.toLowerCase() === 'i')) {
        e.preventDefault()
        e.stopPropagation()
        setDevtools(true)
        onDevtoolsDetected && onDevtoolsDetected()
      }
    }

    const interval = setInterval(() => {
      const open = isDevToolsOpen()
      if (open && !devtools) {
        setDevtools(true)
        onDevtoolsDetected && onDevtoolsDetected()
      }
    }, 800)

    window.addEventListener('contextmenu', handleContext)
    window.addEventListener('keydown', handleKey, true)

    return () => {
      clearInterval(interval)
      window.removeEventListener('contextmenu', handleContext)
      window.removeEventListener('keydown', handleKey, true)
    }
  }, [])

  return { devtoolsOpen: devtools }
}
