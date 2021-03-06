// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract SuperNFT is ERC721URIStorage, ERC721Burnable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address public exchange;

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function setExchangeAddress(address _exchangeAddress) external onlyOwner {
        exchange = _exchangeAddress;
    }

    function createNFT(string memory tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        console.log(
            "safeTransfer from: %s, to: %s, tokenId: %s",
            from,
            to,
            tokenId
        );
        // require(msg.sender == ownerOf(tokenId) || owner() == ownerOf(tokenId), "Could not transfer to other except Super Energy Company");
        require(
            from == owner() ||
                from == exchange ||
                to == owner() ||
                to == exchange,
            "Cound not safe transfer between person (from should be owner or exchange) or (to should be owner or exchange) "
        );
        safeTransferFrom(from, to, tokenId, "");
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        console.log(
            "transfer from: %s, to: %s, tokenId: %s",
            from,
            to,
            tokenId
        );
        require(
            from == owner() ||
                from == exchange ||
                to == owner() ||
                to == exchange,
            "Cound not transfer between person (from should be owner or exchange) or (to should be owner or exchange) "
        );
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );

        _transfer(from, to, tokenId);
    }
}
