const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs')

const app = express()

app.use('/', express.static('dist'));
app.use(bodyParser.json())

app.post('/save', (req, res) => {
  const body = req.body;
  fs.writeFile('data1.json', JSON.stringify(body), () => {})
  res.sendStatus(200)
})

app.listen(3000, () => {
  console.log(`listening on 3000`)
})