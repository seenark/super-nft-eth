import { Exchange__factory } from './../typechain/factories/Exchange__factory';
import { SuperToken__factory } from './../typechain/factories/SuperToken__factory';
import { ethers } from 'hardhat';
import { ContractTransaction } from 'ethers';
import {env} from '../config/config'
import { FutureTokenPrice__factory } from '../typechain/factories/FutureTokenPrice__factory';
import { SuperFuture__factory } from '../typechain/factories/SuperFuture__factory';
import { writeContractAddress } from './writeContractAddress';

const SuperFutureName = "SuperFuture";
const SuperTokenName = "SuperToken"
const ExchangeName = "Exchange"
const FutureTokenPriceName = "FutureTokenPrice";

let tx: ContractTransaction

async function main() {
  const FToken = await ethers.getContractFactory(SuperTokenName) as SuperToken__factory
  const CToken = await FToken.deploy(env.Token.name, env.Token.symbol)
  await CToken.deployed()

  console.log("Super Token Contract address: ", CToken.address)
   

    // deploy price feed
		const FPriceFeed = (await ethers.getContractFactory(
			FutureTokenPriceName
		)) as FutureTokenPrice__factory;
		const CPriceFeed = await FPriceFeed.deploy();
		await CPriceFeed.deployed();
    console.log("Price feed contract address: ", CPriceFeed.address)

    // deploy future ERC1155
		const FSuperFuture = (await ethers.getContractFactory(
			SuperFutureName
		)) as SuperFuture__factory;
		const CFuture = await FSuperFuture.deploy("abc/{id}.json", CPriceFeed.address);
		await CFuture.deployed();
    console.log("future contract address: ", CFuture.address)

    // deploy exchange
    const FEx = await ethers.getContractFactory(ExchangeName) as Exchange__factory
    const CEx = await FEx.deploy(CToken.address, CFuture.address, CPriceFeed.address)
    await CEx.deployed()
    console.log("Exchange Contract address: ", CEx.address)

    tx = await CFuture.setExchangeAddress(CEx.address)
    await tx.wait()
    console.log("Set Super NFT set exchange contract address")

    await writeContractAddress(CToken.address, CFuture.address, CPriceFeed.address, CEx.address)
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