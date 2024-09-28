const express = require('express')
const router = require('express').Router()
const cors = require('cors');
const { ObjectId } = require('mongodb')
const methodOverride = require('method-override')

router.use(cors());
router.use(methodOverride('_method'))
router.use(express.json())
router.use(express.urlencoded({extended: true}))

let connectDB = require('./../database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

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

router.get('/list/detail/:id', async (req, res) => {
  try {
    const result = await db.collection('post').findOne({_id : new ObjectId(req.params.id)});
    res.render('detail.ejs', {result : result})
  } catch(err){
      console.log(err);
      res.status(500).send('Server Error')
  }
})

router.get('/list/write', async (req, res) => {
  try {
    console.log('test')
    res.render('post-write.ejs')
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

router.post('/list/write', async (req, res) => {
  try {
    if (req.body.title == '' || req.body.content == ''){
      res.send('제목 또는 내용을 작성해주세요')
    } else {
      await db.collection('post').insertOne({title : req.body.title, content: req.body.content})
      res.redirect('/list/page/1')
    }
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

router.get('/list/edit/:id', async (req,res) => {
  try {
    const result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id) })
    res.render('edit.ejs', { result : result })
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

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

router.delete('/post_delete', async (req, res)=>{
  try {
    console.log('data: ' + req.query.id)
    await db.collection('post').deleteOne({ _id : new ObjectId(req.query.id) })
    res.status(200).send('Delete complete');
  } catch(err){
    console.log(err);
    res.status(500).send('Server Error')
  }
})

module.exports = router