import { SuperNFT__factory } from './../typechain/factories/SuperNFT__factory';
import { Exchange__factory } from './../typechain/factories/Exchange__factory';
import { SuperToken__factory } from './../typechain/factories/SuperToken__factory';
import { ethers } from 'hardhat';
import { ContractTransaction } from 'ethers';
import {env} from '../config/config'

const SuperNFTName = "SuperNFT";
const SuperTokenName = "SuperToken"
const ExchangeName = "Exchange"
let tx: ContractTransaction
async function main() {
  const FToken = await ethers.getContractFactory(SuperTokenName) as SuperToken__factory
  const CToken = await FToken.deploy(env.Token.name, env.Token.symbol)
  await CToken.deployed()

  console.log("Super Token Contract address: ", CToken.address)
    const fNFT = await ethers.getContractFactory(SuperNFTName) as SuperNFT__factory
    const cNFT = await fNFT.deploy(env.NFT.name, env.NFT.symbol)
    await cNFT.deployed()
    console.log("Super NFT Contract address: ", cNFT.address)
    const FEx = await ethers.getContractFactory(ExchangeName) as Exchange__factory
    const CEx = await FEx.deploy(CToken.address, cNFT.address)
    await CEx.deployed()
    console.log("Exchange Contract address: ", CEx.address)
    tx = await cNFT.setExchangeAddress(CEx.address)
    await tx.wait()
    console.log("Set Super NFT set exchange contract address")
}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();