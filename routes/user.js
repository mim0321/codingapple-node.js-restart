const express = require('express')
const router = require('express').Router()
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

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

router.get('/user/login', async (req, res)=>{
    try {
        if(!req.user){
            console.log('Not login')
            res.render('user-login.ejs')
        } else{
            console.log('Status Signin')
            res.render('user-profile.ejs', {result : req.user})
        }
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.post('/user/login', async (req, res, next)=>{
    try {
        passport.authenticate('local', (error, user, info)=>{
            // 아이디 비번 비교하는 작업 진행하는 부분
            if(error) return res.status(500).json(error)
            if(!user) return res.status(401).json(info.message)
            req.logIn(user, (err)=>{
                if(err) return next(err);
                res.redirect('/')
            })
        })(req, res, next)
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.get('/user/register', async (req, res)=>{
    try {
        const result = await db.collection('user').find().toArray()
        res.render('register.ejs', {result : result})
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.post('/user/register', async (req, res)=>{
    try {
        const usernameCheck = await db.collection('user').findOne({username : req.body.username})
        if (usernameCheck){
            console.log('아이디 중복')
            res.status(401).send('중복된 아이디가 있습니다.')
        } else if(req.body.password != req.body.passwordCheck){
            console.log('패스워드 중복체크 잘못됨')
            res.status(401).send('패스워드 중복체크에서 문제가 발생했습니다.')
        } else {
            const hashing = await bcrypt.hash(req.body.password, 10)
            await db.collection('user').insertOne({username: req.body.username, password: hashing})
            res.redirect('/user/login')
        }
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.get('/user/logout', async (req, res, next)=>{
    try {
        req.logout((err)=>{
            if(err) return next(err);

            req.session.destroy((err)=>{
                if(err) return next(err);

                res.redirect('/');
            })
        })
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

module.exports = router;