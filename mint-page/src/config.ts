import { http, createConfig } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// Environment detection
const IS_TESTNET = import.meta.env.VITE_NETWORK === 'testnet' || import.meta.env.DEV

// Contract addresses
// CANONICAL SOURCE: dashboard/src/constants/contracts.ts
// Keep these addresses in sync with the dashboard constants
// Mainnet (deployed 2026-01-06)
const MAINNET_CONTRACT = '0x02EA7B4870Aa0553EF357Af6475727f1E01c7b2F' as `0x${string}`
const MAINNET_USDT = '0x55d398326f99059fF775485246999027B3197955' as `0x${string}`

// Testnet (deployed 2024-12-23)
const TESTNET_CONTRACT = '0x6CB59d29BE5b618eeca9Bc5374648477256f109A' as `0x${string}`
const TESTNET_USDT = '0x7ef95a0fee0dd31b22626fa2e10ee6a223f8a684' as `0x${string}`

// Use testnet in development, mainnet in production
export const CONTRACT_ADDRESS = IS_TESTNET ? TESTNET_CONTRACT : MAINNET_CONTRACT
export const USDT_ADDRESS = IS_TESTNET ? TESTNET_USDT : MAINNET_USDT
export const IS_TESTNET_MODE = IS_TESTNET

// Block explorer URL
export const BLOCK_EXPLORER_URL = IS_TESTNET
  ? 'https://testnet.bscscan.com'
  : 'https://bscscan.com'

// Membership price: 30 USDT (18 decimals)
export const MEMBERSHIP_PRICE = BigInt('30000000000000000000')

// WalletConnect project ID (get from https://cloud.walletconnect.com)
const projectId = 'YOUR_PROJECT_ID'

export const config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
})

// ArcSign Pro NFT ABI (only the functions we need)
export const ArcSignProABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'renew',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'isValidMember',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getMemberships',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'expirations', type: 'uint256[]' },
      { name: 'valid', type: 'bool[]' },
    ],
  },
  {
    name: 'timeUntilExpiry',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'PRICE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// USDT ABI (only approve and allowance)
export const USDTABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
