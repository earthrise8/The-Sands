/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Position {
  x: number;
  y: number;
}

export enum GameMode {
  FREMEN_SOLO = 'FREMEN_SOLO', // Player controls Fremen, Worm is AI
  WORM_SOLO = 'WORM_SOLO',     // Player controls Worm, Fremens are AI
  LOCAL_VS = 'LOCAL_VS',        // Player 1 controls Fremen, Player 2 controls Worm
  ONLINE_MULTIPLAYER = 'ONLINE_MULTIPLAYER' // Online real-time multiplayer
}

export enum DuelType {
  FREMEN_VS_WORM = 'FREMEN_VS_WORM',
  FREMEN_VS_FREMEN = 'FREMEN_VS_FREMEN',
  WORM_VS_WORM = 'WORM_VS_WORM'
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER_WORM_WON = 'GAME_OVER_WORM_WON',
  GAME_OVER_FREMEN_WON = 'GAME_OVER_FREMEN_WON',
  HELP = 'HELP'
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface Thumper {
  x: number;
  y: number;
  life: number;       // Remaining lifespan in frames/ticks
  pulseRadius: number; // For expanding visual concentric circles
}

export interface SpiceBlow {
  id: string;
  x: number;
  y: number;
  amount: number; // Spice value: 1 to 5
  isMajor: boolean; // Gigantic spice blow
}

export interface FremenState {
  x: number;
  y: number;
  targetX: number; // For smooth interpolation
  targetY: number;
  lives: number;
  spiceCarried: number;
  spiceDeposited: number;
  noiseLevel: number; // 0 to 100. High noise attracts the worm.
  thumpersLeft: number;
  isRiding: boolean; // Is currently riding the worm!
  rideSegmentIndex: number;
  score: number;
  stepCooldown: number; // Cooldown between cell movements
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';
  invulnerableTime?: number; // Visual flash and hit immunity frames
}

export interface WormState {
  segments: Position[]; // Head is segments[0]
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  targetDirection: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  speed: number;
  diveActive: boolean; // Subsurface under the sand (immune to obstacles, can't eat normal spice easily)
  diveEnergy: number; // 0 to 100
  isFrenzied: boolean; // Driven wild by shield or thumpers
  frenzyTime: number; // Frames remaining of frenzy
}

export interface MatchConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
}
