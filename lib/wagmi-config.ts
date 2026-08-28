import { createConfig, http } from "wagmi"
import { defineChain } from "viem"
import { injected } from "wagmi/connectors"

// Ritual Chain Testnet
export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual Chain",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ritualfoundation.org"],
      webSocket: ["wss://rpc.ritualfoundation.org/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [
    injected(), // works with MetaMask, Rabby, Coinbase Wallet, any injected wallet
  ],
  transports: {
    [ritualChain.id]: http("https://rpc.ritualfoundation.org"),
  },
})