const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs')

const app = express()
const server = require('http').createServer(app)
const WebSocket = require('ws')
const wss = new WebSocket.Server({ server })

const PORT = process.env.PORT || 3000;

app.use('/', express.static('dist'));
app.use(bodyParser.json())

const { generateTerrain } = require('fractal-terrain-generator')

let heightmap = []

function createHeightmap() {
  heightmap = generateTerrain(100, 100, 0.4).map(row => 
    row.map(z => z + 2)
  )
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate()

    ws.isAlive = false
    ws.ping('', false, true)
  })
}, 30000)

function heartbeat() {
  this.isAlive = true
}

const sockets = {}

wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

wss.on('connection', function connection(ws) {
  ws.isAlive = true
  ws.on('pong', heartbeat)
  ws.on('message', function incoming(data) {
    // Broadcast to everyone else.
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});

app.get('/heightmap', (req, res) => {
  if(heightmap.length < 1) {
    createHeightmap()
  } 

  res.json(heightmap)
})

app.get('/fonts/:font', (req, res) => {
  let font = require(`./src/assets/${req.params.font}`)
  res.json(font)
})

app.post('/save', (req, res) => {
  const body = req.body;
  fs.writeFile('data1.json', JSON.stringify(body), () => {})
  res.sendStatus(200)
})


server.listen(PORT, () => {
  console.log(`listening on ${PORT}`)
})