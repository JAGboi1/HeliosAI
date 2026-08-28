import { NextRequest, NextResponse } from "next/server"

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY
const ALCHEMY_BASE    = `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wallet    = searchParams.get("wallet")
  const contractAddress = searchParams.get("contract")
  const tokenId   = searchParams.get("tokenId")

  if (!ALCHEMY_API_KEY) {
    return NextResponse.json({ error: "Alchemy API key not configured" }, { status: 500 })
  }

  // ── Fetch single NFT metadata ─────────────────────────────────────────────
  if (contractAddress && tokenId) {
    try {
      const res  = await fetch(
        `${ALCHEMY_BASE}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`
      )
      const data = await res.json()

      return NextResponse.json({
        contractAddress: data.contract?.address,
        tokenId:         data.tokenId,
        name:            data.name || `NFT #${tokenId}`,
        description:     data.description || "",
        imageUrl:        data.image?.cachedUrl || data.image?.originalUrl || "",
        traits:          data.raw?.metadata?.attributes || [],
        collectionName:  data.contract?.name || "Unknown Collection",
        collectionSymbol: data.contract?.symbol || "",
      })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }

  // ── Fetch all NFTs for a wallet ───────────────────────────────────────────
  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  try {
    const res  = await fetch(
      `${ALCHEMY_BASE}/getNFTsForOwner?owner=${wallet}&withMetadata=true&pageSize=50`
    )
    const data = await res.json()

    const nfts = (data.ownedNfts || [])
      .filter((nft: any) => nft.image?.cachedUrl || nft.image?.originalUrl)
      .map((nft: any) => ({
        contractAddress:  nft.contract?.address || "",
        tokenId:          nft.tokenId || "",
        name:             nft.name || `${nft.contract?.name || "NFT"} #${nft.tokenId}`,
        description:      nft.description || "",
        imageUrl:         nft.image?.cachedUrl || nft.image?.originalUrl || "",
        traits:           nft.raw?.metadata?.attributes || [],
        collectionName:   nft.contract?.name || "Unknown Collection",
        collectionSymbol: nft.contract?.symbol || "",
        floorPrice:       nft.contract?.openSeaMetadata?.floorPrice || null,
      }))

    return NextResponse.json({ nfts, total: nfts.length })
  } catch (err: any) {
    console.error("Alchemy fetch error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}