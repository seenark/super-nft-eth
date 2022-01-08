import { SuperToken__factory } from './../../typechain/factories/SuperToken__factory';
import { ethers } from 'hardhat';


async function run() {
    const accounts = await ethers.getSigners()
    const [owner, person1] = accounts
    const SuperToken_Factory = await ethers.getContractFactory("SuperToken") as SuperToken__factory
    const SuperTokenContract = await SuperToken_Factory.deploy()
    await SuperTokenContract.deployed()

    const totalSupply = await SuperTokenContract.totalSupply()
    console.log("🚀 ~ file: superToken.ts ~ line 13 ~ deploy ~ totalSupply", totalSupply)
    let ownerBalance = await SuperTokenContract.balanceOf(owner.address)
    console.log("🚀 ~ file: superToken.ts ~ line 15 ~ deploy ~ ownerBalance", ownerBalance)

    // transfer to person1
    let tx = await SuperTokenContract.transfer(person1.address, 100 * 1e8)
    await tx.wait()
    console.log('transfer tx: ', tx.hash)

    ownerBalance = await SuperTokenContract.balanceOf(owner.address)
    console.log("🚀 ~ file: superToken.ts ~ line 15 ~ deploy ~ ownerBalance", ownerBalance)

    const person1Balance = await SuperTokenContract.balanceOf(person1.address)
    console.log("🚀 ~ file: superToken.ts ~ line 26 ~ deploy ~ person1Balance", person1Balance)
    return SuperTokenContract
}


export default {
    run
}