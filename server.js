const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

let players = [null, null];

wss.on('connection', function connection(ws) {
  const playerId = players[0] === null ? 0 : players[1] === null ? 1 : -1;

  if (playerId === -1) {
    ws.close();
    return;
  }

  players[playerId] = ws;
  ws.send(JSON.stringify({ type: 'init', id: playerId }));

  ws.on('message', function incoming(message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error("Invalid JSON:", message);
      return;
    }

    if (data.type === 'hit') {
      data.shooterId = playerId;
      players.forEach(client => {
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
      return;
    }

    const otherId = 1 - playerId;
    const other = players[otherId];
    if (other && other.readyState === WebSocket.OPEN) {
      other.send(JSON.stringify(data));
    }
  });

  ws.on('close', () => {
    players[playerId] = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

let forbiddenZoneX = 380; // 左邊界初始值
const forbiddenZoneWidth = 40;
let forbiddenZoneDir = 1; // 向右

// 定期移動禁區，每 100ms 更新一次
setInterval(() => {
  forbiddenZoneX += 1 * forbiddenZoneDir;

  if (forbiddenZoneX < 300 || forbiddenZoneX > 660) {
    forbiddenZoneDir *= -1; // 到邊界就反向
  }

  const zoneData = {
    type: 'forbiddenZone',
    x: forbiddenZoneX,
    width: forbiddenZoneWidth
  };

  players.forEach(ws => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(zoneData));
    }
  });
}, 10);
