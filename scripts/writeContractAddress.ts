import fs from 'fs/promises'
import path from 'path'

export async function writeContractAddress(token:string, future: string, priceFeed:string, exchange:string) {
  const currenctDir = path.join(process.cwd(), "/deployed.json")
  const data = {
    token,
    future,
    priceFeed,
    exchange
  }
  try {
    return await fs.writeFile(currenctDir, JSON.stringify(data))
  } catch (error) {
    console.error("error while write contract address", error)
    return
  }

  
}

// writeContractAddress("1","2","3","4")