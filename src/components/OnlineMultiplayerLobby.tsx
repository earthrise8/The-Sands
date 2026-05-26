import React, { useState, useEffect, useRef } from 'react';
import { Compass, Swords, Users, ShieldAlert, Wifi, MessageSquare, Send, Check, Play, LogOut } from 'lucide-react';
import { Position, SpiceBlow } from '../types';

interface OnlineMultiplayerLobbyProps {
  onStartOnlineMatch: (
    socket: WebSocket,
    role: 'fremen' | 'worm',
    initialHomeBase: Position,
    initialSpiceBlows: SpiceBlow[],
    roomId: string
  ) => void;
  onBackToMenu: () => void;
}

export default function OnlineMultiplayerLobby({
  onStartOnlineMatch,
  onBackToMenu,
}: OnlineMultiplayerLobbyProps) {
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('arrakis_username');
    if (saved) return saved;
    return `SietchRunner-${Math.floor(Math.random() * 800) + 100}`;
  });

  const [roomIdInput, setRoomIdInput] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lobbyState, setLobbyState] = useState<{
    roomId: string;
    gameState: string;
    fremen: { id: string; username: string; ready: boolean } | null;
    worm: { id: string; username: string; ready: boolean } | null;
  } | null>(null);

  const [assignedRole, setAssignedRole] = useState<'fremen' | 'worm' | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender?: string; text: string; isSystem?: boolean }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem('arrakis_username', username);
  }, [username]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Clean up WebSocket on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  const connectWebSocket = (callback: (ws: WebSocket) => void) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      callback(socket);
      return;
    }

    setIsConnecting(true);
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Match window.location.host so it proxies identically in dev AND preview
    const socketUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(socketUrl);

    ws.onopen = () => {
      setSocket(ws);
      setIsConnecting(false);
      callback(ws);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const { type, payload, senderRole } = parsed;

        switch (type) {
          case 'ROOM_CREATED':
            setAssignedRole(payload.role);
            break;

          case 'ROOM_JOINED':
            setAssignedRole(payload.role);
            break;

          case 'ROOM_SYNC':
            setLobbyState(payload);
            break;

          case 'CHAT_MSG':
            setChatMessages((prev) => [...prev, payload]);
            break;

          case 'START_MATCH':
            onStartOnlineMatch(ws, assignedRole || 'fremen', payload.homeBase, payload.spiceBlows, payload.roomId || (lobbyState?.roomId ?? ''));
            break;

          case 'ERROR':
            setError(payload.message);
            setIsConnecting(false);
            ws.close();
            setSocket(null);
            setLobbyState(null);
            setAssignedRole(null);
            break;
        }
      } catch (err) {
        console.error('Error parsing packet payload:', err);
      }
    };

    ws.onerror = () => {
      setError('Coriolis sandstorm disrupted transceiver link. Connection failed.');
      setIsConnecting(false);
      setSocket(null);
    };

    ws.onclose = () => {
      setSocket(null);
      setLobbyState(null);
      setAssignedRole(null);
    };
  };

  const handleCreateRoom = (preferWorm: boolean = false) => {
    if (!username.trim()) {
      setError('Provide a valid Sietch callsign.');
      return;
    }
    connectWebSocket((ws) => {
      ws.send(
        JSON.stringify({
          type: 'CREATE_ROOM',
          payload: { username, preferWorm },
        })
      );
    });
  };

  const handleJoinRoomByCode = () => {
    if (!username.trim()) {
      setError('Provide a valid Sietch callsign.');
      return;
    }
    if (!roomIdInput.trim()) {
      setError('Please type a distinct Sietch Room Code.');
      return;
    }
    connectWebSocket((ws) => {
      ws.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          payload: { roomId: roomIdInput, username },
        })
      );
    });
  };

  const handleQuickMatch = () => {
    if (!username.trim()) {
      setError('Provide a valid Sietch callsign.');
      return;
    }
    connectWebSocket((ws) => {
      ws.send(
        JSON.stringify({
          type: 'QUICK_JOIN',
          payload: { username },
        })
      );
    });
  };

  const handleToggleReady = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'SET_READY',
          payload: {},
        })
      );
    }
  };

  const handleSendChatAndClear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.send(
      JSON.stringify({
        type: 'SEND_CHAT',
        payload: { text: chatInput },
      })
    );
    setChatInput('');
  };

  const handleLeaveLobby = () => {
    if (socket) {
      socket.close();
    }
    setSocket(null);
    setLobbyState(null);
    setAssignedRole(null);
    setChatMessages([]);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl bg-stone-900/95 border border-[#ea580c]/40 p-6 md:p-8 rounded-xl shadow-2xl relative overflow-hidden" id="multiplayer-lobby-panel">
      {/* Decorative orange laser header accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-[1.5px] bg-[#ea580c]" />

      {/* Header Info */}
      <div className="flex flex-col items-center text-center gap-1.5 w-full">
        <div className="flex items-center gap-2 px-3 py-0.5 bg-cyan-950/40 border border-cyan-900/40 rounded-full text-[10px] font-mono text-cyan-400 tracking-widest uppercase animate-pulse">
          <Wifi className="w-3 h-3 text-cyan-400" />
          Arrakis Holtzman Network
        </div>
        <h2 className="text-2xl font-bold tracking-[0.15em] text-amber-500 uppercase mt-2">
          MULTIPLAYER CONSOLE
        </h2>
        <p className="text-xs text-stone-400">
          Match with other operators across the desert. Harness Melange or devour harvesters.
        </p>
      </div>

      {/* ERROR MESSAGE DISPLAY BANNER */}
      {error && (
        <div className="w-full bg-red-950/40 border border-red-900/80 rounded-lg p-3.5 flex items-start gap-3" id="lobby-error">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-left text-xs text-red-400 leading-relaxed font-mono">
            <strong>COMMS INTERRUPTED:</strong> {error}
          </div>
        </div>
      )}

      {/* STAGE A: SELECTION SCREEN (LOBBY IS UNCONNECTED) */}
      {!lobbyState ? (
        <div className="w-full flex flex-col gap-6" id="setup-view">
          {/* User profile callsign choice card */}
          <div className="flex flex-col gap-2 p-4 bg-stone-950/30 border border-stone-850 rounded-lg">
            <label className="text-[10px] uppercase font-mono tracking-widest text-[#ea580c] font-bold">
              Operator callsigN (Your Username):
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Stilgar"
              maxLength={22}
              className="px-3.5 py-2.5 bg-stone-950 border border-stone-800 focus:border-[#ea580c] focus:outline-none rounded-lg text-sm text-stone-200 font-mono tracking-wider transition-all"
              id="multiplayer-user-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick match action */}
            <button
              onClick={handleQuickMatch}
              disabled={isConnecting}
              className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-cyan-950/20 to-stone-950 hover:from-cyan-950/45 hover:to-stone-900 border border-cyan-800/40 hover:border-cyan-500/80 rounded-xl transition-all hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50"
              id="lobby-quickmatch"
            >
              <Users className="w-8 h-8 text-cyan-400 mb-2.5 animate-pulse" />
              <span className="font-bold text-cyan-300 text-sm tracking-wider uppercase">Quick Matchmaker</span>
              <span className="text-[10px] text-stone-500 text-center mt-1 leading-relaxed">
                Connect instantly with any vacant Sietch Room in the sector.
              </span>
            </button>

            {/* Create Room Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleCreateRoom(false)}
                disabled={isConnecting}
                className="flex items-center gap-3 p-3 bg-[#0c0a09] hover:bg-amber-950/15 border border-stone-800/80 hover:border-amber-500/45 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-left"
                id="lobby-create-fremen"
              >
                <div className="p-2 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Compass className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block font-bold text-stone-200 text-xs uppercase tracking-wider">Start Host (Fremen)</span>
                  <span className="block text-[10px] text-stone-500 mt-0.5">Fremen caller hosts code</span>
                </div>
              </button>

              <button
                onClick={() => handleCreateRoom(true)}
                disabled={isConnecting}
                className="flex items-center gap-3 p-3 bg-[#0c0a09] hover:bg-orange-950/15 border border-stone-800/80 hover:border-[#ea580c]/45 rounded-xl transition-all cursor-pointer disabled:opacity-50 text-left"
                id="lobby-create-worm"
              >
                <div className="p-2 bg-orange-500/10 text-[#ea580c] border border-orange-500/20">
                  <Swords className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block font-bold text-stone-200 text-xs uppercase tracking-wider">Start Host (Shai-Hulud)</span>
                  <span className="block text-[10px] text-stone-500 mt-0.5">Worm hunter hosts code</span>
                </div>
              </button>
            </div>
          </div>

          {/* Join Sietch via secret code card */}
          <div className="flex flex-col gap-2 p-4 bg-stone-950/30 border border-stone-850 rounded-lg">
            <label className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-bold">
              Join custom Sietch by Room Code:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="e.g. SIETCH-TABR-314"
                className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 focus:border-cyan-500 focus:outline-none rounded-lg text-xs font-mono tracking-widest uppercase"
                id="room-code-input"
              />
              <button
                onClick={handleJoinRoomByCode}
                disabled={isConnecting}
                className="px-4 py-2 bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 hover:border-cyan-400/80 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                id="join-code-btn"
              >
                Join
              </button>
            </div>
          </div>

          {/* Navigation Go Back button */}
          <button
            onClick={onBackToMenu}
            className="w-full py-2 bg-stone-950 border border-stone-850 hover:bg-stone-900 text-stone-400 hover:text-stone-300 rounded-lg text-xs font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="back-lobby-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            Back to Main Menu
          </button>
        </div>
      ) : (
        /* STAGE B: LOBBY STATUS (ROOM IS FOUND & SYNCING) */
        <div className="w-full flex flex-col gap-6" id="lobby-view">
          {/* Room Title Card */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-stone-950/40 border border-[#ea580c]/30 rounded-lg gap-3">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#ea580c] font-mono">SECURE TRANSCEIVER SITE:</span>
              <h3 className="text-lg md:text-xl font-mono font-bold text-amber-500 tracking-wider">
                {lobbyState.roomId}
              </h3>
            </div>
            <div className="flex gap-2.5 font-mono text-[9px] uppercase">
              <span className="px-2.5 py-1 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 rounded text-center font-semibold">
                ● COMMS STEADY
              </span>
              <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-center">
                ROLE: {assignedRole === 'fremen' ? 'FREMEN CALLER' : 'SHAI-HULUD'}
              </span>
            </div>
          </div>

          {/* Visual Role Seats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fremen seat */}
            <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between min-h-[140px] transition-all duration-300 ${
              assignedRole === 'fremen' ? 'bg-amber-950/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.08)]' : 'bg-stone-950/20 border-stone-900'
            }`}>
              <div className="flex flex-col items-center text-center gap-2">
                <Compass className={`w-8 h-8 ${lobbyState.fremen ? 'text-amber-500' : 'text-stone-600'}`} />
                <div>
                  <span className="block text-[10px] font-mono tracking-widest text-stone-500 uppercase font-bold">FREMEN HARVESTER SEAT</span>
                  {lobbyState.fremen ? (
                    <span className="block font-bold text-sm text-amber-500 mt-1 font-mono">
                      {lobbyState.fremen.username} {assignedRole === 'fremen' && '(You)'}
                    </span>
                  ) : (
                    <span className="block text-xs italic text-stone-600 mt-1">Waiting for caller...</span>
                  )}
                </div>
              </div>

              {lobbyState.fremen && (
                <div className={`mt-3 px-3 py-1 border rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all ${
                  lobbyState.fremen.ready 
                    ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40' 
                    : 'bg-red-950/10 text-red-500 border-red-900/40'
                }`}>
                  {lobbyState.fremen.ready ? '✓ COMMAND READY' : '⚒ TACTICAL PREP'}
                </div>
              )}
            </div>

            {/* Worm seat */}
            <div className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between min-h-[140px] transition-all duration-300 ${
              assignedRole === 'worm' ? 'bg-orange-950/10 border-[#ea580c]/50 shadow-[0_0_15px_rgba(234,88,12,0.08)]' : 'bg-stone-950/20 border-stone-900'
            }`}>
              <div className="flex flex-col items-center text-center gap-2">
                <Swords className={`w-8 h-8 ${lobbyState.worm ? 'text-[#ea580c]' : 'text-stone-600'}`} />
                <div>
                  <span className="block text-[10px] font-mono tracking-widest text-stone-500 uppercase font-bold">SHAI-HULUD HUNTER SEAT</span>
                  {lobbyState.worm ? (
                    <span className="block font-bold text-sm text-[#ea580c] mt-1 font-mono">
                      {lobbyState.worm.username} {assignedRole === 'worm' && '(You)'}
                    </span>
                  ) : (
                    <span className="block text-xs italic text-stone-600 mt-1">Waiting for worm...</span>
                  )}
                </div>
              </div>

              {lobbyState.worm && (
                <div className={`mt-3 px-3 py-1 border rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all ${
                  lobbyState.worm.ready 
                    ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40' 
                    : 'bg-red-950/10 text-red-500 border-red-900/40'
                }`}>
                  {lobbyState.worm.ready ? '✓ MAKER READY' : '⚒ COILS SLEEPING'}
                </div>
              )}
            </div>
          </div>

          {/* Lobby Live Chat Channel */}
          <div className="flex flex-col border border-stone-850 bg-stone-950/20 rounded-xl h-44 overflow-hidden shadow-inner font-mono text-xs">
            <div className="bg-stone-950/60 py-1 px-3 border-b border-stone-850 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
                <MessageSquare className="w-3.5 h-3.5" />
                Dune Comms Feed
              </span>
              <span className="text-[9px] text-stone-500">frequency 45.42 MHz</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5 h-full select-text selection:bg-orange-900/40">
              {chatMessages.length === 0 ? (
                <div className="text-center text-stone-500 italic py-6 text-[10px]">
                  Coriolis frequency is quiet. Type below to broadcast coordinates...
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`p-1 leading-relaxed rounded text-left ${
                    msg.isSystem ? 'text-cyan-400 bg-cyan-950/5 text-[10px] italic border-l-2 border-cyan-500' : 'text-stone-300'
                  }`}>
                    {!msg.isSystem && <span className="text-amber-500 font-bold tracking-wide mr-1.5 uppercase">[{msg.sender}]:</span>}
                    <span>{msg.text}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChatAndClear} className="flex border-t border-stone-850">
              <input
                type="text"
                placeholder="Transmit coordinates (chat text)..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={90}
                className="flex-1 px-3.5 py-1.5 bg-stone-950 text-stone-200 outline-none placeholder-stone-650"
              />
              <button type="submit" className="px-3 bg-stone-900 hover:bg-[#ea580c]/20 border-l border-stone-850 hover:text-[#ea580c] transition-colors cursor-pointer">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Bottom command panel bar triggers */}
          <div className="flex gap-4">
            <button
              onClick={handleLeaveLobby}
              className="flex-1 py-3 bg-stone-950 hover:bg-red-950/30 text-stone-400 hover:text-red-400 border border-stone-850 hover:border-red-900/50 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              id="leave-lobby-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
              Retreat
            </button>

            <button
              onClick={handleToggleReady}
              className={`flex-1 py-3 border text-xs font-mono font-extrabold tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                (assignedRole === 'fremen' && lobbyState.fremen?.ready) || (assignedRole === 'worm' && lobbyState.worm?.ready)
                  ? 'bg-red-950/15 text-red-400 hover:text-red-300 border-red-900/50 hover:bg-red-950/30'
                  : 'bg-emerald-950/20 text-[#10b981] border-[#10b981]/40 hover:bg-emerald-950/40 hover:border-[#10b981]/70'
              }`}
              id="lobby-ready-toggle"
            >
              <Check className="w-4 h-4" />
              {((assignedRole === 'fremen' && lobbyState.fremen?.ready) || (assignedRole === 'worm' && lobbyState.worm?.ready))
                ? 'Cancel Ready'
                : 'Assert Ready Status'}
            </button>
          </div>

          {/* Prompt informing waiting state */}
          {(!lobbyState.fremen || !lobbyState.worm) && (
            <p className="text-[10px] text-stone-550 animate-pulse text-center leading-relaxed">
              ⚠️ Comms awaiting peer arrival. Tap quick matchmaking on another device or coordinate code to start the trial!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
