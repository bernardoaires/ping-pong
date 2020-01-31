const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID
const bodyParser = require('body-parser')
const morgan = require('morgan')
const assert = require('assert')
const express = require('express')
const app = express()

const url = 'mongodb://localhost:27017'
const dbName = 'PingPong'

const client = new MongoClient(url, { useUnifiedTopology: true });

const getDb = async () => {
  if (!client.isConnected()) {
    client.connect(function(err) {
    assert.equal(null, err)
    console.log("Connected successfully to server")
    })
  } 
  const db = client.db(dbName)
  
  return db
}

app.use(morgan('tiny'))
app.use(bodyParser.json())

app.post('/players', async (req, res) => {
  const { username, password, name, email, age, sex, profilePicture, ranking } = req.body
  const db = await getDb()
  const player = { username, password, name, email, age, sex, profilePicture, ranking }
  const insertedPlayer = await db.collection('Player').insertOne(player)
  const newPlayer = insertedPlayer.ops[0]
  res.send(newPlayer)
})

app.post('/matches', async (req, res) => {
  const { data, player1Id, player2Id, winnerId, result, points } = req.body
  const db = await getDb()
  const match = { data, player1Id, player2Id, winnerId, result, points }
  const insertedMatch = await db.collection('Match').insertOne(match)
  const newMatch = insertedMatch.ops[0]
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

app.put('/players/:playerId', async (req, res) => {
  const playerId = req.params.playerId
  const db = await getDb()
  const player = await db.collection('Player').updateOne({
    _id: new ObjectID(playerId)
  })
  res.send(player)
})

app.put('/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId
  const db = await getDb()
  const match = await db.collection('Match').updateOne({
    _id: new ObjectID(matchId)
  })
  res.send(match)
})

app.delete('/players/:playerId', async (req, res) => {
  const playerId = req.params.playerId
  const db = await getDb()
  await db.collection('Player').deleteOne({
    _id: new ObjectID(playerId)
  })

})

app.delete('/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId
  const db = await getDb()
  await db.collection('Match').deleteOne({
    _id: new ObjectID(matchId)
  })
})

app.listen(8000, function () {
  console.log('Listening on port 8000!')
})