// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
contract FutureTokenPrice is Ownable {
  // TODO: change price to struct to be store date along with price
  mapping(bytes32 => uint256) prices;
  mapping(uint256 => bytes32) futureTokenKeys;

  function setPricesBatch(bytes32[] memory _keys, uint256[] memory _prices) external onlyOwner() {
    require(_keys.length == _prices.length, "Length of keys and prices is difference");

    for(uint256 i = 0; i < _keys.length; i++) {
      prices[_keys[i]] = _prices[i];
    }
  }

  function setPrice(bytes32 _key, uint256 _price) external onlyOwner() {
    prices[_key] = _price;
  }

  function setPriceForFutureTokenId(uint256 _futureTokenId, bytes32 _key, uint256 _price) public {
    require(tx.origin == owner(), "caller is not owner");
    futureTokenKeys[_futureTokenId] = _key;
    prices[_key] = _price;
  }

  function getPriceForFutureTokenId(uint256 _id) public view returns(uint256) {
    bytes32 key = futureTokenKeys[_id];
    return prices[key];
  }
}