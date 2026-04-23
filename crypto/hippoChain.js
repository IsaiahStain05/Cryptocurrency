import sha256 from "sha256"

const objHippoChain = {
    chain: [
        // Genesis block
        {
            index: 0,
            time: Date.now(),
            transaction: {},
            nonce: 0,
            hash: "000hash",
            previous: "000prevhash"
        }
    ],
    getLastBlock: () => {
        return objHippoChain.chain[objHippoChain.chain.length - 1]
    },
    generateHash: (strPrevHash, datStartTime, objNewTransaction) => {
        let strLocalHash = ''
        let intNonce = 0

        while (strLocalHash.substring(0,3) != '000') {
            intNonce ++

            strLocalHash = sha256(`${strPrevHash}${datStartTime}${objNewTransaction}${intNonce}`)
        }

        return {strLocalHash, intNonce}
    },
    createNewBlock: (decTransAmt, strTransSender, strTransRecipient) => {
        const objNewTransaction = {decTransAmt, strTransSender, strTransRecipient}
        const datInitTime = Date.now()
        const prevBlock = objHippoChain.getLastBlock()
        const newCoinHash = objHippoChain.generateHash(prevBlock.hash, datInitTime, objNewTransaction)

        const newBlock = {
            index: prevBlock.index + 1,
            time: datInitTime,
            transaction: objNewTransaction,
            nonce: newCoinHash.intNonce,
            hash: newCoinHash.strLocalHash,
            previous: prevBlock.hash
        }
        objHippoChain.chain.push(newBlock)
    },
    printChain: () => {
        console.log(objHippoChain.chain)
    }
}

export {objHippoChain}