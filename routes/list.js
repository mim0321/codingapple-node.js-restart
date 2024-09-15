const router = require('express').Router()

let connectDB = require('./../database.js')

let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

router.get('/list', (req, res) => {
    res.send('route 성공함')
})

module.exports = router