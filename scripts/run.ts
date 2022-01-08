import { SuperNFT } from './../typechain/SuperNFT.d';
import { SuperNFT__factory } from './../typechain/factories/SuperNFT__factory';
import { ethers } from 'hardhat';


async function main() {
    const accounts = await ethers.getSigners()
    const [owner, person1] = accounts
    const SuperNFT_Factory = await ethers.getContractFactory("SuperNFT") as SuperNFT__factory
    const SuperNFT_Contract = await SuperNFT_Factory.deploy() as SuperNFT
    await SuperNFT_Contract.deployed()
    console.log("Contract deployed to:", SuperNFT_Contract.address) 
    console.log('transaction hash', SuperNFT_Contract.deployTransaction.hash)
    // let tx = await SuperNFT_Contract.approve(owner.address, 0)
    // await tx.wait()
    // console.log('approve tx: ', tx.hash)
    // mint nft 
    let tx = await SuperNFT_Contract.createNFT("")
    await tx.wait()
    console.log('mint tx hash:', tx.hash)
    const approveAddress = await SuperNFT_Contract.getApproved(0)
    console.log("🚀 ~ file: run.ts ~ line 22 ~ main ~ approveAddress", approveAddress)
    // tx.wait()
    // console.log('transfer tx: ', tx.hash)


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