import { useCallback } from 'react'
import { useExtensionStorage } from './useExtensionStorage'

const STORAGE_KEY = 'demo_flr_balance_v2'
const INITIAL_BALANCE = 1000 // Start with 1000 FLR in demo
const AUTO_FUND_AMOUNT = 500 // Auto-fund 500 FLR when risk detected
const WITHDRAWAL_AMOUNT = 500 // Withdraw 500 FLR for protection
const RISK_THRESHOLD = 85

export interface DemoFundingEntry {
  amount: number
  timestamp: number
  reason: string
}

interface DemoFLRState {
  balance: number
  collateralVault: number
  stablecoins: number
  lastFunded: number | null
  lastWithdrawal: number | null
  fundingHistory: DemoFundingEntry[]
}

const DEFAULT_STATE: DemoFLRState = {
  balance: INITIAL_BALANCE,
  collateralVault: 0,
  stablecoins: 0,
  lastFunded: null,
  lastWithdrawal: null,
  fundingHistory: []
}

export function useDemoFLRBalanceV2() {
  const [state, setState, isHydrated] = useExtensionStorage<DemoFLRState>(STORAGE_KEY, DEFAULT_STATE)
  const safeState = isHydrated ? state : DEFAULT_STATE

  const addHistory = useCallback((entry: DemoFundingEntry) => {
    if (!isHydrated) return
    setState(prev => ({
      ...prev,
      fundingHistory: [...prev.fundingHistory, entry].slice(-50),
    }))
  }, [isHydrated, setState])

  const autoFund = useCallback((reason = 'Risk detected') => {
    if (!isHydrated) return false
    const ts = Date.now()
    setState(prev => ({
      ...prev,
      balance: prev.balance + AUTO_FUND_AMOUNT,
      lastFunded: ts,
      fundingHistory: [
        ...prev.fundingHistory,
        { amount: AUTO_FUND_AMOUNT, timestamp: ts, reason: `Auto-funded: ${reason}` },
      ].slice(-50),
    }))
    return true
  }, [isHydrated, setState])

  // returns true if withdraw executed, false otherwise
  const autoWithdraw = useCallback((reason = 'Protection rebalance') => {
    if (!isHydrated) return false
    const ts = Date.now()
    let executed = false
    setState(prev => {
      if (prev.balance >= WITHDRAWAL_AMOUNT) {
        executed = true
        return {
          ...prev,
          balance: prev.balance - WITHDRAWAL_AMOUNT,
          collateralVault: prev.collateralVault + WITHDRAWAL_AMOUNT,
          lastWithdrawal: ts,
          fundingHistory: [
            ...prev.fundingHistory,
            { amount: -WITHDRAWAL_AMOUNT, timestamp: ts, reason: `Withdrawn: ${reason}` },
          ].slice(-50),
        }
      }
      return prev
    })
    return executed
  }, [isHydrated, setState])

  const reclaimCollateral = useCallback((amount?: number, reason = 'Collateral reclaimed to demo balance') => {
    if (!isHydrated) return false
    const ts = Date.now()
    let executed = false
    setState(prev => {
      const available = prev.collateralVault
      if (available <= 0) return prev
      const reclaimAmount = Math.min(amount ?? available, available)
      if (reclaimAmount <= 0) return prev

      executed = true
      return {
        ...prev,
        balance: prev.balance + reclaimAmount,
        collateralVault: prev.collateralVault - reclaimAmount,
        fundingHistory: [
          ...prev.fundingHistory,
          { amount: reclaimAmount, timestamp: ts, reason }
        ].slice(-50),
      }
    })
    return executed
  }, [isHydrated, setState])

  const depositToVault = useCallback((amount: number, reason = 'Deposit to vault') => {
    if (!isHydrated) return false
    const ts = Date.now()
    let executed = false
    setState(prev => {
      if (amount <= 0) return prev
      if (prev.balance >= amount) {
        executed = true
        return {
          ...prev,
          balance: prev.balance - amount,
          collateralVault: prev.collateralVault + amount,
          fundingHistory: [
            ...prev.fundingHistory,
            { amount: -amount, timestamp: ts, reason },
          ].slice(-50),
        }
      }
      return prev
    })
    return executed
  }, [isHydrated, setState])

  // Simulate conversion from collateral to stablecoins (e.g., collateral sold for stablecoins)
  // returns true if conversion executed
  const convertVaultToStable = useCallback((amount: number, conversionRate = 1) => {
    if (!isHydrated) return false
    const ts = Date.now()
    let executed = false
    setState(prev => {
      if (amount <= 0) return prev
      if (prev.collateralVault >= amount) {
        executed = true
        const stableReceived = amount * conversionRate
        return {
          ...prev,
          collateralVault: prev.collateralVault - amount,
          stablecoins: prev.stablecoins + stableReceived,
          fundingHistory: [
            ...prev.fundingHistory,
            { amount: -amount, timestamp: ts, reason: `Converted to stablecoins (${stableReceived.toFixed(2)})` },
          ].slice(-50),
        }
      }
      return prev
    })
    return executed
  }, [isHydrated, setState])

  const addFunds = useCallback((amount: number) => {
    if (!isHydrated) return
    const ts = Date.now()
    setState(prev => ({
      ...prev,
      balance: prev.balance + amount,
      fundingHistory: [
        ...prev.fundingHistory,
        { amount, timestamp: ts, reason: 'Manual deposit' },
      ].slice(-50),
    }))
  }, [isHydrated, setState])

  const resetBalance = useCallback(() => {
    if (!isHydrated) return
    setState(DEFAULT_STATE)
  }, [isHydrated, setState])

  return {
    balance: safeState.balance,
    collateralVault: safeState.collateralVault,
    stablecoins: safeState.stablecoins,
    lastFunded: safeState.lastFunded,
    lastWithdrawal: safeState.lastWithdrawal,
    fundingHistory: safeState.fundingHistory,
    autoFund,
    autoWithdraw,
    depositToVault,
    convertVaultToStable,
    reclaimCollateral,
    addFunds,
    resetBalance,
  }
}

export const FLR_CONFIG_V2 = {
  INITIAL_BALANCE,
  AUTO_FUND_AMOUNT,
  WITHDRAWAL_AMOUNT,
  RISK_THRESHOLD,
}
