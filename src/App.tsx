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
import { Compass, Sparkles, Swords, Play, HelpCircle, Disc, Trophy, Volume2, VolumeX } from 'lucide-react';
import { Position, SpiceBlow } from './types';

const LOCAL_STORAGE_KEY = 'arrakis_harvest_highscore';

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

  return (
    <div className="min-h-screen bg-[#070504] text-[#e7e5e4] flex items-center justify-center p-2 md:p-6 selection:bg-amber-500 selection:text-stone-950 font-sans tracking-wide" id="applet-viewport">
      
      {/* Immersive Atmospheric Sandstorm Background */}
      <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#451a03] via-transparent to-transparent"></div>
        <div className="absolute w-full h-px bg-[#78350f]/40 top-1/4"></div>
        <div className="absolute w-full h-px bg-[#78350f]/30 top-2/4"></div>
        <div className="absolute w-full h-px bg-[#78350f]/20 top-3/4"></div>
        <div className="absolute left-1/2 -translate-x-1/2 -top-20 w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Sietch Tabr Terminal chassis */}
      <div className="relative z-10 w-full max-w-[1080px] min-h-[760px] bg-[#0c0a09] border border-orange-950/40 md:rounded-2xl overflow-hidden flex flex-col shadow-[0_0_60px_rgba(120,53,15,0.18)]" id="main-chassis">
        
        {/* Responsive HUD Header Block */}
        <header className="relative z-20 h-20 flex items-center justify-between px-6 md:px-8 border-b border-orange-990/30 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            {/* Dune physical diamond rotation launcher icon */}
            <div className="w-9 h-9 border border-amber-500/50 flex items-center justify-center rotate-45 bg-[#0c0a09] shadow-[0_0_10px_rgba(245,158,11,0.1)]">
              <div className="w-5 h-5 bg-amber-600 -rotate-45 flex items-center justify-center">
                <Compass className="w-3 h-3 text-[#0c0a09] animate-spin-slow" />
              </div>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold tracking-[0.2em] text-amber-500 uppercase">THE SANDS</h1>
              <p className="text-[9px] tracking-[0.25em] text-stone-550 uppercase">Sietch Tabr Sector HUD • v2.1</p>
            </div>
          </div>

          {/* Dynamic real-time stats in middle header */}
          <div className="flex gap-8 md:gap-14">
            <div className="text-center">
              <p className="text-[9px] uppercase tracking-widest text-amber-500/70 mb-0.5">CURRENT YIELD</p>
              <p className="text-lg md:text-xl font-mono text-cyan-400 font-bold">
                {spiceCoins * 10} <span className="text-[10px] text-cyan-400/70">kg/c</span>
              </p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[9px] uppercase tracking-widest text-[#ea580c] mb-0.5">SEISMIC VIBRATION</p>
              <p className={`text-lg md:text-xl font-mono font-bold transition-all duration-300 ${noiseLevel > 65 ? 'text-red-500 animate-pulse' : noiseLevel > 35 ? 'text-amber-550' : 'text-cyan-400'}`}>
                {noiseLevel > 65 ? 'CRITICAL' : noiseLevel > 35 ? 'SENSING' : 'STEALTH'}
              </p>
            </div>
          </div>

          {/* Leader of Sietch Avatar element */}
          <div className="flex items-center gap-3 border-l border-orange-950/40 pl-6 md:pl-8">
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
        <main className="flex-1 w-full flex flex-col justify-center items-center py-6 px-4 md:px-8 relative z-10" id="console-body">
          
          {/* Main Menu view */}
          {gameState === GameState.MENU && gameMode !== GameMode.ONLINE_MULTIPLAYER && (
            <div className="flex flex-col items-center gap-8 w-full max-w-xl bg-stone-900/90 border border-orange-950/60 p-6 md:p-8 rounded-xl shadow-2xl relative overflow-hidden" id="entry-menu">
              
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
              
              {/* LEFT COLUMN: Shai-Hulud Sensory Feed Diagnostics */}
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

                  {/* Seismic ripples level tracker */}
                  <div className="flex flex-col gap-1.5 bg-stone-950/30 p-2.5 rounded border border-stone-850">
                    <span className="block text-[9px] uppercase font-mono tracking-wider text-stone-400">DESERT HUM DISTURBANCE</span>
                    <div className="flex gap-[2px] items-center h-5">
                      <div className={`w-2 rounded-sm ${noiseLevel > 10 ? 'bg-cyan-500/80 h-2' : 'bg-stone-800 h-1'}`} />
                      <div className={`w-2 rounded-sm ${noiseLevel > 25 ? 'bg-cyan-500/80 h-3' : 'bg-stone-800 h-1'}`} />
                      <div className={`w-2 rounded-sm ${noiseLevel > 40 ? 'bg-amber-500/80 h-4' : 'bg-stone-800 h-1'}`} />
                      <div className={`w-2 rounded-sm ${noiseLevel > 55 ? 'bg-amber-500/80 h-5' : 'bg-stone-800 h-1'}`} />
                      <div className={`w-2 rounded-sm ${noiseLevel > 70 ? 'bg-red-500 h-5 animate-pulse' : 'bg-stone-800 h-1'}`} />
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">Stealth walks damp noise.</span>
                  </div>

                  {/* Shai-hulud body metric */}
                  <div className="bg-stone-950/30 p-2.5 rounded border border-stone-850 text-xs flex flex-col gap-1 font-mono">
                    <span className="text-stone-500 text-[9px]">DIAGNOSTIC BLOCK:</span>
                    <div>• Sector: <span className="text-stone-300">Tabr Sector 4B</span></div>
                    <div>• Subsurface: <span className="text-stone-300">{diveEnergy}% Reserves</span></div>
                  </div>
                </div>

                {/* Aesthetic Quote block fitted elegantly into bottom of Left Column */}
                <div className="mt-4 pt-3 border-t border-orange-950/25 bg-amber-950/10 p-2 rounded text-justify">
                  <p className="text-amber-500/85 font-mono text-[9px] uppercase tracking-widest font-bold mb-1">ARRAKAN PROVERB:</p>
                  <p className="text-[10px] text-stone-400 italic">"He who controls the spice controls the universe."</p>
                </div>
              </div>

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
