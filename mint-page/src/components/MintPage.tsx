/**
 * MintPage Component
 *
 * ArcSign Pro NFT Mint page - uses ArcSign Wallet via WebSocket
 * No external wallets (MetaMask, etc.) - only ArcSign Wallet supported
 *
 * Design: On-demand connection
 * - Connect only when user clicks "Connect Wallet"
 * - No auto-reconnect, no persistent connection
 * - Disconnect after flow completes or is cancelled
 */

import { useState, useEffect, useRef } from 'react'
import { arcSignClient } from '../lib/arcsign-client'
import type { ConnectionStatus } from '../lib/arcsign-client'
import {
  CONTRACT_ADDRESS,
  USDT_ADDRESS,
  MEMBERSHIP_PRICE,
  BLOCK_EXPLORER_URL,
  IS_TESTNET_MODE,
} from '../config'
import { encodeFunctionData } from 'viem'

// ABI for encoding function calls
const APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

const MINT_ABI = [{
  name: 'mint',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [],
  outputs: [],
}] as const

type Step = 'connect' | 'select' | 'approve' | 'mint' | 'pending' | 'success'

export function MintPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  const [address, setAddress] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('connect')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string>('')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Subscribe to connection status changes (but don't auto-connect)
  useEffect(() => {
    const unsubscribe = arcSignClient.onStatusChange(setConnectionStatus)

    // Cleanup on unmount
    return () => {
      unsubscribe()
      arcSignClient.disconnect()
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      // Connection lost - reset state
      if (step !== 'success') {
        setAddress(null)
        setAvailableAccounts([])
        setStep('connect')
        setIsLoading(false)
      }
      // Stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [connectionStatus, step])

  const handleSelectAddress = (selectedAddress: string) => {
    setAddress(selectedAddress)
    setStep('approve')
    // Stop polling once address is selected
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)

    const connected = await arcSignClient.connect()

    if (!connected) {
      setError('Could not connect to ArcSign Wallet. Please make sure the application is running.')
      setIsLoading(false)
      return
    }

    // Connected - try to fetch accounts
    const result = await arcSignClient.getAccounts()
    if (result && result.accounts.length > 0) {
      setAvailableAccounts(result.accounts)
      if (result.accounts.length === 1) {
        setAddress(result.accounts[0])
        setStep('approve')
      } else {
        setStep('select')
      }
      setIsLoading(false)
    } else {
      // Connected but no accounts - start polling (wallet might be locked)
      setStep('connect') // Stay on connect step, show "waiting for unlock"
      // Start polling for accounts
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      pollIntervalRef.current = setInterval(async () => {
        const res = await arcSignClient.getAccounts()
        if (res && res.accounts.length > 0) {
          setAvailableAccounts(res.accounts)
          if (res.accounts.length === 1) {
            setAddress(res.accounts[0])
            setStep('approve')
          } else {
            setStep('select')
          }
          // Stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setIsLoading(false)
        }
      }, 2000)
      // Don't set isLoading false - keep showing loading state
    }
  }

  const handleApprove = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)
    setPendingMessage('Please confirm the approval in ArcSign Wallet...')
    setStep('pending')

    try {
      // Encode approve function call
      const data = encodeFunctionData({
        abi: APPROVE_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, MEMBERSHIP_PRICE],
      })

      const response = await arcSignClient.signAndBroadcast({
        from: address,
        to: USDT_ADDRESS,
        data,
        value: '0x0',
        chainId: IS_TESTNET_MODE ? 97 : 56,
      })

      if (response.success) {
        // Approval successful - move to mint step
        setStep('mint')
        setIsLoading(false)
      } else {
        // Check if user cancelled
        if (response.error === 'Request cancelled by user') {
          setError('Approval cancelled')
        } else {
          setError(response.error || 'Approval failed')
        }
        setStep('approve')
        setIsLoading(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed')
      setStep('approve')
      setIsLoading(false)
    }
  }

  const handleMint = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)
    setPendingMessage('Please confirm the mint in ArcSign Wallet...')
    setStep('pending')

    try {
      // Encode mint function call
      const data = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mint',
        args: [],
      })

      const response = await arcSignClient.signAndBroadcast({
        from: address,
        to: CONTRACT_ADDRESS,
        data,
        value: '0x0',
        chainId: IS_TESTNET_MODE ? 97 : 56,
      })

      if (response.success) {
        const result = response.result as Record<string, unknown> | undefined
        if (result?.tx_hash) {
          setTxHash(result.tx_hash as string)
        }
        setStep('success')
      } else {
        setError(response.error || 'Mint failed')
        setStep('mint')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mint failed')
      setStep('mint')
    }

    setIsLoading(false)
  }

  const handleDisconnect = () => {
    // Stop polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    arcSignClient.disconnect()
    setAddress(null)
    setAvailableAccounts([])
    setStep('connect')
    setIsLoading(false)
    setError(null)
  }

  const handleCancelPending = () => {
    // Cancel the current pending request
    arcSignClient.cancelCurrentRequest()
    // Go back to previous step
    setIsLoading(false)
    setPendingMessage('')
    // Determine which step to go back to
    if (txHash) {
      // We were minting, go back to mint step
      setStep('mint')
    } else {
      // We were approving, go back to approve step
      setStep('approve')
    }
    setError('Transaction cancelled')
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="mint-container">
      <div className="mint-card">
        {/* Header */}
        <div className="logo-section">
          <h1>ArcSign Pro</h1>
          <p className="subtitle">NFT Membership</p>
          {IS_TESTNET_MODE && (
            <span className="testnet-badge">TESTNET</span>
          )}
        </div>

        {/* Benefits */}
        <div className="benefits">
          <h3>Pro Benefits</h3>
          <ul>
            <li>Unlimited wallets (Free: 5)</li>
            <li>Earn points for future airdrop</li>
            <li>Priority support</li>
            <li>1 year validity</li>
          </ul>
        </div>

        {/* Price */}
        <div className="price-section">
          <span className="price">30 USDT</span>
          <span className="chain">on BNB Chain</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Step: Connect */}
        {step === 'connect' && (
          <div className="connect-section">
            <div className="wallet-status">
              <div className={`status-dot ${connectionStatus}`} />
              <span>
                {connectionStatus === 'disconnected' && 'ArcSign Wallet not connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'connected' && 'Connected - Waiting for unlock'}
                {connectionStatus === 'error' && 'Connection failed'}
              </span>
            </div>

            {connectionStatus === 'connected' ? (
              <>
                <div className="waiting-unlock">
                  <div className="spinner small" />
                  <p>Please unlock your wallet in ArcSign Dashboard</p>
                </div>
                <p className="help-text">
                  Insert your USB drive and enter your password to unlock the wallet.
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleConnect}
                  disabled={isLoading || connectionStatus === 'connecting'}
                  className="connect-btn"
                >
                  {isLoading ? 'Connecting...' : 'Connect ArcSign Wallet'}
                </button>

                <p className="help-text">
                  Make sure ArcSign Wallet is running on your computer.
                </p>
              </>
            )}
          </div>
        )}

        {/* Step: Select Address */}
        {step === 'select' && (
          <div className="select-section">
            <h3>Select Address</h3>
            <p className="select-description">
              Choose which BSC address to use for minting the NFT
            </p>
            <div className="address-list">
              {availableAccounts.map((acc, index) => (
                <button
                  key={acc}
                  className="address-option"
                  onClick={() => handleSelectAddress(acc)}
                >
                  <span className="address-index">Wallet {index + 1}</span>
                  <span className="address-value">{formatAddress(acc)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connected - Show address */}
        {address && step !== 'connect' && step !== 'select' && step !== 'success' && (
          <div className="wallet-info">
            <p>Connected: {formatAddress(address)}</p>
            <button onClick={handleDisconnect} className="disconnect-btn">
              Disconnect
            </button>
          </div>
        )}

        {/* Step: Pending */}
        {step === 'pending' && (
          <div className="pending-section">
            <div className="spinner" />
            <p>{pendingMessage}</p>
            <p className="help-text">
              Check ArcSign Wallet to confirm the transaction.
              You will need to insert your USB and enter your password.
            </p>
            <button
              onClick={handleCancelPending}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Step: Approve */}
        {step === 'approve' && !isLoading && (
          <div className="action-section">
            <p>Step 1: Approve USDT spending</p>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="action-btn"
            >
              Approve 30 USDT
            </button>
          </div>
        )}

        {/* Step: Mint */}
        {step === 'mint' && !isLoading && (
          <div className="action-section">
            <p>Step 2: Mint your Pro NFT</p>
            <button
              onClick={handleMint}
              disabled={isLoading}
              className="action-btn primary"
            >
              Mint Pro NFT
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="success-section">
            <h3>Welcome to ArcSign Pro!</h3>
            <p>Your membership is now active for 1 year.</p>
            {txHash && (
              <a
                href={`${BLOCK_EXPLORER_URL}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View Transaction
              </a>
            )}
          </div>
        )}
      </div>

      <footer>
        <p>Powered by ArcSign | BNB Chain</p>
        {IS_TESTNET_MODE && (
          <p className="testnet-notice">
            Contract: {formatAddress(CONTRACT_ADDRESS)}
          </p>
        )}
      </footer>
    </div>
  )
}
