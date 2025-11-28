import React, { useState, useEffect, useRef } from 'react';
import { Chart } from './components/Chart';
import { TradePanel } from './components/TradePanel';
import { History } from './components/History';
import { analyzeMarketTrend } from './services/geminiService';
import { Tick, Trade, TradeType, TradeResult, BotSettings, BotState, StrategyType } from './types';
import { Wallet, ShieldCheck } from 'lucide-react';

const INITIAL_BALANCE = 10000.00;
const INITIAL_PRICE = 6350.50;

// Helper: Calculate RSI
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50; // Not enough data
  
  let gains = 0;
  let losses = 0;

  // Simple RSI calculation for last period
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
};

const App: React.FC = () => {
  // --- State ---
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [botState, setBotState] = useState<BotState>(BotState.IDLE);
  const [rsi, setRsi] = useState(50);
  
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
  
  // Sync refs with state
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // --- Mock Data Generator (Deriv Simulation) ---
  useEffect(() => {
    // Fill initial history
    const initialData: Tick[] = [];
    let currentPrice = INITIAL_PRICE;
    const now = Date.now();
    for (let i = 60; i > 0; i--) {
        currentPrice = currentPrice + (Math.random() - 0.5) * 2;
        initialData.push({ time: now - i * 1000, price: currentPrice });
    }
    setTicks(initialData);
    ticksRef.current = initialData;
    priceRef.current = currentPrice;

    const interval = setInterval(() => {
      // Random Walk Logic
      const change = (Math.random() - 0.5) * 3; // High volatility
      const newPrice = priceRef.current + change;
      const newTick: Tick = { time: Date.now(), price: newPrice };
      
      priceRef.current = newPrice;
      
      setTicks(prev => {
        const updated = [...prev.slice(1), newTick]; // Keep last 60 ticks
        ticksRef.current = updated;
        return updated;
      });

      // Update RSI for UI
      const currentPrices = ticksRef.current.map(t => t.price);
      const currentRsi = calculateRSI(currentPrices);
      setRsi(currentRsi);

      // --- STRATEGY 2: RSI REVERSAL LOGIC ---
      if (settingsRef.current.strategy === StrategyType.RSI_REVERSAL && 
          (botState === BotState.TRADING) && 
          !activeTradeRef.current) {
          
          if (currentRsi > 75) {
             executeTrade(TradeType.PUT); // Overbought -> Sell
          } else if (currentRsi < 25) {
             executeTrade(TradeType.CALL); // Oversold -> Buy
          }
      }

      // Check Active Trade Outcome (Scalping Logic - Fast expiry)
      if (activeTradeRef.current) {
        const trade = activeTradeRef.current;
        const priceDiff = newPrice - trade.entryPrice;
        let result = TradeResult.PENDING;
        let profit = 0;

        const duration = Date.now() - trade.timestamp;
        
        if (duration > 3000) { // 3 seconds scalping
             if (trade.type === TradeType.CALL) {
                 profit = priceDiff > 0 ? trade.stake * 0.95 : -trade.stake;
             } else {
                 profit = priceDiff < 0 ? trade.stake * 0.95 : -trade.stake;
             }
             result = profit > 0 ? TradeResult.WIN : TradeResult.LOSS;
        }

        if (result !== TradeResult.PENDING) {
            completeTrade(trade, newPrice, profit, result);
        }
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [botState]); // Re-bind if botState changes, though refs handle most

  // --- Trading Logic Helper ---
  const completeTrade = (trade: Trade, exitPrice: number, profit: number, result: TradeResult) => {
      const completedTrade = { ...trade, exitPrice, profit, status: result };
      
      setTrades(prev => [...prev, completedTrade]);
      setBalance(prev => prev + profit); // If profit negative, it subtracts
      activeTradeRef.current = null;
  };

  const executeTrade = (type: TradeType) => {
      if (activeTradeRef.current) return; // Only one trade at a time

      const currentPrice = priceRef.current;
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

  // --- AI Analysis Loop (Only if AI Strategy Selected) ---
  useEffect(() => {
    if (botState !== BotState.TRADING) return;
    
    // Only run this effect loop if strategy is AI
    if (settings.strategy !== StrategyType.AI_GEMINI) return;

    const runAnalysis = async () => {
      // Get prices from ref
      const prices = ticksRef.current.map(t => t.price);
      if (prices.length < 20) return;

      const result = await analyzeMarketTrend(prices);
      setAnalysis(result);

      // Auto-Trade Decision for AI
      if (result.confidence > 70 && !activeTradeRef.current) {
         if (result.recommendation === 'CALL') executeTrade(TradeType.CALL);
         if (result.recommendation === 'PUT') executeTrade(TradeType.PUT);
      }
    };

    // Run analysis every 5 seconds
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
          activeTradeRef.current = null; // Force close pending logic in real app
      }
  };

  // Calculate session stats
  const totalProfit = trades.reduce((acc, t) => acc + t.profit, 0);
  const winRate = trades.length > 0 
    ? (trades.filter(t => t.status === TradeResult.WIN).length / trades.length) * 100 
    : 0;

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
                <span className="text-xs text-gray-400">Saldo Disponível</span>
                <span className="text-xl font-mono font-bold text-white flex items-center">
                   <Wallet className="w-4 h-4 mr-2 text-deriv-green" />
                   ${balance.toFixed(2)}
                </span>
             </div>
             <div className="h-8 w-px bg-gray-700 hidden md:block"></div>
             <div className="flex flex-col items-end hidden md:flex">
                <span className="text-xs text-gray-400">Lucro Sessão</span>
                <span className={`text-sm font-mono font-bold ${totalProfit >= 0 ? 'text-deriv-green' : 'text-deriv-red'}`}>
                   {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(2)}
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
                  <span className="text-xs text-gray-500 block mb-1">Win Rate</span>
                  <span className="text-xl font-bold text-white">{winRate.toFixed(1)}%</span>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block mb-1">Total Trades</span>
                  <span className="text-xl font-bold text-white">{trades.length}</span>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                  <span className="text-xs text-gray-500 block mb-1">Status</span>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${botState === BotState.TRADING ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                    <span className="text-sm font-bold text-white uppercase">{botState}</span>
                  </div>
              </div>
              <div className="bg-deriv-card p-4 rounded-xl border border-gray-800">
                 <span className="text-xs text-gray-500 block mb-1">Proteção</span>
                 <div className="flex items-center text-green-500">
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    <span className="text-sm font-bold">Ativa</span>
                 </div>
              </div>
           </div>

           {/* History Table (Desktop/Tablet view, fits in column) */}
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
            />
        </div>

      </main>
      
      {/* Footer */}
      <footer className="p-4 text-center text-xs text-gray-600 border-t border-gray-900">
         <p>Nund@Comercial &copy; 2024. Ferramenta de automação simulada para fins educacionais.</p>
         <p className="mt-1">Operar em mercados financeiros envolve riscos. API Key necessária para funcionalidade AI.</p>
      </footer>
    </div>
  );
};

export default App;