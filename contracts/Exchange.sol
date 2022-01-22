// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "contracts/SuperNFT.sol";

contract Exchange is ReentrancyGuard, Ownable, IERC721Receiver {
    IERC20 public superToken;
    SuperNFT public superNFT;

    struct OpenTrade {
        address seller;
        uint256 nftTokenId;
        uint256 price;
        bytes32 status; // Open, Executed, Cancelled, CO2
    }
    // nft tokenId => OpenTrade
    mapping(uint256 => OpenTrade) public openForTrades;
    // nftTokenId => boolean
    mapping(uint256 => bool) public areOpenForTrades;
    // TODO: separate which nft sell from owner and others keep for direct buy
    uint256[] public nftOpenForTradeArray;

    struct UsedNFT {
        address customer;
        uint256 tokenId;
        string tokenURI;
    }

    UsedNFT[] public usedNFTs;

    // event Sell(OpenTrade _newOpenTrade);
    event UpdateUsedNFT(UsedNFT[] _usedNFTs, uint256[] _nftOpenForTradeArray);

    constructor(address superTokenAddress, address superNftAddress) {
        superToken = IERC20(superTokenAddress);
        superNFT = SuperNFT(superNftAddress);
    }

    function getAllNFTOpenForTrades() public view returns (uint256[] memory) {
        return nftOpenForTradeArray;
    }

    function getUsedNFTs() public view returns (UsedNFT[] memory) {
        return usedNFTs;
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
        superNFT.safeTransferFrom(msg.sender, address(this), _nftTokenId);
        openForTrades[_nftTokenId] = OpenTrade({
            seller: msg.sender,
            nftTokenId: _nftTokenId,
            price: _price,
            status: "Open"
        });
        areOpenForTrades[_nftTokenId] = true;
        nftOpenForTradeArray.push(_nftTokenId);
    }

    function buy(uint256 _nftTokenId) public {
        OpenTrade memory trade = openForTrades[_nftTokenId];
        require(msg.sender != trade.seller, "Seller do not need to buy back. Please cancel sell instead");
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(trade.seller == owner() || msg.sender == owner(), "Could not transfer to other except Super Energy Company");
        // require(address(this) == SuperNFT.ownerOf(_nftTokenId) || owner() == SuperNFT.ownerOf(_nftTokenId), "Could not transfer to other except Super Energy Company");
        require(
            superToken.balanceOf(msg.sender) >= trade.price,
            "your balance is not enough"
        );
        superToken.transferFrom(msg.sender, trade.seller, trade.price);
        superNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        openForTrades[_nftTokenId].status = "Closed";
        areOpenForTrades[_nftTokenId] = false;
        _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
    }

    function cancelSell(uint256 _nftTokenId) public {
        OpenTrade memory trade = openForTrades[_nftTokenId];
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(trade.seller == msg.sender);
        superNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        openForTrades[_nftTokenId].status = "Cancel";
        areOpenForTrades[_nftTokenId] = false;
        _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
    }

    function directBuyCo2FromToken(uint256 _nftTokenId) external {
        OpenTrade memory trade = openForTrades[_nftTokenId];
        require(nftOpenForTradeArray.length > 0, "no any open trade");
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(msg.sender != owner(), "buyer cannot be owner");
        require(trade.seller == owner(), "seller should be owner");
        require(superToken.balanceOf(msg.sender) >= trade.price, "your balance is not enough");
        superToken.transferFrom(msg.sender, trade.seller, trade.price);
        UsedNFT memory used = createUsedNFT(_nftTokenId);
        usedNFTs.push(used);
        openForTrades[_nftTokenId].status = "CO2";
        _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
        superNFT.burn(_nftTokenId);
        emit UpdateUsedNFT(usedNFTs, nftOpenForTradeArray);
    }

    function transformNFTToCo2Credit(uint256 _nftTokenId) external {
        // OpenTrade memory trade = openForTrades[_nftTokenId];
        // require(nftOpenForTrade.length > 0);
        // require(
        //     trade.status == "Open",
        //     "this NFT TokenId is not open for trade"
        // );
        require(msg.sender == superNFT.ownerOf(_nftTokenId), "owner of nft must be msg.sender");
        require(msg.sender != owner(), "buyer cannot be owner");
        UsedNFT memory used = createUsedNFT(_nftTokenId);
        usedNFTs.push(used);
        openForTrades[_nftTokenId].status = "CO2";
        // _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
        superNFT.burn(_nftTokenId);
        emit UpdateUsedNFT(usedNFTs, nftOpenForTradeArray);
    }


    // helpers
    function createUsedNFT(uint256 _nftTokenId) private view returns (UsedNFT memory) {
        UsedNFT memory used = UsedNFT(msg.sender, _nftTokenId, superNFT.tokenURI(_nftTokenId));
        return used;
    }
    function _removeTokenIdFromNFTOpenForTrade(uint256 _nftTokenId) private {
        // remove tokenId from nftOpenForTrade
        require(nftOpenForTradeArray.length > 0, "nftOpenForTradeArray should contain at least 1 item");
        if (nftOpenForTradeArray.length == 1) {
            nftOpenForTradeArray.pop();
            return;
        }else{
            // uint256 indx = 0;
            for (uint256 i = 0; i < nftOpenForTradeArray.length; i++) {
                if (i == _nftTokenId) {
                    // indx = uint256(i);
                    nftOpenForTradeArray[i] = nftOpenForTradeArray[nftOpenForTradeArray.length - 1];
                    nftOpenForTradeArray.pop();
                    break;
                }
            }
        }
        
    }
}
