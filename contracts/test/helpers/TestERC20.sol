// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.30;

contract TestERC20 {
    string public name; string public symbol; uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol, uint256 supply) {
        name = _name; symbol = _symbol;
        totalSupply = supply; balanceOf[msg.sender] = supply;
    }
    function transfer(address to, uint256 v) external returns (bool) {
        balanceOf[msg.sender] -= v; balanceOf[to] += v; return true;
    }
    function transferFrom(address f, address t, uint256 v) external returns (bool) {
        if (allowance[f][msg.sender] != type(uint256).max) allowance[f][msg.sender] -= v;
        balanceOf[f] -= v; balanceOf[t] += v; return true;
    }
    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v; return true;
    }
}
