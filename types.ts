export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  QTE = 'QTE',
  GAMEOVER = 'GAMEOVER',
  WON = 'WON'
}

export interface ObstacleData {
  id: number;
  x: number;
  width: number;
  height: number;
  passed: boolean;
}

export interface QteData {
  active: boolean;
  question: string;
  timeLeft: number;
}

export interface PhysicsState {
  horseY: number;
  horseVy: number;
  distance: number;
  isSitting: boolean;
  obstacles: ObstacleData[];
  qteTriggers: number[];
}