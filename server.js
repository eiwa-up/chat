// server.js（マルチルーム対応＋ルーム一覧返却機能付き）
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

app.use(express.static(__dirname));

let users = {}; // socket.id => room

io.on('connection', socket => {
  console.log('接続:', socket.id);

  socket.on('join', room => {
    socket.join(room);
    users[socket.id] = room;

    socket.to(room).emit('new-peer', socket.id);

    const clients = [...(io.sockets.adapter.rooms.get(room) || [])];
    socket.emit('peers', clients.filter(id => id !== socket.id));

    console.log(`📡 ${socket.id} が ${room} に参加`);
  });

  socket.on('signal', data => {
    io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  });

  socket.on('disconnect', () => {
    const room = users[socket.id];
    if (room) socket.to(room).emit('peer-disconnect', socket.id);
    console.log('切断:', socket.id);
    delete users[socket.id];
  });

  // ルーム一覧を返す
  socket.on('request-rooms', () => {
    const rooms = [];
    for (const [roomName, roomSet] of io.sockets.adapter.rooms.entries()) {
      // roomNameがsocket.idではない場合のみ（実際のルーム）
      if (!users[roomName]) rooms.push(roomName);
    }
    socket.emit('room-list', rooms);
  });
});

const PORT = process.env.PORT || 30000;
http.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🚀 サーバー起動成功！');
  console.log('🌐 http://127.0.0.1:3000');
  console.log('=================================');
});
