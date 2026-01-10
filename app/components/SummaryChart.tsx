import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#FF80AB', '#FFB74D', '#4FC3F7', '#AED581', '#BA68C8', '#90A4AE', '#E0E0E0'];

export default function SummaryChart({ expenses }: { expenses: any[] }) {
  // カテゴリごとの集計
  const data = React.useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;

    expenses.forEach((ex) => {
      if (ex.type === 'settlement') return;
      const cat = ex.category || 'その他';
      const current = map.get(cat) || 0;
      map.set(cat, current + ex.amount);
      total += ex.amount;
    });

    // 金額が大きい順にソート
    return Array.from(map.entries())
      .map(([name, value], index) => ({
        name,
        value,
        percent: total === 0 ? 0 : Math.round((value / total) * 100),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 mt-4">
      <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Category Ratio</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-6">
        
        {/* 左側：ドーナツグラフ */}
        <div className="w-40 h-40 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                </Pie>
                {/* ↓ここを修正しました（型エラー対策） */}
                <Tooltip 
                    formatter={(value: any) => `¥${Number(value).toLocaleString()}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
            </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-gray-300">TOTAL</span>
            </div>
        </div>

        {/* 右側（スマホでは下）：詳細リスト */}
        <div className="w-full space-y-3">
            {data.map((item) => (
                <div key={item.name} className="flex items-center justify-between w-full text-sm group">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-bold text-slate-600">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{item.percent}%</span>
                        <span className="font-bold text-slate-700 w-16 text-right">¥{item.value.toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}