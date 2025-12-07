import { JsonRpcProvider, Contract, formatUnits } from 'ethers'

// 1. Configuration: Multiple RPCs for reliability
const COSTON2_RPC_URLS = [
  'https://flare-testnet-coston2.rpc.thirdweb.com',
  'https://coston2-api.flare.network/ext/C/rpc',
  'https://coston2.enosys.global/ext/C/rpc'
]

const FTSO_V2_CONTRACT = '0x3d893C53D9e8C5E3dC340B2f6944eD52e46da915'

const FTSO_FEED_IDS: { [key: string]: string } = {
  BTC: '0x014254432f55534400000000000000000000000000',
  ETH: '0x014554482f55534400000000000000000000000000',
  XRP: '0x015852502f55534400000000000000000000000000',
  FLR: '0x01464c522f55534400000000000000000000000000',
  SOL: '0x01534f4c2f55534400000000000000000000000000',
  USDC: '0x01555344432f555344000000000000000000000000',
}

// 2. Fixed ABI String
const ABI = [
  'function getFeedById(bytes21 feedId) external view returns (uint256 value, int8 decimals, uint64 timestamp)'
]

export const getFtsoPrices = async () => {
  let lastError: Error | null = null

  // Loop through RPCs until one connects
  for (const rpcUrl of COSTON2_RPC_URLS) {
    try {
      const provider = new JsonRpcProvider(rpcUrl)
      // fast check to see if network is reachable
      await provider.getNetwork() 

      const contract = new Contract(FTSO_V2_CONTRACT, ABI, provider)

      // 3. Fetch all feeds in parallel
      const feedPromises = Object.entries(FTSO_FEED_IDS).map(async ([symbol, feedId]) => {
        try {
          const [value, decimals] = await contract.getFeedById(feedId)
          const formattedPrice = parseFloat(formatUnits(value, decimals))
          return { symbol, price: formattedPrice }
        } catch (error) {
          console.warn(`Error fetching ${symbol}:`, error)
          // Return 0 instead of throwing, so other feeds still load
          return { symbol, price: 0 }
        }
      })

      const results = await Promise.all(feedPromises)

      // 4. Format results
      const prices: { [key: string]: number } = {}
      results.forEach(({ symbol, price }) => {
        if (price > 0) prices[symbol] = price
      })

      return prices

    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`)
      lastError = error as Error
      // Loop continues to next URL
    }
  }

  console.error("All RPCs failed")
  throw new Error(`Unable to connect to Flare Network. Last error: ${lastError?.message}`)
}

export const fetchLivePrices = getFtsoPrices