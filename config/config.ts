import yamlToEnv from 'yaml-to-env'

yamlToEnv({
    yamlPath: 'config/config.yml',
    exposeVariables: [
        "RINKEBY_URL",
        "PRIVATE_KEY",
        "ETHERSCAN_KEY",
    ]
})

export const env = {
    RinkebyUrl: process.env.RINKEBY_URL || '',
    PrivateKey: process.env.PRIVATE_KEY || '',
    EtherScanKey: process.env.ETHERSCAN_KEY || '',
    Token: {
        name: "Super Exchange",
        symbol: "SuperX"
    },
    NFT: {
        name: "Super Carbon Credit Smart Certificate",
        symbol: "SuperCO2"
    }
}