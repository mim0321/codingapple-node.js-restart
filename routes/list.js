const router = require('express').Router()

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

module.exports = router