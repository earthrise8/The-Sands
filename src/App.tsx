/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, GameState, DuelType } from './types';
import GameCanvas from './components/GameCanvas';
import GameControls from './components/GameControls';
import GameHelp from './components/GameHelp';
import OnlineMultiplayerLobby from './components/OnlineMultiplayerLobby';
import { audioController } from './utils/AudioController';
import { Compass, Sparkles, Swords, Play, HelpCircle, Disc, Trophy, Volume2, VolumeX, ArrowUp } from 'lucide-react';
import { Position, SpiceBlow } from './types';

const LOCAL_STORAGE_KEY = 'arrakis_harvest_highscore';
const DUNE_QUOTES = [
  { text: "Fear is the mind-killer. Fear is the little-death that brings total obliteration.", author: "Bene Gesserit Litany" },
  { text: "He who controls the spice controls the universe.", author: "Baron Harkonnen" },
  { text: "Bless the Maker and His water. Bless the coming and going of Him.", author: "Fremen Blessing" },
  { text: "The mystery of life isn't a problem to solve, but a reality to experience.", author: "Reverend Mother Gaius Helen Mohiam" }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.FREMEN_SOLO);
  
  // Game scores & triggers synced with dashboard scoreboard
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [spiceCoins, setSpiceCoins] = useState(0);
  const [thumpersLeft, setThumpersLeft] = useState(3);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [diveActive, setDiveActive] = useState(false);
  const [diveEnergy, setDiveEnergy] = useState(100);

  // Challenge round levels and countdown timers
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(90);
  const [duelType, setDuelType] = useState<DuelType>(DuelType.FREMEN_VS_WORM);

  const [isSoundOn, setIsSoundOn] = useState(true);

  // States specifically for online multiplayer matching
  const [multiplayerSocket, setMultiplayerSocket] = useState<WebSocket | null>(null);
  const [multiplayerRole, setMultiplayerRole] = useState<'fremen' | 'worm' | null>(null);
  const [multiplayerHomeBase, setMultiplayerHomeBase] = useState<Position | null>(null);
  const [multiplayerSpiceBlows, setMultiplayerSpiceBlows] = useState<SpiceBlow[]>([]);
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string>('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const isWormVsWormMatch =
    (gameMode === GameMode.LOCAL_VS && duelType === DuelType.WORM_VS_WORM) ||
    (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.WORM_VS_WORM);

  const handleSoundToggle = () => {
    const nextState = !isSoundOn;
    setIsSoundOn(nextState);
    audioController.toggleSound(nextState);
  };

  // Dynamically scale spice goal based on solar levels in Fremen Solo mode
  const spiceGoal = gameMode === GameMode.FREMEN_SOLO ? (50 + (level - 1) * 20) : 50;

  // Load High Score on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setHighScore(parseInt(stored, 10));
      }
    } catch (e) {
      console.warn("localStorage not fully accessible", e);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % DUNE_QUOTES.length);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, newScore.toString());
      } catch (e) {}
    }
  };

  const handleStartGame = (mode: GameMode) => {
    setGameMode(mode);
    setScore(0);
    setSpiceCoins(0);
    setLives(3);
    setLevel(1);
    setTimeLeft(90);
    setGameState(GameState.PLAYING);
    audioController.playVictory();
  };

  const handleStartOnlineMatch = (
    socket: WebSocket,
    role: 'fremen' | 'worm',
    initialHomeBase: Position,
    initialSpiceBlows: SpiceBlow[],
    roomId: string
  ) => {
    setMultiplayerSocket(socket);
    setMultiplayerRole(role);
    setMultiplayerHomeBase(initialHomeBase);
    setMultiplayerSpiceBlows(initialSpiceBlows);
    setMultiplayerRoomId(roomId);

    setGameMode(GameMode.ONLINE_MULTIPLAYER);
    setScore(0);
    setSpiceCoins(0);
    setLives(3);
    setLevel(1);
    setTimeLeft(90);
    setGameState(GameState.PLAYING);
    audioController.playVictory();
  };

  const handleResetGame = () => {
    if (multiplayerSocket) {
      multiplayerSocket.close();
      setMultiplayerSocket(null);
    }
    setGameState(GameState.MENU);
    setGameMode(GameMode.FREMEN_SOLO);
    setScore(0);
    setSpiceCoins(0);
    setLives(3);
    setLevel(1);
    setTimeLeft(90);
    setMultiplayerRole(null);
    setMultiplayerHomeBase(null);
    setMultiplayerSpiceBlows([]);
    setMultiplayerRoomId('');
  };

  const handleTogglePause = () => {
    setGameState(prev => {
      if (prev === GameState.PLAYING) return GameState.PAUSED;
      if (prev === GameState.PAUSED) return GameState.PLAYING;
      return prev;
    });
  };

  const showHeaderStats =
    gameState === GameState.PLAYING ||
    gameState === GameState.PAUSED ||
    gameState === GameState.GAME_OVER_WORM_WON ||
    gameState === GameState.GAME_OVER_FREMEN_WON;
  const activeQuote = DUNE_QUOTES[quoteIndex];

  return (
    <div className="h-screen overflow-hidden bg-[#070504] text-[#e7e5e4] flex items-center justify-center p-2 md:p-3 selection:bg-amber-500 selection:text-stone-950 font-sans tracking-wide" id="applet-viewport">
      
      {/* Immersive Atmospheric Sandstorm Background */}
      <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#451a03] via-transparent to-transparent"></div>
        <div className="absolute w-full h-px bg-[#78350f]/40 top-1/4"></div>
        <div className="absolute w-full h-px bg-[#78350f]/30 top-2/4"></div>
        <div className="absolute w-full h-px bg-[#78350f]/20 top-3/4"></div>
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Sietch Tabr Terminal chassis */}
      <div className="relative z-10 w-full max-w-[1080px] h-full max-h-[calc(100vh-0.5rem)] md:max-h-[calc(100vh-1rem)] bg-[#0c0a09] border border-orange-950/40 md:rounded-2xl overflow-hidden flex flex-col shadow-[0_0_60px_rgba(120,53,15,0.18)]" id="main-chassis">
        
        {/* Responsive HUD Header Block */}
        <header className="relative z-20 h-16 flex items-center justify-between px-4 md:px-6 border-b border-orange-990/30 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5 md:gap-3">
            {/* Minimalist Dune triangle inside diamond frame */}
            <div className="w-8 h-8 border border-amber-500/50 flex items-center justify-center rotate-45 bg-[#0c0a09] shadow-[0_0_10px_rgba(245,158,11,0.1)]" aria-hidden="true">
              <div className="w-4 h-4 -rotate-45 flex items-center justify-center">
                {/* Orange triangle (minimal dune emblem) */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true" focusable="false">
                  <polygon points="12,3 3,20 21,20" fill="#f59e0b" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-extrabold tracking-[0.2em] text-amber-500 uppercase leading-none">THE SANDS</h1>
              <p className="mt-0.5 text-[8px] md:text-[9px] tracking-[0.22em] text-stone-550 uppercase leading-none">Sietch Tabr Sector HUD • v2.1</p>
            </div>
          </div>

          {/* Dynamic real-time stats in middle header */}
          {showHeaderStats && (
            <div className="flex gap-8 md:gap-14">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-amber-500/70 mb-0.5">CURRENT YIELD</p>
                <p className="text-lg md:text-xl font-mono text-cyan-400 font-bold">
                  {spiceCoins * 10} <span className="text-[10px] text-cyan-400/70">kg/c</span>
                </p>
              </div>
            </div>
          )}

          {/* Leader of Sietch Avatar element */}
          <div className="flex items-center gap-2.5 border-l border-orange-950/40 pl-4 md:pl-6">
            <button
              onClick={handleSoundToggle}
              className="p-1.5 bg-stone-900 hover:bg-stone-800 border border-orange-950/40 rounded-lg text-amber-500 hover:text-amber-400 transition-all cursor-pointer mr-1"
              title={isSoundOn ? "Mute Game Audio" : "Unmute Game Audio"}
              id="header-sound-toggle-btn"
            >
              {isSoundOn ? <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            </button>
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-stone-200">Muad'Dib</p>
              <p className="text-[10px] text-amber-500/75 font-mono">Leader of Tabr</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-stone-900 border-2 border-cyan-500 flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(6,182,212,0.25)]">
              <span className="text-[11px] text-cyan-400 font-bold font-mono">F7</span>
            </div>
          </div>
        </header>

        {/* Console Content Window */}
        <main className="flex-1 w-full flex flex-col justify-center items-center py-3 md:py-4 px-3 md:px-6 relative z-10" id="console-body">
          
          {/* Main Menu view */}
          {gameState === GameState.MENU && gameMode !== GameMode.ONLINE_MULTIPLAYER && (
            <div className="flex flex-col items-center gap-5 w-full max-w-xl bg-stone-900/90 border border-orange-950/60 p-5 md:p-6 rounded-xl shadow-2xl relative overflow-hidden" id="entry-menu">
              
              {/* Spice flares */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

              <div className="flex flex-col items-center text-center gap-1.5">
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-950/50 border border-amber-900/40 rounded-full text-[10px] font-mono text-amber-500 tracking-widest animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  DUNE CONSOLE LINK VERIFIED
                </div>
                <h2 className="text-3xl md:text-4xl font-sans tracking-widest text-amber-500 font-extrabold mt-2 uppercase" style={{ wordSpacing: '4px' }}>
                  THE SANDS
                </h2>
                <span className="text-[11px] text-stone-400 font-mono tracking-widest uppercase">
                  Desert Survival & Spice Harvesting
                </span>
              </div>

              {/* Game Options/Modes Panel */}
              <div className="flex flex-col gap-3.5 w-full">
                
                <button
                  onClick={() => handleStartGame(GameMode.FREMEN_SOLO)}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-stone-900 to-stone-950 hover:from-amber-950/20 hover:to-amber-900/5 border border-stone-800/80 hover:border-amber-500/40 rounded-lg transition-all hover:scale-102 group active:scale-98"
                  id="start-fremen-solo"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-950 text-amber-500 border border-stone-850 group-hover:border-amber-900/60 group-hover:bg-amber-950/40 transition-colors">
                      <Compass className="w-4.5 h-4.5 animate-spin-slow" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-stone-200 text-sm group-hover:text-amber-400">Deploy as Fremen</span>
                      <span className="block text-[10px] text-stone-500 mt-0.5">Walk without rhythm, deploy thumpers, harvest spice. (VS AI Worm)</span>
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-stone-600 group-hover:text-amber-400 transition-colors" />
                </button>

                <button
                  onClick={() => handleStartGame(GameMode.WORM_SOLO)}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-stone-900 to-stone-950 hover:from-red-950/20 hover:to-red-900/5 border border-stone-800/80 hover:border-red-500/40 rounded-lg transition-all hover:scale-102 group active:scale-98"
                  id="start-worm-solo"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-950 text-red-500 border border-stone-850 group-hover:border-red-900/60 group-hover:bg-red-950/40 transition-colors">
                      <Swords className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-stone-200 text-sm group-hover:text-red-400">Deploy as Shai-Hulud</span>
                      <span className="block text-[10px] text-stone-500 mt-0.5">Control the giant Sandworm to protect territory. (VS AI Harvesters)</span>
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-stone-600 group-hover:text-red-400 transition-colors" />
                </button>

                {/* Competitor match configuration widget */}
                <div className="border border-stone-850 bg-stone-950/45 rounded-lg p-3 flex flex-col gap-2 mt-1">
                  <div className="flex justify-between items-center pb-1 border-b border-stone-850/60">
                    <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest font-mono">Competitor Setup:</span>
                    <span className="text-[9px] font-mono text-amber-500 font-extrabold uppercase">Choose Duel Rules</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDuelType(DuelType.FREMEN_VS_WORM)}
                      className={`py-1 rounded text-[9px] font-bold tracking-wider font-mono uppercase transition-all border ${
                        duelType === DuelType.FREMEN_VS_WORM
                          ? 'bg-amber-950/55 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                          : 'bg-stone-900/30 text-stone-550 border-stone-850 hover:text-stone-300 hover:border-stone-800'
                      }`}
                      id="duel-rules-fremen-vs-worm"
                    >
                      Fremen vs Worm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuelType(DuelType.FREMEN_VS_FREMEN)}
                      className={`py-1 rounded text-[9px] font-bold tracking-wider font-mono uppercase transition-all border ${
                        duelType === DuelType.FREMEN_VS_FREMEN
                          ? 'bg-amber-950/55 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                          : 'bg-stone-900/30 text-stone-550 border-stone-850 hover:text-stone-300 hover:border-stone-800'
                      }`}
                      id="duel-rules-fremen-vs-fremen"
                    >
                      Fremen vs Fremen
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuelType(DuelType.WORM_VS_WORM)}
                      className={`py-1 rounded text-[9px] font-bold tracking-wider font-mono uppercase transition-all border ${
                        duelType === DuelType.WORM_VS_WORM
                          ? 'bg-amber-950/55 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                          : 'bg-stone-900/30 text-stone-550 border-stone-850 hover:text-stone-300 hover:border-stone-800'
                      }`}
                      id="duel-rules-worm-vs-worm"
                    >
                      Worm vs Worm
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleStartGame(GameMode.LOCAL_VS)}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-950/15 to-stone-950 hover:from-amber-900/25 hover:to-amber-950/5 border border-amber-500/20 hover:border-amber-400/50 rounded-lg transition-all hover:scale-102 group active:scale-98 ring-1 ring-amber-500/20"
                  id="start-local-vs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20">
                      <Compass className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-amber-300 text-sm">
                        {duelType === DuelType.FREMEN_VS_WORM && "Local VS duel (Fremen VS Worm)"}
                        {duelType === DuelType.FREMEN_VS_FREMEN && "Local VS Race (Fremen VS Fremen)"}
                        {duelType === DuelType.WORM_VS_WORM && "Local VS Battle (Worm VS Worm)"}
                      </span>
                      <span className="block text-[10px] text-stone-500 mt-0.5">
                        {duelType === DuelType.FREMEN_VS_WORM && "Shared-keyboard: P1 (Fremen, Arrows) vs P2 (Sandworm, WASD) asymmetric duel."}
                        {duelType === DuelType.FREMEN_VS_FREMEN && "Shared-keyboard: P1 (Teal Fremen, Arrows) vs P2 (Gold Fremen, WASD) spice gathering quota race."}
                        {duelType === DuelType.WORM_VS_WORM && "Shared-keyboard: P1 (Red Worm, Arrows) vs P2 (Purple Worm, WASD) territory defense race."}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-amber-500 text-stone-950 px-1.5 py-0.5 rounded shadow">PVP</span>
                </button>

                <button
                  onClick={() => {
                    setGameMode(GameMode.ONLINE_MULTIPLAYER);
                    setGameState(GameState.MENU);
                  }}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-stone-900 to-stone-950 hover:from-cyan-950/20 hover:to-cyan-900/5 border border-stone-850 hover:border-cyan-550/45 rounded-lg transition-all hover:scale-102 group active:scale-98 ring-1 ring-cyan-500/15"
                  id="start-online-vs"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-950 text-cyan-400 border border-stone-850 group-hover:border-cyan-900/60 group-hover:bg-cyan-950/40 transition-colors">
                      <Volume2 className="w-4.5 h-4.5 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-stone-200 text-sm group-hover:text-cyan-400 font-bold">
                        {duelType === DuelType.FREMEN_VS_WORM && "Online Real-Time (Fremen VS Worm)"}
                        {duelType === DuelType.FREMEN_VS_FREMEN && "Online Real-Time (Fremen VS Fremen)"}
                        {duelType === DuelType.WORM_VS_WORM && "Online Real-Time (Worm VS Worm)"}
                      </span>
                      <span className="block text-[10px] text-stone-500 mt-0.5">
                        {duelType === DuelType.FREMEN_VS_WORM && "Dual-screen live connection: Play Fremen vs Shai-Hulud across the web!"}
                        {duelType === DuelType.FREMEN_VS_FREMEN && "Dual-screen: Play Teal Fremen vs Gold Fremen across the web!"}
                        {duelType === DuelType.WORM_VS_WORM && "Dual-screen: Play Red Worm vs Purple Worm across the web!"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-cyan-500 text-stone-950 px-1.5 py-0.5 rounded shadow">WAN</span>
                </button>

              </div>

              {/* High Score Panel & Tactical guide */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full border-t border-stone-800/85 pt-4 mt-1 text-xs">
                
                <div className="flex items-center gap-2 text-stone-400">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Sietch High Yield Record: <strong className="text-amber-400 font-mono text-sm">{highScore * 10} kg</strong></span>
                </div>

                <button
                  onClick={() => setGameState(GameState.HELP)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700/80 rounded-lg hover:text-white transition-all cursor-pointer text-xs"
                  id="view-manual"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  Survival Tactics Booklet
                </button>

              </div>

              <div className="text-[9px] font-mono text-stone-650 tracking-widest mt-1 text-center uppercase">
                "Bless the Maker and His water. Bless the coming and going of Him."
              </div>

            </div>
          )}

          {/* Online Multiplayer Lobby selection */}
          {gameState === GameState.MENU && gameMode === GameMode.ONLINE_MULTIPLAYER && (
            <OnlineMultiplayerLobby
              onStartOnlineMatch={handleStartOnlineMatch}
              onBackToMenu={handleResetGame}
            />
          )}

          {/* Tactical Survival Guide booklet view */}
          {gameState === GameState.HELP && (
            <GameHelp onSetGameState={setGameState} />
          )}

          {/* Active game panel layout (Fully customized into 3-column Sietch dashboard!) */}
          {(gameState === GameState.PLAYING || 
            gameState === GameState.PAUSED || 
            gameState === GameState.GAME_OVER_WORM_WON || 
            gameState === GameState.GAME_OVER_FREMEN_WON) && (
            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 w-full animate-fade-in" id="active-battlefield">
              
              {!isWormVsWormMatch && (
                <div className="w-full lg:w-[220px] bg-stone-900/90 border border-orange-950/45 p-4 rounded-xl flex flex-col justify-between text-stone-300">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 border-b border-orange-950/40 pb-2">
                      <Swords className="w-4 h-4 text-[#ea580c] animate-pulse" />
                      <span className="text-xs uppercase font-extrabold tracking-widest font-mono text-[#ea580c]">Sensory Feed</span>
                    </div>

                    {/* Sandworm Energy Capacity */}
                    <div className="bg-stone-950/55 p-2.5 rounded border border-orange-990/10">
                      <span className="block text-[9px] uppercase font-mono tracking-wider text-stone-500">Worm Breached State</span>
                      <span className={`text-xs font-bold font-mono ${diveActive ? 'text-orange-500' : 'text-amber-500'}`}>
                        {diveActive ? '● SUBTERRANEAN' : '● ON THE SURFACE'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 p-2 bg-stone-950/30 rounded border border-cyan-500/15">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-400 flex items-center gap-1">
                          <Disc className="w-3.5 h-3.5 text-cyan-400" />
                          Fremen Sound:
                        </span>
                        <span className="font-mono font-bold text-cyan-400">{noiseLevel}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, noiseLevel))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-stone-500 font-mono leading-relaxed">
                        Higher output attracts the worm more quickly.
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-1 pt-1 border-t border-stone-800/40">
                      <h3 className="text-xs uppercase font-bold tracking-widest text-red-500 font-mono border-l-2 border-red-500 pl-2">Shai-Hulud (Worm)</h3>

                      {/* Underground Tunnel Capacity/Energy */}
                      <div className="flex flex-col gap-1.5 p-2 bg-stone-950/20 border border-stone-850 rounded">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1 text-stone-400">
                            <ArrowUp className={`w-3.5 h-3.5 rotate-180 ${diveActive ? 'text-orange-500 animate-bounce' : 'text-stone-500'}`} />
                            Subsurface Dive:
                          </span>
                          <span className={`font-semibold font-mono text-[11px] ${diveActive ? 'text-orange-500 font-bold' : 'text-stone-500'}`}>
                            {diveActive ? 'UNDERGROUND' : 'SURFACE'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${diveActive ? 'bg-orange-500' : 'bg-stone-800'}`}
                            style={{ width: `${diveEnergy}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-stone-500 font-mono leading-relaxed mt-1">
                          {diveActive
                            ? "Breaching onto Fremen causes a massive devouring radius!"
                            : "Dive underneath to glide through boulders safely."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rotating quote block on left column */}
                  <div className="mt-4 pt-3 border-t border-orange-950/25 bg-amber-950/10 p-2 rounded text-justify">
                    <p className="text-amber-500/85 font-mono text-[9px] uppercase tracking-widest font-bold mb-1">ARRAKIS QUOTE:</p>
                    <p className="text-[10px] text-stone-400 italic">"{activeQuote.text}"</p>
                    <p className="text-[9px] text-amber-600/80 font-mono tracking-wider text-right uppercase mt-1">- {activeQuote.author}</p>
                  </div>
                </div>
              )}

              {/* CENTER COLUMN: Core map canvas area */}
              <div className="flex-1 flex flex-col items-center">
                <GameCanvas
                  gameMode={gameMode}
                  gameState={gameState}
                  score={score}
                  lives={lives}
                  spiceCoins={spiceCoins}
                  spiceGoal={spiceGoal}
                  thumpersLeft={thumpersLeft}
                  noiseLevel={noiseLevel}
                  diveActive={diveActive}
                  diveEnergy={diveEnergy}
                  isSoundOn={isSoundOn}
                  level={level}
                  onSetLevel={setLevel}
                  timeLeft={timeLeft}
                  onSetTimeLeft={setTimeLeft}
                  duelType={duelType}
                  onSetScore={setScore}
                  onSetLives={setLives}
                  onSetSpiceCoins={setSpiceCoins}
                  onSetThumpersLeft={setThumpersLeft}
                  onSetNoiseLevel={setNoiseLevel}
                  onSetDiveActive={setDiveActive}
                  onSetDiveEnergy={setDiveEnergy}
                  onSetGameState={setGameState}
                  onUpdateHighScore={handleUpdateHighScore}
                  onResetGame={handleResetGame}
                  multiplayerSocket={multiplayerSocket}
                  multiplayerRole={multiplayerRole}
                  multiplayerHomeBase={multiplayerHomeBase}
                  multiplayerSpiceBlows={multiplayerSpiceBlows}
                  multiplayerRoomId={multiplayerRoomId}
                />
              </div>

              {/* RIGHT COLUMN: Live Fremen tools equipment panel (GameControls handles this perfectly!) */}
              <GameControls
                score={score}
                highScore={highScore}
                lives={lives}
                spiceCoins={spiceCoins}
                spiceGoal={spiceGoal}
                thumpersLeft={thumpersLeft}
                noiseLevel={noiseLevel}
                diveActive={diveActive}
                diveEnergy={diveEnergy}
                gameMode={gameMode}
                gameState={gameState}
                isSoundOn={isSoundOn}
                level={level}
                timeLeft={timeLeft}
                duelType={duelType}
                onSetSoundOn={setIsSoundOn}
                onResetGame={handleResetGame}
                onStartGame={handleStartGame}
                onTogglePause={handleTogglePause}
                onSetGameState={setGameState}
              />

            </div>
          )}

        </main>

        {/* Sietch Tabr HUD Footer Block */}
        <footer className="relative z-20 h-10 flex items-center justify-between px-6 md:px-8 border-t border-orange-950/40 bg-black/60">
          <div className="flex gap-4 text-[9px] uppercase tracking-widest text-[#ea580c]/50 font-mono">
            <span>Arrakis telemetry v2.1</span>
            <span className="hidden sm:inline">| Latent Temperature: 47°C</span>
            <span className="hidden sm:inline">| Traditional Fremen Way</span>
          </div>
          <div className="flex gap-4 items-center font-mono">
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></span>
              <span className="text-[9px] text-stone-400 uppercase tracking-widest">Sietch Connection Stable</span>
            </div>
            <span className="text-[9px] text-stone-650 hidden md:inline">UID: 412.000.412.1</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
