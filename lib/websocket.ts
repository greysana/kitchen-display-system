import { WebSocket } from 'ws';

interface WSClient {
  socket: WebSocket;
  channels: Set<string>;
}

const wsClients = new Map<WebSocket, WSClient>();

export function addWSClient(client: WebSocket): void {
  wsClients.set(client, {
    socket: client,
    channels: new Set()
  });
}

export function removeWSClient(client: WebSocket): void {
  wsClients.delete(client);
}

export function joinChannel(client: WebSocket, channel: string): void {
  const clientData = wsClients.get(client);
  if (clientData) {
    clientData.channels.add(channel);
    console.log(`✓ Client joined channel: ${channel} (Total: ${getChannelClientCount(channel)})`);
  }
}

export function leaveChannel(client: WebSocket, channel: string): void {
  const clientData = wsClients.get(client);
  if (clientData) {
    clientData.channels.delete(channel);
    console.log(`○ Client left channel: ${channel}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function broadcastToChannel(channel: string, message: any): void {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  wsClients.forEach((clientData) => {
    if (
      clientData.channels.has(channel) && 
      clientData.socket.readyState === WebSocket.OPEN
    ) {
      clientData.socket.send(messageStr);
      sentCount++;
    }
  });
  
  console.log(`📤 Sent to ${sentCount} clients in channel: ${channel}`);
}

export function getChannelClientCount(channel: string): number {
  let count = 0;
  wsClients.forEach((clientData) => {
    if (clientData.channels.has(channel)) {
      count++;
    }
  });
  return count;
}