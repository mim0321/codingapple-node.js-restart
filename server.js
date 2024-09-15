const express = require('express');
const app = express();
require('dotenv').config()

app.use(express.static(__dirname + '/public'))
app.use('/', require('./routes/list.js'))
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
    res.render('index.ejs')
})