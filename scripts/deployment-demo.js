const fs = require('fs');
const path = require('path');

// Ritual Chain configuration
const RITUAL_CHAIN = {
  chainId: 1979,
  name: 'Ritual',
  rpcUrls: ['https://rpc.ritualfoundation.org'],
  nativeCurrency: {
    name: 'RITUAL',
    symbol: 'RITUAL',
    decimals: 18
  }
};

function showDeploymentInfo() {
  console.log('🚀 Helios Arena - Ritual Chain Deployment');
  console.log('==========================================');
  
  console.log('\n📋 Chain Configuration:');
  console.log('  Chain ID:', RITUAL_CHAIN.chainId);
  console.log('  Name:', RITUAL_CHAIN.name);
  console.log('  RPC URL:', RITUAL_CHAIN.rpcUrls[0]);
  console.log('  Currency:', RITUAL_CHAIN.nativeCurrency.name, `(${RITUAL_CHAIN.nativeCurrency.symbol})`);
  
  console.log('\n🎯 Contract Features:');
  console.log('  ✅ Battle result storage on-chain');
  console.log('  ✅ AI image generation via Ritual precompile (0x0818)');
  console.log('  ✅ ERC-721 NFT minting for winners');
  console.log('  ✅ IPFS storage integration via Pinata');
  console.log('  ✅ Winner-only access control');
  console.log('  ✅ Async 2-phase delivery for image generation');
  
  console.log('\n🔗 System Contract Addresses:');
  console.log('  Image Precompile:    0x0000000000000000000000000000000000000818');
  console.log('  RitualWallet:        0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948');
  console.log('  AsyncDelivery:       0x5A16214fF555848411544b005f7Ac063742f39F6');
  console.log('  TEE Service Registry:0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F');
  
  console.log('\n📝 Contract Functions:');
  console.log('  • recordBattleResult() - Store battle data');
  console.log('  • generateBattleImage() - Trigger AI image generation');
  console.log('  • mintVictoryNFT() - Mint NFT to winner only');
  console.log('  • getBattle() - Retrieve battle details');
  console.log('  • onImageReady() - Callback for image results');
  
  console.log('\n🔧 Deployment Steps:');
  console.log('  1. Install Foundry:');
  console.log('     curl -L https://foundry.paradigm.xyz | bash');
  console.log('     foundryup');
  
  console.log('\n  2. Setup Environment:');
  console.log('     cd contracts');
  console.log('     cp .env.example .env');
  console.log('     # Edit .env with your PRIVATE_KEY');
  
  console.log('\n  3. Install Dependencies:');
  console.log('     forge install OpenZeppelin/openzeppelin-contracts');
  
  console.log('\n  4. Compile Contract:');
  console.log('     forge build');
  
  console.log('\n  5. Run Tests:');
  console.log('     forge test -vvv');
  
  console.log('\n  6. Deploy to Ritual Chain:');
  console.log('     forge script script/Deploy.s.sol --rpc-url $RITUAL_RPC_URL --broadcast');
  
  console.log('\n  7. Verify Contract:');
  console.log('     forge verify-contract \\');
  console.log('       --chain 1979 \\');
  console.log('       --watch \\');
  console.log('       --verifier custom \\');
  console.log('       --verifier-url "$RITUAL_VERIFIER_URL" \\');
  console.log('       --verifier-api-key unused \\');
  console.log('       <CONTRACT_ADDRESS> \\');
  console.log('       src/HeliosArena.sol:HeliosArena');
  
  console.log('\n💰 Fee Requirements:');
  console.log('  • Image generation: ~0.15 RITUAL per image');
  console.log('  • Lock duration: 100,000 blocks (~9.7 hours)');
  console.log('  • Get testnet RITUAL: https://faucet.ritualfoundation.org');
  
  console.log('\n🎮 Usage Example:');
  console.log('  1. Record battle: recordBattleResult(winner, loser, "Dragon", "Phoenix", "Epic story")');
  console.log('  2. Generate image: generateBattleImage(matchId)');
  console.log('  3. Wait for callback (async image generation)');
  console.log('  4. Mint NFT: mintVictoryNFT(matchId) (winner only)');
  
  console.log('\n🌐 Frontend Integration:');
  console.log('  NEXT_PUBLIC_HELIOS_ARENA_CONTRACT=<deployed_address>');
  console.log('  NEXT_PUBLIC_RITUAL_RPC_URL=https://rpc.ritualfoundation.org');
  
  // Create deployment info file
  const deploymentInfo = {
    chainId: RITUAL_CHAIN.chainId,
    contractName: 'HeliosArena',
    symbol: 'HELIOS',
    systemContracts: {
      imagePrecompile: '0x0000000000000000000000000000000000000818',
      ritualWallet: '0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948',
      asyncDelivery: '0x5A16214fF555848411544b005f7Ac063742f39F6',
      teeServiceRegistry: '0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F'
    },
    features: [
      'Battle result storage',
      'AI image generation via Ritual precompile',
      'ERC-721 NFT minting',
      'IPFS storage integration',
      'Winner-only minting access control',
      'Async 2-phase delivery'
    ],
    deploymentSteps: [
      'Install Foundry',
      'Setup environment with private key',
      'Install OpenZeppelin contracts',
      'Compile with forge build',
      'Deploy with forge script',
      'Verify on block explorer'
    ],
    feeRequirements: {
      imageGeneration: '0.15 RITUAL',
      lockDuration: '100,000 blocks (~9.7 hours)',
      faucet: 'https://faucet.ritualfoundation.org'
    },
    explorer: 'https://explorer.ritualfoundation.org',
    rpc: 'https://rpc.ritualfoundation.org'
  };
  
  // Save deployment info
  fs.writeFileSync(
    path.join(__dirname, '../deployment-info.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('\n✅ Deployment configuration saved to deployment-info.json');
  console.log('\n🎯 Ready for deployment! Follow the steps above to complete.');
}

// Run deployment info
showDeploymentInfo();
