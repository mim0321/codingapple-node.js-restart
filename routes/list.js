const express = require('express')
const router = require('express').Router()
const cors = require('cors');
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

router.use(cors());
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

// list GET 요청(리스트)
router.get('/list/page/:page', async (req, res) => {
  try {
      const page = (req.params.page - 1) * 5;
      const pageNum = await db.collection('post').find().toArray();
      const result = await db.collection('post').find().skip(page).limit(5).toArray();
      res.render('list.ejs', {result : result, pageNum : pageNum})
  } catch(err){
      console.log(err);
      res.status(500).send('Server Error')
  }
})

// detail GET 요청(디테일)
router.get('/list/detail/:id', async (req, res) => {
  try {
    const result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)});
    const commentList = await db.collection('comment').find({ postId : new ObjectId(req.params.id)}).toArray();
    res.render('detail.ejs', { result : result, commentList : commentList, commentUser : req.user.username })
  } catch(err){
      console.log(err);
      res.status(500).send('Server Error')
  }
})

// 글작성 GET 요청 (write)
router.get('/list/write', async (req, res) => {
  try {
    if(req.user){
      res.render('post-write.ejs', {result : req.user.username})
    } else {
      res.redirect('/user/login')
    }
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

// 글작성 POST 요청 (write)
router.post('/list/write', async (req, res) => {
  try {
    if (req.body.title == '' || req.body.content == ''){
      res.send('제목 또는 내용을 작성해주세요')
    } else {
      await db.collection('post').insertOne({
        title : req.body.title,
        content: req.body.content,
        user: req.user._id,
        username: req.user.username,
      })
      res.redirect('/list/page/1')
    }
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

// 글 수정 GET 요청(edit)
router.get('/list/edit/:id', async (req,res) => {
  try {
    const result = await db.collection('post').findOne({
      _id : new ObjectId(req.params.id),
      user : new ObjectId(req.user._id)
    })
    if(!result){
      res.redirect('/list/page/1')
    } else{
      res.render('edit.ejs', { result : result })
    }
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

// 글 수정 PUT 요청(edit)
router.put('/list/edit/:id', async (req, res) => {
  // method-override npm설치 후 API put으로 변경하기!
  // form태그의 url 맨 뒤에 ?_method=put 으로 변경해야함(API 확실히 구분 하려고 씀)
  try {
    if (req.body.title == '' || req.body.content == ''){
      res.send('제목 또는 내용을 작성해주세요')
    } else {
      await db.collection('post').updateOne({ _id : new ObjectId(req.params.id) }, {$set : {
        title : req.body.title,
        content : req.body.content,
      }})
      res.redirect('/list/page/1')
    }
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

// 글 삭제 DELETE 요청 (delete)
router.delete('/post_delete', async (req, res)=>{
  try {
    await db.collection('post').deleteOne({
      _id : new ObjectId(req.query.id),
      user : new ObjectId(req.user._id),
    })
    await db.collection('comment').deleteMany({ postId : new ObjectId(req.query.id) });
    res.status(200).send('Delete complete');
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

// 글 검색 GET 요청(search)
router.get('/list/page/:page/search', async (req, res)=>{
  try {
    let search = [
      {$search : {
        index : 'title_index',
        text : { query : req.query.val, path : 'title' }
      }}
    ]
    const page = (req.params.page - 1) * 5;
    const pageNum = await db.collection('post').aggregate(search).toArray();
    const result = await db.collection('post').aggregate(search).skip(page).limit(5).toArray();

    res.render('list-search.ejs', { result : result, pageNum : pageNum, searchVal : req.query.val })
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

//  댓글 기능 POST 요청(comment)
 router.post('/list/detail/comment/:id', async (req, res) => {
  try {
    await db.collection('comment').insertOne({
      postId : new ObjectId(req.params.id),
      user : new ObjectId(req.user._id),
      username : req.user.username,
      commentText : req.body.commentText,
    })
    res.redirect('/list/detail/' + req.params.id)
  } catch(err){
      console.log(err);
      res.status(500).send('Server Error')
  }
})

module.exports = router