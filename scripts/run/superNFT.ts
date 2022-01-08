import {ethers } from 'hardhat'
import { SuperNFT } from './../../typechain/SuperNFT.d';
import { SuperNFT__factory } from '../../typechain/factories/SuperNFT__factory';

async function run() {
    const accounts = await ethers.getSigners()
    const [owner, person1] = accounts
    console.log('owner address:', owner.address)
    console.log('person1 address:', person1.address)
    const SuperNFT_Factory = await ethers.getContractFactory("SuperNFT") as SuperNFT__factory
    const SuperNFT_Contract = await SuperNFT_Factory.deploy() as SuperNFT
    await SuperNFT_Contract.deployed()
    console.log("Contract deployed to:", SuperNFT_Contract.address) 
    console.log('transaction hash', SuperNFT_Contract.deployTransaction.hash)
    // let tx = await SuperNFT_Contract.approve(owner.address, 0)
    // await tx.wait()
    // console.log('approve tx: ', tx.hash)
    // mint nft 
    let tx = await SuperNFT_Contract.createNFT("abc")
    await tx.wait()
    console.log('mint tx hash:', tx.hash)

    // token uri
    const tokenUri = await SuperNFT_Contract.tokenURI(1)
    console.log("🚀 ~ file: superNFT.ts ~ line 25 ~ run ~ tokenUri", tokenUri)
    

    let own =  await SuperNFT_Contract.ownerOf(1)
    console.log("🚀 ~ file: superNFT.ts ~ line 21 ~ run ~ own", own)
    
    // transfer
    tx = await SuperNFT_Contract['safeTransferFrom(address,address,uint256)'](owner.address, person1.address, 1)
    tx.wait()
    console.log('transfer tx:', tx.hash)
    own =  await SuperNFT_Contract.ownerOf(1)
    console.log("🚀 ~ file: superNFT.ts ~ line 30 ~ run ~ own", own)



}

export default {
    run
}