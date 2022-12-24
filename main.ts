import { IndexedTx, StargateClient, SigningStargateClient, StdFee } from "@cosmjs/stargate"
import { Tx } from "cosmjs-types/cosmos/tx/v1beta1/tx"
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx"
import { DirectSecp256k1Wallet, DirectSecp256k1HdWallet, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { readFile } from "fs/promises"
import assert from 'node:assert/strict';
import * as dotenv from 'dotenv'
import { fromHex } from "@cosmjs/encoding"

const envPathMapping: Record<string, string> = {
    "production": ".env",
    "local": ".env.local",
}

dotenv.config({ path: envPathMapping[process.env.NODE_ENV!] })

const rpc = process.env.RPC_SERVER_URL!

const start = async (): Promise<void> => {
    //  Readonly client
    const client = await StargateClient.connect(rpc)
    const chainId = await client.getChainId()
    const blockHeight = await client.getHeight()
    console.log("Client. Chain Id: ", chainId, " Block height: ", blockHeight)

    // Read balance 
    const fromAddress = process.env.FROM_ADDRESS!
    const balance = await client.getAllBalances(fromAddress)
    console.log("My balance: ", balance)

    let toAddress: string;
    let gasFee;
    let gasLimit;
    if (process.env.env === "production") {
        // Testnet flow: Decode faucet transaction
        const faucetTx: IndexedTx = (await client.getTx(process.env.INITIAL_TX_ID!))!
        // Decode Tx uint array first
        const decodedTx: Tx = Tx.decode(faucetTx.tx)
        // Decode messages uint array in body
        const firstMsg: MsgSend = MsgSend.decode(decodedTx.body!.messages[0].value)
        console.log("Decoded msg: ", firstMsg)
        // Gas fee and limit
        gasFee = decodedTx.authInfo!.fee!.amount
        gasLimit = decodedTx.authInfo!.fee!.gasLimit.toString(10)
        console.log("Gas fee: ", gasFee, "Gas limit: ", gasLimit)
        // Find faucet address ("from address" in tx message)
        toAddress = firstMsg.fromAddress
    } else {
        toAddress = process.env.TO_ADDRESS!
        gasFee = [{
            "denom": process.env.DENOM!,
            "amount": process.env.GAS_FEE!
        }]
        gasLimit = process.env.GAS_LIMIT!
    }

    const toBalance = await client.getAllBalances(toAddress)
    console.log("To balance: ", toBalance)

    const fee = {
        amount: gasFee,
        gas: gasLimit
    }
    //await sendToken(fromAddress, toAddress, fee)
    console.log("From Balance: ", await client.getAllBalances(fromAddress))
    console.log("To Balance: ", await client.getAllBalances(toAddress))
}

// The recommended way to encode messages is by using OfflineDirectSigner, which uses Protobuf.
// However, hardware wallets such as Ledger do not support this and still require the legacy Amino encoder (OfflineAminoSigner)
const getSignerFromMnemonic = async(): Promise<OfflineDirectSigner> => {
    const mnemomic = (await readFile(process.env.COSMOS_SEED_PHRASE_FILE!)).toString()
    return DirectSecp256k1HdWallet.fromMnemonic(mnemomic, { prefix: "cosmos" })
}

const getSignerFromPrivateKey = async(): Promise<OfflineDirectSigner> => {
    const privKeyByteArr = fromHex((await readFile(process.env.PRIVATE_KEY_FILE!)).toString())
    return DirectSecp256k1Wallet.fromKey(privKeyByteArr, "cosmos")
}

const sendToken = async (from: string, to: string, fee: StdFee): Promise<void> => {
    // Create signer from mnemonic
    const signer = process.env.env === "production" ? await getSignerFromMnemonic() : await getSignerFromPrivateKey()
    const recoveredAddress = (await signer.getAccounts())[0].address
    assert.equal(recoveredAddress, from, "Recovered address is not the intended address")

    // Create signing client 
    const signingClient = await SigningStargateClient.connectWithSigner(rpc, signer)
    const chainId = await signingClient.getChainId()
    const blockHeight = await signingClient.getHeight()
    console.log("Signing Client. Chain Id: ", chainId, " Block height: ", blockHeight)

    // Send token
    const sentAmount = [{
        denom: process.env.DENOM!,
        amount: "100000"
    }]
    const sentTx = await signingClient.sendTokens(from, to, sentAmount, fee)
    console.log("Sent tx: ", sentTx)
}

start()