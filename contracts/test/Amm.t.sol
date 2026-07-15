// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {TestERC20} from "./helpers/TestERC20.sol";

interface IRouter {
    function addLiquidity(address,address,uint,uint,uint,uint,address,uint)
        external returns (uint,uint,uint);
    function removeLiquidity(address,address,uint,uint,uint,address,uint)
        external returns (uint,uint);
    function swapExactTokensForTokens(uint,uint,address[] calldata,address,uint)
        external returns (uint[] memory);
    function getAmountsOut(uint, address[] calldata) external view returns (uint[] memory);
}
interface IFactory { function getPair(address,address) external view returns (address); }
interface IPair {
    function getReserves() external view returns (uint112,uint112,uint32);
    function balanceOf(address) external view returns (uint);
    function approve(address,uint) external returns (bool);
    function totalSupply() external view returns (uint);
}

contract AmmTest is Test {
    address factory; address router; address weth;
    TestERC20 tokenA; TestERC20 tokenB;

    function setUp() public {
        factory = deployCode("UniswapV2Factory.sol:UniswapV2Factory", abi.encode(address(this)));
        weth = deployCode("WETH9.sol:WETH9");
        router = deployCode("UniswapV2Router02.sol:UniswapV2Router02", abi.encode(factory, weth));
        tokenA = new TestERC20("Token A", "TKA", 1_000_000 ether);
        tokenB = new TestERC20("Token B", "TKB", 1_000_000 ether);
        tokenA.approve(router, type(uint256).max);
        tokenB.approve(router, type(uint256).max);
    }

    function _addLiquidity(uint a, uint b) internal returns (address pair) {
        IRouter(router).addLiquidity(address(tokenA), address(tokenB), a, b, 0, 0, address(this), block.timestamp + 1);
        pair = IFactory(factory).getPair(address(tokenA), address(tokenB));
    }

    function test_addLiquidity_createsPairAndMintsLp() public {
        address pair = _addLiquidity(100 ether, 400 ether);
        assertGt(IPair(pair).balanceOf(address(this)), 0);
        (uint112 r0, uint112 r1,) = IPair(pair).getReserves();
        assertEq(uint(r0) * uint(r1), 100 ether * 400 ether);
    }

    function test_swapExactTokensForTokens_movesPrice() public {
        _addLiquidity(1000 ether, 1000 ether);
        address[] memory path = new address[](2);
        path[0] = address(tokenA); path[1] = address(tokenB);
        uint[] memory amounts = IRouter(router).getAmountsOut(1 ether, path);
        uint expectedOut = amounts[1];
        uint balBefore = tokenB.balanceOf(address(this));
        IRouter(router).swapExactTokensForTokens(1 ether, expectedOut, path, address(this), block.timestamp + 1);
        assertEq(tokenB.balanceOf(address(this)) - balBefore, expectedOut);
        // 0.3% fee: out < in * reserveOut/reserveIn
        assertLt(expectedOut, 1 ether);
    }

    function test_removeLiquidity_returnsTokens() public {
        address pair = _addLiquidity(100 ether, 100 ether);
        uint lp = IPair(pair).balanceOf(address(this));
        IPair(pair).approve(router, lp);
        (uint outA, uint outB) = IRouter(router).removeLiquidity(
            address(tokenA), address(tokenB), lp, 0, 0, address(this), block.timestamp + 1);
        assertGt(outA, 0); assertGt(outB, 0);
    }

    function testFuzz_swapNeverDrainsReserves(uint96 amountIn) public {
        vm.assume(amountIn > 1000);
        _addLiquidity(1000 ether, 1000 ether);
        address[] memory path = new address[](2);
        path[0] = address(tokenA); path[1] = address(tokenB);
        uint[] memory amounts = IRouter(router).getAmountsOut(amountIn, path);
        assertLt(amounts[1], 1000 ether, "output must be below reserve");
    }
}
