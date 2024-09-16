const router = require('express').Router()
const { ObjectId } = require('mongodb')

let connectDB = require('./../database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

router.get('/list', async (req, res) => {
  try {
    const result = await db.collection('post').find().toArray();
    res.render('list.ejs', {result : result})
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

module.exports = router