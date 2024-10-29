const express = require('express')
const cors = require('cors')
const app = express()
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

// socket.io 세팅
const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server) 

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
  server.listen(process.env.port, () => console.log('http://localhost:' + process.env.port + ' 서버실행'));
}).catch((err)=>{
  console.log(err)
})

/** Main API */
app.get('/', (req, res) => {
    try {
        res.render('index.ejs')
    } catch(err){
        console.log(err);
        res.status(500).send('Server Error')
    }
})

/** Chat API */
app.get('/chat/list', async (req, res)=>{
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

app.get('/chat/request', async (req, res)=>{
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

app.get('/chat/detail/:id', async (req, res)=>{
  try {
    const result = await db.collection('chatroom').findOne({_id : new ObjectId(req.params.id)})
    res.render('chat-detail.ejs', {result : result})
  } catch(err){
      console.log(err)
      res.status(500).send('Server error')
  }
})

io.on('connection', (socket) => {

  /** [유저 -> 서버] 데이터 받아오기
   * socket.on('데이터이름', (받은 데이터)=>{받은 데이터를 활용할 코드})
   */
  socket.on('age', (data)=>{
    console.log('age : ', data)

  /** [서버 -> 모든유저] 데이터 전송
   * io.emit('데이터이름', '보낼 데이터')
   */
    io.emit('name', 'Lee')
  })

  /** 모든 유저에게 보내는 것이 아닌, 특정 유저에게 데이터를 전달하려면 room기능을 사용해야함 */
  // 유저를 room으로 보내기 == socket.join('룸 이름')
  socket.on('ask-join', (data)=>{
    socket.join(data);
    console.log('room 접속 : ', data)
  })

  socket.on('message-send', (data)=>{
    // io.emit 사이에 to(룸이름)을 넣으면 특정 룸에 데이터를 보낼 수 있다.
    io.to(data.room).emit('message-broadcast', data.msg)
  })
})

/** Server sent events(SSE) API */
app.get('/stream/list', async (req,res)=>{
  try {
    res.writeHead(200, {
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    })

    let 조건 = [
      { $match : { operationType : 'insert' } }
    ]

    let changeStream = db.collection('post').watch(조건)
    changeStream.on('change', (result)=>{
      res.write('event: post\n')
      res.write(`data: ${JSON.stringify(result.fullDocument)}\n\n`)
    })

  } catch(err){
      console.log(err)
      res.status(500).send('Server error')
  }
})