import { FutureTokenPrice__factory } from "./../typechain/factories/FutureTokenPrice__factory";
import { FutureTokenPrice } from "./../typechain/FutureTokenPrice.d";
import { SuperFuture__factory } from "./../typechain/factories/SuperFuture__factory";
import { SuperFuture } from "./../typechain/SuperFuture.d";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Exchange } from "../typechain/Exchange";
import { SuperToken } from "../typechain/SuperToken";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";
import { ethers } from "hardhat";
import { env } from "../config/config";
import { SuperToken__factory } from "../typechain/factories/SuperToken__factory";
import { Exchange__factory } from "../typechain/factories/Exchange__factory";

chai.use(chaiAsPromised);
const { expect } = chai;

const SuperTokenName = "SuperToken";
const ExchangeName = "Exchange";
const SuperFutureName = "SuperFuture";
const FutureTokenPriceName = "FutureTokenPrice";

describe("SuperFuture", async () => {
  let CSuperToken: SuperToken;
  let CExchange: Exchange;
  let CFuture: SuperFuture;
  let CPriceFeed: FutureTokenPrice;
  let tx: ContractTransaction;
  let owner: SignerWithAddress;
  let person1: SignerWithAddress;
  let person2: SignerWithAddress;

  beforeEach(async () => {
    // assing signers
    const [owner_0, person_1, person_2] = await ethers.getSigners();
    owner = owner_0;
    person1 = person_1;
    person2 = person_2;

    // deploy SuperX
    const FSuperToken = (await ethers.getContractFactory(
      SuperTokenName,
      owner
    )) as SuperToken__factory;
    CSuperToken = await FSuperToken.deploy(env.Token.name, env.Token.symbol);
    await CSuperToken.deployed();
    // transfer to person1 100 token
    tx = await CSuperToken.transfer(person1.address, 100 * 1e8);
    await tx.wait();
    // transfer to person2 100 token
    tx = await CSuperToken.transfer(person2.address, 100 * 1e8);
    await tx.wait();

    const FPriceFeed = (await ethers.getContractFactory(
      FutureTokenPriceName
    )) as FutureTokenPrice__factory;
    CPriceFeed = await FPriceFeed.deploy()
    await CPriceFeed.deployed()

    // deploy future ERC1155
    const FSuperFuture = (await ethers.getContractFactory(
      SuperFutureName,
      owner
    )) as SuperFuture__factory;
    CFuture = await FSuperFuture.deploy("abc/{id}.json", CPriceFeed.address);
    await CFuture.deployed();

    // deploy exchange
    // const FExchange = (await ethers.getContractFactory(
    //   ExchangeName
    // )) as Exchange__factory;
    // CExchange = await FExchange.deploy(CSuperToken.address, CFuture.address);
    // await CExchange.deployed();

    // set exchange address in FutureNFT
    tx = await CFuture.setExchangeAddress(person2.address);
    await tx.wait();
  });

  it("uri", async () => {
    const uri = await CFuture.uri(0);
    expect("abc/{id}.json").to.equal(uri);
  });

  it("owner mint", async () => {
    const tomorow = new Date();
    tomorow.setDate(tomorow.getDate() + 1);
    tx = await CFuture.createNew(
      owner.address,
      10,
      getUnixTimeStamp(tomorow),
      ethers.utils.formatBytes32String("STH"),
      1 * 1e8,
      "0x00"
    );
    await tx.wait();
    const totalNFT = await CFuture.balanceOf(owner.address, 1);
    expect(10).to.equal(totalNFT.toNumber());
  });

  it("owner mint to exchange", async () => {
    const tomorow = new Date();
    tomorow.setDate(tomorow.getDate() + 1);
    tx = await CFuture.createNew(
      person2.address,
      10,
      getUnixTimeStamp(tomorow),
      ethers.utils.formatBytes32String("STH"),
      1 * 1e8,
      "0x00"
    );
    await tx.wait();
    const totalNFT = await CFuture.balanceOf(person2.address, 1);
    expect(10).to.equal(totalNFT.toNumber());
  });

  it("onwer -> mint -> onwer -> transfer to -> exchange", async () => {
    tx = await CFuture.createNew(
      owner.address,
      10,
      getUnixTimeStamp(new Date()),
      ethers.utils.formatBytes32String("STH"),
      1 * 1e8,
      "0x00"
    );
    await tx.wait();
    tx = await CFuture.safeTransferFrom(
      owner.address,
      person2.address,
      1,
      10,
      "0x00"
    );
    await tx.wait();
    const bl = await CFuture.balanceOf(person2.address, 1);
    expect(10).to.equal(bl.toNumber());
  });

  it("owner -> mint -> burn", async () => {
    tx = await CFuture.createNew(
      owner.address,
      10,
      getUnixTimeStamp(new Date()),
      ethers.utils.formatBytes32String("STH"),
      1 * 1e8,
      "0x00"
    );
    await tx.wait();
    tx = await CFuture.burn(owner.address, 1, 5);
    await tx.wait();
    const bl = await CFuture.balanceOf(owner.address, 1);
    expect(5).to.equal(bl.toNumber());
  });

  it("onwer -> mint batches", async () => {
    const tomorow = new Date();
    tomorow.setDate(tomorow.getDate() + 1);
    const unix = getUnixTimeStamp(tomorow);
    tx = await CFuture.mintBatch(
      owner.address,
      [1, 2],
      [10, 20],
      [unix, unix],
      "0x00"
    );
    await tx.wait();
    const bl1 = await CFuture.balanceOf(owner.address, 1);
    const bl2 = await CFuture.balanceOf(owner.address, 2);
    expect(10).to.equal(bl1.toNumber());
    expect(20).to.equal(bl2.toNumber());
  });

  it("owner -> mint -> transfert to other directly", async () => {
    tx = await CFuture.createNew(
      owner.address,
      10,
      getUnixTimeStamp(new Date()),
      ethers.utils.formatBytes32String("STH"),
      1 * 1e8,
      "0x00"
    );
    await tx.wait();
    tx = await CFuture.safeTransferFrom(
      owner.address,
      person1.address,
      1,
      10,
      "0x00"
    );
    await tx.wait();
    tx = await CFuture.connect(person1).safeTransferFrom(
      person1.address,
      person2.address,
      1,
      10,
      "0x00"
    );
    await tx.wait();
    const bl1 = await CFuture.balanceOf(person2.address, 1);
    expect(10).to.equal(bl1.toNumber());
  });
});

export function getUnixTimeStamp(date: Date): number {
  return (date.getTime() / 1000) << 0;
}
