import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { addWSClient, removeWSClient, joinChannel, broadcastToChannel, getChannelClientCount, leaveChannel } from './lib/websocket';

const WS_PORT = process.env.WS_PORT || 3002;
const HTTP_PORT = process.env.WS_HTTP_PORT || 3003;

// WebSocket Server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 New client connected');
  addWSClient(ws);

  ws.on('message', (message: Buffer) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.log('📨 Received:', parsedMessage);

      if (parsedMessage.type === 'join' && parsedMessage.channelId) {
        joinChannel(ws, parsedMessage.channelId);
        
        ws.send(JSON.stringify({
          type: 'join_success',
          channel: parsedMessage.channelId,
          message: `Joined channel: ${parsedMessage.channelId}`
        }));
      } 
      else if (parsedMessage.type === 'leave' && parsedMessage.channelId) {
        leaveChannel(ws, parsedMessage.channelId);
        
        ws.send(JSON.stringify({
          type: 'leave_success',
          channel: parsedMessage.channelId,
          message: `Left channel: ${parsedMessage.channelId}`
        }));
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    removeWSClient(ws);
  });

  ws.on('error', (error: Error) => {
    console.error('❌ WebSocket error:', error);
  });
});

server.listen(Number(WS_PORT), '0.0.0.0', () => {
  console.log(`🚀 WebSocket server running on port ${WS_PORT}`);
});

// HTTP Server for internal broadcasts
const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { channel, message } = JSON.parse(body);
        
        console.log(`📢 Broadcasting to channel: ${channel}`);
        broadcastToChannel(channel, message);
        
        const clientCount = getChannelClientCount(channel);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          clients_notified: clientCount
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    });
  } 
  else if (req.method === 'GET' && req.url?.startsWith('/channel/')) {
    const channel = req.url.split('/channel/')[1];
    const clientCount = getChannelClientCount(channel);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      channel,
      connected_clients: clientCount
    }));
  }
  else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(Number(HTTP_PORT), '0.0.0.0', () => {
  console.log(`🌐 HTTP bridge server running on port ${HTTP_PORT}`);
});
