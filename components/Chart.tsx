import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip, XAxis } from 'recharts';
import { Tick } from '../types';

interface ChartProps {
  data: Tick[];
}

export const Chart: React.FC<ChartProps> = ({ data }) => {
  // Calculate min/max for Y-axis domain to make the chart look dynamic
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices) - 0.5;
  const maxPrice = Math.max(...prices) + 0.5;

  return (
    <div className="w-full h-64 md:h-96 bg-deriv-card rounded-xl border border-gray-800 p-4 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <span className="text-gray-400 text-sm">Ativo:</span>
        <span className="text-white font-bold tracking-wider">Volatility 100 (1s)</span>
        <span className="bg-deriv-green/20 text-deriv-green text-xs px-2 py-0.5 rounded animate-pulse">LIVE</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00a79e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00a79e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            hide={true} 
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            hide={false} 
            orientation="right"
            tick={{fill: '#6b7280', fontSize: 10}}
            tickFormatter={(value) => value.toFixed(2)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
            itemStyle={{ color: '#00a79e' }}
            formatter={(value: number) => [value.toFixed(4), "Preço"]}
            labelFormatter={() => ''}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#00a79e" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            isAnimationActive={false} // Disable animation for smoother tick updates
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};