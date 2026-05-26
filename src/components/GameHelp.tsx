/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameState } from '../types';
import { ArrowLeft, User, Shield, Disc, Zap, Activity, Compass } from 'lucide-react';

interface GameHelpProps {
  onSetGameState: (state: GameState) => void;
}

export default function GameHelp({ onSetGameState }: GameHelpProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl bg-stone-900 border-2 border-amber-900/40 p-6 md:p-8 rounded-xl shadow-2xl text-stone-200 animate-fade-in" id="survival-guide-panel">
      {/* Header */}
      <div className="flex items-center gap-4 border-b-2 border-amber-950 pb-4">
        <button
          onClick={() => onSetGameState(GameState.MENU)}
          className="p-2 bg-stone-850 hover:bg-stone-800 border border-stone-800 rounded-lg text-amber-500 transition-colors"
          title="Back to menu"
          id="back-menu-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-sans tracking-widest text-amber-500 font-bold uppercase">TACTICAL SURVIVAL GUIDE</h2>
          <span className="text-[10px] text-stone-500 font-mono tracking-widest">THE SANDS SURVIVAL PROTOCOLS</span>
        </div>
      </div>

      {/* Guide Content Scroll Area */}
      <div className="flex flex-col gap-6 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-stone-800">
        
        {/* Core Lore */}
        <div className="bg-stone-950/30 p-4 rounded-lg border border-stone-850/60 flex flex-col gap-1.5">
          <span className="text-amber-600 font-mono text-xs font-bold uppercase tracking-widest">Universal Laws of Shai-Hulud</span>
          <p className="text-stone-400 text-xs leading-relaxed text-justify">
            The deep desert of the planet Arrakis is governed by one absolute force: Shai-Hulud, the Great Sandworm. Sound travels effortlessly through the sand grain lattices, across the barren desert. Any repetitive noise-whether walking with standard human strides or stepping with rhythm-will summon the Maker. If you want to survive, walk like the fremen do, without rhythm.
          </p>
        </div>

        {/* Roles Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
          
          {/* Fremen Section */}
          <div className="flex flex-col gap-3.5 p-4 bg-stone-950/25 border border-amber-950/45 rounded-lg">
            <h3 className="text-sm font-sans font-bold text-amber-500 flex items-center gap-2 uppercase tracking-wide border-b border-stone-800 pb-2">
              <User className="w-4 h-4 text-amber-500" />
              Playing as Fremen
            </h3>

            <div className="flex flex-col gap-2.5 text-xs text-stone-400">
              <div className="flex flex-col gap-0.5">
                <span className="text-amber-600 font-mono text-[10px] uppercase font-bold">Movement:</span>
                <p>Use <strong className="text-stone-200">Arrow Keys</strong> to walk. Step carefully. Continuous sprinting makes a lot of noise, alerting the worm of your location!</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-amber-600 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <Disc className="w-3 h-3" />
                  Thumpers (Space):
                </span>
                <p>Deploy a physical thumper. The expanding sound pulses act as an absolute sound magnet, distracting worms so you can harvest safely. Be careful! You only have 3.</p>
              </div>



              <div className="flex flex-col gap-0.5">
                <span className="text-amber-600 font-mono text-[10px] uppercase font-bold">
                  Maker Hooks (X):
                </span>
                <p>When standing adjacent to any middle/tail segment of a sandworm, throw hooks to leap on top! Ride the beast to steer it and collect massive bonus spice. Be careful not to get too close, or you may meet your end.</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-amber-600 font-mono text-[10px] uppercase font-bold">
                  Sietch Safety:
                </span>
                <p>Rocky mountains (brown tiles) are safe zones. The worm crashes or slows down significantly upon impact on the surface. However, be warned that the worm can sometimes breach these safe zones.</p>
              </div>
            </div>
          </div>

          {/* Sandworm Section */}
          <div className="flex flex-col gap-3.5 p-4 bg-stone-950/25 border border-red-950/45 rounded-lg">
            <h3 className="text-sm font-sans font-bold text-red-500 flex items-center gap-2 uppercase tracking-wide border-b border-stone-800 pb-2">
              <Zap className="w-4 h-4 text-red-500 animate-pulse" />
              Playing as Sandworm
            </h3>

            <div className="flex flex-col gap-2.5 text-xs text-stone-400">
              <div className="flex flex-col gap-0.5">
                <span className="text-red-500 font-mono text-[10px] uppercase font-bold">Movement:</span>
                <p>Use <strong className="text-stone-200">W, A, S, D</strong> keys to steer your worm. Eat spice blow deposits to grow longer and move faster.</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-red-500 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Underground Dive (F / Shift):
                </span>
                <p>Submerge below the deep sands. Dives consume energy but grant 1.5x speed and make you completely immune to rocky Sietch peaks. Use on final approach or to catch a particularly sneaky Fremen.</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-red-500 font-mono text-[10px] uppercase font-bold">
                  Breaching Splash:
                </span>
                <p>While submerged, surface directly underneath Fremen or active thumpers. Reaching the surface creates a massive splash eating all nearby blocks!</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-red-500 font-mono text-[10px] uppercase font-bold">
                  Rock Terrain Hazard:
                </span>
                <p>Surfaced worms will crash into rocky boulders. Avoid Sietches while surface slithering, or dive underground to tunnel under them.</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-red-500 font-mono text-[10px] uppercase font-bold">
                  Sound tracker:
                </span>
                <p>Look out for circular expanding ripples. These show the distance and coordinates of noisy Fremen harvesters or active thumpers.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Local VS Keys Summary Card */}
        <div className="bg-gradient-to-r from-amber-950/30 to-red-950/15 border border-amber-900/30 p-4 rounded-lg flex flex-col gap-2 font-mono">
          <span className="text-stone-300 font-mono text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
            <Compass className="w-4 h-4 animate-spin-slow text-amber-500" />
            Local Shared-Keyboard Keys Summary (2-Player PvP)
          </span>
          <div className="grid grid-cols-2 gap-4 text-[11px] text-stone-400 leading-normal">
            <div>
              <span className="text-amber-500 font-bold block mb-1">P1: FREMEN HARVESTER</span>
              <div>• Move: <strong className="text-stone-200">Arrow Keys</strong></div>
              <div>• Drop Thumper: <strong className="text-stone-200">Spacebar</strong></div>
              <div>• Mount Hook: <strong className="text-stone-200">X Key</strong></div>
            </div>
            <div>
              <span className="text-red-500 font-bold block mb-1">P2: SHAI-HULUD (WORM)</span>
              <div>• Move: <strong className="text-stone-200">W, A, S, D</strong></div>
              <div>• Tunnel Dive: <strong className="text-stone-200">F / Shift</strong></div>
              <div>• Eat / Harvest: <strong className="text-stone-200">Collide Segment</strong></div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Return Button */}
      <button
        onClick={() => onSetGameState(GameState.MENU)}
        className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-900 font-bold rounded-lg text-sm tracking-widest uppercase transition-all shadow-md active:scale-95"
        id="guide-return-btn"
      >
        I am Ready for Arrakis
      </button>
    </div>
  );
}
