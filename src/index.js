import { ObjectID, MongoClient } from 'mongodb'
import bodyParser from 'body-parser'
import jwt from 'jsonwebtoken'
import express from 'express'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import Joi from '@hapi/joi'
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

const validateJWT = (req, res, next) => {  
  try {
    const token = req.headers.authorization
    jwt.verify(token, process.env.JWT_KEY)
    next()
  } catch (err) {
    res.sendStatus(401)
    next()
  }
}

app.use(validateJWT)
app.use(express.json())
app.use(morgan('tiny'))
app.use(bodyParser.json())

app.get('/', async (req, res) => {
  res.send('Hello PingPong')
})

app.post('/auth/signUp', async (req, res) => {
  const { username, password, repeat_password, name, email, age, sex } = req.body
  const db = await getDb()
  const playerInfo = { username, password, repeat_password, name, email, age, sex, points: 0 }

  const schema = Joi.object().keys({
    username: Joi.string()
      .trim()
      .email()
      .required(),

    password: Joi.string()
      .regex(/^[a-zA-Z0-9]{3,30}$/)
      .required(),

    repeat_password: Joi.ref('password'),

    name: Joi.string()
      .trim()
      .min(3)
      .max(30)
      .required(),

    email: Joi.ref('username'),

    age: Joi.number()
      .integer()
      .min(18)
      .max(65)
      .required(),

    sex: Joi.string()
      .valid('M', 'F')
      .required(),

    points: Joi.number()
      .integer()
      .required()

  })
    .with('password', 'repeat_password')
    .with('username', 'email')

  try {
    await schema.validateAsync(playerInfo)
  } catch (err) {
    res.send('Invalid schema')
    return
  }

  const oldPlayer = await db.collection('Player').findOne({
    $or: [
      { username },
      { email }
    ]
  })
  if (oldPlayer) {
    res.send('Player ja cadastrado')
    return
  }

  try {
    const hashedPassword = await bcrypt.hash(playerInfo.password, 10)
    playerInfo.password = hashedPassword
    playerInfo.repeat_password = hashedPassword
  } catch (err) {
    res.status(500).send('Error hashing password')
    return
  }
  const insertedPlayer = await db.collection('Player').insertOne(playerInfo)
  const newPlayer = insertedPlayer.ops[0]
  const token = jwt.sign({
    userId: newPlayer._id
  }, process.env.JWT_KEY)
  res.send(token)
})

app.post('/auth/signIn', async (req, res) => {
  const { username, password } = req.body
  const db = await getDb()
  const playerInfo = { username, password }
  const schema = Joi.object().keys({
    username: Joi.string()
      .trim()
      .email()
      .required(),

    password: Joi.string()
      .regex(/^[a-zA-Z0-9]{3,30}$/)
      .required()
  }).with('username', 'password')
  try {
    await schema.validateAsync(playerInfo)
  } catch (err) {
    res.send('Invalid schema')
    return
  }
  const authPlayer = await db.collection('Player').findOne({ username })
  try {
    if (!await bcrypt.compare(req.body.password, authPlayer.password)) {
      res.status(404).send('Failed login')
      return
    }
  } catch {
    res.sendStatus(500)
    return
  }
  if (!authPlayer) {
    res.status(404).send('Player not found')
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
    const playerInfo = await db.collection('Player').findOne({
      _id: new ObjectID(verifiedPlayer.userId)
    })
    res.send(playerInfo)
  } catch (err) {
    res.sendStatus(401)
    return
  }
})

app.get('/ranking', async (req, res) => {
  const db = await getDb()
  const sortedPlayers = await db.collection('Player').find({}).sort({ points: -1 }).toArray()
  res.send(sortedPlayers)
})

app.post('/matches', async (req, res) => {
  const { date, winnerId, loserId, result } = req.body
  const db = await getDb()
  const match = { date, winnerId, loserId, result }
  const schema = Joi.object().keys({
    date: Joi.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .required(),

    winnerId: Joi.string()
      .required(),

    loserId: Joi.string()
      .required(),

    result: Joi.array()
      .items(Joi.number().integer())
      .required()
  }).with('winnerId', 'loserId')
  try {
    await schema.validateAsync(match)
  } catch (err) {
    res.send('Invalid schema')
    return
  }
  if (!winnerId || !loserId || winnerId === loserId) {
    req.sendStatus(401)
    return
  }
  const insertedMatch = await db.collection('Match').insertOne(match)
  await db.collection('Player').updateOne({
    _id: new ObjectID(winnerId)
  }, {
    $inc: {
      points: MATCH_POINTS
    }
  })
  await db.collection('Player').updateOne({
    _id: new ObjectID(loserId)
  }, {
    $inc: {
      points: -MATCH_POINTS
    }
  })
  const newMatch = insertedMatch.ops[0]
  const token = jwt.sign({
    matchId: newMatch._id
  }, process.env.JWT_KEY)
  res.send(token)
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

app.listen(8000, async () => {
  console.log('Listening on port 8000!')
})