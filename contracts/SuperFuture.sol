// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "contracts/FuturePrice.sol";
import "hardhat/console.sol";

contract SuperFuture is
    ERC1155,
    AccessControl,
    Pausable,
    ERC1155Burnable,
    ERC1155Supply,
    Ownable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    address public exchange;
    FutureTokenPrice public futureTokenPrice;
    mapping(uint256 => uint256) public expiredOfToken;
    using Counters for Counters.Counter;
    Counters.Counter private _idCounter;

    constructor(string memory _uri, address _futureTokenPrice) ERC1155(_uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        futureTokenPrice = FutureTokenPrice(_futureTokenPrice);
    }

    function setURI(string memory newuri) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        require(expiredOfToken[id] > 0, "future token does not create yet");
        require(
            id < _idCounter.current(),
            "future token id does not create yet. id should less than counter"
        );
        _mint(account, id, amount, data);
    }

    function createNew(
        address account,
        uint256 amount,
        uint256 expire,
        bytes32 keyForPrice,
        uint256 price,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        _idCounter.increment();
        uint256 id = _idCounter.current();
        require(expiredOfToken[id] == 0, "future token already exists");
        _mint(account, id, amount, data);
        expiredOfToken[id] = expire;
        futureTokenPrice.setPriceForFutureTokenId(id, keyForPrice, price);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256[] memory expires,
        bytes memory data
    ) public onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, data);
        for (uint256 i = 0; i < expires.length; i++) {
            expiredOfToken[ids[i]] = expires[i];
        }
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        if (operator != exchange) {
            require(
                from == owner() ||
                    from == exchange ||
                    to == owner() ||
                    to == exchange,
                "Could not transfer between person (from == owner) or (to == owner)"
            );
        }
    }

    function setExchangeAddress(address _exchangeAddress) external onlyOwner {
        exchange = _exchangeAddress;
    }

    function getLatestIdCreated() public view returns (uint256) {
        return _idCounter.current();
    }

    struct FutureTokenData {
        uint256 futureTokenId;
        uint256 totalSupply;
        uint256 balance;
        uint256 expire;
        uint256 currentPrice;
    }

    function getFutureTokenData(address userAddress, uint256 _futureTokenId)
        public
        view
        returns (FutureTokenData memory)
    {
        return
            FutureTokenData({
                futureTokenId: _futureTokenId,
                totalSupply: totalSupply(_futureTokenId),
                balance: balanceOf(userAddress, _futureTokenId),
                expire: expiredOfToken[_futureTokenId],
                currentPrice: futureTokenPrice.getPriceForFutureTokenId(
                    _futureTokenId
                )
            });
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
