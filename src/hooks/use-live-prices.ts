import { useEffect, useRef, useState } from 'react'

type LivePrice = {
  price: number
  timestamp: number
}

type LivePricesMap = Record<string, LivePrice>

export function useLivePrices(symbols: string[]) {
  const [prices, setPrices] = useState<LivePricesMap>({})
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number>(0)
  
  // Ref to store latest prices without triggering re-renders immediately
  const latestPricesRef = useRef<LivePricesMap>({})
  const throttleRef = useRef<number | null>(null)

  useEffect(() => {
    if (!symbols || symbols.length === 0) return

    const streams = symbols
      .map(s => `${s.toLowerCase()}usdt@trade`)
      .join('/')

    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

    let isAlive = true

    // FLUSH: Updates React state from the Ref
    const flushUpdates = () => {
      setPrices(prev => ({ ...prev, ...latestPricesRef.current }))
      throttleRef.current = null
    }

    function connect() {
      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          // console.log('Live prices WS open')
        }

        ws.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data)
            const payload = parsed.data || parsed
            const symbolRaw = (payload.s || payload.symbol || '') as string
            
            // Normalize symbol: BTCUSDT -> BTC
            const symbol = symbolRaw.replace(/USDT$/i, '')
            const price = parseFloat(payload.p || payload.price || payload.P || payload.c)
            
            if (!symbol) return

            // 1. Update the Ref immediately (no re-render)
            latestPricesRef.current[symbol] = { price, timestamp: Date.now() }

            // 2. Throttle the State Update (Limit to 1 update per second)
            if (!throttleRef.current) {
              throttleRef.current = window.setTimeout(flushUpdates, 1000)
            }

          } catch (e) {
            // ignore parse errors
          }
        }

        ws.onclose = () => {
          if (!isAlive) return
          reconnectRef.current = window.setTimeout(() => connect(), 2000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch (e) {
        // ignore
      }
    }

    connect()

    return () => {
      isAlive = false
      if (wsRef.current) wsRef.current.close()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (throttleRef.current) clearTimeout(throttleRef.current)
    }
  }, [symbols.join(',')]) // Safe dependency

  return prices
}

export type { LivePrice, LivePricesMap }