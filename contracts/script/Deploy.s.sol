// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.30;

import {Script, console} from "forge-std/Script.sol";

contract Deploy is Script {
    function run() external {
        // Use the existing canonical WETH if WETH_ADDRESS is set, otherwise deploy a fresh WETH9.
        address weth = vm.envOr("WETH_ADDRESS", address(0));
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        address factory = deployCode("UniswapV2Factory.sol:UniswapV2Factory", abi.encode(deployer));
        if (weth == address(0)) {
            weth = deployCode("WETH9.sol:WETH9");
        }
        address router = deployCode("UniswapV2Router02.sol:UniswapV2Router02", abi.encode(factory, weth));
        vm.stopBroadcast();

        bytes32 initCodeHash = keccak256(vm.getCode("UniswapV2Pair.sol:UniswapV2Pair"));
        console.log("factory:", factory);
        console.log("weth:", weth);
        console.log("router:", router);
        console.logBytes32(initCodeHash);
        string memory json = "deployment";
        vm.serializeAddress(json, "factory", factory);
        vm.serializeAddress(json, "weth", weth);
        vm.serializeAddress(json, "router", router);
        string memory out = vm.serializeBytes32(json, "initCodeHash", initCodeHash);
        vm.writeJson(out, "./deployment-190415.json");
    }
}
