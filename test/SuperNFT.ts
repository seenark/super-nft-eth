import { Exchange } from './../typechain/Exchange.d';
import { Exchange__factory } from './../typechain/factories/Exchange__factory';
import { SuperToken__factory } from './../typechain/factories/SuperToken__factory';
import { SuperToken } from './../typechain/SuperToken.d';
import { SuperNFT } from "./../typechain/SuperNFT.d";
import { SuperNFT__factory } from "./../typechain/factories/SuperNFT__factory";
import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {env} from '../config/config'

chai.use(chaiAsPromised);
const { expect } = chai;

const SuperNFTName = "SuperNFT";
const SuperTokenName = "SuperToken"
const ExchangeName = "Exchange"

describe("SuperNFT", () => {
  let CSuperNFT: SuperNFT;
  let CSuperToken: SuperToken;
  let CExchange: Exchange;
  let tx: ContractTransaction;
  let owner: SignerWithAddress;
  let person1: SignerWithAddress;
  let person2: SignerWithAddress;
  beforeEach(async () => {
    // 1
    const [owner_0, person_1, person_2] = await ethers.getSigners();
    owner = owner_0;
    person1 = person_1;
    person2 = person_2;
    // 2
    const FSuperToken = await ethers.getContractFactory(SuperTokenName, owner) as SuperToken__factory
    CSuperToken = await FSuperToken.deploy(env.Token.name, env.Token.symbol)
    await CSuperToken.deployed()
    // transfer to person1 100 token
    tx = await CSuperToken.transfer(person1.address, 100 * 1e8)
    await tx.wait()
    // transfer to person2 100 token
    tx = await CSuperToken.transfer(person2.address, 100 * 1e8)
    await tx.wait()
    
    // 3
    const FSuperNFT = await ethers.getContractFactory(
      SuperNFTName,
      owner
    ) as SuperNFT__factory
    CSuperNFT = await FSuperNFT.deploy(env.NFT.name, env.NFT.symbol) as SuperNFT
    await CSuperNFT.deployed()

    const FExchange = await ethers.getContractFactory(ExchangeName) as Exchange__factory
    CExchange = await FExchange.deploy(CSuperToken.address, CSuperNFT.address)
    await CExchange.deployed()
    tx = await CSuperNFT.setExchangeAddress(CExchange.address)
    await tx.wait()
  });

  it("person1 SuperToken = 100 token", async () => {
    expect((await CSuperToken.balanceOf(person1.address)).toString()).to.equal((100 * 1e8).toString())
  })
  it("person2 SuperToken = 100 token", async () => {
    expect((await CSuperToken.balanceOf(person2.address)).toString()).to.equal((100 * 1e8).toString())
  })

  it("owner of tokenId 1 should be owner", async () => {
    tx = await CSuperNFT.createNFT("abc");
    await tx.wait();
    const ownerOfTokenID1 = await CSuperNFT.ownerOf(1);
    expect(ownerOfTokenID1).to.equal(owner.address);
    const tokenUri = await CSuperNFT.tokenURI(1);
    expect(tokenUri).to.equal("abc");
  });

  describe("Supber Token", async () => {
    it ("person1 approve token", async () => {
      tx = await CSuperToken.connect(person1).approve(CSuperNFT.address, 1 * 1e8)
      await tx.wait()
      const allowance = await CSuperToken.allowance(person1.address, CSuperNFT.address)
      expect(allowance).to.equal(1 * 1e8)
    })
  })

  describe("transfer", async ( ) => {
    beforeEach(async () => {
      // mint from owner
      tx = await CSuperNFT.createNFT("abc");
      await tx.wait();
    })
    
    it("owner -> sell", async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      const own = await CSuperNFT.ownerOf(1)
      expect(own).to.equal(CExchange.address)
      const isOpen = await CExchange.areOpenForTrades(1)
      expect(isOpen).to.equal(true)
    })

    it("owner -> sell -> person1 -> buy",async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      // person1 approve SuperToken
      tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8);
      await tx.wait()
      // buy
      const initTokens = await CSuperToken.balanceOf(person1.address)
      tx = await CExchange.connect(person1).buy(1);
      await tx.wait()
      const own = await CSuperNFT.ownerOf(1)
      expect(own).to.equal(person1.address)
      expect((await CSuperToken.balanceOf(person1.address)).toNumber()).to.equal(initTokens.toNumber() - (1 * 1e8))
    })

    it("owner -> sell -> person1 -> buy -> person1 -> sell -> person2 -> buy = should not pass", async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      // person1 approve SuperToken
      tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8);
      await tx.wait()
      // buy
      tx = await CExchange.connect(person1).buy(1);
      await tx.wait()
      // person1 approve nft
      tx = await CSuperNFT.connect(person1).approve(CExchange.address, 1)
      await tx.wait()
      // sell from person1
      tx = await CExchange.connect(person1).sell(1, 1 * 1e8)
      await tx.wait()
      // person2 approve super token
      tx = await CSuperToken.connect(person2).approve(CExchange.address, 1 * 1e8)
      await tx.wait()
      // buy from person2
      expect(CExchange.connect(person2).buy(1)).to.rejected
    })

    it("owner -> sell -> person1 -> buy -> person1 -> direct -> person2 = should not pass", async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      // person1 approve SuperToken
      tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8);
      await tx.wait()
      // buy
      tx = await CExchange.connect(person1).buy(1);
      await tx.wait()
      // person1 -> direct -> person2
      expect(CSuperNFT.connect(person1)['safeTransferFrom(address,address,uint256)'](person1.address, person2.address, 1)).to.rejected

      expect(CSuperNFT.connect(person1).transferFrom(person1.address, person2.address,1)).to.rejected
    })

    it("owner -> sell -> person1 -> buy -> person1 -> sell -> owner -> buy", async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      // person1 approve SuperToken
      tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8);
      await tx.wait()
      // buy
      tx = await CExchange.connect(person1).buy(1);
      await tx.wait()
      // person1 approve nft
      tx = await CSuperNFT.connect(person1).approve(CExchange.address, 1)
      await tx.wait()
      // sell from person1
      tx = await CExchange.connect(person1).sell(1, 1 * 1e8)
      await tx.wait()
      // owner approve super token
      tx = await CSuperToken.approve(CExchange.address, 1 * 1e8)
      await tx.wait()
      // owner buy
      tx = await CExchange.buy(1)
      await tx.wait()
      const own = await CSuperNFT.ownerOf(1)
      expect(own).to.equal(owner.address)
    })

  })

  describe("exchange", async () => {
    beforeEach(async () => {
      // mint from owner
      tx = await CSuperNFT.createNFT("abc");
      await tx.wait();
    })

    it("owner -> sell -> owner -> cancel", async () => {
      // owner approve
      tx = await CSuperNFT.approve(CExchange.address, 1)
      await tx.wait()
      // sell order
      tx = await CExchange.sell(1, 1 * 1e8)
      await tx.wait()
      let own = await CSuperNFT.ownerOf(1)
      expect(own).to.equal(CExchange.address)
      // cancel
      tx = await CExchange.cancelSell(1)
      await tx.wait()
      own = await CSuperNFT.ownerOf(1)
      expect(own).to.equal(owner.address)
    })
  })

  describe("direct buy from token", async () => {
    beforeEach(async () => {
      // mint from owner
      tx = await CSuperNFT.createNFT("abc");
      await tx.wait();
      // mint from owner 2
      tx = await CSuperNFT.createNFT("def");
      await tx.wait();

      // owner sell on exchange
      tx = await CSuperNFT.setApprovalForAll(CExchange.address, true)
      await tx.wait()

      // sell token1
      tx = await CExchange.sell(1,1 * 1e8)
      await tx.wait()
      // sell token2
      tx = await CExchange.sell(2,1 * 1e8)
      await tx.wait()

      // person1 approve
      tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8)
      await tx.wait()
    })

      it("person1 -> direct buy from token", async () => {
        // expect(console.log("openForTrades", await CExchange.getAllNFTOpenForTrades()))
        // expect(console.log("owner of token id 1: ", (await CSuperNFT.ownerOf(1)).toString()))
        let allNFTOpenForTrades = await CExchange.getAllNFTOpenForTrades()
        expect(allNFTOpenForTrades.length).to.equal(2)
        tx = await CExchange.connect(person1).directBuyCo2FromToken(1)
        await tx.wait()
        // expect(console.log("used nfts", await CExchange.getUsedNFTs()))
        const p1Balance = await CSuperToken.balanceOf(person1.address)
        expect(p1Balance.toNumber()/1e8).to.equal(99)
        allNFTOpenForTrades = await CExchange.getAllNFTOpenForTrades()
        expect(allNFTOpenForTrades.length).to.equal(1)
        const usedNFT = await CExchange.usedNFTs(0)
        // expect(console.log("used nft: ", usedNFT))
        expect(usedNFT.customer).to.equal(person1.address)
        expect(usedNFT.tokenId).to.equal(1)
        // check owner should be reject because it already burned
        expect(CSuperNFT.ownerOf(1)).to.rejected
      })
  })

  describe.only("direct buy co2 from nft", () => {
    beforeEach(async () => {
       // mint from owner
       tx = await CSuperNFT.createNFT("abc");
       await tx.wait();
 
       // owner sell on exchange
       tx = await CSuperNFT.approve(CExchange.address, 1)
       await tx.wait()
       // sell token1
       tx = await CExchange.sell(1,1 * 1e8)
       await tx.wait()
 
       // person1 approve
       tx = await CSuperToken.connect(person1).approve(CExchange.address, 1 * 1e8)
       await tx.wait()

       // person1 buy from exchange
       tx = await CExchange.connect(person1).buy(1)
       await tx.wait()
        // set approve for all to allow exchange transfer nft for person1
       tx = await CSuperNFT.connect(person1).setApprovalForAll(CExchange.address, true);
       await tx.wait()
    })


    it("person1 nft -> exchange -> co2 credit",async () => {
      tx = await CExchange.connect(person1).transformNFTToCo2Credit(1)

      await tx.wait()
      expect(console.log("used nft", await CExchange.getUsedNFTs()))
      const usedNft = await CExchange.usedNFTs(0);
      expect(usedNft.customer).to.equal(person1.address)
      expect(usedNft.tokenId).to.equal(1)
      expect(CSuperNFT.ownerOf(1)).to.rejected
    })
  })

});
