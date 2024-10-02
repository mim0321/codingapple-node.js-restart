const express = require('express')
const cors = require('cors')
const app = express()
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

require('dotenv').config()

app.use(cors());
app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'))
app.use('/', require('./routes/list.js'))
app.use('/', require('./routes/user.js'))
app.use(passport.initialize())
app.use(session({
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
app.use(passport.session())
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
  
app.set("view engine", "ejs")

let connectDB = require('./database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum')
  app.listen(process.env.port, () => console.log('http://localhost:' + process.env.port + ' 서버실행'));
}).catch((err)=>{
  console.log(err)
})

app.get('/', (req, res) => {
    try {
        res.render('index.ejs')
    } catch(err){
        console.log(err);
        res.status(500).send('Server Error')
    }
})