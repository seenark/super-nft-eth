// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";
import "contracts/SuperFuture.sol";
import "contracts/FuturePrice.sol";

contract Exchange is ReentrancyGuard, Ownable, IERC1155Receiver {
    // TODO: collect expired future tokens and distributed to customers
    FutureTokenPrice public futureTokenPriceFeed;

    constructor(
        address superTokenAddress,
        address superFutureAddress,
        address _futureTokenPriceFeed
    ) {
        superToken = IERC20(superTokenAddress);
        superFuture = SuperFuture(superFutureAddress);
        futureTokenPriceFeed = FutureTokenPrice(_futureTokenPriceFeed);
    }

    using Counters for Counters.Counter;
    Counters.Counter private _sellCounter;

    IERC20 public superToken;
    SuperFuture public superFuture;

    struct OpenTrade {
        uint256 sellId;
        address seller;
        uint256 futureTokenId;
        uint256 amount;
        bytes32 status; // Open, Executed, Cancelled, CO2
    }

    // // futureTokenId => array of sellId
    // mapping(uint256 => uint256[]) futureTokenIdToSellIdList;

    //     function getAllSellIdForFutureTokenId(uint256 _futureTokenId)
    //     public
    //     view
    //     returns (uint256[] memory)
    // {
    //     return futureTokenIdToSellIdList[_futureTokenId];
    // }

    // function _removeSellIdFromList(uint256 _futureTokenId, uint256 _sellId)
    //     private
    // {
    //     uint256[] storage sellToken = futureTokenIdToSellIdList[_futureTokenId];
    //     require(
    //         sellToken.length > 0,
    //         "futureTokenIdToSellIdList should contain at least 1 item"
    //     );

    //     if (sellToken.length == 1) {
    //         sellToken.pop();
    //         return;
    //     } else {
    //         // uint256 indx = 0;
    //         for (uint256 i = 0; i < sellToken.length; i++) {
    //             if (i == _sellId) {
    //                 // indx = uint256(i);
    //                 sellToken[i] = sellToken[sellToken.length - 1];
    //                 sellToken.pop();
    //                 break;
    //             }
    //         }
    //     }
    // }

    // sellId => OpenTrade
    mapping(uint256 => OpenTrade) public openForTrades;
    // TODO: separate which nft sell from owner and others keep for direct buy
    uint256[] public sellIdOpenForTradeArray;

    function getAllSellIdOpenForTrades()
        public
        view
        returns (uint256[] memory)
    {
        return sellIdOpenForTradeArray;
    }

    function getAllOwnerSellIdsForOpenTrade()
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory ids;
        for (uint256 i = 0; i < sellIdOpenForTradeArray.length; i++) {
            uint256 sellId = sellIdOpenForTradeArray[i];
            OpenTrade memory trade = openForTrades[sellId];
            if (trade.seller == owner()) {
                ids[i] = sellId;
            }
        }
        return ids;
    }

    function _removeTokenIdFromNFTOpenForTrade(uint256 _nftTokenId) private {
        // remove tokenId from nftOpenForTrade
        require(
            sellIdOpenForTradeArray.length > 0,
            "sellIdOpenForTradeArray should contain at least 1 item"
        );
        if (sellIdOpenForTradeArray.length == 1) {
            sellIdOpenForTradeArray.pop();
            return;
        } else {
            // uint256 indx = 0;
            for (uint256 i = 0; i < sellIdOpenForTradeArray.length; i++) {
                if (i == _nftTokenId) {
                    // indx = uint256(i);
                    sellIdOpenForTradeArray[i] = sellIdOpenForTradeArray[
                        sellIdOpenForTradeArray.length - 1
                    ];
                    sellIdOpenForTradeArray.pop();
                    break;
                }
            }
        }
    }

    // nftTokenId => boolean
    // mapping(uint256 => bool) public areOpenForTrades;

    struct UsedNFT {
        address customer;
        uint256 tokenId;
        uint256 amount;
    }

    UsedNFT[] public usedNFTs;

    function createUsedNFT(uint256 _futureTokenId, uint256 _amount)
        private
        view
        returns (UsedNFT memory)
    {
        UsedNFT memory used = UsedNFT({
            customer: msg.sender,
            tokenId: _futureTokenId,
            amount: _amount
        });
        return used;
    }

    // mapping(uint256 => uint256) public futureTokenPrices;
    // event Sell(OpenTrade _newOpenTrade);
    event UpdateUsedNFT(
        UsedNFT[] _usedNFTs,
        uint256[] _sellIdOpenForTradeArray
    );
    event UpdateOpenTradeList(uint256[] _sellIdOpenForTradeArray);

    function getUsedNFTs() public view returns (UsedNFT[] memory) {
        return usedNFTs;
    }

    // function setPriceForFutureTokenId(uint256 _futureTokenId, uint256 _price)
    //     public
    // {
    //     futureTokenPrices[_futureTokenId] = _price;
    // }

    // function setPriceForFutureTokenIdBatch(
    //     uint256[] memory _futureTokenIds,
    //     uint256[] memory _prices
    // ) public {
    //     for (uint256 i = 0; i < _futureTokenIds.length; i++) {
    //         futureTokenPrices[_futureTokenIds[i]] = _prices[i];
    //     }
    // }

    function sell(uint256 _futureTokenId, uint256 _amount) public {
        // require(
        //     !areOpenForTrades[_nftTokenId],
        //     "this tokenId already open for trade"
        // );
        // superFuture.safeTransferFrom(msg.sender, address(this), _nftTokenId);
        require(_amount > 0, "amount less than 1");
        uint256 expired = superFuture.expiredOfToken(_futureTokenId);
        require(
            block.timestamp < expired,
            "cannot sell due to future token expired"
        );
        require(
            superFuture.balanceOf(msg.sender, _futureTokenId) >= _amount,
            "sell future tokens exceed your balance"
        );
        superFuture.safeTransferFrom(
            msg.sender,
            address(this),
            _futureTokenId,
            _amount,
            "0x00"
        );

        _sellCounter.increment();
        uint256 newSellId = _sellCounter.current();

        openForTrades[newSellId] = OpenTrade({
            sellId: newSellId,
            seller: msg.sender,
            futureTokenId: _futureTokenId,
            amount: _amount,
            status: "Open"
        });
        // areOpenForTrades[_futureTokenId] = true;
        sellIdOpenForTradeArray.push(newSellId);
        // futureTokenIdToSellIdList[_futureTokenId].push(newSellId);
        // if (msg.sender == owner()) {
        //     ownerAddressToFutureTokenIdToSellId[msg.sender][_futureTokenId].push(newSellId);
        // }
        emit UpdateOpenTradeList(sellIdOpenForTradeArray);
    }

    function buy(uint256 _sellId, uint256 _amount) public {
        OpenTrade storage trade = openForTrades[_sellId];
        require(
            msg.sender != trade.seller,
            "Seller do not need to buy back. Please cancel sell instead"
        );
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(
            trade.seller == owner() || msg.sender == owner(),
            "Could not transfer to other except Super Energy Company"
        );
        require(
            trade.amount >= _amount,
            "future token for sell is less than amount you want to buy"
        );
        uint256 pricePerToken = futureTokenPriceFeed.getPriceForFutureTokenId(
            trade.futureTokenId
        );
        uint256 neededToken = _amount * pricePerToken;
        require(
            superToken.balanceOf(msg.sender) >= neededToken,
            "your balance is not enough"
        );

        superToken.transferFrom(msg.sender, trade.seller, neededToken);
        // superNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        superFuture.safeTransferFrom(
            address(this),
            msg.sender,
            trade.futureTokenId,
            _amount,
            "0x00"
        );

        trade.amount -= _amount;

        if (trade.amount <= 0) {
            openForTrades[_sellId].status = "Closed";
            // _removeSellIdFromList(trade.futureTokenId, _sellId);
            _removeTokenIdFromNFTOpenForTrade(_sellId);

            // if (trade.seller == owner()) {
            //     _removeSellIdFromOwnerList(trade.futureTokenId, _sellId);
            // }
        }
        emit UpdateOpenTradeList(sellIdOpenForTradeArray);
    }

    function cancelSell(uint256 _sellId) public {
        OpenTrade storage trade = openForTrades[_sellId];
        require(
            trade.status == "Open",
            "this NFT TokenId is not open for trade"
        );
        require(trade.seller == msg.sender);
        // superNFT.safeTransferFrom(address(this), msg.sender, _nftTokenId);
        superFuture.safeTransferFrom(
            address(this),
            msg.sender,
            trade.futureTokenId,
            trade.amount,
            "0x00"
        );
        trade.status = "Cancel";
        // areOpenForTrades[_nftTokenId] = false;
        // _removeSellIdFromList(trade.futureTokenId, _sellId);
        _removeTokenIdFromNFTOpenForTrade(_sellId);
        // if (trade.seller == owner()) {
        //     _removeSellIdFromOwnerList(trade.futureTokenId, _sellId);
        // }
        emit UpdateOpenTradeList(sellIdOpenForTradeArray);
    }

    // TODO: re implement
    // function directBuyCo2FromToken(uint256 _futureTokenId) external {
    //     OpenTrade memory trade = openForTrades[_nftTokenId];
    //     require(sellIdOpenForTradeArray.length > 0, "no any open trade");
    //     require(
    //         trade.status == "Open",
    //         "this NFT TokenId is not open for trade"
    //     );
    //     require(msg.sender != owner(), "buyer cannot be owner");
    //     require(trade.seller == owner(), "seller should be owner");
    //     require(
    //         superToken.balanceOf(msg.sender) >= trade.price,
    //         "your balance is not enough"
    //     );
    // superToken.transferFrom(msg.sender, trade.seller, trade.price);
    // UsedNFT memory used = createUsedNFT(_nftTokenId);
    // usedNFTs.push(used);
    // openForTrades[_nftTokenId].status = "CO2";
    // _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
    // superNFT.burn(_nftTokenId);
    // emit UpdateUsedNFT(usedNFTs, sellIdOpenForTradeArray);
    // }

    function redeemFromToken(uint256 _sellId, uint256 _amount) external {
        OpenTrade storage trade = openForTrades[_sellId];
        require(trade.status == "Open", "this sellId status is not open");
        require(msg.sender != owner(), "redeemer cannot be owner");
        require(trade.seller == owner(), "seller should be owner");
        uint256 price = futureTokenPriceFeed.getPriceForFutureTokenId(
            trade.futureTokenId
        );
        require(
            superToken.balanceOf(msg.sender) >= price * _amount,
            "your balance is not enough"
        );

        superToken.transferFrom(msg.sender, trade.seller, price * _amount);
        UsedNFT memory used = createUsedNFT(trade.futureTokenId, _amount);
        usedNFTs.push(used);

        trade.amount -= _amount;
        if (trade.amount <= 0) {
            trade.status = "CO2";
            _removeTokenIdFromNFTOpenForTrade(trade.futureTokenId);
        }

        superFuture.burn(address(this), trade.futureTokenId, _amount);
        emit UpdateUsedNFT(usedNFTs, sellIdOpenForTradeArray);
    }

    // TODO: re implement
    // function transformNFTToCo2Credit(uint256 _nftTokenId) external {
    // OpenTrade memory trade = openForTrades[_nftTokenId];
    // require(nftOpenForTrade.length > 0);
    // require(
    //     trade.status == "Open",
    //     "this NFT TokenId is not open for trade"
    // );
    // require(msg.sender == superNFT.ownerOf(_nftTokenId), "owner of nft must be msg.sender");
    // require(msg.sender != owner(), "buyer cannot be owner");
    // UsedNFT memory used = createUsedNFT(_nftTokenId);
    // usedNFTs.push(used);
    // openForTrades[_nftTokenId].status = "CO2";
    // // _removeTokenIdFromNFTOpenForTrade(_nftTokenId);
    // superNFT.burn(_nftTokenId);
    // emit UpdateUsedNFT(usedNFTs, sellIdOpenForTradeArray);
    // }

    function redeemFromNFT(uint256 _futureTokenId, uint256 _amount) external {
        require(msg.sender != owner(), "redeemer cannot be owner");
        require(
            superFuture.balanceOf(msg.sender, _futureTokenId) >= _amount
        );
        UsedNFT memory used = createUsedNFT(_futureTokenId, _amount);
        usedNFTs.push(used);

        superFuture.burn(msg.sender, _futureTokenId, _amount);
        emit UpdateUsedNFT(usedNFTs, sellIdOpenForTradeArray);
    }

    // require for reciever
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}
