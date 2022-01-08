import SuperTKN from './superToken'
import SpNFT from './superNFT'

async function main() {
    // await SuperTKN.run()
    await SpNFT.run()
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