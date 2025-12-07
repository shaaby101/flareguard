import { useState, useCallback, useEffect } from 'react'

const INITIAL_BALANCE = 1000 // Start with 1000 FLR in demo
const AUTO_FUND_AMOUNT = 500 // Auto-fund 500 FLR when risk detected
const WITHDRAWAL_AMOUNT = 500 // Withdraw 500 FLR for protection
const RISK_THRESHOLD = 85

interface DemoFLRBalance {
  balance: number
  lastFunded: number | null
  lastWithdrawal: number | null
  fundingHistory: { amount: number; timestamp: number; reason: string }[]
}

export function useDemoFLRBalance() {
  const [flrData, setFlrData] = useState<DemoFLRBalance>(() => {
    const saved = localStorage.getItem('demo_flr_balance')
    if (saved) {
      return JSON.parse(saved)
    }
    return {
      balance: INITIAL_BALANCE,
      lastFunded: null,
      lastWithdrawal: null,
      fundingHistory: [],
    }
  })

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('demo_flr_balance', JSON.stringify(flrData))
  }, [flrData])

  // Auto-fund when risk detected
  const autoFund = useCallback((reason: string = 'Risk detected') => {
    setFlrData((prev) => {
      const newBalance = prev.balance + AUTO_FUND_AMOUNT
      return {
        ...prev,
        balance: newBalance,
        lastFunded: Date.now(),
        fundingHistory: [
          ...prev.fundingHistory,
          {
            amount: AUTO_FUND_AMOUNT,
            timestamp: Date.now(),
            reason: `Auto-funded: ${reason}`,
          },
        ].slice(-10), // Keep last 10 entries
      }
    })
  }, [])

  // Auto-withdraw for protection
  const autoWithdraw = useCallback((reason: string = 'Protection rebalance') => {
    setFlrData((prev) => {
      if (prev.balance >= WITHDRAWAL_AMOUNT) {
        const newBalance = prev.balance - WITHDRAWAL_AMOUNT
        return {
          ...prev,
          balance: newBalance,
          lastWithdrawal: Date.now(),
          fundingHistory: [
            ...prev.fundingHistory,
            {
              amount: -WITHDRAWAL_AMOUNT,
              timestamp: Date.now(),
              reason: `Withdrawn: ${reason}`,
            },
          ].slice(-10),
        }
      }
      return prev
    })
  }, [])

  // Manually add funds (for testing)
  const addFunds = useCallback((amount: number) => {
    setFlrData((prev) => ({
      ...prev,
      balance: prev.balance + amount,
      fundingHistory: [
        ...prev.fundingHistory,
        {
          amount,
          timestamp: Date.now(),
          reason: 'Manual deposit',
        },
      ].slice(-10),
    }))
  }, [])

  // Reset to initial balance
  const resetBalance = useCallback(() => {
    setFlrData({
      balance: INITIAL_BALANCE,
      lastFunded: null,
      lastWithdrawal: null,
      fundingHistory: [],
    })
  }, [])

  return {
    balance: flrData.balance,
    lastFunded: flrData.lastFunded,
    lastWithdrawal: flrData.lastWithdrawal,
    fundingHistory: flrData.fundingHistory,
    autoFund,
    autoWithdraw,
    addFunds,
    resetBalance,
  }
}

export const FLR_CONFIG = {
  INITIAL_BALANCE,
  AUTO_FUND_AMOUNT,
  WITHDRAWAL_AMOUNT,
  RISK_THRESHOLD,
}
