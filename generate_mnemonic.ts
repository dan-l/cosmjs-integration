import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing"

const generateKey = async (): Promise<void> => {
    // 24-word mnemonic
    const wallet: DirectSecp256k1HdWallet = await DirectSecp256k1HdWallet.generate(24)
    console.log(wallet.mnemonic)
    const accounts = await wallet.getAccounts()
    console.log(`1st account: ${accounts[0].address}`)
}

generateKey()