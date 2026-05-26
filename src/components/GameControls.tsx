/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, GameState, DuelType } from '../types';
import { Volume2, VolumeX, Shield, Disc, ArrowUp, Zap, HelpCircle, EyeOff, User, Compass } from 'lucide-react';
import { audioController } from '../utils/AudioController';

interface GameControlsProps {
  score: number;
  highScore: number;
  lives: number;
  spiceCoins: number;
  spiceGoal: number;
  thumpersLeft: number;
  noiseLevel: number;
  diveActive: boolean;
  diveEnergy: number;
  gameMode: GameMode;
  gameState: GameState;
  isSoundOn: boolean;
  level: number;
  timeLeft: number;
  duelType: DuelType;
  onSetSoundOn: (on: boolean) => void;
  onResetGame: () => void;
  onStartGame: (mode: GameMode) => void;
  onTogglePause: () => void;
  onSetGameState: (state: GameState) => void;
}

const DUNE_QUOTES = [
  { text: "Fear is the mind-killer. Fear is the little-death that brings total obliteration.", author: "Bene Gesserit Litany" },
  { text: "He who controls the spice controls the universe.", author: "Baron Harkonnen" },
  { text: "A stone is heavy and the sand is weighty; but a fool's wrath is heavier than them both.", author: "Arrakis Proverbs" },
  { text: "Bless the Maker and His water. Bless the coming and going of Him.", author: "Fremen Blessing" },
  { text: "The mystery of life isn't a problem to solve, but a reality to experience.", author: "Reverend Mother Gaius Helen Mohiam" },
  { text: "Arrakis teaches the attitude of the knife - chopping off what's incomplete and saying: 'Now, it's complete.'", author: "Princess Irulan" }
];

export default function GameControls({
  score,
  highScore,
  lives,
  spiceCoins,
  spiceGoal,
  thumpersLeft,
  noiseLevel,
  diveActive,
  diveEnergy,
  gameMode,
  gameState,
  isSoundOn,
  level,
  timeLeft,
  duelType,
  onSetSoundOn,
  onResetGame,
  onStartGame,
  onTogglePause,
  onSetGameState
}: GameControlsProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    // Cycle quotes every 25 seconds
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % DUNE_QUOTES.length);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = () => {
    const nextState = !isSoundOn;
    onSetSoundOn(nextState);
    audioController.toggleSound(nextState);
  };

  const activeQuote = DUNE_QUOTES[quoteIndex];

  return (
    <div className="flex flex-col gap-4 w-full lg:w-[260px] bg-stone-900/90 border border-orange-950/45 p-4 rounded-xl shadow-2xl text-stone-200" id="tactical-panel">
      {/* Header & Logo */}
      <div className="flex items-center justify-between border-b border-orange-950/30 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          <h2 className="text-xs font-sans tracking-[0.2em] text-cyan-400 font-extrabold uppercase">SURVIVAL GEAR</h2>
        </div>
        <button
          onClick={handleSoundToggle}
          className="p-2 bg-stone-800 hover:bg-stone-700 active:bg-amber-950/40 border border-stone-700/80 rounded-lg text-amber-500 transition-colors"
          title={isSoundOn ? "Mute audio" : "Unmute audio"}
          id="sound-toggle-btn"
        >
          {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {gameState === GameState.MENU ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <p className="text-stone-400 text-xs leading-relaxed text-justify">
            Select a game mode to deploy onto the sands of Arrakis. Run, harvest spice blows, and survive Shai-Hulud's wrath as the Fremen, or hunt down harvesters as the massive Sandworm!
          </p>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => onStartGame(GameMode.FREMEN_SOLO)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/40 to-amber-900/25 hover:from-amber-900/60 hover:to-amber-800/40 border border-amber-500/35 rounded-lg text-amber-400 font-medium hover:text-amber-300 transition-all shadow-md group"
              id="mode-fremen-solo-btn"
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Solo Fremen Mode
              </span>
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 group-hover:bg-amber-500/20">Worm AI</span>
            </button>

            <button
              onClick={() => onStartGame(GameMode.WORM_SOLO)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/40 to-amber-900/25 hover:from-amber-900/60 hover:to-amber-800/40 border border-amber-500/35 rounded-lg text-amber-400 font-medium hover:text-amber-300 transition-all shadow-md group"
              id="mode-worm-solo-btn"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Solo Sandworm Mode
              </span>
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 group-hover:bg-amber-500/20">Fremen AI</span>
            </button>

            <button
              onClick={() => onStartGame(GameMode.LOCAL_VS)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-700/20 to-amber-600/10 hover:from-amber-700/35 hover:to-amber-600/20 border border-amber-500/60 rounded-lg text-amber-300 font-bold transition-all shadow-md group"
              id="mode-local-vs-btn"
            >
              <span className="flex items-center gap-2">
                <Compass className="w-4 h-4 animate-pulse" />
                Local 2-Player (VS)
              </span>
              <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 group-hover:scale-105 transition-transform">PvP</span>
            </button>
          </div>

          <button
            onClick={() => onSetGameState(GameState.HELP)}
            className="w-full py-2 bg-stone-800/40 border border-stone-800 hover:border-stone-700 hover:bg-stone-800/80 rounded-lg text-xs tracking-wider text-stone-400 hover:text-stone-300 transition-colors"
            id="guide-btn"
          >
            Tactical Survival Guide
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Game Stats */}
          <div className="grid grid-cols-2 gap-2 border-b border-orange-950/20 pb-2.5">
            <div className="bg-stone-950/50 p-2 rounded border border-orange-950/10">
              <span className="block text-[8px] uppercase font-mono tracking-wider text-stone-500">Global Yield</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{score * 10} kg</span>
            </div>
            <div className="bg-stone-950/50 p-2 rounded border border-orange-950/10">
              <span className="block text-[8px] uppercase font-mono tracking-wider text-stone-500">Best Yield</span>
              <span className="text-sm font-bold text-stone-300 font-mono">{highScore * 10} kg</span>
            </div>
          </div>

          {/* Tactical Timer and Level Gauge */}
          <div className="grid grid-cols-2 gap-2 border-b border-orange-950/20 pb-2.5">
            <div className="bg-stone-950/50 p-2 rounded border border-orange-950/10 flex flex-col justify-center">
              <span className="block text-[8px] uppercase font-mono tracking-wider text-stone-400">Time Remaining</span>
              <span className={`text-base font-bold font-mono ${timeLeft < 15 ? 'text-red-500 animate-pulse font-extrabold' : 'text-cyan-400'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="bg-stone-950/50 p-2 rounded border border-orange-950/10 flex flex-col justify-center">
              <span className="block text-[8px] uppercase font-mono tracking-wider text-stone-400">Active Level</span>
              <span className="text-base font-bold text-amber-500 font-mono">Level {level}</span>
            </div>
          </div>

          {/* Active Mode Specific Indicators */}
          {(gameMode === GameMode.FREMEN_SOLO || gameMode === GameMode.LOCAL_VS) && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono border-l border-cyan-400 pl-1.5">Fremen Harvester</h3>
              
              {/* Lives */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-400">Survival Retries:</span>
                <span className="flex gap-1.5" id="fremen-lives">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span 
                      key={i} 
                      className={`w-3 h-3 rounded-full border ${i < lives ? 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20' : 'bg-stone-850 border-stone-800'}`} 
                    />
                  ))}
                </span>
              </div>

              {/* Spice */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">Spice Stockpile:</span>
                  <span className="font-mono text-amber-400 font-bold">{spiceCoins} / {spiceGoal} kg</span>
                </div>
                <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (spiceCoins / spiceGoal) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Noise meter */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-300 flex items-center gap-1">
                    Walking Noise:
                  </span>
                  <span className={`font-mono text-xs font-semibold ${noiseLevel > 65 ? 'text-red-500 animate-pulse font-extrabold' : noiseLevel > 35 ? 'text-amber-500' : 'text-emerald-400'}`}>
                    {noiseLevel > 65 ? 'RHYTHMIC CHARR' : noiseLevel > 35 ? 'Slight Rhythm' : 'Dune Stealth'}
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-850">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${noiseLevel > 65 ? 'bg-red-500' : noiseLevel > 35 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${noiseLevel}%` }}
                  />
                </div>
              </div>

              {/* Thumpers */}
              <div className="flex justify-between items-center text-xs bg-stone-950/30 p-2 rounded border border-stone-850">
                <span className="text-stone-400 flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5 text-amber-500" />
                  Thumper Shells:
                </span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded">
                  {thumpersLeft} Left
                </span>
              </div>
            </div>
          )}

          {/* Sandworm Specific Indicators */}
          {(gameMode === GameMode.WORM_SOLO || gameMode === GameMode.LOCAL_VS) && (
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
          )}

          {/* Controls & Helpers in play */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onTogglePause}
              className="w-full py-2 bg-stone-800 hover:bg-stone-700 active:bg-stone-950/40 border border-stone-700/60 rounded-lg text-sm font-semibold hover:text-white transition-colors"
              id="pause-app-btn"
            >
              {gameState === GameState.PAUSED ? 'Resume Harvest' : 'Pause Game'}
            </button>
            <button
              onClick={onResetGame}
              className="w-full py-2 bg-red-950/20 text-red-400/90 hover:text-red-300 hover:bg-red-950/45 border border-red-900/40 hover:border-red-500/50 rounded-lg text-xs font-mono tracking-wider transition-all active:scale-98 cursor-pointer"
              id="abort-match-btn"
            >
              Abort & Return to Menu
            </button>
          </div>
        </div>
      )}

      {/* Decorative Custom Lore Quote Block */}
      <div className="mt-auto bg-stone-950/35 border border-stone-850/60 p-3.5 rounded-lg flex flex-col gap-2">
        <p className="text-stone-400 italic text-[11px] leading-relaxed text-justify">
          "{activeQuote.text}"
        </p>
        <span className="text-[9px] text-amber-600/80 font-mono tracking-wider text-right uppercase">
          — {activeQuote.author}
        </span>
      </div>

      {/* Embedded visual mini help panel */}
      {gameState === GameState.PLAYING && (
        <div className="text-[10px] text-stone-500 border-t border-stone-800/40 pt-3 flex flex-col gap-1 font-mono">
          <span className="font-bold text-amber-600">QUICK TACTICS:</span>
          {gameMode !== GameMode.WORM_SOLO && (
            <>
              <div>• <span className="text-stone-400">Sietch Rocks (Brown)</span>: Safe for Fremen. Worm crashes or crawls over but slow.</div>
              <div>• <span className="text-stone-400">Rhythm Walk (holding keys)</span>: Double speed, but triggers worm speed up!</div>
            </>
          )}
          {gameMode === GameMode.WORM_SOLO && (
            <div>• <span className="text-stone-400">Fremen Harvesters (Blue)</span>: Run when they hear you. Use sound waves to track them!</div>
          )}
        </div>
      )}
    </div>
  );
}
