type ChromeLike = {
  runtime?: {
    onMessage?: {
      addListener(callback: (message: unknown) => void): void
    }
  }
}

const chromeLike =
  typeof window !== 'undefined'
    ? (window as Window & { chrome?: ChromeLike }).chrome
    : undefined

console.log('[FlareGuard] Content script active on', typeof window !== 'undefined' ? window.location.href : 'unknown')

chromeLike?.runtime?.onMessage?.addListener(message => {
  if ((message as { type?: string })?.type === 'FLAREGUARD_HIGHLIGHT') {
    console.log('[FlareGuard] Highlight request received', message)
  }
})
