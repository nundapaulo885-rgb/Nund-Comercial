export enum TradeType {
  CALL = 'CALL', // Compra/Sobe
  PUT = 'PUT'    // Venda/Desce
}

export enum TradeResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  PENDING = 'PENDING'
}

export enum StrategyType {
  AI_GEMINI = 'AI_GEMINI',
  RSI_REVERSAL = 'RSI_REVERSAL',
  SMA_CROSSOVER = 'SMA_CROSSOVER'
}

export interface Tick {
  time: number;
  price: number;
}

export interface Trade {
  id: string;
  type: TradeType;
  entryPrice: number;
  exitPrice?: number;
  stake: number;
  profit: number; // Positive or negative
  timestamp: number;
  status: TradeResult;
  strategyUsed: string;
}

export interface BotSettings {
  stake: number;
  takeProfit: number;
  stopLoss: number;
  asset: string; // e.g., "Volatility 100"
  strategy: StrategyType;
  derivToken: string;
}

export enum BotState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  TRADING = 'TRADING',
  STOPPED = 'STOPPED'
}