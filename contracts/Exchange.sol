// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Exchange is ReentrancyGuard, Ownable, IERC721Receiver {
    IERC20 public SuperToken;
    ERC721URIStorage public SuperNFT;

    struct OpenTrade {
        address seller;
        uint256 nftTokenId;
        uint256 price;
        bytes32 status; // Open, Executed, Cancelled
    }
    mapping(uint256 => OpenTrade) public openForTrades;
    mapping(uint256 => bool) public areOpenForTrades;

    constructor(address superTokenAddress, address superNftAddress) {
        SuperToken = IERC20(superTokenAddress);
        SuperNFT = ERC721URIStorage(superNftAddress);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function sell(uint256 _nftTokenId, uint256 _price) public {
        require(
            !areOpenForTrades[_nftTokenId],
            "this tokenId already open for trade"
        );
        SuperNFT.safeTransferFrom(msg.sender, address(this), _nftTokenId);
        openForTrades[_nftTokenId] = OpenTrade({
            seller: msg.sender,
            nftTokenId: _nftTokenId,
            price: _price,
            status: "Open"
        });
        areOpenForTrades[_nftTokenId] = true;
    }

    function buy(uint256 _nftTokenId) public {
        OpenTrade memory trade = openForTrades[_nftTokenId];
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(trade.seller == owner() || msg.sender == owner(), "Could not transfer to other except Super Energy Company");
        // require(address(this) == SuperNFT.ownerOf(_nftTokenId) || owner() == SuperNFT.ownerOf(_nftTokenId), "Could not transfer to other except Super Energy Company");
        require(
            SuperToken.balanceOf(msg.sender) >= trade.price,
            "your balance is not enough"
        );
        SuperToken.transferFrom(msg.sender, trade.seller, trade.price);
        SuperNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        openForTrades[_nftTokenId].status = "Closed";
        areOpenForTrades[_nftTokenId] = false;
    }

    function cancelSell(uint256 _nftTokenId) public {
        OpenTrade memory trade = openForTrades[_nftTokenId];
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(trade.seller == msg.sender);
        SuperNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        openForTrades[_nftTokenId].status = "Cancel";
        areOpenForTrades[_nftTokenId] = false;
    }
}
