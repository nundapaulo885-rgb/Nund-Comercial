import React, { useState, useEffect, useRef } from 'react';
import { Chart } from './components/Chart';
import { TradePanel } from './components/TradePanel';
import { History } from './components/History';
import { analyzeMarketTrend } from './services/geminiService';
import { DerivService } from './services/derivService';
import { Tick, Trade, TradeType, TradeResult, BotSettings, BotState, StrategyType } from './types';
import { Wallet, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

const INITIAL_BALANCE = 10000.00;
const INITIAL_PRICE = 6350.50;

// Helper: Calculate RSI
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
};

// Helper: Calculate SMA
const calculateSMA = (prices: number[], period: number): number => {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
};

const App: React.FC = () => {
  // --- State ---
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [botState, setBotState] = useState<BotState>(BotState.IDLE);
  
  // Indicators
  const [rsi, setRsi] = useState(50);
  const [smaValues, setSmaValues] = useState({ fast: 0, slow: 0 });
  
  const [settings, setSettings] = useState<BotSettings>({
    stake: 50,
    takeProfit: 100,
    stopLoss: 50,
    asset: 'Volatility 100',
    strategy: StrategyType.AI_GEMINI,
    derivToken: ''
  });
  
  // AI Analysis State
  const [analysis, setAnalysis] = useState({
    recommendation: 'HOLD',
    reasoning: 'Inicializando sistemas...',
    confidence: 0
  });

  // Refs for logic loop
  const priceRef = useRef(INITIAL_PRICE);
  const activeTradeRef = useRef<Trade | null>(null);
  const ticksRef = useRef<Tick[]>([]);
  const settingsRef = useRef(settings);
  const derivServiceRef = useRef<DerivService | null>(null);
  
  // Sync refs with state
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // --- Trade Execution Helpers ---
  const executeTrade = (type: TradeType) => {
      if (activeTradeRef.current) return; // Only one trade at a time

      const currentPrice = priceRef.current;
      
      // If Real API is connected, send buy command
      if (derivServiceRef.current && settingsRef.current.derivToken) {
          derivServiceRef.current.buy(type, settingsRef.current.stake);
      }

      const newTrade: Trade = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          entryPrice: currentPrice,
          stake: settingsRef.current.stake,
          profit: 0,
          timestamp: Date.now(),
          status: TradeResult.PENDING,
          strategyUsed: settingsRef.current.strategy
      };

      activeTradeRef.current = newTrade;
  };

  const completeTrade = (trade: Trade, exitPrice: number, profit: number, result: TradeResult) => {
      const completedTrade = { ...trade, exitPrice, profit, status: result };
      setTrades(prev => [...prev, completedTrade]);
      setBalance(prev => prev + profit);
      activeTradeRef.current = null;
  };

  // --- Core Processing Loop (Handles both Real and Mock ticks) ---
  const processTick = (newTick: Tick) => {
      priceRef.current = newTick.price;
      
      setTicks(prev => {
        const updated = [...prev.slice(1), newTick]; // Keep last 60 ticks
        ticksRef.current = updated;
        return updated;
      });

      // Calculate Indicators
      const currentPrices = ticksRef.current.map(t => t.price);
      
      // RSI
      const currentRsi = calculateRSI(currentPrices);
      setRsi(currentRsi);

      // SMA
      const smaFast = calculateSMA(currentPrices, 5);
      const smaSlow = calculateSMA(currentPrices, 10);
      setSmaValues({ fast: smaFast, slow: smaSlow });

      // --- STRATEGY ENGINE ---
      if (botState === BotState.TRADING && !activeTradeRef.current) {
          
          // 1. RSI Reversal
          if (settingsRef.current.strategy === StrategyType.RSI_REVERSAL) {
              if (currentRsi > 75) executeTrade(TradeType.PUT);
              else if (currentRsi < 25) executeTrade(TradeType.CALL);
          }

          // 2. SMA Crossover
          if (settingsRef.current.strategy === StrategyType.SMA_CROSSOVER) {
              // Simple crossover logic: Check if fast crossed slow recently
              // We use simple condition: Fast > Slow = CALL context, but for crossover we need previous state.
              // For this simplified version, we trade if gap is small but divergent.
              if (smaFast > smaSlow && currentPrices[currentPrices.length-2] < smaSlow) {
                  executeTrade(TradeType.CALL); // Golden Cross
              } else if (smaFast < smaSlow && currentPrices[currentPrices.length-2] > smaSlow) {
                  executeTrade(TradeType.PUT); // Death Cross
              }
          }
      }

      // --- TRADE MANAGEMENT (For Mock Mode primarily, Real mode would rely on trade updates but we simulate result here for UI responsiveness if needed) ---
      if (activeTradeRef.current) {
        const trade = activeTradeRef.current;
        const duration = Date.now() - trade.timestamp;
        
        // Check for 5 second expiry (matches DerivService 5 tick duration roughly)
        if (duration > 5000) { 
             const priceDiff = newTick.price - trade.entryPrice;
             let profit = 0;
             let result = TradeResult.PENDING;

             if (trade.type === TradeType.CALL) {
                 profit = priceDiff > 0 ? trade.stake * 0.95 : -trade.stake;
             } else {
                 profit = priceDiff < 0 ? trade.stake * 0.95 : -trade.stake;
             }
             result = profit > 0 ? TradeResult.WIN : TradeResult.LOSS;
             
             completeTrade(trade, newTick.price, profit, result);
        }
      }
  };

  // --- Real vs Mock Data Source ---
  useEffect(() => {
      // Initialize Ticks
      const initialData: Tick[] = [];
      let p = INITIAL_PRICE;
      for (let i = 60; i > 0; i--) {
          p = p + (Math.random() - 0.5) * 2;
          initialData.push({ time: Date.now() - i * 1000, price: p });
      }
      setTicks(initialData);
      ticksRef.current = initialData;

      let mockInterval: any;

      if (settings.derivToken && (botState === BotState.TRADING || botState === BotState.ANALYZING || botState === BotState.IDLE)) {
          // REAL MODE: Connect to Deriv
          const service = new DerivService(
              settings.derivToken,
              (price, time) => {
                  processTick({ price, time });
              },
              (tradeData) => {
                  console.log("Real Trade Executed:", tradeData);
              }
          );
          service.connect();
          derivServiceRef.current = service;
      } else {
          // MOCK MODE: Simulation
          if (derivServiceRef.current) {
              derivServiceRef.current.disconnect();
              derivServiceRef.current = null;
          }

          mockInterval = setInterval(() => {
              const change = (Math.random() - 0.5) * 3;
              const newPrice = priceRef.current + change;
              processTick({ price: newPrice, time: Date.now() });
          }, 1000);
      }

      return () => {
          if (mockInterval) clearInterval(mockInterval);
          if (derivServiceRef.current) derivServiceRef.current.disconnect();
      };
  }, [botState === BotState.TRADING, settings.derivToken]); // Re-run if Trading starts or Token changes

  // --- AI Analysis Loop ---
  useEffect(() => {
    if (botState !== BotState.TRADING || settings.strategy !== StrategyType.AI_GEMINI) return;

    const runAnalysis = async () => {
      const prices = ticksRef.current.map(t => t.price);
      if (prices.length < 20) return;

      const result = await analyzeMarketTrend(prices);
      setAnalysis(result);

      if (result.confidence > 75 && !activeTradeRef.current) {
         if (result.recommendation === 'CALL') executeTrade(TradeType.CALL);
         if (result.recommendation === 'PUT') executeTrade(TradeType.PUT);
      }
    };

    const interval = setInterval(runAnalysis, 5000);
    runAnalysis();
    return () => clearInterval(interval);
  }, [botState, settings.strategy]);

  // --- Handlers ---
  const toggleBot = () => {
      if (botState === BotState.IDLE || botState === BotState.STOPPED) {
          setBotState(BotState.TRADING);
      } else {
          setBotState(BotState.STOPPED);
          activeTradeRef.current = null; 
      }
  };

  const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);

  return (
    <div className="min-h-screen bg-deriv-dark text-white flex flex-col font-sans">
      {/* Header */}
      <header className="bg-deriv-card border-b border-gray-800 p-4 sticky top-0 z-50 shadow-md">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-gradient-to-br from-deriv-red to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-900/30">
                N@
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight">Nund@Comercial</h1>
                <p className="text-xs text-gray-400">Deriv Automated Scalping</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-6">
             <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400">Status da Conexão</span>
                <span className="text-sm font-bold flex items-center">
                   {settings.derivToken ? (
                       <><Wifi className="w-4 h-4 mr-1 text-green-500" /> REAL API</>
                   ) : (
                       <><WifiOff className="w-4 h-4 mr-1 text-yellow-500" /> SIMULAÇÃO</>
                   )}
                </span>
             </div>
             <div className="h-8 w-px bg-gray-700 hidden md:block"></div>
             <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400">Saldo</span>
                <span className="text-xl font-mono font-bold text-white flex items-center">
                   <Wallet className="w-4 h-4 mr-2 text-deriv-green" />
                   ${balance.toFixed(2)}
                </span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Chart & Stats */}
        <div className="lg:col-span-8 space-y-6">
           <Chart data={ticks} />
           
           {/* Quick Stats Row */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block mb-1">Total Trades</span>
                  <span className="text-xl font-bold text-white">{trades.length}</span>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block mb-1">Lucro Total</span>
                   <span className={`text-xl font-bold ${totalProfit >= 0 ? 'text-deriv-green' : 'text-deriv-red'}`}>
                   {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(2)}
                </span>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block mb-1">Status</span>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${botState === BotState.TRADING ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-sm font-bold text-white uppercase">{botState}</span>
                  </div>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                 <span className="text-xs text-gray-500 block mb-1">Segurança</span>
                 <div className="flex items-center text-green-500">
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    <span className="text-sm font-bold">Ativa</span>
                 </div>
              </div>
           </div>

           {/* History Table */}
           <div className="h-64 lg:h-80">
               <History trades={trades} />
           </div>
        </div>

        {/* Right Column: Controls */}
        <div className="lg:col-span-4 h-full">
            <TradePanel 
                settings={settings}
                setSettings={setSettings}
                botState={botState}
                onToggleBot={toggleBot}
                aiAnalysis={analysis}
                rsiValue={rsi}
                smaValues={smaValues}
            />
        </div>

      </main>
      
      {/* Footer */}
      <footer className="p-4 text-center text-xs text-gray-600 border-t border-gray-900">
         <p>Nund@Comercial &copy; 2024. Plataforma de Scalping Automatizado.</p>
         <p className="mt-1 text-red-900/50">Atenção: O uso de API Real envolve risco financeiro real. Use com cautela.</p>
      </footer>
    </div>
  );
};

export default App;