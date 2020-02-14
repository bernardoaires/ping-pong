import { ObjectID, MongoClient } from 'mongodb'
import bodyParser from 'body-parser'
import express from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
const morgan = require('morgan') // Using require as a workaround to deprecated default format
const app = express()
dotenv.config()

const url = 'mongodb://localhost:27017'
const dbName = 'PingPong'
const MATCH_POINTS = 25

const client = new MongoClient(url, { useUnifiedTopology: true });

const getDb = async () => {
if (!client.isConnected()) {
  await client.connect()
} 
  const db = client.db(dbName)
  
  return db
}

app.use(express.json())
app.use(morgan('tiny'))
app.use(bodyParser.json())

app.get('/', async (req, res) => {
  res.send('Hello PingPong')
})

app.post('/auth/signUp', async (req, res) => {
  const { username, password, name, email, age, sex } = req.body
  const db = await getDb()
  const playerInfo = { username, password, name, email, age, sex, points: 0 }
  const oldPlayer = await db.collection('Player').findOne({
    $or:[
      { username },
      { email }
    ]
  })
  if (oldPlayer) {
    res.send('Player ja cadastrado')
    return
  }
  const insertedPlayer = await db.collection('Player').insertOne(playerInfo)
  const newPlayer = insertedPlayer.ops[0]
  res.send(newPlayer)
})

app.post('/auth/signIn', async (req, res) => {
  const { username, password } = req.body
  const db = await getDb()
  const playerInfo = { username, password }
  const authPlayer = await db.collection('Player').findOne(playerInfo)
  if (!authPlayer) {
    res.sendStatus(404)
    return
  }
  const token = jwt.sign({
    userId: authPlayer._id
  }, process.env.JWT_KEY)
  res.send(token)
})

app.get('/me', async (req, res) => {
  const token = req.headers.authorization
  try {
    const verifiedPlayer = jwt.verify(token, process.env.JWT_KEY)
    const db = await getDb()
    const playerInfo = await db.collection('Player').findOne({ _id: new ObjectID(verifiedPlayer.userId) })
    res.send(playerInfo)
  } catch (err) {
    res.sendStatus(401)
  }
})

app.post('/matches', async (req, res) => {
  const { date, winnerId, loserId, result } = req.body
  const db = await getDb()
  const match = { date, winnerId, loserId, result }
  const insertedMatch = await db.collection('Match').insertOne(match)
  await db.collection('Player').updateOne({
    _id: new ObjectId(winnerId)
  }, {
    $inc: {
      points: MATCH_POINTS
    }
  })
  await db.collection('Player').updateOne({
    _id: new ObjectId(loserId)
  }, {
    $inc: {
      points: -MATCH_POINTS
    }
  })
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
  res.send('Player deleted')
})

app.delete('/matches/:matchId', async (req, res) => {
  const matchId = req.params.matchId
  const db = await getDb()
  await db.collection('Match').deleteOne({
    _id: new ObjectID(matchId)
  })
  res.send('Match deleted')
})

app.listen(8000, async () => {
  console.log('Listening on port 8000!')
})