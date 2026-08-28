"use client"

import { useAccount, useConnect, useDisconnect, useSwitchChain, useBalance } from "wagmi"
import { useEffect } from "react"
import { ritualChain } from "@/lib/wagmi-config"
import { injected } from "wagmi/connectors"
import { formatEther } from "viem"

declare global {
  interface Window { ethereum?: any }
}

export function useWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const { data: balanceData } = useBalance({
    address,
    chainId: ritualChain.id,
    query: { enabled: !!address && chain?.id === ritualChain.id }
  })

  // Persist wallet to localStorage for battle flow pages
  useEffect(() => {
    if (address) {
      localStorage.setItem("wallet", address)
    } else {
      localStorage.removeItem("wallet")
    }
  }, [address])

  const addRitualNetwork = async () => {
    if (!window.ethereum) return
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x7BB", // 1979 in hex
          chainName: "Ritual Chain",
          nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
          rpcUrls: ["https://rpc.ritualfoundation.org"],
          blockExplorerUrls: ["https://explorer.ritualfoundation.org"],
        }],
      })
    } catch (error) {
      console.error("Failed to add Ritual network:", error)
    }
  }

  const switchToRitual = async () => {
    try {
      switchChain({ chainId: ritualChain.id })
    } catch {
      await addRitualNetwork()
    }
  }

  const connectWallet = async () => {
    // Disconnect if already connected
    if (isConnected) {
      disconnect()
      localStorage.removeItem("wallet")
      localStorage.removeItem("current_match")
      return
    }

    // No MetaMask installed
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank")
      return
    }

    // Connect using injected connector (MetaMask/Rabby/any browser wallet)
    connect(
      { connector: injected() },
      {
        onSuccess: async () => {
          // Switch to Ritual Chain after connecting
          try {
            switchChain({ chainId: ritualChain.id })
          } catch {
            await addRitualNetwork()
          }
        },
        onError: (err) => {
          console.error("Wallet connection failed:", err)
        }
      }
    )
  }

  const disconnectWallet = () => {
    disconnect()
    localStorage.removeItem("wallet")
    localStorage.removeItem("current_match")
  }

  const isOnRitualChain = chain?.id === ritualChain.id
  const ritualBalance = balanceData
    ? parseFloat(formatEther(balanceData.value)).toFixed(3)
    : null

  return {
    wallet: address || null,
    isConnected,
    isConnecting,
    isOnRitualChain,
    ritualBalance,
    chain,
    connectWallet,
    disconnectWallet,
    switchToRitual,
    addRitualNetwork,
  }
}