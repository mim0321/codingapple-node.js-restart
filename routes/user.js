const express = require('express')
const router = require('express').Router()
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

router.use(methodOverride('_method'))
router.use(express.json())
router.use(express.urlencoded({extended: true}))
router.use(passport.initialize())
router.use(session({
  secret: process.env.PASSPORT_Secret,
  resave : true,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 6 * 60 * 1000 }
}))
router.use(passport.session())
passport.use(new LocalStrategy(async (username, password, cb) => {
    try {
        let result = await db.collection('user').findOne({ username : username})
        if (!result) {
          return cb(null, false, { message: '아이디가 일치하지 않습니다.' })
        }
        if (result.password == password) {
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

router.get('/user/profile', async (req, res)=>{
    try {
        console.log('req.user :', req.user)
        if(!req.user){
            console.log('Not login')
            res.render('user-login.ejs')
        } else{
            console.log('Status Signin')
            res.render('user-profile')
        }
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.post('/user/profile', async (req, res, next)=>{
    try {
        passport.authenticate('local', (error, user, info)=>{
            // 아이디 비번 비교하는 작업 진행하는 부분
            if(error) return res.status(500).json(error)
            if(!user) return res.status(401).json(info.message)
            req.logIn(user, (err)=>{
                if(err) return next(err)
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
        res.render('register.ejs')
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

router.post('/user/register', async (req, res)=>{
    try {
        // 만약 중복된 아이디가 있으면 안되고, 없으면 가입되도록 만들 예정
        await db.collection('user').insertOne({username: req.body.username, password: req.body.password})
        console.log(req.body)
        res.redirect('/user/login')
    } catch(err){
        console.log(err)
        res.status(500).send('Server error')
    }
})

module.exports = router;