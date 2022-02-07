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
import { getUnixTimeStamp } from "./SuperFuture";
import { FutureTokenPrice__factory } from "../typechain/factories/FutureTokenPrice__factory";
import { FutureTokenPrice } from "../typechain/FutureTokenPrice";

chai.use(chaiAsPromised);
const { expect } = chai;

const SuperTokenName = "SuperToken";
const ExchangeName = "Exchange";
const SuperFutureName = "SuperFuture";
const FutureTokenPriceName = "FutureTokenPrice";

const PRICE_FEED_KEY = "STH";

describe("exchange", async () => {
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

		// deploy price feed
		const FPriceFeed = (await ethers.getContractFactory(
			FutureTokenPriceName
		)) as FutureTokenPrice__factory;
		CPriceFeed = await FPriceFeed.deploy();
		await CPriceFeed.deployed();

		// deploy future ERC1155
		const FSuperFuture = (await ethers.getContractFactory(
			SuperFutureName,
			owner
		)) as SuperFuture__factory;
		CFuture = await FSuperFuture.deploy("abc/{id}.json", CPriceFeed.address);
		await CFuture.deployed();

		// deploy exchange
		const FExchange = (await ethers.getContractFactory(
			ExchangeName
		)) as Exchange__factory;
		CExchange = await FExchange.deploy(
			CSuperToken.address,
			CFuture.address,
			CPriceFeed.address
		);
		await CExchange.deployed();

		// set exchange address in FutureNFT
		tx = await CFuture.setExchangeAddress(CExchange.address);
		await tx.wait();

		const tomorow = new Date();
		tomorow.setDate(tomorow.getDate() + 1);
		tx = await CFuture.createNew(
			owner.address,
			10,
			getUnixTimeStamp(tomorow),
			ethers.utils.formatBytes32String(PRICE_FEED_KEY),
			(1.1 * 1e8) << 0,
			"0x00"
		);
		await tx.wait();
	});

	it("sell", async () => {
		// approve for all
		tx = await CFuture.setApprovalForAll(CExchange.address, true);
		await tx.wait();
		tx = await CExchange.sell(1, 10);
		await tx.wait();
		const balance1 = await CFuture.balanceOf(CExchange.address, 1);
		expect(10).to.equal(balance1.toNumber());
		const allSellId = await CExchange.getAllSellIdOpenForTrades();
		const allSellIdNumber = allSellId.map((a) => a.toNumber());
		expect(allSellIdNumber.includes(1)).to.equal(true);
		const sellIdOpenForTradesBigNum =
			await CExchange.getAllSellIdOpenForTrades();
		const allSellIdOpenForTrade = sellIdOpenForTradesBigNum.map((e) =>
			e.toNumber()
		);
		expect(allSellIdOpenForTrade.includes(1)).to.equal(true);
	});

	describe("buy", async () => {
		beforeEach(async () => {
			// approve for all
			tx = await CFuture.setApprovalForAll(CExchange.address, true);
			await tx.wait();
			// sell
			tx = await CExchange.sell(1, 10);
			await tx.wait();
			// perons1 approve for token
			tx = await CSuperToken.connect(person1).approve(
				CExchange.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();
		});

		it("buy", async () => {
			// buy
			tx = await CExchange.connect(person1).buy(1, 10);
			await tx.wait();
			let balance = await CFuture.balanceOf(CExchange.address, 1);
			expect(balance.toNumber()).to.equal(0);
			balance = await CFuture.balanceOf(person1.address, 1);
			expect(balance.toNumber()).to.equal(10);
			const allSell = await CExchange.getAllSellIdOpenForTrades();
			expect(allSell.length).to.equal(0);
			const tokenBalance = await CSuperToken.balanceOf(person1.address);
			expect(tokenBalance.toNumber(), "buy token balance check").to.equal(
				89 * 1e8
			);
		});

		it("person1 buy -> transfer to  person2 directly", async () => {
			// buy
			tx = await CExchange.connect(person1).buy(1, 5);
			await tx.wait();
			expect(
				CFuture.connect(person1).safeTransferFrom(
					person1.address,
					person2.address,
					1,
					5,
					"0x00"
				)
			).to.rejected;
		});

		it("person1 buy -> sell to exchange", async () => {
			// buy
			tx = await CExchange.connect(person1).buy(1, 5);
			await tx.wait();
			let balance = await CFuture.balanceOf(person1.address, 1);
			expect(balance.toNumber()).to.equal(5);

			tx = await CFuture.connect(person1).setApprovalForAll(
				CExchange.address,
				true
			);
			await tx.wait();
			// sell on exchange
			tx = await CExchange.connect(person1).sell(1, 5);
			await tx.wait();
			balance = await CFuture.balanceOf(person1.address, 1);
			expect(balance.toNumber()).to.equal(0);

			balance = await CFuture.balanceOf(CExchange.address, 1);
			expect(balance.toNumber()).to.equal(10);
		});

		it("owner cancel", async () => {
			let allSell = await CExchange.getAllSellIdOpenForTrades();
			expect(allSell.length).to.equal(1);

			tx = await CExchange.cancelSell(1);
			await tx.wait();

			let balance = await CFuture.balanceOf(CExchange.address, 1);
			expect(balance.toNumber()).to.equal(0);

			balance = await CFuture.balanceOf(owner.address, 1);
			expect(balance.toNumber()).to.equal(10);
			allSell = await CExchange.getAllSellIdOpenForTrades();
			expect(allSell.length).to.equal(0);
		});
	});

	describe("redeem from token", async () => {
		beforeEach(async () => {
			// approve for all
			tx = await CFuture.setApprovalForAll(CExchange.address, true);
			await tx.wait();
			// sell
			tx = await CExchange.sell(1, 10);
			await tx.wait();
			// perons1 approve for token
			tx = await CSuperToken.connect(person1).approve(
				CExchange.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();
			// perons2 approve for token
			tx = await CSuperToken.connect(person2).approve(
				CExchange.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();
		});

		it("redeem all (10)", async () => {
			let openTrades = await CExchange.getAllSellIdOpenForTrades();
			expect(openTrades.length, "open trade length == 1").to.equal(1);
			// redeem
			tx = await CExchange.connect(person1).redeemFromToken(1, 10);
			await tx.wait();
			const useds = await CExchange.getUsedNFTs();
			expect(useds.length, "used array length").to.equal(1);
			const used = useds[0];
			expect(used.customer, "used customer address").to.equal(person1.address);
			expect(used.amount.toNumber(), "used amount").to.equal(10);
			expect(used.tokenId, "used futureTokenId").to.equal(1);
			const bl = await CFuture.balanceOf(CExchange.address, 1);
			expect(bl.toNumber()).to.equal(0);
			const tkBl = await CSuperToken.balanceOf(person1.address);
			expect(tkBl.toNumber(), "token remaining").to.equal(89 * 1e8);
			openTrades = await CExchange.getAllSellIdOpenForTrades();
			expect(openTrades.length, "open trade length").to.equal(0);
			const totalSupply = await CFuture.totalSupply(1);
			expect(totalSupply.toNumber(), "total supply").to.equal(0);
		});

		it("redeem 5", async () => {
			// redeem
			tx = await CExchange.connect(person2).redeemFromToken(1, 5);
			await tx.wait();

			await tx.wait();
			const useds = await CExchange.getUsedNFTs();
			expect(useds.length, "used array length").to.equal(1);
			const used = useds[0];
			expect(used.customer, "used customer address").to.equal(person2.address);
			expect(used.amount.toNumber(), "used amount").to.equal(5);
			expect(used.tokenId, "used futureTokenId").to.equal(1);
			const bl = await CFuture.balanceOf(CExchange.address, 1);
			expect(bl.toNumber(), "balance of Exchange").to.equal(5);
			const tkBl = await CSuperToken.balanceOf(person2.address);
			expect(tkBl.toNumber(), "token remaining").to.equal(94.5 * 1e8);
			const openTrades = await CExchange.getAllSellIdOpenForTrades();
			expect(openTrades.length, "open trade length").to.equal(1);
			const totalSupply = await CFuture.totalSupply(1);
			expect(totalSupply.toNumber(), "total supply").to.equal(5);
		});
	});

	describe("redeem from nft", async () => {
		beforeEach(async () => {
			// approve for all
			tx = await CFuture.setApprovalForAll(CExchange.address, true);
			await tx.wait();
			// sell
			tx = await CExchange.sell(1, 10);
			await tx.wait();
			// perons1 approve for token
			tx = await CSuperToken.connect(person1).approve(
				CExchange.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();
			// perons2 approve for token
			tx = await CSuperToken.connect(person2).approve(
				CExchange.address,
				ethers.constants.MaxUint256
			);
			await tx.wait();
      
      // person1 buy all
			tx = await CExchange.connect(person1).buy(1, 10);
			await tx.wait();
		});

    it("redeem from nft", async () => {
      // approve 
      tx = await CFuture.connect(person1).setApprovalForAll(CExchange.address, true)
      await tx.wait()
      print("ex", CExchange.address)
      tx = await CExchange.connect(person1).redeemFromNFT(1, 10)
      await tx.wait()
      let balance = await CFuture.balanceOf(person1.address, 1)
      expect(balance.toNumber(), "person1 balance").to.equal(0)
      const useds = await CExchange.getUsedNFTs()
      expect(useds.length, "used array length").to.eq(1)
      const used = useds[0]
      expect(used.amount, "used amount").to.eq(10)
      expect(used.customer, "used customer").to.eq(person1.address)
      expect(used.tokenId, "used futureTokenId").to.eq(1)
      const tokenBalance = await CFuture.totalSupply(1)
      expect(tokenBalance.toNumber(), "token balance").to.eq(0)
    })
	});
});

function print(text: string, something: any) {
	expect(console.log(text, something));
}
