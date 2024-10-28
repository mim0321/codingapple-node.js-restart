const express = require('express')
const router = express.Router()
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const cors = require('cors');

router.use(cors())
router.use(methodOverride('_method'))
router.use(express.json())
router.use(express.urlencoded({extended: true}))
router.use(passport.initialize())
router.use(session({
  secret: process.env.PASSPORT_Secret,
  resave : true,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 6 * 60 * 1000 },
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'forum',
    ttl : 60 * 6 * 60 * 1000,
    autoRemove: 'native',
  })
}))
router.use(passport.session())
passport.use(new LocalStrategy(async (username, password, cb) => {
    try {
        let result = await db.collection('user').findOne({ username : username})
        if (!result) {
          return cb(null, false, { message: '아이디가 일치하지 않습니다.' })
        }

        const hashingPassword = await bcrypt.compare(password, result.password)
        if (hashingPassword){
          return cb(null, result)
        } else {
          return cb(null, false, { message: '암호가 일치하지 않습니다.' });
        }
    } catch(err){
        console.log(err)
    }
  }))

  passport.serializeUser((user, done)=>{
    process.nextTick(()=>{
        done(null, {id : user._id, username : user.username })
    })
  })

  passport.deserializeUser(async (user, done)=>{
    let result = await db.collection('user').findOne({ _id : new ObjectId(user.id) })
    delete result.password
    process.nextTick(()=>{
        done(null, result)
    })
  })

let connectDB = require('./../database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

// API List

router.get('/chat/list', async (req, res)=>{
  try {
    const result = await db.collection('chatroom').find({
      member : req.user._id,
    }).toArray()
    res.render('chat-list.ejs', {result : result})
  } catch(err){
      console.log(err)
      res.status(500).send('Server error')
  }
})

router.get('/chat/request', async (req, res)=>{
  try {
    await db.collection('chatroom').insertOne({
      // member 0:유저아이디, 1:작성자아이디
      member : [req.user._id, new ObjectId(req.query.writerId)],
      date : new Date(),
    })
    res.redirect('/chat/list')
  } catch(err){
      console.log(err)
      res.status(500).send('Server error')
  }
})

router.get('/chat/detail/:id', async (req, res)=>{
  try {
    const result = await db.collection('chatroom').findOne({_id : new ObjectId(req.params.id)})
    res.render('chat-detail.ejs', {result : result})
  } catch(err){
      console.log(err)
      res.status(500).send('Server error')
  }
})

module.exports = router