// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {IUniswapV2Factory} from "../src/core/interfaces/IUniswapV2Factory.sol";

contract InitCodeHashTest is Test {
    // Must stay in sync with the hardcoded hash inside
    // src/periphery/libraries/UniswapV2Library.sol's pairFor(). UniswapV2Library.sol cannot
    // be imported here directly: it transitively imports libraries/SafeMath.sol, which is
    // pinned to `pragma solidity =0.6.6`, incompatible with this file's `pragma ^0.8.30`.
    // Instead, both tests below pin this literal and assert it against the actually-compiled
    // UniswapV2Pair bytecode, so any drift (e.g. a solc/optimizer change reproducing a
    // different UniswapV2Pair init code) fails loudly here.
    bytes32 constant EXPECTED_PAIR_INIT_CODE_HASH = 0x5800ffe4b53beb540183bd1f16bf7fa0957897af8ffe1266f1a1c30ea0b58b72;

    function test_printInitCodeHash() public {
        bytes memory creationCode = vm.getCode("UniswapV2Pair.sol:UniswapV2Pair");
        bytes32 hash = keccak256(creationCode);
        emit log_named_bytes32("INIT_CODE_HASH", hash);
        assertEq(hash, EXPECTED_PAIR_INIT_CODE_HASH, "UniswapV2Library.pairFor init code hash is stale");
    }

    // Locks in that UniswapV2Library.pairFor's hardcoded init code hash matches this
    // repo's actually-compiled UniswapV2Pair bytecode, by comparing the CREATE2 address
    // predicted with EXPECTED_PAIR_INIT_CODE_HASH against the address the factory actually
    // deploys via `new UniswapV2Pair()`.
    function test_pairForMatchesFactory() public {
        address factory = deployCode("UniswapV2Factory.sol:UniswapV2Factory", abi.encode(address(this)));
        address tokenA = makeAddr("tokenA");
        address tokenB = makeAddr("tokenB");
        // createPair only stores addresses and does not require code at tokenA/tokenB,
        // so plain EOA-style addresses from makeAddr are sufficient here.
        address created = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        address predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            hex"ff", factory, keccak256(abi.encodePacked(t0, t1)), EXPECTED_PAIR_INIT_CODE_HASH)))));
        assertEq(created, predicted, "pairFor hash mismatch");
    }
}
