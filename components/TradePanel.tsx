import React, { useState } from 'react';
import { BotSettings, BotState, StrategyType } from '../types';
import { Play, Square, Settings2, Activity, Link as LinkIcon, Lock, Globe, Zap, BarChart2, TrendingUp } from 'lucide-react';

interface TradePanelProps {
  settings: BotSettings;
  setSettings: React.Dispatch<React.SetStateAction<BotSettings>>;
  botState: BotState;
  onToggleBot: () => void;
  aiAnalysis: { recommendation: string; reasoning: string; confidence: number };
  rsiValue: number;
  smaValues: { fast: number; slow: number };
}

type Tab = 'run' | 'config' | 'connection';

export const TradePanel: React.FC<TradePanelProps> = ({ 
  settings, 
  setSettings, 
  botState, 
  onToggleBot,
  aiAnalysis,
  rsiValue,
  smaValues
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('run');
  const isRunning = botState === BotState.TRADING || botState === BotState.ANALYZING;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof BotSettings) => {
    const value = field === 'stake' || field === 'takeProfit' || field === 'stopLoss' 
      ? parseFloat(e.target.value) 
      : e.target.value;
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const getStrategyIcon = (type: StrategyType) => {
    switch(type) {
        case StrategyType.AI_GEMINI: return <Zap className="w-5 h-5 text-yellow-400 mr-2" />;
        case StrategyType.RSI_REVERSAL: return <BarChart2 className="w-5 h-5 text-blue-400 mr-2" />;
        case StrategyType.SMA_CROSSOVER: return <TrendingUp className="w-5 h-5 text-purple-400 mr-2" />;
    }
  };

  const getStrategyName = (type: StrategyType) => {
    switch(type) {
        case StrategyType.AI_GEMINI: return "IA Gemini Scalper";
        case StrategyType.RSI_REVERSAL: return "RSI Reversal";
        case StrategyType.SMA_CROSSOVER: return "SMA Crossover";
    }
  };

  return (
    <div className="bg-deriv-card rounded-xl border border-gray-800 flex flex-col h-full overflow-hidden">
      
      {/* Tabs Header */}
      <div className="flex border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('run')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center ${activeTab === 'run' ? 'text-white border-b-2 border-deriv-red bg-[#1a1c1c]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Activity className="w-4 h-4 mr-2" /> Operar
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center ${activeTab === 'config' ? 'text-white border-b-2 border-deriv-red bg-[#1a1c1c]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Settings2 className="w-4 h-4 mr-2" /> Ajustes
        </button>
        <button 
          onClick={() => setActiveTab('connection')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center ${activeTab === 'connection' ? 'text-white border-b-2 border-deriv-red bg-[#1a1c1c]' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Globe className="w-4 h-4 mr-2" /> Conexão
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        
        {/* TAB 1: OPERAR (RUN) */}
        {activeTab === 'run' && (
          <div className="flex flex-col h-full animate-fadeIn">
            <div className="mb-6 text-center">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Estratégia Ativa</span>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center justify-center">
                {getStrategyIcon(settings.strategy)}
                {getStrategyName(settings.strategy)}
              </h3>
            </div>

            {/* Status Display based on Strategy */}
            <div className="mb-6 p-4 bg-[#0e0e0e] rounded border border-gray-800 flex-1 relative overflow-hidden flex flex-col justify-center">
              {settings.strategy === StrategyType.AI_GEMINI && (
                <>
                  <div className="flex items-center justify-between mb-2 w-full">
                    <span className="text-sm font-semibold text-gray-300">Análise IA</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${aiAnalysis.confidence > 70 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      Conf: {aiAnalysis.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-4 h-16 overflow-y-auto w-full">
                    {aiAnalysis.reasoning || "Aguardando dados de mercado para análise..."}
                  </div>
                  <div className="flex items-center justify-between mt-auto border-t border-gray-800 pt-3 w-full">
                      <span className="text-xs text-gray-500">Recomendação:</span>
                      <span className={`text-lg font-bold ${
                          aiAnalysis.recommendation === 'CALL' ? 'text-deriv-green' : 
                          aiAnalysis.recommendation === 'PUT' ? 'text-deriv-red' : 'text-gray-400'
                      }`}>
                          {aiAnalysis.recommendation}
                      </span>
                  </div>
                </>
              )}

              {settings.strategy === StrategyType.RSI_REVERSAL && (
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <div className="text-4xl font-mono font-bold text-gray-200 mb-2">
                    {rsiValue.toFixed(1)}
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-widest mb-4">Valor RSI (14)</span>
                  
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full transition-all duration-500 ${rsiValue > 70 ? 'bg-deriv-red' : rsiValue < 30 ? 'bg-deriv-green' : 'bg-blue-500'}`} 
                      style={{ width: `${rsiValue}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full text-[10px] text-gray-500 mt-1 px-1">
                    <span>0</span>
                    <span>30</span>
                    <span>70</span>
                    <span>100</span>
                  </div>
                </div>
              )}

              {settings.strategy === StrategyType.SMA_CROSSOVER && (
                 <div className="flex flex-col items-center justify-center h-full w-full space-y-4">
                    <div className="grid grid-cols-2 gap-4 w-full text-center">
                        <div className="bg-[#1a1c1c] p-2 rounded">
                            <span className="block text-[10px] text-gray-500 uppercase">SMA (5)</span>
                            <span className="text-lg font-mono text-deriv-green">{smaValues.fast.toFixed(2)}</span>
                        </div>
                        <div className="bg-[#1a1c1c] p-2 rounded">
                            <span className="block text-[10px] text-gray-500 uppercase">SMA (10)</span>
                            <span className="text-lg font-mono text-deriv-red">{smaValues.slow.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                        {smaValues.fast > smaValues.slow ? (
                            <span className="text-deriv-green flex items-center justify-center"><TrendingUp className="w-3 h-3 mr-1" /> Tendência de Alta</span>
                        ) : (
                            <span className="text-deriv-red flex items-center justify-center"><TrendingUp className="w-3 h-3 mr-1 transform rotate-180" /> Tendência de Baixa</span>
                        )}
                    </div>
                 </div>
              )}
            </div>

            <button
              onClick={onToggleBot}
              className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all shadow-lg mt-auto ${
                isRunning 
                  ? 'bg-deriv-red hover:bg-red-600 text-white shadow-red-900/20' 
                  : 'bg-deriv-green hover:bg-emerald-600 text-white shadow-green-900/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-5 h-5 mr-2 fill-current" /> PAUSAR OPERAÇÃO
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2 fill-current" /> INICIAR ROBÔ
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: CONFIG (AJUSTES) */}
        {activeTab === 'config' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wide mb-2">Estratégia Operacional</label>
              <select 
                value={settings.strategy}
                onChange={(e) => handleInputChange(e as any, 'strategy')}
                disabled={isRunning}
                className="w-full bg-[#0e0e0e] border border-gray-700 rounded p-3 text-white focus:border-deriv-green focus:outline-none disabled:opacity-50"
              >
                <option value={StrategyType.AI_GEMINI}>🤖 IA Gemini (Scalping)</option>
                <option value={StrategyType.RSI_REVERSAL}>📊 RSI Reversal (Contra-Tendência)</option>
                <option value={StrategyType.SMA_CROSSOVER}>📈 SMA Crossover (Seguidor de Tendência)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">Valor da Entrada (Stake)</label>
              <div className="relative">
                 <input 
                  type="number" 
                  value={settings.stake}
                  onChange={(e) => handleInputChange(e, 'stake')}
                  disabled={isRunning}
                  className="w-full bg-[#0e0e0e] border border-gray-700 rounded p-3 text-white focus:border-deriv-red focus:outline-none transition-colors"
                />
                <span className="absolute right-3 top-3 text-gray-500">$</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">Take Profit</label>
                <input 
                  type="number" 
                  value={settings.takeProfit}
                  onChange={(e) => handleInputChange(e, 'takeProfit')}
                  className="w-full bg-[#0e0e0e] border border-gray-700 rounded p-3 text-deriv-green focus:border-deriv-green focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1">Stop Loss</label>
                <input 
                  type="number" 
                  value={settings.stopLoss}
                  onChange={(e) => handleInputChange(e, 'stopLoss')}
                  className="w-full bg-[#0e0e0e] border border-gray-700 rounded p-3 text-deriv-red focus:border-deriv-red focus:outline-none"
                />
              </div>
            </div>
            
            <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-200">
              <p>Nota: Alterações de gerenciamento de risco (TP/SL) são aplicadas em tempo real.</p>
            </div>
          </div>
        )}

        {/* TAB 3: CONNECTION (DERIV) */}
        {activeTab === 'connection' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center mb-3">
                 <img src="https://static.deriv.com/logos/deriv-icon-red.svg" alt="Deriv" className="w-10 h-10" onError={(e) => {
                    // Fallback se a imagem não carregar
                    (e.target as HTMLImageElement).style.display = 'none';
                 }} />
                 <span className="text-deriv-red font-bold text-xl" style={{display: 'none'}}>D</span>
              </div>
              <h4 className="font-bold text-white">Conexão Deriv API</h4>
              <p className="text-xs text-gray-500">
                  {settings.derivToken ? <span className="text-deriv-green">Token Configurado</span> : "Conecte sua conta para operar REAL"}
              </p>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wide mb-1 flex items-center">
                <Lock className="w-3 h-3 mr-1" /> Deriv API Token
              </label>
              <input 
                type="password" 
                value={settings.derivToken}
                onChange={(e) => handleInputChange(e, 'derivToken')}
                placeholder="Insira seu token..."
                className="w-full bg-[#0e0e0e] border border-gray-700 rounded p-3 text-white focus:border-deriv-red focus:outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">O token é salvo apenas localmente. Deixe em branco para modo SIMULAÇÃO.</p>
            </div>

            <a 
              href="https://app.deriv.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full"
            >
              <button className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-white font-semibold transition-all flex items-center justify-center">
                <LinkIcon className="w-4 h-4 mr-2" />
                Ir para Plataforma Deriv
              </button>
            </a>
            
            <div className="mt-auto pt-6 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Instruções:</p>
                <ol className="text-xs text-gray-400 list-decimal pl-4 space-y-1">
                    <li>Acesse sua conta Deriv.</li>
                    <li>Vá em Configurações &gt; API Token.</li>
                    <li>Crie um token com permissão "Read" e "Trade".</li>
                    <li>Cole acima para habilitar o modo REAL.</li>
                </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};