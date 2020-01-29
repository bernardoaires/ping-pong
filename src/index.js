const MongoClient = require('mongodb').MongoClient
const assert = require('assert')
const express = require('express')
const app = express()

const url = 'mongodb://localhost:27017'

const dbName = 'PingPong'

const client = new MongoClient(url, { useUnifiedTopology: true })

const getDb = async () => {
    if (!client.isConnected()) {
        client.connect(function(err) {
            assert.equal(null, err)
            console.log("Connected successfully to server")
        })
    } 
    const db = await client.db(dbName)
    
    return db
}

app.post('/', async (req, res) => {
    // const { username, password, name, email, age, sex, profilePicture, ranking } = req
    const { name, age } = req
    const db = await getDb()
    // const player = { username, password, name, email, age, sex, profilePicture, ranking }
    const player = { name, age }
    const newPlayer = await db.collection('Player').insertOne(player)
    res.send(newPlayer)
    const { data, player1Id, player2Id, winnerId, result, points } = req
    const match = { data, player1Id, player2Id, winnerId, result, points }
    const newMatch = await db.collection('Match').insertOne(match)
    res.send(newMatch)
})

app.get('/players', async (req, res) => {
    const db = await getDb()
    const players = await db.collection('Player').find({})
    res.send(players)
})

app.get('/players/:playerId', async (req, res) => {
    const db = await getDb()
    const player = await db.collection('Player').findOne({})
    res.send(player)
})

app.get('/matches/:matchesId', async (req, res) => {
    res.send('Hello World!')
})

app.listen(8000, function () {
    console.log('Example app listening on port 8000!')
})