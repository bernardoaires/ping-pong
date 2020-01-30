const MongoClient = require('mongodb').MongoClient
const Server = require('mongodb').Server
const ObjectID = require('mongodb').ObjectID
const assert = require('assert')
const express = require('express')
const app = express()

const url = 'localhost'
const dbName = 'account'

const client = new MongoClient(new Server(url, 27017), {native_parser: true});

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
  //const { username, password, name, email, age, sex, profilePicture, ranking } = req
  const { name, age } = req
  const db = await getDb()
  //const player = { username, password, name, email, age, sex, profilePicture, ranking }
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
  const players = await db.collection('Player').find({}).toArray()
  res.send(players)
})

app.get('/players/:playerId', async (req, res) => {
  const playerId = req.params.playerId
  const db = await getDb()
  const player = await db.collection('Player').findOne({
    _id: new ObjectID(playerId)
  })
  res.send(player)
})

app.get('/matches', async (req, res) => {
  const db = await getDb()
  const matches = await db.collection('Match').find({}).toArray()
  res.send(matches)
})

app.get('/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId
  const db = await getDb()
  const match = await db.collection('Match').findOne({
    _id: new ObjectID(matchId)
  })
  res.send(match)
})

app.listen(8000, function () {
  console.log('Listening on port 8000!')
})