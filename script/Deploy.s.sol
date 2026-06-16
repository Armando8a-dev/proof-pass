// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/ProofPass.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        ProofPass pass = new ProofPass(msg.sender);
        console.log("ProofPass deployed at:", address(pass));
        vm.stopBroadcast();
    }
}
