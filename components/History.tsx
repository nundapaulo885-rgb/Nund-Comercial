import React from 'react';
import { Trade, TradeResult, TradeType } from '../types';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface HistoryProps {
  trades: Trade[];
}

export const History: React.FC<HistoryProps> = ({ trades }) => {
  return (
    <div className="bg-deriv-card rounded-xl border border-gray-800 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-bold text-gray-200">Histórico de Operações</h3>
        <span className="text-xs text-gray-500">{trades.length} Trades</span>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-[#0e0e0e] sticky top-0">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Entrada</th>
              <th className="px-4 py-3">Saída</th>
              <th className="px-4 py-3 text-right">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice().reverse().map((trade) => (
              <tr key={trade.id} className="border-b border-gray-800 hover:bg-[#1a1c1c]">
                <td className="px-4 py-3">
                    <div className="flex items-center">
                        {trade.type === TradeType.CALL ? (
                            <ArrowUpCircle className="w-4 h-4 text-deriv-green mr-2" />
                        ) : (
                            <ArrowDownCircle className="w-4 h-4 text-deriv-red mr-2" />
                        )}
                        <span className={trade.type === TradeType.CALL ? 'text-deriv-green' : 'text-deriv-red'}>
                            {trade.type}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3 font-mono">{trade.entryPrice.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono">
                  {trade.status === TradeResult.PENDING 
                    ? <span className="animate-pulse text-yellow-500">...</span> 
                    : trade.exitPrice?.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${
                  trade.profit > 0 ? 'text-deriv-green' : trade.profit < 0 ? 'text-deriv-red' : 'text-gray-500'
                }`}>
                  {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)} $
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-600">
                        Nenhuma operação realizada ainda.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};