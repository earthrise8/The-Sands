import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Dune Sietch Names for creative Room IDs
const SIETCH_NAMES = ['TABR', 'HABANYA', 'TUONO', 'CARTHAG', 'ARRAKEEN', 'SINK', 'CHIN', 'GARA', 'SULOCH', 'BIALKAN'];

// Predefined Rocky Highgrounds for validation & Home Base Selection
const ROCKY_SIETCHES = [
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 2 },
  { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }, { x: 13, y: 3 },
  { x: 22, y: 2 }, { x: 23, y: 2 }, { x: 23, y: 3 },
  { x: 2, y: 15 }, { x: 2, y: 16 }, { x: 3, y: 16 },
  { x: 22, y: 15 }, { x: 23, y: 15 }, { x: 23, y: 16 }, { x: 21, y: 15 },
  { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 12, y: 15 }
];

interface Player {
  id: string;
  ws: WebSocket;
  username: string;
  ready: boolean;
}

interface Room {
  id: string; // e.g. "SIETCH-TABR-712"
  fremen: Player | null;
  worm: Player | null;
  gameState: 'LOBBY' | 'PLAYING' | 'OVER';
  homeBase: { x: number; y: number } | null;
  spiceBlows: any[];
}

const rooms = new Map<string, Room>();

const generateRoomId = (): string => {
  const name1 = SIETCH_NAMES[Math.floor(Math.random() * SIETCH_NAMES.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `SIETCH-${name1}-${num}`;
};

// API Endpoint for health checking
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

// WebSocket upgrade handling
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client_${Math.random().toString(36).substring(2, 9)}`;
  let clientRoomId: string | null = null;
  let clientUsername = 'Fremen Sandrider';

  const send = (data: object) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  const getClientRoleInRoom = (room: Room, cId: string): 'fremen' | 'worm' | null => {
    if (room.fremen?.id === cId) return 'fremen';
    if (room.worm?.id === cId) return 'worm';
    return null;
  };

  const broadcastToRoom = (roomId: string, data: object, excludeSelfId?: string) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const msg = JSON.stringify(data);
    
    if (room.fremen && room.fremen.id !== excludeSelfId && room.fremen.ws.readyState === WebSocket.OPEN) {
      room.fremen.ws.send(msg);
    }
    if (room.worm && room.worm.id !== excludeSelfId && room.worm.ws.readyState === WebSocket.OPEN) {
      room.worm.ws.send(msg);
    }
  };

  const syncRoomLobby = (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) return;

    broadcastToRoom(roomId, {
      type: 'ROOM_SYNC',
      payload: {
        roomId: room.id,
        gameState: room.gameState,
        fremen: room.fremen ? { id: room.fremen.id, username: room.fremen.username, ready: room.fremen.ready } : null,
        worm: room.worm ? { id: room.worm.id, username: room.worm.username, ready: room.worm.ready } : null,
      }
    });
  };

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message);
      const { type, payload } = parsed;

      switch (type) {
        case 'CREATE_ROOM': {
          const rId = generateRoomId();
          clientUsername = payload?.username || clientUsername;
          const preferWorm = payload?.preferWorm || false;

          const player: Player = {
            id: clientId,
            ws,
            username: clientUsername,
            ready: false,
          };

          const newRoom: Room = {
            id: rId,
            fremen: preferWorm ? null : player,
            worm: preferWorm ? player : null,
            gameState: 'LOBBY',
            homeBase: null,
            spiceBlows: [],
          };

          rooms.set(rId, newRoom);
          clientRoomId = rId;

          send({
            type: 'ROOM_CREATED',
            payload: {
              roomId: rId,
              role: preferWorm ? 'worm' : 'fremen',
              username: clientUsername
            }
          });
          syncRoomLobby(rId);
          break;
        }

        case 'JOIN_ROOM': {
          const rId = (payload?.roomId || '').trim().toUpperCase();
          clientUsername = payload?.username || clientUsername;
          const room = rooms.get(rId);

          if (!room) {
            send({ type: 'ERROR', payload: { message: `Sietch shelter '${rId}' not found in storm.` } });
            return;
          }

          if (room.fremen && room.worm) {
            send({ type: 'ERROR', payload: { message: `Sietch shelter '${rId}' is already fully occupied.` } });
            return;
          }

          const player: Player = {
            id: clientId,
            ws,
            username: clientUsername,
            ready: false,
          };

          let assignedRole: 'fremen' | 'worm';
          if (!room.fremen) {
            room.fremen = player;
            assignedRole = 'fremen';
          } else {
            room.worm = player;
            assignedRole = 'worm';
          }

          clientRoomId = rId;

          send({
            type: 'ROOM_JOINED',
            payload: {
              roomId: rId,
              role: assignedRole,
              username: clientUsername
            }
          });
          syncRoomLobby(rId);
          broadcastToRoom(rId, {
            type: 'CHAT_MSG',
            payload: { text: `Sandrider ${clientUsername} descended into ${rId}!`, isSystem: true }
          });
          break;
        }

        case 'QUICK_JOIN': {
          clientUsername = payload?.username || clientUsername;
          // Look for any room with 1 player
          let foundRoom: Room | null = null;
          for (const [rId, r] of rooms.entries()) {
            if (r.gameState === 'LOBBY' && ((r.fremen && !r.worm) || (!r.fremen && r.worm))) {
              foundRoom = r;
              break;
            }
          }

          if (foundRoom) {
            const player: Player = { id: clientId, ws, username: clientUsername, ready: false };
            let assignedRole: 'fremen' | 'worm';
            if (!foundRoom.fremen) {
              foundRoom.fremen = player;
              assignedRole = 'fremen';
            } else {
              foundRoom.worm = player;
              assignedRole = 'worm';
            }
            clientRoomId = foundRoom.id;
            send({
              type: 'ROOM_JOINED',
              payload: { roomId: foundRoom.id, role: assignedRole, username: clientUsername }
            });
            syncRoomLobby(foundRoom.id);
            broadcastToRoom(foundRoom.id, {
              type: 'CHAT_MSG',
              payload: { text: `Sandrider ${clientUsername} descended into ${foundRoom.id}!`, isSystem: true }
            });
          } else {
            // No room found, construct one
            const rId = generateRoomId();
            const player: Player = { id: clientId, ws, username: clientUsername, ready: false };
            const newRoom: Room = { id: rId, fremen: player, worm: null, gameState: 'LOBBY', homeBase: null, spiceBlows: [] };
            rooms.set(rId, newRoom);
            clientRoomId = rId;
            send({
              type: 'ROOM_CREATED',
              payload: { roomId: rId, role: 'fremen', username: clientUsername }
            });
            syncRoomLobby(rId);
          }
          break;
        }

        case 'SET_READY': {
          if (!clientRoomId) return;
          const room = rooms.get(clientRoomId);
          if (!room) return;

          const isFremen = room.fremen?.id === clientId;
          if (isFremen && room.fremen) {
            room.fremen.ready = payload?.ready ?? !room.fremen.ready;
          } else if (room.worm) {
            room.worm.ready = payload?.ready ?? !room.worm.ready;
          }

          syncRoomLobby(clientRoomId);

          // Check if both are ready to launch!
          if (room.fremen?.ready && room.worm?.ready) {
            room.gameState = 'PLAYING';

            // Generate authoritative seed: homeBase and initial spice blows coordinates
            // Select a safe homeBase position among the ROCKY_SIETCHES that is different from start position
            const possibleSietches = ROCKY_SIETCHES.filter(pos => Math.abs(pos.x - 5) > 1 || Math.abs(pos.y - 9) > 1);
            const selectedBase = possibleSietches[Math.floor(Math.random() * possibleSietches.length)] || ROCKY_SIETCHES[10];

            room.homeBase = selectedBase;

            // Pre-seed 5 spice blows
            const spiceBlows = [];
            for (let i = 0; i < 5; i++) {
              let rx = Math.floor(Math.random() * 26);
              let ry = Math.floor(Math.random() * 19);
              // avoid rocks
              while (ROCKY_SIETCHES.some(r => r.x === rx && r.y === ry)) {
                rx = Math.floor(Math.random() * 26);
                ry = Math.floor(Math.random() * 19);
              }
              spiceBlows.push({
                id: `sb_${Math.random().toString(36).substring(2, 6)}_${i}`,
                x: rx,
                y: ry,
                amount: Math.floor(Math.random() * 3) + 2,
                isMajor: i === 0 // 1 major blow
              });
            }
            room.spiceBlows = spiceBlows;

            broadcastToRoom(clientRoomId, {
              type: 'START_MATCH',
              payload: {
                homeBase: room.homeBase,
                spiceBlows: room.spiceBlows
              }
            });
          }
          break;
        }

        case 'GAME_FORWARD': {
          // Relays specific real-time coordinate movements between peers incredibly fast!
          if (!clientRoomId) return;
          broadcastToRoom(clientRoomId, {
            type: 'GAME_STATE_UPDATE',
            payload: payload
          }, clientId);
          break;
        }

        case 'THUMPER_PLACED': {
          if (!clientRoomId) return;
          broadcastToRoom(clientRoomId, {
            type: 'THUMPER_SIGNAL',
            payload: payload
          }, clientId);
          break;
        }

        case 'SPICE_GATHERED': {
          if (!clientRoomId) return;
          const room = rooms.get(clientRoomId);
          if (room) {
            // Remove from server list
            room.spiceBlows = room.spiceBlows.filter(sb => sb.id !== payload.id);
            // Spawn a replacement spice blow
            let rx = Math.floor(Math.random() * 26);
            let ry = Math.floor(Math.random() * 19);
            while (ROCKY_SIETCHES.some(r => r.x === rx && r.y === ry)) {
              rx = Math.floor(Math.random() * 26);
              ry = Math.floor(Math.random() * 19);
            }
            const replacement = {
              id: `sb_${Math.random().toString(36).substring(2, 6)}_${Date.now()}`,
              x: rx,
              y: ry,
              amount: Math.floor(Math.random() * 3) + 2,
              isMajor: Math.random() > 0.82
            };
            room.spiceBlows.push(replacement);

            // Broadcast the entire updated list of spice blows to keep both clients in perfect sync
            broadcastToRoom(clientRoomId, {
              type: 'SPICE_UPDATE',
              payload: {
                spiceBlows: room.spiceBlows
              }
            });
          }
          break;
        }

        case 'DEATH_TRIGGER': {
          if (!clientRoomId) return;
          broadcastToRoom(clientRoomId, {
            type: 'WORM_DEATH_NOTIFICATION',
            payload: payload
          }, clientId);
          break;
        }

        case 'SEND_CHAT': {
          if (!clientRoomId) return;
          broadcastToRoom(clientRoomId, {
            type: 'CHAT_MSG',
            payload: {
              sender: clientUsername,
              text: payload?.text || ''
            }
          });
          break;
        }

        case 'RESET_MATCH': {
          if (!clientRoomId) return;
          const room = rooms.get(clientRoomId);
          if (room) {
            room.gameState = 'LOBBY';
            if (room.fremen) room.fremen.ready = false;
            if (room.worm) room.worm.ready = false;
            syncRoomLobby(clientRoomId);
          }
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
    }
  });

  ws.on('close', () => {
    if (clientRoomId) {
      const room = rooms.get(clientRoomId);
      if (room) {
        const isFremen = room.fremen?.id === clientId;
        const remainingPlayer = isFremen ? room.worm : room.fremen;

        if (isFremen) {
          room.fremen = null;
        } else {
          room.worm = null;
        }

        if (!room.fremen && !room.worm) {
          // Both exited, tear down sietch room memory
          rooms.delete(clientRoomId);
        } else {
          // Reset other player to unready lobby state
          room.gameState = 'LOBBY';
          if (remainingPlayer) remainingPlayer.ready = false;
          syncRoomLobby(clientRoomId);
          broadcastToRoom(clientRoomId, {
            type: 'CHAT_MSG',
            payload: { text: `We collapsed! Player '${clientUsername}' disappeared into the Coriolis storm.`, isSystem: true }
          });
        }
      }
    }
  });
});

// Configure Vite integration for serving assets based on environment build target
async function createViteIntegration() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Serving developer sandbox modules inside Vite dev server...');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production-ready pre-compiled bundle assets from /dist...');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Arrakis Sietch Multiplex bound successfully on Port ${PORT}`);
  });
}

createViteIntegration();
