import { objHippoChain } from "./hippoChain.js"
import express from "express"
import sqlite3 from "sqlite3"
import bcrypt from "bcrypt"
import cors from "cors"

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10)
}

const HTTP_PORT = 8000

var app = express()
app.use(cors())
app.use(express.json())

const dbBlockchain = new sqlite3.Database('./database/Blockchain.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message)
    }else{
        console.log("Connected to Blockchain.db")
    }
})

app.listen(HTTP_PORT, () => {
    console.log("Listening on port", HTTP_PORT)
})

app.post("/user", async (req, res, next) => {
    try {
        let username = req.body.username
        let password = req.body.password

        if (!username || !password) {
            return res.status(400).json({outcome: "failure", message: "Every field must be provided"})
        }

        console.log(password)

        let hashedPassword = await hashPassword(password)

        let query1 = "SELECT Username FROM tblUsers"
        dbBlockchain.all(query1, [], (err, rows) => {
            try {
                let usernames = rows.map(row => row.Username)
                if (usernames.includes(username)) {
                    return res.status(400).json({outcome: "failure", message: "Usernames must be unique"})
                } else {
                    let query = "INSERT INTO tblUsers VALUES (?,?, 10)"
                    dbBlockchain.all(query, [username, hashedPassword], (err) => {
                        try {
                            if (err) {
                                return res.status(500).json({outcome: "failure", message: err.message})
                            } else {
                                return res.status(200).json({outcome: "success", message: `User created with username ${username}`})
                            }
                        } catch (err) {
                            return res.status(500).json({outcome: "failure", message: err.message})
                        }
                    }
            )}} catch (err) {
                return res.status(500).json({outcome: "failure", message: err.message})
            }
        })
    } catch (err) {
        return res.status(500).json({outcome: "failure", error: err.message})
}})


app.post("/login", (req, res, next) => {
    try {
        let username = req.body.username
        let password = req.body.password

        if (!username || !password) {
            return res.status(400).json({outcome: "failure", message: "Every field must be provided"})
        }

        let query1 = "SELECT Password FROM tblUsers WHERE Username = ?"
        dbBlockchain.get(query1, [username], async (err, row) => {
            try {
                if(!row) {
                    return(res.status(401).json({outcome: "failure", message: "<div>No user by that name.</div>"}))
                }
                
                const passMatch = await bcrypt.compare(password, row.Password)
                

                if(passMatch){
                    return res.status(200).json({outcome: "success", message: "Logged in"})
                } else {
                    return res.status(402).json({outcome: "failure", message: "<div>Incorrect password.</div>"})
                }
            } catch (err) {
                return res.status(500).json({outcome: "failure", message: `<div>${err.message}</div>`})
            }
        })
    } catch (err) {
        return res.status(500).json({outcome: "failure", error: `<div>${err.message}</div>`})
}})

// TESTING ACCOUNT -- Do not keep
app.delete("/user", (req, res, next) => {
    dbBlockchain.run("DELETE FROM tblUsers WHERE Username = 'Isaiah'", (err) => {
        if (err) {
            res.status(400).json({message: err.message})
        } else {
            res.status(200).json({message: "successfully deleted Isaiah"})
        }
    })
})

app.get("/users", (req, res, next) => {
    try {
        const query = "SELECT Username FROM tblUsers"
        dbBlockchain.all(query, [], (err, rows) => {
            try {
                let usernames = rows.map(row => row.Username)
                res.status(200).json(usernames)
            } catch (err) {
                res.status(500).json({outcome: "failure", message: err.message})
            }
        })
    } catch (err) {
        res.status(500).json({outcome: "failure", message: err.message})
    }
})

app.get("/coins/:user", (req, res, next) => {
    const username = req.params.user

    const strQuery = "Select * FROM tblBlockchain WHERE OwnerId = ?"
    dbBlockchain.all(strQuery, [username], (err, rows) => {
        if (err) {
            return res.status(500).json({outcome: "failure", message: err.message})
        }

        return res.status(200).json(rows)
    })
})

app.get("/coinCount/:user", (req, res, next) => {
    const username = req.params.user
    const strQuery = "SELECT Coins FROM tblUsers WHERE Username = ?"
    dbBlockchain.get(strQuery, [username], (err, row) => {
        if (err) {
            res.status(500).json({outcome: "failure", message: "server error"})
        } else if (!row) {
            res.status(404).json({outcome: "failure", message: "User not found"})
        } else {
           res.status(200).json(row)
        }
    })
})

app.post("/transaction", (req, res, next) => {
    const sender = req.body.sender
    const recipient = req.body.recipient
    const amount = Number(req.body.amount)

    if (!sender || !recipient || !req.body.amount) {
        return res.status(400).json({outcome: "failure", message: "Every field must be provided"})
    }

    if (!Number.isInteger(amount) || amount <= 0) {
        return res.status(400).json({outcome: "failure", message: "Amount must be a positive whole number"})
    }

    if (sender === recipient) {
        return res.status(400).json({outcome: "failure", message: "You cannot send coins to yourself"})
    }

    const senderQuery = "SELECT Username, Coins FROM tblUsers WHERE Username = ?"
    dbBlockchain.get(senderQuery, [sender], (err, senderRow) => {
        if (err) {
            return res.status(500).json({outcome: "failure", message: err.message})
        } else if (!senderRow) {
            return res.status(404).json({outcome: "failure", message: "Sender not found"})
        } else if (senderRow.Coins < amount) {
            return res.status(400).json({outcome: "failure", message: "Not enough coins to make that transaction"})
        }

        const recipientQuery = "SELECT Username FROM tblUsers WHERE Username = ?"
        dbBlockchain.get(recipientQuery, [recipient], (err, recipientRow) => {
            if (err) {
                return res.status(500).json({outcome: "failure", message: err.message})
            } else if (!recipientRow) {
                return res.status(404).json({outcome: "failure", message: "Recipient not found"})
            }

            const addTransaction = "INSERT INTO tblTransaction (TransAmount, Sender, Recipient, BlockId) VALUES (?, ?, ?, NULL)"
            dbBlockchain.run(addTransaction, [amount, sender, recipient], (err) => {
                if (err) {
                    return res.status(500).json({outcome: "failure", message: err.message})
                }

                return res.status(200).json({outcome: "success", message: "Transaction added to the mining queue"})
            })
        })
    })
})

app.post("/mine", (req, res, next) => {
    const username = req.body.username

    const strTranSearch = "SELECT * FROM tblTransaction WHERE BlockId IS NULL ORDER BY transIndex ASC LIMIT 1"
    dbBlockchain.get(strTranSearch, [], (err, row) => {
        if (err) {
            return res.status(400).json({outcome: "failure", message: err.message})
        } else if (!row) {
            return res.status(400).json({outcome: "failure", message: "No transactions exist to mine"})
        }else {
            const amount = row.TransAmount
            const sender = row.Sender
            const recipient = row.Recipient

            const minerQuery = "SELECT Username FROM tblUsers WHERE Username = ?"
            dbBlockchain.get(minerQuery, [username], (err, minerRow) => {
                if (err) {
                    return res.status(500).json({outcome: "failure", message: err.message})
                } else if (!minerRow) {
                    return res.status(404).json({outcome: "failure", message: "Miner not found"})
                }

                const senderCoinQuery = "SELECT Coins FROM tblUsers WHERE Username = ?"
                dbBlockchain.get(senderCoinQuery, [sender], (err, senderRow) => {
                    if (err) {
                        return res.status(500).json({outcome: "failure", message: err.message})
                    } else if (!senderRow) {
                        return res.status(404).json({outcome: "failure", message: "Transaction sender no longer exists"})
                    } else if (senderRow.Coins < amount) {
                        return res.status(400).json({outcome: "failure", message: "Sender no longer has enough coins to complete this transaction"})
                    }

                    const lastBlockQuery = "SELECT * FROM tblBlockchain ORDER BY [Index] DESC LIMIT 1"
                    dbBlockchain.get(lastBlockQuery, [], (err, lastBlock) => {
                        if (err) {
                            return res.status(500).json({outcome: "failure", message: err.message})
                        }

                        if (lastBlock) {
                            objHippoChain.chain = [{
                                index: lastBlock.Index,
                                time: lastBlock.Time,
                                transaction: {},
                                nonce: lastBlock.Nonce,
                                hash: lastBlock.Hash,
                                previous: lastBlock.PrevHash
                            }]
                        }

                        objHippoChain.createNewBlock(amount, sender, recipient)

                        const newestBlock = objHippoChain.chain[objHippoChain.chain.length - 1]
                        const add = "INSERT INTO tblBlockchain (Time, Nonce, Hash, PrevHash, OwnerId) VALUES (TIME(), ?, ?, ?, ?)"
                        dbBlockchain.run(add, [newestBlock.nonce, newestBlock.hash, newestBlock.previous, username], function (err) {
                            if (err) {
                                console.log(err.message)
                                return res.status(401).json({outcome: "failure", message: err.message})
                            }
                            const blockId = this.lastID
                            const updateTransaction = "UPDATE tblTransaction SET BlockId = ? WHERE transIndex = ?"
                            dbBlockchain.run(updateTransaction, [blockId, row.transIndex], (err) => {
                                if (err) {
                                    return res.status(500).json({outcome: "failure", message: err.message})
                                }
                                const removeCoins = "UPDATE tblUsers SET Coins = Coins - ? WHERE Username = ?"
                                dbBlockchain.run(removeCoins, [amount, sender], (err) => {
                                    if (err) {
                                        return res.status(500).json({outcome: "failure", message: err.message})
                                    }
                                    const addRecipientCoins = "UPDATE tblUsers SET Coins = Coins + ? WHERE Username = ?"
                                    dbBlockchain.run(addRecipientCoins, [amount, recipient], (err) => {
                                        if (err) {
                                            return res.status(500).json({outcome: "failure", message: err.message})
                                        }
                                        const addCoins = "UPDATE tblUsers SET Coins = Coins + 10 WHERE Username = ?"
                                        dbBlockchain.run(addCoins, [username], (err) => {
                                            if(err){
                                                return res.status(400).json({outcome: "failure"})
                                            }
                                            return res.status(200).json({outcome: "success" , block: newestBlock.index, message: "Block mined and transaction confirmed"})
                                        })
                                    })
                                })
                            })
                        })
                    })
                })
            })
        }
    })
}) 

app.get('/wholeChain', (req, res, next) => {
    const strQuery = "SELECT * FROM tblBlockchain ORDER BY [Index] ASC"
    dbBlockchain.all(strQuery, [], (err, rows) => {
        if (err) {
            return res.status(500).json({outcome: "failure", message: err.message})
        }

        const rebuiltChain = rows.map((row) => ({
            index: row.Index,
            time: row.Time,
            nonce: row.Nonce,
            hash: row.Hash,
            previous: row.PrevHash,
            ownerId: row.OwnerId
        }))

        return res.status(200).json(rebuiltChain)
    })
})
