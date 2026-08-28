// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HeliosArena} from "../src/HeliosArena.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying HeliosArena from:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        HeliosArena arena = new HeliosArena();

        console.log("HeliosArena deployed to:", address(arena));

        // NOTE: depositForFees removed — users deposit RITUAL themselves when minting.
        // Each winner deposits ~0.15 RITUAL to cover Ritual image precompile fees.

        vm.stopBroadcast();

        console.log("==============================================");
        console.log("Deployment complete!");
        console.log("Contract address:", address(arena));
        console.log("Add to .env.local and Vercel:");
        console.log("NEXT_PUBLIC_HELIOS_ARENA_CONTRACT=", address(arena));
        console.log("==============================================");
    }
}
