/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { GameMode, GameState, Position, GameParticle, Thumper, SpiceBlow, FremenState, WormState, DuelType } from '../types';
import { audioController } from '../utils/AudioController';
import { Play, RotateCcw, Disc, Swords, Compass } from 'lucide-react';

interface GameCanvasProps {
  gameMode: GameMode;
  gameState: GameState;
  score: number;
  lives: number;
  spiceCoins: number;
  spiceGoal: number;
  thumpersLeft: number;
  noiseLevel: number;
  diveActive: boolean;
  diveEnergy: number;
  isSoundOn: boolean;
  level: number;
  onSetLevel: React.Dispatch<React.SetStateAction<number>>;
  timeLeft: number;
  onSetTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  duelType: DuelType;
  onSetScore: React.Dispatch<React.SetStateAction<number>>;
  onSetLives: React.Dispatch<React.SetStateAction<number>>;
  onSetSpiceCoins: React.Dispatch<React.SetStateAction<number>>;
  onSetThumpersLeft: React.Dispatch<React.SetStateAction<number>>;
  onSetNoiseLevel: React.Dispatch<React.SetStateAction<number>>;
  onSetDiveActive: React.Dispatch<React.SetStateAction<boolean>>;
  onSetDiveEnergy: React.Dispatch<React.SetStateAction<number>>;
  onSetGameState: (state: GameState) => void;
  onUpdateHighScore: (score: number) => void;
  onResetGame?: () => void;

  // Online Multiplayer additions
  multiplayerSocket?: WebSocket | null;
  multiplayerRole?: 'fremen' | 'worm' | null;
  multiplayerHomeBase?: Position | null;
  multiplayerSpiceBlows?: SpiceBlow[];
  multiplayerRoomId?: string;
}

// Map Grid Configuration
const COLS = 26;
const ROWS = 19;
const CELL_SIZE = 26; // Pixels
const CANVAS_WIDTH = COLS * CELL_SIZE;  // 676px
const CANVAS_HEIGHT = ROWS * CELL_SIZE; // 494px

// Rocky high-ground layout (Sietches) - indices that are rocky terrain
const ROCKY_SIETCHES: Position[] = [
  { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 2 },
  { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }, { x: 13, y: 3 },
  { x: 22, y: 2 }, { x: 23, y: 2 }, { x: 23, y: 3 },
  { x: 2, y: 15 }, { x: 2, y: 16 }, { x: 3, y: 16 },
  { x: 22, y: 15 }, { x: 23, y: 15 }, { x: 23, y: 16 }, { x: 21, y: 15 },
  { x: 11, y: 14 }, { x: 12, y: 14 }, { x: 13, y: 14 }, { x: 12, y: 15 }
];

export default function GameCanvas({
  gameMode,
  gameState,
  score,
  lives,
  spiceCoins,
  spiceGoal,
  thumpersLeft,
  noiseLevel,
  diveActive,
  diveEnergy,
  isSoundOn,
  level,
  onSetLevel,
  timeLeft,
  onSetTimeLeft,
  duelType,
  onSetScore,
  onSetLives,
  onSetSpiceCoins,
  onSetThumpersLeft,
  onSetNoiseLevel,
  onSetDiveActive,
  onSetDiveEnergy,
  onSetGameState,
  onUpdateHighScore,
  onResetGame,
  multiplayerSocket,
  multiplayerRole,
  multiplayerHomeBase,
  multiplayerSpiceBlows,
  multiplayerRoomId
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isWormVsWormMatch = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.WORM_VS_WORM) ||
                            (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.WORM_VS_WORM);

  // Core Game Entity States held inside Refs for real-time physics consistency
  const stateRef = useRef({
    gameState: GameState.MENU,
    score: 0,
    lives: 3,
    spiceCoins: 0,
    thumpersLeft: 3,
    noiseLevel: 0,
    diveActive: false,
    diveEnergy: 100,
    timeLeft: 90,
    level: 1,
    homeBase: { x: 12, y: 15 } as Position | null,

    // Fremen attributes
    fremen: {
      x: 5,
      y: 9,
      targetX: 5,
      targetY: 9,
      lives: 3,
      spiceCarried: 0,
      spiceDeposited: 0,
      noiseLevel: 0,
      thumpersLeft: 3,
      isRiding: false,
      rideSegmentIndex: 0,
      score: 0,
      stepCooldown: 0,
      direction: 'NONE' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE',
      invulnerableTime: 0
    },

    // AI Fremens (used in Worm Solo mode)
    aiFremens: [] as Array<FremenState & { id: number; color: string }>,
    aiFremenCounter: 0,

    // Secondary Fremen player (for Fremen vs Fremen modes)
    fremen2: {
      x: 7,
      y: 11,
      targetX: 7,
      targetY: 11,
      lives: 3,
      spiceCarried: 0,
      spiceDeposited: 0,
      noiseLevel: 0,
      thumpersLeft: 3,
      isRiding: false,
      rideSegmentIndex: 0,
      score: 0,
      stepCooldown: 0,
      direction: 'NONE' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE',
      invulnerableTime: 0
    },

    // Worm attributes
    worm: {
      segments: [
        { x: 18, y: 9 },
        { x: 19, y: 9 },
        { x: 20, y: 9 },
        { x: 21, y: 9 },
        { x: 22, y: 9 },
        { x: 23, y: 9 }
      ] as Position[],
      direction: 'LEFT' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
      targetDirection: 'LEFT' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
      speed: 1.0,
      diveActive: false,
      diveEnergy: 100,
      isFrenzied: false,
      frenzyTime: 0
      ,
      // track spice eaten by this worm (for Worm vs Worm scoring)
      spiceEaten: 0
    },

    // Secondary Worm player (for Worm vs Worm modes)
    worm2: {
      segments: [
        { x: 18, y: 13 },
        { x: 19, y: 13 },
        { x: 20, y: 13 },
        { x: 21, y: 13 },
        { x: 22, y: 13 },
        { x: 23, y: 13 }
      ] as Position[],
      direction: 'LEFT' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
      targetDirection: 'LEFT' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
      speed: 1.0,
      diveActive: false,
      diveEnergy: 100,
      isFrenzied: false,
      frenzyTime: 0
      ,
      // track spice eaten by worm2 (for Worm vs Worm scoring)
      spiceEaten: 0
    },

    // Dynamic environmental systems
    spiceBlows: [] as SpiceBlow[],
    thumpers: [] as Thumper[],
    particles: [] as GameParticle[],
    shakeTime: 0,
    shakeIntensity: 0,
    windTime: 0,
    timeStep: 0,
    keys: {} as Record<string, boolean>
  });

  // Keep Sync Refs updated with parent state for user interactions
  useEffect(() => {
    stateRef.current.gameState = gameState;
  }, [gameState]);

  useEffect(() => {
    stateRef.current.thumpersLeft = thumpersLeft;
  }, [thumpersLeft]);

  // Clean initialization upon starting/resuming a new playthrough
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initLevel();
    }
  }, [gameState]);

  // Is Rocky ground helper
  const isRock = (x: number, y: number): boolean => {
    return ROCKY_SIETCHES.some(r => r.x === x && r.y === y);
  };

  // Safe Sietch shelter check (places where Sandworm cannot normally devour unless diving)
  const isSafeSietch = (x: number, y: number): boolean => {
    return isRock(x, y);
  };

  // Dynamic particle trigger
  const addParticles = (x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      stateRef.current.particles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 2,
        life: 0,
        maxLife: Math.random() * 30 + 15
      });
    }
  };

  // Play Screen Shake trigger
  const triggerScreenShake = (intensity: number, duration: number) => {
    stateRef.current.shakeIntensity = intensity;
    stateRef.current.shakeTime = duration;
  };

    // Initialize/Reset the tactical parameters
    const initLevel = () => {
      const s = stateRef.current;
      s.score = score;

      // Randomly place the Home Base Sietch (Dune safety sector)
      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerHomeBase) {
        s.homeBase = multiplayerHomeBase;
      } else {
        const idx = Math.floor(Math.random() * ROCKY_SIETCHES.length);
        s.homeBase = ROCKY_SIETCHES[idx];
      }
      
      
      // Position Fremen nicely in a left-center valley (or respawn at base if base is defined!)
      s.fremen = {
        x: s.homeBase ? s.homeBase.x : 5,
        y: s.homeBase ? s.homeBase.y : 9,
        targetX: s.homeBase ? s.homeBase.x : 5,
        targetY: s.homeBase ? s.homeBase.y : 9,
        lives: 3,
        spiceCarried: 0,
        spiceDeposited: 0,
        noiseLevel: 0,
        thumpersLeft: 3,
        isRiding: false,
        rideSegmentIndex: 0,
        score: s.score,
        stepCooldown: 0,
        direction: 'NONE',
        invulnerableTime: 0
      };
      // Reset per-worm spice counters at level start
      s.worm.spiceEaten = 0;
      s.worm2.spiceEaten = 0;

      s.fremen2 = {
        x: s.homeBase ? s.homeBase.x : 7,
        y: s.homeBase ? Math.min(ROWS - 1, s.homeBase.y + 1) : 11,
        targetX: s.homeBase ? s.homeBase.x : 7,
        targetY: s.homeBase ? Math.min(ROWS - 1, s.homeBase.y + 1) : 11,
        lives: 3,
        spiceCarried: 0,
        spiceDeposited: 0,
        noiseLevel: 0,
        thumpersLeft: 3,
        isRiding: false,
        rideSegmentIndex: 0,
        score: s.score,
        stepCooldown: 0,
        direction: 'NONE',
        invulnerableTime: 0
      };
  
      // Position Colossal Worm winding in the deep Arrakis desert
      s.worm = {
        segments: [
          { x: 18, y: 9 },
          { x: 19, y: 9 },
          { x: 20, y: 9 },
          { x: 21, y: 9 },
          { x: 22, y: 9 },
          { x: 23, y: 9 }
        ],
        direction: 'LEFT',
        targetDirection: 'LEFT',
        speed: 1.0,
        diveActive: false,
        diveEnergy: 100,
        isFrenzied: false,
        frenzyTime: 0
        ,
        spiceEaten: 0
      };
  
      // Spawn initial Spice Blow components (preventing spawning inside rock)
      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSpiceBlows && multiplayerSpiceBlows.length > 0) {
        s.spiceBlows = [...multiplayerSpiceBlows];
      } else {
        s.spiceBlows = [];
        for (let i = 0; i < 4; i++) {
          spawnSpiceBlow(false);
        }
        // Spawn 1 major rich blow
        spawnSpiceBlow(true);
      }
  
      s.thumpers = [];
      s.particles = [];
      s.shakeTime = 0;
      s.shakeIntensity = 0;
      s.timeStep = 0;
  
      // Reset AI Fremens
      s.aiFremens = [];
      if (
        gameMode === GameMode.WORM_SOLO ||
        ((gameMode === GameMode.LOCAL_VS || gameMode === GameMode.ONLINE_MULTIPLAYER) && duelType === DuelType.WORM_VS_WORM)
      ) {
        // Spawn 3 AI harvesters
        for (let i = 0; i < 3; i++) {
          spawnAIFremen(i);
        }
      }
  
      onSetLives(3);
      onSetScore(s.score);
      onSetSpiceCoins(0);
      onSetThumpersLeft(3);
      onSetNoiseLevel(0);
      onSetDiveActive(false);
      onSetDiveEnergy(100);
      s.timeLeft = 90;
      onSetTimeLeft(90);
    };

  const spawnSpiceBlow = (isMajor: boolean = false) => {
    const s = stateRef.current;
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const rx = Math.floor(Math.random() * (COLS - 2)) + 1;
      const ry = Math.floor(Math.random() * (ROWS - 2)) + 1;
      
      // Assure spice does not land inside boulder high ground
      if (!isRock(rx, ry)) {
        s.spiceBlows.push({
          id: Math.random().toString(),
          x: rx,
          y: ry,
          amount: isMajor ? 5 : Math.floor(Math.random() * 2) + 1,
          isMajor
        });
        placed = true;
      }
    }
  };

  const spawnAIFremen = (id: number) => {
    const s = stateRef.current;
    let placed = false;
    let attempts = 0;
    const colors = ['#38bdf8', '#06b6d4', '#22d3ee'];
    while (!placed && attempts < 100) {
      attempts++;
      const rx = Math.floor(Math.random() * 8) + 1; // Left side of map
      const ry = Math.floor(Math.random() * (ROWS - 2)) + 1;
      if (!isRock(rx, ry)) {
        s.aiFremens.push({
          id,
          x: rx,
          y: ry,
          targetX: rx,
          targetY: ry,
          lives: 1,
          spiceCarried: 0,
          spiceDeposited: 0,
          noiseLevel: 20,
          thumpersLeft: 1,
          isRiding: false,
          rideSegmentIndex: 0,
          score: 0,
          stepCooldown: Math.floor(Math.random() * 30),
          direction: 'NONE',
          color: colors[id % colors.length]
        });
        placed = true;
      }
    }
  };

  // Keyboard and Control listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key.toLowerCase();
      s.keys[key] = true;

      if (s.gameState !== GameState.PLAYING) return;

      // Intercept key events to prevent scrolling the AI studio iframe
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'q', 'w', 'a', 's', 'd', 'c', 'x', 'f'].includes(key)) {
        e.preventDefault();
      }

      const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                               (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);

      const deployThumper = (fremen: typeof s.fremen, syncToPeer: boolean) => {
        if (fremen.thumpersLeft > 0 && !fremen.isRiding) {
          fremen.thumpersLeft--;
          // Keep legacy single value synced to Fremen 1 outside dual-fremen mode
          if (!isFremenVsFremen || fremen === s.fremen) {
            onSetThumpersLeft(fremen.thumpersLeft);
          }
          s.thumpers.push({
            x: fremen.x,
            y: fremen.y,
            life: 220,
            pulseRadius: 0
          });
          audioController.playThump(1.2);
          addParticles(fremen.x, fremen.y, '#d97706', 12);

          if (syncToPeer && gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
            multiplayerSocket.send(JSON.stringify({
              type: 'THUMPER_SIGNAL',
              payload: {
                x: fremen.x,
                y: fremen.y
              }
            }));
          }
        }
      };

      // Drop Thumper controls
      // Fremen-vs-Fremen: WASD player uses Q, Arrow player uses Space.
      if (isFremenVsFremen) {
        if (key === 'q' && s.fremen.lives > 0) {
          deployThumper(s.fremen, false);
        }
        if (e.key === ' ' && s.fremen2.lives > 0) {
          deployThumper(s.fremen2, false);
        }
      } else if (e.key === ' ' && (gameMode === GameMode.FREMEN_SOLO || gameMode === GameMode.LOCAL_VS || (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerRole === 'fremen'))) {
        deployThumper(s.fremen, true);
      }



      // Dive Underground (Player Worm Option)
      if ((key === 'f' || e.key === 'Shift') && (gameMode === GameMode.WORM_SOLO || gameMode === GameMode.LOCAL_VS || (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerRole === 'worm'))) {
        if (s.worm.diveEnergy > 15) {
          s.worm.diveActive = !s.worm.diveActive;
          onSetDiveActive(s.worm.diveActive);
          audioController.playWormRoar();
          addParticles(s.worm.segments[0].x, s.worm.segments[0].y, '#b45309', 25);
          triggerScreenShake(8, 15);
        }
      }

      // Mount/Riding hooks (Fremen Option)
      if (key === 'x' && (gameMode === GameMode.FREMEN_SOLO || gameMode === GameMode.LOCAL_VS)) {
        if (!s.fremen.isRiding) {
          // Check if adjacent to a middle/tail worm segment
          let rideIndex = -1;
          for (let i = 1; i < s.worm.segments.length; i++) {
            const seg = s.worm.segments[i];
            const dist = Math.abs(s.fremen.x - seg.x) + Math.abs(s.fremen.y - seg.y);
            if (dist <= 1) {
              rideIndex = i;
              break;
            }
          }

          if (rideIndex !== -1) {
            s.fremen.isRiding = true;
            s.fremen.rideSegmentIndex = rideIndex;
            audioController.playVictory();
            addParticles(s.fremen.x, s.fremen.y, '#f59e0b', 15);
            onSetScore(prev => prev + 100);
            triggerScreenShake(3, 10);
          }
        } else {
          // Dismount
          s.fremen.isRiding = false;
          addParticles(s.fremen.x, s.fremen.y, '#ea580c', 8);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      s.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameMode, level, spiceGoal]);

  // Handle Online Multiplayer Live synchronizer packets
  useEffect(() => {
    if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket) {
      const handleSocketMessage = (e: MessageEvent) => {
        try {
          const message = JSON.parse(e.data);
          const s = stateRef.current;
          
          if (message.type === 'GAME_STATE_UPDATE') {
            const { role, data } = message.payload;
            if (role === 'fremen' && multiplayerRole === 'worm') {
              // Peer is Fremen
              s.fremen.x = data.x;
              s.fremen.y = data.y;
              s.fremen.targetX = data.targetX;
              s.fremen.targetY = data.targetY;
              s.fremen.noiseLevel = data.noiseLevel;
              s.fremen.spiceCarried = data.spiceCarried;
              s.fremen.spiceDeposited = data.spiceDeposited;
              s.fremen.thumpersLeft = data.thumpersLeft;
              s.fremen.isRiding = data.isRiding;
              s.fremen.direction = data.direction;
              s.score = data.score;
              
              onSetNoiseLevel(data.noiseLevel);
              onSetSpiceCoins(data.spiceDeposited);
              onSetScore(data.score);
            } else if (role === 'worm' && multiplayerRole === 'fremen') {
              // Peer is Worm
              s.worm.segments = data.segments;
              s.worm.direction = data.direction;
              s.worm.diveActive = data.diveActive;
              s.worm.diveEnergy = data.diveEnergy;
              s.worm.isFrenzied = data.isFrenzied;
              
              onSetDiveActive(data.diveActive);
              onSetDiveEnergy(data.diveEnergy);
            }
          } else if (message.type === 'THUMPER_SIGNAL') {
            const { x, y } = message.payload;
            // Peer placed a thumper! Let's display and emit thump sound wave
            s.thumpers.push({
              x: x,
              y: y,
              life: 220,
              pulseRadius: 0
            });
            audioController.playThump(1.2);
            addParticles(x, y, '#d97706', 12);
          } else if (message.type === 'SPICE_UPDATE') {
            const { spiceBlows } = message.payload;
            // Hot swap spice blows listing
            s.spiceBlows = spiceBlows;
          } else if (message.type === 'WORM_DEATH_NOTIFICATION') {
            // Worm won or lost
            const { winner } = message.payload;
            if (winner === 'fremen') {
              onSetGameState(GameState.GAME_OVER_FREMEN_WON);
            } else {
              onSetGameState(GameState.GAME_OVER_WORM_WON);
            }
          }
        } catch (err) {
          console.error("Error parsing multiplayer websocket packet:", err);
        }
      };

      multiplayerSocket.addEventListener('message', handleSocketMessage);
      return () => {
        multiplayerSocket.removeEventListener('message', handleSocketMessage);
      };
    }
  }, [gameMode, multiplayerSocket, multiplayerRole]);

  // Main tick and animation sequence loop running at 60 FPS
  useEffect(() => {
    let animationFrameId: number;
    const s = stateRef.current;

    // Reset loop
    initLevel();

    const handleTimeOut = () => {
      audioController.playDeath();

      const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                               (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);
      const isWormVsWorm = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.WORM_VS_WORM) ||
                           (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.WORM_VS_WORM);

      let winner: 'fremen' | 'worm' = 'fremen';

      if (isFremenVsFremen) {
        if (s.fremen.spiceDeposited >= s.fremen2.spiceDeposited) {
          onSetGameState(GameState.GAME_OVER_FREMEN_WON);
          winner = 'fremen';
        } else {
          onSetGameState(GameState.GAME_OVER_WORM_WON);
          winner = 'worm';
        }
      } else if (isWormVsWorm) {
        // Decide Worm-vs-Worm winner by spice collected (including bonuses for eating Fremens)
        const worm1Spice = s.worm.spiceEaten || 0;
        const worm2Spice = s.worm2.spiceEaten || 0;
        if (worm1Spice >= worm2Spice) {
          onSetGameState(GameState.GAME_OVER_WORM_WON);
          winner = 'worm';
        } else {
          onSetGameState(GameState.GAME_OVER_FREMEN_WON);
          winner = 'fremen';
        }
      } else if (gameMode === GameMode.FREMEN_SOLO) {
        onSetGameState(GameState.GAME_OVER_WORM_WON);
        winner = 'worm';
      } else if (gameMode === GameMode.WORM_SOLO) {
        onSetGameState(GameState.GAME_OVER_FREMEN_WON);
        winner = 'fremen';
      } else {
        onSetGameState(GameState.GAME_OVER_FREMEN_WON);
        winner = 'fremen';
      }

      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
        multiplayerSocket.send(JSON.stringify({
          type: 'MATCH_OVER',
          payload: {
            winner: winner
          }
        }));
      }
    };

    const loop = () => {
      if (s.gameState === GameState.PLAYING) {
        updatePhysics();
      }
      renderCanvas();
      animationFrameId = requestAnimationFrame(loop);
    };

    const updatePhysics = () => {
      s.timeStep++;
      s.windTime += 0.01;

      // Decrement countdown timer roughly once per second at 60 FPS
      if (s.timeStep % 60 === 0) {
        if (s.timeLeft > 0) {
          s.timeLeft--;
          onSetTimeLeft(s.timeLeft);
          if (s.timeLeft <= 0) {
            handleTimeOut();
          }
        }
      }

      // 1. Update Screen Shake values
      if (s.shakeTime > 0) {
        s.shakeTime--;
      }

      // 2. Resolve particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        return p.life < p.maxLife;
      });

      // 3. Resolve thumpers
      s.thumpers = s.thumpers.filter(t => {
        t.life--;
        t.pulseRadius = (t.pulseRadius + 1.2) % 40;
        
        // Emit thump beep periodically
        if (s.timeStep % 25 === 0 && t.life > 0) {
          audioController.playThump(0.5);
        }
        return t.life > 0;
      });

      // 4. Resolve Sandworm Frenzy timers
      if (s.worm.isFrenzied) {
        s.worm.frenzyTime--;
        if (s.worm.frenzyTime <= 0) {
          s.worm.isFrenzied = false;
        }
      }

      // 5. Update Worm Dive Energy levels
      if (s.worm.diveActive) {
        s.worm.diveEnergy = Math.max(0, s.worm.diveEnergy - 0.4);
        onSetDiveEnergy(Math.floor(s.worm.diveEnergy));
        if (s.worm.diveEnergy <= 0) {
          s.worm.diveActive = false;
          onSetDiveActive(false);
          audioController.playWormRoar();
          addParticles(s.worm.segments[0].x, s.worm.segments[0].y, '#ea580c', 20);
        }
      } else {
        s.worm.diveEnergy = Math.min(100, s.worm.diveEnergy + 0.15);
        onSetDiveEnergy(Math.floor(s.worm.diveEnergy));
      }



      // 7. HANDLE PLAYER CONTROLS (FREMEN)
      updatePlayerFremen();

      // 8. HANDLE AI FREMENS (For Worm Solo and Worm-vs-Worm race modes)
      if (
        gameMode === GameMode.WORM_SOLO ||
        ((gameMode === GameMode.LOCAL_VS || gameMode === GameMode.ONLINE_MULTIPLAYER) && duelType === DuelType.WORM_VS_WORM)
      ) {
        updateAIFremens();
      }

      // 9. HANDLE WORM MOVEMENT (Player or AI)
      updateWorm();

      // 10. CHECK COLLISION & GAME OVER conditions
      checkMatchCollisions();

      // Forward Game State coordinates over WebSocket in Online Multiplayer mode
      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
        if (multiplayerRole === 'fremen') {
          multiplayerSocket.send(JSON.stringify({
            type: 'GAME_FORWARD',
            payload: {
              role: 'fremen',
              data: {
                x: s.fremen.x,
                y: s.fremen.y,
                targetX: s.fremen.targetX,
                targetY: s.fremen.targetY,
                noiseLevel: s.fremen.noiseLevel,
                spiceCarried: s.fremen.spiceCarried,
                spiceDeposited: s.fremen.spiceDeposited,
                thumpersLeft: s.fremen.thumpersLeft,
                isRiding: s.fremen.isRiding,
                score: s.score,
                direction: s.fremen.direction
              }
            }
          }));
        } else if (multiplayerRole === 'worm') {
          multiplayerSocket.send(JSON.stringify({
            type: 'GAME_FORWARD',
            payload: {
              role: 'worm',
              data: {
                segments: s.worm.segments,
                direction: s.worm.direction,
                diveActive: s.worm.diveActive,
                diveEnergy: s.worm.diveEnergy,
                isFrenzied: s.worm.isFrenzied
              }
            }
          }));
        }
      }
    };

    const updatePlayerFremen = () => {
      if (s.fremen.invulnerableTime && s.fremen.invulnerableTime > 0) {
        s.fremen.invulnerableTime--;
      }
      if (s.fremen2.invulnerableTime && s.fremen2.invulnerableTime > 0) {
        s.fremen2.invulnerableTime--;
      }

      if (gameMode === GameMode.WORM_SOLO) return; // Fremen is AI in block-hunt mode
      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerRole === 'worm') return; // Peer controls Fremen

      const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                               (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);

      const getDirectionFromKeys = (
        upKey: string,
        downKey: string,
        leftKey: string,
        rightKey: string
      ) => {
        let dx = 0;
        let dy = 0;

        if (s.keys[upKey]) dy = -1;
        else if (s.keys[downKey]) dy = 1;
        else if (s.keys[leftKey]) dx = -1;
        else if (s.keys[rightKey]) dx = 1;

        return { dx, dy };
      };

      const moveFremen = (
        fremen: typeof s.fremen,
        controls: { up: string; down: string; left: string; right: string },
        label: 'fremen' | 'fremen2'
      ) => {
        if (fremen.lives <= 0) {
          return;
        }
        let { dx, dy } = getDirectionFromKeys(controls.up, controls.down, controls.left, controls.right);

        if (label === 'fremen' || isFremenVsFremen) {
          if (dx !== 0 || dy !== 0) {
            fremen.noiseLevel = Math.min(100, fremen.noiseLevel + 3);
          } else {
            fremen.noiseLevel = Math.max(0, fremen.noiseLevel - 1.5);
          }
          if (label === 'fremen') {
            onSetNoiseLevel(Math.floor(fremen.noiseLevel));
          }
        }

        if (fremen.isRiding) {
          const segIndex = fremen.rideSegmentIndex;
          if (segIndex < s.worm.segments.length) {
            const seg = s.worm.segments[segIndex];
            fremen.x = seg.x;
            fremen.y = seg.y;
            fremen.targetX = seg.x;
            fremen.targetY = seg.y;

            if (dx !== 0 || dy !== 0) {
              let nextDir = s.worm.direction;
              if (dx === 1) nextDir = 'RIGHT';
              if (dx === -1) nextDir = 'LEFT';
              if (dy === 1) nextDir = 'DOWN';
              if (dy === -1) nextDir = 'UP';

              if (
                (nextDir === 'LEFT' && s.worm.direction !== 'RIGHT') ||
                (nextDir === 'RIGHT' && s.worm.direction !== 'LEFT') ||
                (nextDir === 'UP' && s.worm.direction !== 'DOWN') ||
                (nextDir === 'DOWN' && s.worm.direction !== 'UP')
              ) {
                s.worm.targetDirection = nextDir;
              }
            }

            if (s.worm.diveActive || s.timeStep % 500 === 0) {
              fremen.isRiding = false;
              addParticles(fremen.x, fremen.y, '#ea580c', 16);
              onSetScore(prev => prev + 50);
            }
          } else {
            fremen.isRiding = false;
          }
          return;
        }

        if (fremen.stepCooldown > 0) {
          fremen.stepCooldown--;
        }

        if (fremen.stepCooldown === 0 && (dx !== 0 || dy !== 0)) {
          const nextX = fremen.x + dx;
          const nextY = fremen.y + dy;

          if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
            fremen.x = nextX;
            fremen.y = nextY;
            fremen.targetX = nextX;
            fremen.targetY = nextY;

            const isRocky = isRock(nextX, nextY);
            fremen.stepCooldown = isRocky ? 12 : 6;

            if (!isRocky) {
              addParticles(nextX, nextY, '#d97706', 2);
            }

            const itemIdx = s.spiceBlows.findIndex(sb => sb.x === nextX && sb.y === nextY);
            if (itemIdx !== -1) {
              const gatheredSpice = s.spiceBlows[itemIdx];
              fremen.spiceCarried += gatheredSpice.amount;
              s.spiceBlows.splice(itemIdx, 1);

              audioController.playSpiceHarvest();
              addParticles(nextX, nextY, '#f59e0b', 12);

              if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
                multiplayerSocket.send(JSON.stringify({
                  type: 'SPICE_GATHERED',
                  payload: {
                    id: gatheredSpice.id,
                    fremenCoins: fremen.spiceCarried
                  }
                }));
              } else if (label === 'fremen') {
                s.score += gatheredSpice.amount * 10;
                onSetScore(s.score);
                spawnSpiceBlow(Math.random() > 0.82);
              }
            }

            if (s.homeBase && nextX === s.homeBase.x && nextY === s.homeBase.y) {
              if (fremen.spiceCarried > 0) {
                const depAmount = fremen.spiceCarried;
                fremen.spiceDeposited += depAmount;
                fremen.spiceCarried = 0;

                if (label === 'fremen') {
                  onSetSpiceCoins(fremen.spiceDeposited);

                  const depositBonus = depAmount * 15;
                  s.score += depositBonus;
                  onSetScore(s.score);
                }

                audioController.playVictory();
                addParticles(s.homeBase.x, s.homeBase.y, '#10b981', 16);

                if (label === 'fremen' && gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
                  multiplayerSocket.send(JSON.stringify({
                    type: 'GAME_FORWARD',
                    payload: {
                      role: 'fremen',
                      data: {
                        x: fremen.x,
                        y: fremen.y,
                        targetX: fremen.targetX,
                        targetY: fremen.targetY,
                        noiseLevel: fremen.noiseLevel,
                        spiceCarried: 0,
                        spiceDeposited: fremen.spiceDeposited,
                        thumpersLeft: fremen.thumpersLeft,
                        isRiding: fremen.isRiding,
                        score: s.score,
                        direction: fremen.direction
                      }
                    }
                  }));
                }

                if (label === 'fremen' && fremen.spiceDeposited >= spiceGoal) {
                  audioController.playVictory();
                  onUpdateHighScore(s.score + 500);
                  onSetGameState(GameState.GAME_OVER_FREMEN_WON);

                  if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
                    multiplayerSocket.send(JSON.stringify({
                      type: 'MATCH_OVER',
                      payload: {
                        winner: 'fremen'
                      }
                    }));
                  }
                }
              }
            }
          }
        }
      };

      if (isFremenVsFremen) {
        moveFremen(s.fremen, { up: 'w', down: 's', left: 'a', right: 'd' }, 'fremen');
        moveFremen(s.fremen2, { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright' }, 'fremen2');
        return;
      }

      // Check keyboard directions
      let dx = 0;
      let dy = 0;

      if (s.keys['arrowup']) dy = -1;
      else if (s.keys['arrowdown']) dy = 1;
      else if (s.keys['arrowleft']) dx = -1;
      else if (s.keys['arrowright']) dx = 1;

      // Noise calculation based on physical movement
      if (dx !== 0 || dy !== 0) {
        // Continuous walk increases noise
        s.fremen.noiseLevel = Math.min(100, s.fremen.noiseLevel + 3);
      } else {
        s.fremen.noiseLevel = Math.max(0, s.fremen.noiseLevel - 1.5);
      }
      onSetNoiseLevel(Math.floor(s.fremen.noiseLevel));

      // Handle Rider-to-Worm attachment positioning
      if (s.fremen.isRiding) {
        const segIndex = s.fremen.rideSegmentIndex;
        if (segIndex < s.worm.segments.length) {
          const seg = s.worm.segments[segIndex];
          s.fremen.x = seg.x;
          s.fremen.y = seg.y;
          s.fremen.targetX = seg.x;
          s.fremen.targetY = seg.y;

          // Steer the worm!
          if (dx !== 0 || dy !== 0) {
            let nextDir = s.worm.direction;
            if (dx === 1) nextDir = 'RIGHT';
            if (dx === -1) nextDir = 'LEFT';
            if (dy === 1) nextDir = 'DOWN';
            if (dy === -1) nextDir = 'UP';

            // Avoid direct back-pedal suicide steer
            if (
              (nextDir === 'LEFT' && s.worm.direction !== 'RIGHT') ||
              (nextDir === 'RIGHT' && s.worm.direction !== 'LEFT') ||
              (nextDir === 'UP' && s.worm.direction !== 'DOWN') ||
              (nextDir === 'DOWN' && s.worm.direction !== 'UP')
            ) {
              s.worm.targetDirection = nextDir;
            }
          }

          // Check if ride finishes (e.g., worm dives deep)
          if (s.worm.diveActive || s.timeStep % 500 === 0) {
            s.fremen.isRiding = false;
            addParticles(s.fremen.x, s.fremen.y, '#ea580c', 16);
            onSetScore(prev => prev + 50); // Rider dismount bonus
          }
        } else {
          s.fremen.isRiding = false;
        }
        return;
      }

      // Handle step pacing to feel realistic (prevents bullet speed running)
      if (s.fremen.stepCooldown > 0) {
        s.fremen.stepCooldown--;
      }

      if (s.fremen.stepCooldown === 0 && (dx !== 0 || dy !== 0)) {
        const nextX = s.fremen.x + dx;
        const nextY = s.fremen.y + dy;

        // Wall boundary checks
        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
          s.fremen.x = nextX;
          s.fremen.y = nextY;
          s.fremen.targetX = nextX;
          s.fremen.targetY = nextY;
          
          // Speed scale. Running on sand causes noise. Moving onto rock is quiet.
          const isRocky = isRock(nextX, nextY);
          s.fremen.stepCooldown = isRocky ? 12 : 6;

          // Emit visual dust steps on sand
          if (!isRocky) {
            addParticles(nextX, nextY, '#d97706', 2);
          }

          // Gather spice blows
          const itemIdx = s.spiceBlows.findIndex(sb => sb.x === nextX && sb.y === nextY);
          if (itemIdx !== -1) {
            const gatheredSpice = s.spiceBlows[itemIdx];
            s.fremen.spiceCarried += gatheredSpice.amount;
            s.spiceBlows.splice(itemIdx, 1);
            
            audioController.playSpiceHarvest();
            addParticles(nextX, nextY, '#f59e0b', 12);

            // In online multiplayer, we sync spice blows via the server
            if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
              multiplayerSocket.send(JSON.stringify({
                type: 'SPICE_GATHERED',
                payload: {
                  id: gatheredSpice.id,
                  fremenCoins: s.fremen.spiceCarried
                }
              }));
            } else {
              s.score += gatheredSpice.amount * 10;
              onSetScore(s.score);
              spawnSpiceBlow(Math.random() > 0.82);
            }
          }

          // Return to Rocky Sietch / Home Base to save/deposit spice reserves!
          if (s.homeBase && nextX === s.homeBase.x && nextY === s.homeBase.y) {
            if (s.fremen.spiceCarried > 0) {
              const depAmount = s.fremen.spiceCarried;
              s.fremen.spiceDeposited += depAmount;
              s.fremen.spiceCarried = 0;
              onSetSpiceCoins(s.fremen.spiceDeposited);

              const depositBonus = depAmount * 15;
              s.score += depositBonus;
              onSetScore(s.score);

              audioController.playVictory();
              addParticles(s.homeBase.x, s.homeBase.y, '#10b981', 16);

              if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
                // Forward updated scores to peer immediately
                multiplayerSocket.send(JSON.stringify({
                  type: 'GAME_FORWARD',
                  payload: {
                    role: 'fremen',
                    data: {
                      x: s.fremen.x,
                      y: s.fremen.y,
                      targetX: s.fremen.targetX,
                      targetY: s.fremen.targetY,
                      noiseLevel: s.fremen.noiseLevel,
                      spiceCarried: 0,
                      spiceDeposited: s.fremen.spiceDeposited,
                      thumpersLeft: s.fremen.thumpersLeft,
                      isRiding: s.fremen.isRiding,
                      score: s.score,
                      direction: s.fremen.direction
                    }
                  }
                }));
              }

              // Evaluate real harvest victory goals based on SECURELY DEPOSITED reserves!
              if (s.fremen.spiceDeposited >= spiceGoal) {
                audioController.playVictory();
                onUpdateHighScore(s.score + 500);
                onSetGameState(GameState.GAME_OVER_FREMEN_WON);

                if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
                  multiplayerSocket.send(JSON.stringify({
                    type: 'MATCH_OVER',
                    payload: {
                      winner: 'fremen'
                    }
                  }));
                }
              }
            }
          }
        }
      }
    };

    const updateAIFremens = () => {
      s.aiFremens.forEach(af => {
        if (af.stepCooldown > 0) {
          af.stepCooldown--;
          return;
        }

        // Simple AI: Head toward nearest spice source, run away from worm if too close!
        const wHead = s.worm.segments[0];
        const distWorm = Math.abs(af.x - wHead.x) + Math.abs(af.y - wHead.y);

        let dx = 0;
        let dy = 0;

        if (distWorm < 6) {
          // PANIC! Move away from worm
          const diffX = af.x - wHead.x;
          const diffY = af.y - wHead.y;
          
          if (Math.abs(diffX) > Math.abs(diffY)) {
            dx = diffX > 0 ? 1 : -1;
          } else {
            dy = diffY > 0 ? 1 : -1;
          }


        } else {
          // Wander or harvest spice blows
          if (s.spiceBlows.length > 0) {
            const targetSpice = s.spiceBlows[0];
            const diffX = targetSpice.x - af.x;
            const diffY = targetSpice.y - af.y;

            if (diffX !== 0) dx = diffX > 0 ? 1 : -1;
            else if (diffY !== 0) dy = diffY > 0 ? 1 : -1;
          } else {
            // Random direction
            const rng = Math.random();
            if (rng < 0.25) dx = 1;
            else if (rng < 0.5) dx = -1;
            else if (rng < 0.75) dy = 1;
            else dy = -1;
          }
        }

        const nextX = af.x + dx;
        const nextY = af.y + dy;

        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && !isRock(nextX, nextY)) {
          af.x = nextX;
          af.y = nextY;
          af.stepCooldown = Math.max(4, 15 - (level - 1) * 2); // AI gets faster every level!

          // Eat spice
          const sbIdx = s.spiceBlows.findIndex(b => b.x === nextX && b.y === nextY);
          if (sbIdx !== -1) {
            s.spiceBlows.splice(sbIdx, 1);
            spawnSpiceBlow(Math.random() > 0.85);
            addParticles(nextX, nextY, '#f59e0b', 5);
          }
        } else {
          af.stepCooldown = 5; // try again soon if blocked
        }
      });
    };

    const updateWorm = () => {
      if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerRole === 'fremen') {
        // If online multiplayer and both are playing Fremen:
        if (duelType !== DuelType.FREMEN_VS_FREMEN) {
          return; // Peer controls Shai-Hulud normally, except when it is a Freelender race!
        }
      }
      // Steer pace check
      const isAIWorm = gameMode === GameMode.FREMEN_SOLO || 
                       (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                       (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);
      
      let speedTicks = 14; // Default slow crawls: update physics every 14 steps
      if (s.worm.isFrenzied) speedTicks = 6;
      else if (s.worm.diveActive) speedTicks = 7;
      else if (s.fremen.noiseLevel > 60) speedTicks = 9;

      if (s.timeStep % speedTicks !== 0) return;

      if (isAIWorm) {
        // AI WORM DECISION TREE
        const head = s.worm.segments[0];
        
        // Target 1: Active thumper
        // Target 2: Noisiest alive Fremen (in Fremen-vs-Fremen)
        // Target 3: Loud Fremen
        // Target 4: Clumped spice blow
        let targetX = s.fremen.x;
        let targetY = s.fremen.y;
        let hasSpecTarget = false;
        const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                                 (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);

        if (s.thumpers.length > 0) {
          targetX = s.thumpers[0].x;
          targetY = s.thumpers[0].y;
          hasSpecTarget = true;
        } else if (isFremenVsFremen) {
          const candidates = [s.fremen, s.fremen2].filter(f => f.lives > 0);
          if (candidates.length > 0) {
            const chosen = candidates.reduce((best, cur) => {
              if (cur.noiseLevel > best.noiseLevel) return cur;
              if (cur.noiseLevel < best.noiseLevel) return best;
              const distBest = Math.abs(head.x - best.x) + Math.abs(head.y - best.y);
              const distCur = Math.abs(head.x - cur.x) + Math.abs(head.y - cur.y);
              return distCur < distBest ? cur : best;
            });
            targetX = chosen.x;
            targetY = chosen.y;
            hasSpecTarget = true;
          }
        } else if (s.fremen.noiseLevel > 40 && !s.fremen.isRiding) {
          targetX = s.fremen.x;
          targetY = s.fremen.y;
          hasSpecTarget = true;
        } else if (s.spiceBlows.length > 0) {
          // Target nearby spice blows
          const nearestSpice = s.spiceBlows.reduce((prev, curr) => {
            const distP = Math.abs(head.x - prev.x) + Math.abs(head.y - prev.y);
            const distC = Math.abs(head.x - curr.x) + Math.abs(head.y - curr.y);
            return distP < distC ? prev : curr;
          });
          targetX = nearestSpice.x;
          targetY = nearestSpice.y;
        }

        // Steering logic toward targeted sector (A-Star-lite step)
        const diffX = targetX - head.x;
        const diffY = targetY - head.y;

        let nextDir = s.worm.direction;

        // Try aligned direction which avoids body auto-cannibalism
        if (Math.abs(diffX) > Math.abs(diffY) && diffX !== 0) {
          const tryDir = diffX > 0 ? 'RIGHT' : 'LEFT';
          if (!isOpposite(tryDir, s.worm.direction)) {
            nextDir = tryDir;
          } else {
            nextDir = diffY > 0 ? 'DOWN' : 'UP';
          }
        } else if (diffY !== 0) {
          const tryDir = diffY > 0 ? 'DOWN' : 'UP';
          if (!isOpposite(tryDir, s.worm.direction)) {
            nextDir = tryDir;
          } else {
            nextDir = diffX > 0 ? 'RIGHT' : 'LEFT';
          }
        }

        // Avoid direct impact with Rocks UNLESS in subsurface diving mode
        let avoidRock = false;
        let testX = head.x;
        let testY = head.y;
        if (nextDir === 'RIGHT') testX++;
        if (nextDir === 'LEFT') testX--;
        if (nextDir === 'DOWN') testY++;
        if (nextDir === 'UP') testY--;

        if (isRock(testX, testY) && !s.worm.diveActive) {
          // Sietch barrier! Turn directions randomly to search layout
          const directions: Array<'UP'|'DOWN'|'LEFT'|'RIGHT'> = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
          for (const d of directions) {
            if (!isOpposite(d, s.worm.direction)) {
              let tX = head.x;
              let tY = head.y;
              if (d === 'RIGHT') tX++;
              if (d === 'LEFT') tX--;
              if (d === 'DOWN') tY++;
              if (d === 'UP') tY--;
              if (!isRock(tX, tY)) {
                nextDir = d;
                break;
              }
            }
          }

          // AI might dive to go under rocks
          if (s.worm.diveEnergy > 30 && Math.random() > 0.5) {
            s.worm.diveActive = true;
            onSetDiveActive(true);
            audioController.playWormRoar();
            addParticles(head.x, head.y, '#92400e', 14);
          }
        }

        s.worm.direction = nextDir;
      } else {
        // PLAYER WORM CONTROLS (WASD keys or directional keys in riding state)
        let wdx = 0;
        let wdy = 0;

        if (s.keys['w']) wdy = -1;
        else if (s.keys['s']) wdy = 1;
        else if (s.keys['a']) wdx = -1;
        else if (s.keys['d']) wdx = 1;

        if (wdx !== 0 || wdy !== 0) {
          let nextDir = s.worm.direction;
          if (wdx === 1) nextDir = 'RIGHT';
          if (wdx === -1) nextDir = 'LEFT';
          if (wdy === 1) nextDir = 'DOWN';
          if (wdy === -1) nextDir = 'UP';

          // Avoid backing on self
          if (!isOpposite(nextDir, s.worm.direction)) {
            s.worm.targetDirection = nextDir;
          }
        }
        s.worm.direction = s.worm.targetDirection;
      }

      // Step slither calculation
      const head = s.worm.segments[0];
      let newHeadX = head.x;
      let newHeadY = head.y;

      if (s.worm.direction === 'UP') newHeadY--;
      if (s.worm.direction === 'DOWN') newHeadY++;
      if (s.worm.direction === 'LEFT') newHeadX--;
      if (s.worm.direction === 'RIGHT') newHeadX++;

      // Wraparound grid logic mimicking Shai-Hulud coming out of deep desert
      if (newHeadX < 0) newHeadX = COLS - 1;
      if (newHeadX >= COLS) newHeadX = 0;
      if (newHeadY < 0) newHeadY = ROWS - 1;
      if (newHeadY >= ROWS) newHeadY = 0;

      // Check collision with Sietch rocky barriers
      if (isRock(newHeadX, newHeadY) && !s.worm.diveActive) {
        // Crash into rocky Sietch peaks! Stuns worm or chops its length!
        triggerScreenShake(12, 10);
        audioController.playDeath();
        
        // Remove tail segments as penalty for hitting massive rocks
        if (s.worm.segments.length > 5) {
          const removed = s.worm.segments.pop();
          if (removed) addParticles(removed.x, removed.y, '#ea580c', 10);
        }
        
        // Block movement
        return;
      }

      // Shift segments slither chain
      const newSegments = [{ x: newHeadX, y: newHeadY }, ...s.worm.segments.slice(0, -1)];
      s.worm.segments = newSegments;

      // Dust trace trail
      addParticles(newHeadX, newHeadY, s.worm.diveActive ? '#9a3412' : '#ca8a04', s.worm.diveActive ? 4 : 2);

      // Consume spice blows directly if surfaced
      if (!s.worm.diveActive) {
        const itemIdx = s.spiceBlows.findIndex(sb => sb.x === newHeadX && sb.y === newHeadY);
        if (itemIdx !== -1) {
          const gathered = s.spiceBlows[itemIdx];
          s.spiceBlows.splice(itemIdx, 1);
          spawnSpiceBlow(Math.random() > 0.85);

          // Growth element!
          s.worm.segments.push({ ...s.worm.segments[s.worm.segments.length - 1] });
          addParticles(newHeadX, newHeadY, '#f59e0b', 14);
          // Track spice eaten by this worm (used for Worm vs Worm scoring)
          if (typeof s.worm.spiceEaten === 'number') {
            s.worm.spiceEaten += gathered.amount;
          } else {
            s.worm.spiceEaten = gathered.amount;
          }
          
          if (gameMode === GameMode.WORM_SOLO) {
            onSetScore(prev => prev + gathered.amount * 10);
          }
        }
      }

      // If this is a Worm vs Worm local match, also update the second worm (purple) from arrow keys
      const isWormVsWormLocal = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.WORM_VS_WORM) ||
                                (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.WORM_VS_WORM);

      if (isWormVsWormLocal) {
        // Allow player 2 to control worm2 with arrow keys
        let w2dx = 0;
        let w2dy = 0;
        if (s.keys['arrowup']) w2dy = -1;
        else if (s.keys['arrowdown']) w2dy = 1;
        else if (s.keys['arrowleft']) w2dx = -1;
        else if (s.keys['arrowright']) w2dx = 1;

        if (w2dx !== 0 || w2dy !== 0) {
          let nextDir2 = s.worm2.direction;
          if (w2dx === 1) nextDir2 = 'RIGHT';
          if (w2dx === -1) nextDir2 = 'LEFT';
          if (w2dy === 1) nextDir2 = 'DOWN';
          if (w2dy === -1) nextDir2 = 'UP';

          if (!isOpposite(nextDir2, s.worm2.direction)) {
            s.worm2.targetDirection = nextDir2;
          }
        }
        s.worm2.direction = s.worm2.targetDirection;

        // Step slither for worm2 (uses same speedTicks pacing)
        const head2 = s.worm2.segments[0];
        let newHeadX2 = head2.x;
        let newHeadY2 = head2.y;

        if (s.worm2.direction === 'UP') newHeadY2--;
        if (s.worm2.direction === 'DOWN') newHeadY2++;
        if (s.worm2.direction === 'LEFT') newHeadX2--;
        if (s.worm2.direction === 'RIGHT') newHeadX2++;

        // Wraparound
        if (newHeadX2 < 0) newHeadX2 = COLS - 1;
        if (newHeadX2 >= COLS) newHeadX2 = 0;
        if (newHeadY2 < 0) newHeadY2 = ROWS - 1;
        if (newHeadY2 >= ROWS) newHeadY2 = 0;

        // Rock collision check for worm2
        if (!(isRock(newHeadX2, newHeadY2) && !s.worm2.diveActive)) {
          const newSegments2 = [{ x: newHeadX2, y: newHeadY2 }, ...s.worm2.segments.slice(0, -1)];
          s.worm2.segments = newSegments2;

          addParticles(newHeadX2, newHeadY2, s.worm2.diveActive ? '#7c2d91' : '#9f7aea', s.worm2.diveActive ? 4 : 2);

          // Consume spice for worm2
          if (!s.worm2.diveActive) {
            const itemIdx2 = s.spiceBlows.findIndex(sb => sb.x === newHeadX2 && sb.y === newHeadY2);
            if (itemIdx2 !== -1) {
              const gathered2 = s.spiceBlows[itemIdx2];
              s.spiceBlows.splice(itemIdx2, 1);
              spawnSpiceBlow(Math.random() > 0.85);

              s.worm2.segments.push({ ...s.worm2.segments[s.worm2.segments.length - 1] });
              addParticles(newHeadX2, newHeadY2, '#f59e0b', 14);

              if (typeof s.worm2.spiceEaten === 'number') {
                s.worm2.spiceEaten += gathered2.amount;
              } else {
                s.worm2.spiceEaten = gathered2.amount;
              }
            }
          }
        } else {
          // Penalty for hitting rock on worm2 (chop tail)
          if (s.worm2.segments.length > 5 && !s.worm2.diveActive) {
            const removed2 = s.worm2.segments.pop();
            if (removed2) addParticles(removed2.x, removed2.y, '#a855f7', 10);
          }
        }
      }
    };

    const isOpposite = (d1: string, d2: string) => {
      if (d1 === 'LEFT' && d2 === 'RIGHT') return true;
      if (d1 === 'RIGHT' && d2 === 'LEFT') return true;
      if (d1 === 'UP' && d2 === 'DOWN') return true;
      if (d1 === 'DOWN' && d2 === 'UP') return true;
      return false;
    };

    const checkMatchCollisions = () => {
      const wHead = s.worm.segments[0];

      // Matchup: BOTH ARE FREMEN RACES
      const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                               (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);
      
      const isWormVsWorm = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.WORM_VS_WORM) ||
                           (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.WORM_VS_WORM);

      if (isFremenVsFremen) {
        const finishFremenVsFremen = () => {
          audioController.playDeath();
          if (s.fremen.spiceDeposited >= s.fremen2.spiceDeposited) {
            onSetGameState(GameState.GAME_OVER_FREMEN_WON); // Fremen 1 (silver) wins ties
          } else {
            onSetGameState(GameState.GAME_OVER_WORM_WON); // Fremen 2 (gold) wins
          }
        };

        // Resolve collisions of BOTH Fremen P1 and P2 with the AI Worm
        // Fremen P1 check:
        if (!s.fremen.isRiding && !(s.fremen.invulnerableTime && s.fremen.invulnerableTime > 0)) {
          let hit1 = false;
          if (s.worm.diveActive) {
            if (wHead.x === s.fremen.x && wHead.y === s.fremen.y) hit1 = true;
          } else {
            s.worm.segments.forEach(seg => {
              if (seg.x === s.fremen.x && seg.y === s.fremen.y) hit1 = true;
            });
          }
          if (hit1) {
            s.fremen.lives--;
            onSetLives(s.fremen.lives);
            triggerScreenShake(20, 30);
            audioController.playWormRoar();
            addParticles(s.fremen.x, s.fremen.y, '#38bdf8', 25);
            s.fremen.spiceCarried = 0;
            s.fremen.x = s.homeBase ? s.homeBase.x : 5;
            s.fremen.y = s.homeBase ? s.homeBase.y : 9;
            s.fremen.stepCooldown = 35; // Respawn stun
            s.fremen.invulnerableTime = 90; // 1.5 seconds invincere
            if (s.fremen.lives <= 0) {
              // Keep match running until timer or until BOTH Fremen are out of lives
              s.fremen.invulnerableTime = 0;
              s.fremen.x = -100;
              s.fremen.y = -100;
            }
          }
        }

        // Fremen P2 check:
        if (!s.fremen2.isRiding && !(s.fremen2.invulnerableTime && s.fremen2.invulnerableTime > 0)) {
          let hit2 = false;
          if (s.worm.diveActive) {
            if (wHead.x === s.fremen2.x && wHead.y === s.fremen2.y) hit2 = true;
          } else {
            s.worm.segments.forEach(seg => {
              if (seg.x === s.fremen2.x && seg.y === s.fremen2.y) hit2 = true;
            });
          }
          if (hit2) {
            s.fremen2.lives--;
            triggerScreenShake(20, 30);
            audioController.playWormRoar();
            addParticles(s.fremen2.x, s.fremen2.y, '#eab308', 25);
            s.fremen2.spiceCarried = 0;
            s.fremen2.x = s.homeBase ? s.homeBase.x : 5;
            s.fremen2.y = s.homeBase ? Math.min(ROWS - 1, s.homeBase.y + 1) : 11;
            s.fremen2.stepCooldown = 35; // Respawn stun
            s.fremen2.invulnerableTime = 90; // 1.5 seconds invincere
            if (s.fremen2.lives <= 0) {
              // Keep match running until timer or until BOTH Fremen are out of lives
              s.fremen2.invulnerableTime = 0;
              s.fremen2.x = -100;
              s.fremen2.y = -100;
            }
          }
        }

        if (s.fremen.lives <= 0 && s.fremen2.lives <= 0) {
          finishFremenVsFremen();
        }
        return;
      }

      if (isWormVsWorm) {
        // AI Fremens can be eaten by Worm 1 (s.worm) or Worm 2 (s.worm2)
        s.aiFremens = s.aiFremens.filter(af => {
          let eatenByWorm1 = false;
          let eatenByWorm2 = false;

          // Check Worm 1 (wHead)
          if (s.worm.diveActive) {
            if (wHead.x === af.x && wHead.y === af.y) eatenByWorm1 = true;
          } else {
            s.worm.segments.forEach(seg => {
              if (seg.x === af.x && seg.y === af.y) eatenByWorm1 = true;
            });
          }

          // Check Worm 2 (wHead2)
          const wHead2 = s.worm2.segments[0];
          if (s.worm2.diveActive) {
            if (wHead2.x === af.x && wHead2.y === af.y) eatenByWorm2 = true;
          } else {
            s.worm2.segments.forEach(seg => {
              if (seg.x === af.x && seg.y === af.y) eatenByWorm2 = true;
            });
          }

          if (eatenByWorm1) {
            triggerScreenShake(15, 20);
            audioController.playWormRoar();
            addParticles(af.x, af.y, '#ef4444', 30);
            s.worm.segments.push({ ...s.worm.segments[s.worm.segments.length - 1] });
            s.score += 100;
            onSetScore(s.score);
            // Bonus spice for eating a Fremen
            s.worm.spiceEaten = (s.worm.spiceEaten || 0) + 3;
            return false; // Remove AI Fremen
          }

          if (eatenByWorm2) {
            triggerScreenShake(15, 20);
            audioController.playWormRoar();
            addParticles(af.x, af.y, '#a855f7', 30);
            s.worm2.segments.push({ ...s.worm2.segments[s.worm2.segments.length - 1] });
            // Bonus spice for eating a Fremen
            s.worm2.spiceEaten = (s.worm2.spiceEaten || 0) + 3;
            return false; // Remove AI Fremen
          }

          return true;
        });

        // Check if all AI Fremens eaten:
        if (s.aiFremens.length === 0) {
          audioController.playVictory();
          if (s.worm.segments.length >= s.worm2.segments.length) {
            onSetGameState(GameState.GAME_OVER_WORM_WON); // Player 1 Worm wins
          } else {
            onSetGameState(GameState.GAME_OVER_FREMEN_WON); // Player 2 Worm wins
          }
        }
        return;
      }

      // STANDARD SINGLE PLAYER OR CLASSIC ASYMMETRIC FREMEN VS WORM MATCH
      if (gameMode !== GameMode.WORM_SOLO) {
        if (s.fremen.isRiding) return; // Immune during worm riding
        if (s.fremen.invulnerableTime && s.fremen.invulnerableTime > 0) return; // Immune during spawn/hit protection

        // Calculate distance from worm segments
        let hitSegIndex = -1;
        
        // Worm breach splash radius check in dive active
        if (s.worm.diveActive) {
          // Subsurface, check if right under Fremen
          if (wHead.x === s.fremen.x && wHead.y === s.fremen.y) {
            hitSegIndex = 0;
          }
        } else {
          // Slithering surfaced, check head and segments
          s.worm.segments.forEach((seg, index) => {
            if (seg.x === s.fremen.x && seg.y === s.fremen.y) {
              hitSegIndex = index;
            }
          });
        }

        if (hitSegIndex !== -1) {
          // Devoured completely!
          s.fremen.lives--;
          onSetLives(s.fremen.lives);
          triggerScreenShake(20, 30);
          audioController.playWormRoar();
          addParticles(s.fremen.x, s.fremen.y, '#ea580c', 35);

          if (s.fremen.lives <= 0) {
            audioController.playDeath();
            onUpdateHighScore(s.score);
            // Worm victory
            onSetGameState(GameState.GAME_OVER_WORM_WON);

            if (gameMode === GameMode.ONLINE_MULTIPLAYER && multiplayerSocket && multiplayerSocket.readyState === WebSocket.OPEN) {
              multiplayerSocket.send(JSON.stringify({
                type: 'MATCH_OVER',
                payload: {
                  winner: 'worm'
                }
              }));
            }
          } else {
            // Reset positions on life loss - return safely to the Home Base Sietch!
            const respawnX = s.homeBase ? s.homeBase.x : 1;
            const respawnY = s.homeBase ? s.homeBase.y : 1;
            
            s.fremen.x = respawnX;
            s.fremen.y = respawnY;
            s.fremen.targetX = respawnX;
            s.fremen.targetY = respawnY;
            
            // Being devoured discards ALL carried/unsecured dune spice
            s.fremen.spiceCarried = 0;
            
            s.fremen.stepCooldown = 35; // Brief spawn stun protection
            s.fremen.invulnerableTime = 90; // 1.5 seconds invincere
          }
        }

        // Crushing thumpers
        s.thumpers.forEach((t, tIdx) => {
          if (wHead.x === t.x && wHead.y === t.y) {
            s.thumpers.splice(tIdx, 1);
            audioController.playWormRoar();
            addParticles(t.x, t.y, '#b45309', 18);
            triggerScreenShake(8, 10);
            
            // Player worm gets points for clearing alarms
            if (gameMode === GameMode.LOCAL_VS) {
              onSetScore(prev => prev + 50);
            }
          }
        });
      }

      // 2. COLLISION IN WORM_SOLO (Worm Devours AI Fremens)
      if (gameMode === GameMode.WORM_SOLO) {
        s.aiFremens = s.aiFremens.filter(af => {
          let hit = false;
          if (s.worm.diveActive) {
            // Swim underground check breach splash
            if (wHead.x === af.x && wHead.y === af.y) hit = true;
          } else {
            s.worm.segments.forEach(seg => {
              if (seg.x === af.x && seg.y === af.y) hit = true;
            });
          }

          if (hit) {
            // Devoured AI Fremen!
            triggerScreenShake(15, 20);
            audioController.playWormRoar();
            addParticles(af.x, af.y, '#ef4444', 30);
            onSetScore(prev => prev + 100);

            // Worm growth
            s.worm.segments.push({ ...s.worm.segments[s.worm.segments.length - 1] });

            // Check victory condition (all harvesters devoured)
            if (s.aiFremens.length <= 1) {
              audioController.playVictory();
              onUpdateHighScore(s.score + 100);
              onSetGameState(GameState.GAME_OVER_WORM_WON);
            }
            return false;
          }
          return true;
        });
      }
    };

    const renderCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Base screen shake translation
      ctx.save();
      if (s.shakeTime > 0) {
        const dx = (Math.random() - 0.5) * s.shakeIntensity;
        const dy = (Math.random() - 0.5) * s.shakeIntensity;
        ctx.translate(dx, dy);
      }

      // A. DRAW BACKGROUND TERRAIN - Arrakis Deserts
      ctx.fillStyle = '#1c1917'; // Desert night border background
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Sand Dune shader grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const isRocky = isRock(c, r);
          
          if (isRocky) {
            // Drawing Rocky Sietch high ground blocks
            ctx.fillStyle = '#443730'; // Rock shadow
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.fillStyle = '#78350f'; // Hot desert brown
            ctx.fillRect(c * CELL_SIZE + 1, r * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            
            // Accent highlights on mountain peaks
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.moveTo(c * CELL_SIZE + CELL_SIZE / 2, r * CELL_SIZE + 4);
            ctx.lineTo(c * CELL_SIZE + 4, r * CELL_SIZE + CELL_SIZE - 4);
            ctx.lineTo(c * CELL_SIZE + CELL_SIZE - 4, r * CELL_SIZE + CELL_SIZE - 4);
            ctx.fill();
          } else {
            // Drawing soft orange dunes
            // Subtle wave noise representing desert wind ripple
            const ripple = Math.sin(c * 0.45 + s.windTime * 0.6) * 1.5;
            ctx.fillStyle = (c + r) % 2 === 0 ? '#1f1a14' : '#1e1c18';
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);

            // Sand grid speckles
            ctx.fillStyle = '#ca8a04';
            ctx.globalAlpha = 0.08;
            if ((c * 7 + r * 13) % 9 === 0) {
              ctx.fillRect(c * CELL_SIZE + 5 + ripple, r * CELL_SIZE + 7, 1.5, 1.5);
            }
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Wind dust streams across the Arrakis background
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) {
        const yCoord = (200 + i * 130 + Math.sin(s.windTime + i) * 60) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(0, yCoord);
        ctx.bezierCurveTo(
          CANVAS_WIDTH * 0.25, yCoord - 40,
          CANVAS_WIDTH * 0.75, yCoord + 40,
          CANVAS_WIDTH, yCoord
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // DRAW ROCKY SIETCH / HOME BASE
      if (s.homeBase) {
        const hx = s.homeBase.x * CELL_SIZE;
        const hy = s.homeBase.y * CELL_SIZE;
        
        // Draw the rocky sietch base
        ctx.fillStyle = '#292524'; // Very deep charcoal stone slate
        ctx.fillRect(hx, hy, CELL_SIZE, CELL_SIZE);
        
        ctx.fillStyle = '#44403c'; // Stone borders
        ctx.fillRect(hx + 2, hy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        // Green glowing entry cave
        ctx.fillStyle = '#059669'; // Emerald Sietch entry glow
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(hx + CELL_SIZE/2, hy + CELL_SIZE/2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Golden Sietch Emblem Triangle
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(hx + CELL_SIZE/2, hy + 4);
        ctx.lineTo(hx + 4, hy + CELL_SIZE - 4);
        ctx.lineTo(hx + CELL_SIZE - 4, hy + CELL_SIZE - 4);
        ctx.closePath();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Base text label
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("SIETCH", hx + CELL_SIZE/2, hy - 3);
      }

      // B. DRAW SPICE BLOWS (Sparkly golden heaps)
      s.spiceBlows.forEach(sb => {
        const bx = sb.x * CELL_SIZE + CELL_SIZE / 2;
        const by = sb.y * CELL_SIZE + CELL_SIZE / 2;

        // Orange glowing background aura
        const sizeMultiplier = sb.isMajor ? 1.5 : 1.0;
        const pulse = Math.sin(s.timeStep * 0.12) * 2;
        
        ctx.beginPath();
        const radGrd = ctx.createRadialGradient(bx, by, 1, bx, by, (7 * sizeMultiplier) + pulse);
        radGrd.addColorStop(0, '#f59e0b');
        radGrd.addColorStop(0.4, '#d97706');
        radGrd.addColorStop(1, 'transparent');
        ctx.fillStyle = radGrd;
        ctx.arc(bx, by, (10 * sizeMultiplier) + pulse, 0, Math.PI * 2);
        ctx.fill();

        // Heaped crystals
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(bx, by - 5 * sizeMultiplier);
        ctx.lineTo(bx + 4 * sizeMultiplier, by + 1 * sizeMultiplier);
        ctx.lineTo(bx - 4 * sizeMultiplier, by + 1 * sizeMultiplier);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx - 3 * sizeMultiplier, by + 2 * sizeMultiplier);
        ctx.lineTo(bx + 1 * sizeMultiplier, by + 5 * sizeMultiplier);
        ctx.lineTo(bx - 7 * sizeMultiplier, by + 5 * sizeMultiplier);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // C. DRAW THUMPERS (Vibrational drum indicators emitting sound rings)
      s.thumpers.forEach(t => {
        const tx = t.x * CELL_SIZE + CELL_SIZE / 2;
        const ty = t.y * CELL_SIZE + CELL_SIZE / 2;

        // Visual expanding wave ripple soundwave rings which prompt the sand-worm attraction
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = Math.max(0, 1.0 - t.pulseRadius / 40);
        ctx.beginPath();
        ctx.arc(tx, ty, t.pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.arc(tx, ty, Math.max(0, t.pulseRadius - 15), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Thumper pole physical rod
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(t.x * CELL_SIZE + 10, t.y * CELL_SIZE + 4, 6, 18);
        ctx.fillStyle = '#b45309'; // Red blinking LED at top
        if (s.timeStep % 16 < 8) {
          ctx.beginPath();
          ctx.arc(tx, t.y * CELL_SIZE + 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // D. DRAW THE FREMEN PLAYER
      if (gameMode !== GameMode.WORM_SOLO && !s.fremen.isRiding) {
        if (!s.fremen.invulnerableTime || s.fremen.invulnerableTime <= 0 || s.timeStep % 8 < 4) {
          const fx = s.fremen.x * CELL_SIZE + CELL_SIZE / 2;
          const fy = s.fremen.y * CELL_SIZE + CELL_SIZE / 2;

          // Draw Fremen figure (Stillsuit robes & glowing blue spice eyes)
          ctx.fillStyle = '#57534e'; // Stillsuit dark gray
          ctx.fillRect(s.fremen.x * CELL_SIZE + 6, s.fremen.y * CELL_SIZE + 8, 14, 14);

          ctx.fillStyle = '#78716c'; // Cape/Hood
          ctx.beginPath();
          ctx.moveTo(s.fremen.x * CELL_SIZE + 4, s.fremen.y * CELL_SIZE + 18);
          ctx.lineTo(fx, s.fremen.y * CELL_SIZE + 4);
          ctx.lineTo(s.fremen.x * CELL_SIZE + 22, s.fremen.y * CELL_SIZE + 18);
          ctx.fill();

          // Blue glow eyes
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(fx - 3, s.fremen.y * CELL_SIZE + 9, 2, 0, Math.PI * 2);
          ctx.arc(fx + 3, s.fremen.y * CELL_SIZE + 9, 2, 0, Math.PI * 2);
          ctx.fill();
          // Clear shadow parameters for rest of drawing
          ctx.shadowBlur = 0;
        }
      }

      // D2. DRAW THE SECONDRY FREMEN PLAYER (GOLDEN HOOD)
      const hasTwoFremens = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                            (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);
      if (hasTwoFremens) {
        if (!s.fremen2.invulnerableTime || s.fremen2.invulnerableTime <= 0 || s.timeStep % 8 < 4) {
          const fx2 = s.fremen2.x * CELL_SIZE + CELL_SIZE / 2;
          const fy2 = s.fremen2.y * CELL_SIZE + CELL_SIZE / 2;

          ctx.fillStyle = '#57534e'; // Stillsuit dark gray
          ctx.fillRect(s.fremen2.x * CELL_SIZE + 6, s.fremen2.y * CELL_SIZE + 8, 14, 14);

          ctx.fillStyle = '#ca8a04'; // Gold/Orange cape for P2 Fremen
          ctx.beginPath();
          ctx.moveTo(s.fremen2.x * CELL_SIZE + 4, s.fremen2.y * CELL_SIZE + 18);
          ctx.lineTo(fx2, s.fremen2.y * CELL_SIZE + 4);
          ctx.lineTo(s.fremen2.x * CELL_SIZE + 22, s.fremen2.y * CELL_SIZE + 18);
          ctx.fill();

          // Blue glow eyes
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(fx2 - 3, s.fremen2.y * CELL_SIZE + 9, 2, 0, Math.PI * 2);
          ctx.arc(fx2 + 3, s.fremen2.y * CELL_SIZE + 9, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // E. DRAW AI FREMENS
      if (gameMode === GameMode.WORM_SOLO || isWormVsWormMatch) {
        s.aiFremens.forEach(af => {
          const fx = af.x * CELL_SIZE + CELL_SIZE / 2;
          const fy = af.y * CELL_SIZE + CELL_SIZE / 2;



          ctx.fillStyle = '#44403c';
          ctx.fillRect(af.x * CELL_SIZE + 7, af.y * CELL_SIZE + 9, 12, 12);

          ctx.fillStyle = af.color; // Custom cloak/ID highlight
          ctx.beginPath();
          ctx.moveTo(af.x * CELL_SIZE + 5, af.y * CELL_SIZE + 17);
          ctx.lineTo(fx, af.y * CELL_SIZE + 5);
          ctx.lineTo(af.x * CELL_SIZE + 21, af.y * CELL_SIZE + 17);
          ctx.fill();

          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(fx - 2, af.y * CELL_SIZE + 10, 1.5, 0, Math.PI * 2);
          ctx.arc(fx + 2, af.y * CELL_SIZE + 10, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // F. DRAW SHAI-HULUD (SANDWORM SEGMENTS CHASM)
      const wormColor = s.worm.isFrenzied ? '#ef4444' : '#ea580c';
      const secondaryColor = s.worm.isFrenzied ? '#991b1b' : '#78350f';

      // Trace line path showing soundwave disturbance arrow if worm is deep underground
      if (s.worm.diveActive) {
        ctx.save();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        // Draw path connecting segments under dunes
        s.worm.segments.forEach((seg, idx) => {
          const px = seg.x * CELL_SIZE + CELL_SIZE / 2;
          const py = seg.y * CELL_SIZE + CELL_SIZE / 2;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }

      s.worm.segments.forEach((seg, index) => {
        const sx = seg.x * CELL_SIZE + CELL_SIZE / 2;
        const sy = seg.y * CELL_SIZE + CELL_SIZE / 2;

        const baseRadius = index === 0 ? 14 : Math.max(5, 12 - index * 0.35);

        if (s.worm.diveActive) {
          // Underground - draw beautiful rising sand hump shadows instead of worm body
          ctx.fillStyle = '#451a03';
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius + 1.5 + Math.sin(s.timeStep * 0.2 + index * 0.5) * 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#78350f';
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius - 2 + Math.sin(s.timeStep * 0.2 + index * 0.5) * 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        } else {
          // Surfaced - Draw huge frightening slithering segmented worm
          ctx.shadowBlur = index === 0 && s.worm.isFrenzied ? 8 : 0;
          ctx.shadowColor = '#red';

          // Outer leathery ring armor
          ctx.fillStyle = secondaryColor;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius, 0, Math.PI * 2);
          ctx.fill();

          // Inner segment detail
          ctx.fillStyle = wormColor;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius - 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Head features (Needle steel teeth circle detailing)
          if (index === 0) {
            // Mouth opening
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();

            // Searing red glowing eyes or mouth spike rotations
            ctx.fillStyle = '#fdba74';
            const toothRayCount = 6;
            for (let j = 0; j < toothRayCount; j++) {
              const toothAngle = (s.timeStep * 0.05) + (j * (Math.PI * 2)) / toothRayCount;
              const tx = sx + Math.cos(toothAngle) * 5.5;
              const ty = sy + Math.sin(toothAngle) * 5.5;
              ctx.beginPath();
              ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.shadowBlur = 0;
        }

        // Handle drawing the Fremen rider on top of segment if riding
        if (gameMode !== GameMode.WORM_SOLO && s.fremen.isRiding && s.fremen.rideSegmentIndex === index) {
          // Frame riding Fremen holding Maker Hooks
          ctx.fillStyle = '#0284c7'; // Rider cloak blue
          ctx.fillRect(seg.x * CELL_SIZE + 8, seg.y * CELL_SIZE + 4, 10, 10);
          
          // Maker hook steel lines
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(seg.x * CELL_SIZE + 13, seg.y * CELL_SIZE + 4);
          ctx.lineTo(seg.x * CELL_SIZE + 13, seg.y * CELL_SIZE - 6);
          ctx.stroke();

          // Spice glow eyes of the Fremen Lisan Al-Gaib
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(sx - 2, seg.y * CELL_SIZE + 6, 1, 0, Math.PI * 2);
          ctx.arc(sx + 2, seg.y * CELL_SIZE + 6, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // F2. DRAW SECOND SHAI-HULUD (PURPLE WORM FOR WORM RACES)
      if (isWormVsWormMatch) {
        const wormColor2 = '#a855f7'; // Purple colors
        const secondaryColor2 = '#6b21a8';

        s.worm2.segments.forEach((seg, index) => {
          const sx = seg.x * CELL_SIZE + CELL_SIZE / 2;
          const sy = seg.y * CELL_SIZE + CELL_SIZE / 2;

          const baseRadius = index === 0 ? 14 : Math.max(5, 12 - index * 0.35);

          ctx.fillStyle = secondaryColor2;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = wormColor2;
          ctx.beginPath();
          ctx.arc(sx, sy, baseRadius - 2.5, 0, Math.PI * 2);
          ctx.fill();

          if (index === 0) {
            // Mouth opening
            ctx.fillStyle = '#1c1917';
            ctx.beginPath();
            ctx.arc(sx, sy, 8, 0, Math.PI * 2);
            ctx.fill();

            // Searing gold rotating spike elements
            ctx.fillStyle = '#f59e0b';
            const toothRayCount = 6;
            for (let j = 0; j < toothRayCount; j++) {
              const toothAngle = (s.timeStep * 0.05) + (j * (Math.PI * 2)) / toothRayCount;
              const tx = sx + Math.cos(toothAngle) * 5.5;
              const ty = sy + Math.sin(toothAngle) * 5.5;
              ctx.beginPath();
              ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }

      // G. RESOLVE AND DRAW ACTIVE DUST PARTICLES
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1.0 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Floating HUD Overlay for Fremen Carried Spice
      if (gameMode !== GameMode.WORM_SOLO && s.fremen.spiceCarried > 0) {
        ctx.fillStyle = 'rgba(12, 10, 9, 0.85)';
        ctx.fillRect(12, 12, 160, 26);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, 160, 26);
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CARRIED: ${s.fremen.spiceCarried} kg`, 20, 28);
        
        // Blink a neat return arrow
        if (s.timeStep % 30 < 15) {
          ctx.fillStyle = '#10b981';
          ctx.fillText("⮞ SIETCH BASE", 102, 28);
        }
      }

      // Fremen-vs-Fremen: show separate thumper counts for both players
      const isFremenVsFremen = (gameMode === GameMode.LOCAL_VS && duelType === DuelType.FREMEN_VS_FREMEN) ||
                               (gameMode === GameMode.ONLINE_MULTIPLAYER && duelType === DuelType.FREMEN_VS_FREMEN);
      if (isFremenVsFremen) {
        ctx.fillStyle = 'rgba(12, 10, 9, 0.85)';
        ctx.fillRect(CANVAS_WIDTH - 214, 12, 202, 40);
        ctx.strokeStyle = '#57534e';
        ctx.lineWidth = 1;
        ctx.strokeRect(CANVAS_WIDTH - 214, 12, 202, 40);

        ctx.textAlign = 'left';
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#d6d3d1';
        ctx.fillText(`SILVER (WASD/Q) THUMPERS: ${Math.max(0, s.fremen.thumpersLeft)}`, CANVAS_WIDTH - 206, 27);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`GOLD (ARROWS/SPACE) THUMPERS: ${Math.max(0, s.fremen2.thumpersLeft)}`, CANVAS_WIDTH - 206, 43);
      }

      // Live Session HUD watermark in the lower corner of the tactical battlefield
      if (gameMode === GameMode.ONLINE_MULTIPLAYER) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(CANVAS_WIDTH - 210, CANVAS_HEIGHT - 22, 200, 16);
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#06b6d4';
        ctx.textAlign = 'right';
        ctx.fillText(`WAN: Room ${multiplayerRoomId} | Role: ${multiplayerRole === 'fremen' ? 'FREMEN' : 'WORM'}`, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 12);
      }

      // Worm-vs-Worm spice meters, shown during play and at match end
      if (isWormVsWormMatch) {
        const worm1Spice = s.worm.spiceEaten || 0;
        const worm2Spice = s.worm2.spiceEaten || 0;
        const maxSpice = Math.max(worm1Spice, worm2Spice, 1);
        const panelX = 16;
        const panelY = 44;
        const panelW = 220;
        const panelH = 42;

        ctx.fillStyle = 'rgba(12, 10, 9, 0.82)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('WORM SPICE', panelX + 10, panelY + 12);

        const drawBar = (label: string, value: number, color: string, y: number) => {
          ctx.fillStyle = '#44403c';
          ctx.fillRect(panelX + 10, y, 180, 8);
          ctx.fillStyle = color;
          ctx.fillRect(panelX + 10, y, Math.max(2, (value / maxSpice) * 180), 8);
          ctx.fillStyle = '#e7e5e4';
          ctx.font = 'bold 7px monospace';
          ctx.fillText(`${label}: ${value} spice`, panelX + 194, y + 7);
        };

        drawBar('ORANGE', worm1Spice, '#f97316', panelY + 18);
        drawBar('PURPLE', worm2Spice, '#a855f7', panelY + 30);
      }

      // Base translation restore
      ctx.restore();
    };

    // Begin Loop
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameMode]);

  return (
    <div className="relative flex flex-col items-center bg-stone-950 p-4 border-2 border-amber-950/60 rounded-xl max-w-full justify-center" id="game-canvas-container">
      {/* Game canvas window screen */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-stone-800 rounded-lg shadow-inner max-w-full bg-stone-900 cursor-none"
        id="arrakis-field"
      />

      {/* PAUSED screen overlay */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6 animate-fade-in" id="paused-overlay">
          <div className="flex flex-col items-center max-w-sm gap-2 animate-bounce-slow">
            <Compass className="w-12 h-12 text-amber-500" />
            <h3 className="text-2xl font-sans tracking-widest text-amber-500 font-bold uppercase mt-2">Dune Pause</h3>
            <p className="text-xs text-stone-400 leading-relaxed">The storm of Arrakis holds. Recalibrate your stillsuit water reserves and adjust your rhythm controls.</p>
          </div>
        </div>
      )}

      {/* Worm-vs-Worm result overlay */}
      {isWormVsWormMatch && (gameState === GameState.GAME_OVER_WORM_WON || gameState === GameState.GAME_OVER_FREMEN_WON) && (
        <div className="absolute inset-0 bg-stone-950/92 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6 animate-fade-in animate-duration-500" id="worm-duel-overlay">
          <div className="flex flex-col items-center max-w-md gap-4">
            <div className="w-20 h-20 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Swords className={`w-10 h-10 ${gameState === GameState.GAME_OVER_WORM_WON ? 'text-orange-500' : 'text-purple-400'}`} />
            </div>
            <div>
              <h3 className="text-3xl font-sans tracking-widest text-amber-400 font-bold uppercase">WORM DUEL RESULT</h3>
              <p className="text-xs text-stone-400 font-mono tracking-widest mt-1 uppercase">MOST SPICE COLLECTED WINS</p>
            </div>

            <div className="bg-stone-900 border border-stone-850 p-3 rounded text-sm font-mono w-full text-left">
              <div className="flex justify-between border-b border-stone-850 pb-1 w-full text-xs text-stone-500">
                <span>Orange Worm</span>
                <span className="text-orange-400 font-bold">{stateRef.current.worm.spiceEaten || 0} spice</span>
              </div>
              <div className="flex justify-between pt-1 w-full text-xs text-stone-500">
                <span>Purple Worm</span>
                <span className="text-purple-400 font-bold">{stateRef.current.worm2.spiceEaten || 0} spice</span>
              </div>
            </div>

            <p className="text-xs text-stone-400 px-6 leading-relaxed">
              {(stateRef.current.worm.spiceEaten || 0) >= (stateRef.current.worm2.spiceEaten || 0)
                ? 'Orange Worm collected the most spice before the clock expired.'
                : 'Purple Worm collected the most spice before the clock expired.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => {
                  initLevel();
                  onSetGameState(GameState.PLAYING);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-900 border border-amber-400/50 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-amber-500/10 flex-grow"
                id="worm-duel-rematch-btn"
              >
                <RotateCcw className="w-4 h-4" />
                Rematch
              </button>

              <button
                onClick={() => onResetGame?.()}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md flex-grow cursor-pointer"
                id="back-to-menu-overlay-btn"
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (Worm Eat Fremen) screen overlay */}
      {!isWormVsWormMatch && gameState === GameState.GAME_OVER_WORM_WON && (
        <div className="absolute inset-0 bg-stone-950/92 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6 animate-fade-in animate-duration-500" id="worm-won-overlay">
          <div className="flex flex-col items-center max-w-md gap-4">
            <div className="w-20 h-20 rounded-full bg-red-950/40 border border-red-500/50 flex items-center justify-center shadow-lg shadow-red-500/10">
              <Swords className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h3 className="text-3xl font-sans tracking-widest text-red-500 font-bold uppercase">WORM TRIUMPHED</h3>
              <p className="text-xs text-amber-600/80 font-mono tracking-widest mt-1 uppercase">SHAI-HULUD HAS RECLAIMED THE SANDS</p>
            </div>
            
            <p className="text-xs text-stone-400 px-6 leading-relaxed">
              {gameMode === GameMode.WORM_SOLO 
                ? "Excellent hunt, Maker! All Fremen spice harvesters have been devoured by your colossal maw. The sand is clean once again." 
                : "The Sandworm breached and devoured the Fremen harvester! Remember: never step with rhythm."}
            </p>

            <div className="bg-stone-900 border border-stone-850 p-3 rounded text-sm font-mono w-full">
              <div className="flex justify-between border-b border-stone-850 pb-1 w-full text-xs text-stone-500">
                <span>Final Harvest Score:</span>
                <span className="text-amber-400 font-bold">{score} pts</span>
              </div>
              <div className="flex justify-between pt-1 w-full text-xs text-stone-500">
                <span>Spice blows eaten:</span>
                <span className="text-stone-300 font-extrabold">{spiceCoins} spice</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => {
                  if (gameMode === GameMode.WORM_SOLO) {
                    onSetLevel(prev => prev + 1);
                  }
                  initLevel();
                  onSetGameState(GameState.PLAYING);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-900 border border-amber-400/50 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-amber-500/10 flex-grow"
                id="try-again-btn"
              >
                <RotateCcw className="w-4 h-4" />
                {gameMode === GameMode.WORM_SOLO ? "Advance to Next Hunt" : "Re-deploy Harvester"}
              </button>

              <button
                onClick={() => onResetGame?.()}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md flex-grow cursor-pointer"
                id="back-to-menu-overlay-btn"
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER (Fremen Harvest Escape) screen overlay */}
      {!isWormVsWormMatch && gameState === GameState.GAME_OVER_FREMEN_WON && (
        <div className="absolute inset-0 bg-stone-950/92 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6 animate-fade-in animate-duration-500" id="fremen-won-overlay">
          <div className="flex flex-col items-center max-w-md gap-4 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-amber-950/40 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
              <Compass className="w-10 h-10 text-amber-500 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-3xl font-sans tracking-widest text-emerald-400 font-bold uppercase">HARVEST COMPLETE</h3>
              <p className="text-xs text-amber-500 font-mono tracking-widest mt-1 uppercase">THE LISAN AL-GAIB SECURES THE SPICE</p>
            </div>
            
            <p className="text-xs text-stone-400 px-6 leading-relaxed">
              Incredible navigation! You harvested the required {spiceGoal} kg of pure Melange Spice and successfully dodged the tremors of Shai-Hulud. The Guild's tribute is satisfied.
            </p>

            <div className="bg-stone-900 border border-stone-850 p-3 rounded text-sm font-mono w-full">
              <div className="flex justify-between border-b border-stone-850 pb-1 w-full text-xs text-stone-500">
                <span>Final Harvest Score:</span>
                <span className="text-emerald-400 font-bold">{score + 500} pts</span>
              </div>
              <div className="flex justify-between pt-1 w-full text-xs text-stone-500">
                <span>Melange quota filled:</span>
                <span className="text-stone-300 font-extrabold">{spiceCoins} / {spiceGoal}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => {
                  if (gameMode === GameMode.FREMEN_SOLO) {
                    onSetLevel(prev => prev + 1);
                  }
                  initLevel();
                  onSetGameState(GameState.PLAYING);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-stone-900 border border-amber-400/50 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-amber-500/10 flex-grow"
                id="fremen-try-again-btn"
              >
                <RotateCcw className="w-4 h-4" />
                {gameMode === GameMode.FREMEN_SOLO ? "Advance to Next Sietch" : "Harvest Again"}
              </button>

              <button
                onClick={() => onResetGame?.()}
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md flex-grow cursor-pointer"
                id="back-to-menu-overlay-btn"
              >
                Return to Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
