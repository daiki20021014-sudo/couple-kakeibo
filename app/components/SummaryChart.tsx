"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#FF6699', '#8884d8'];

type Props = {
  expenses: any[];
};

export default function SummaryChart({ expenses }: Props) {
  // カテゴリごとの合計を計算
  const data = React.useMemo(() => {
    const map = new Map();
    expenses.forEach(ex => {
      const current = map.get(ex.category) || 0;
      map.set(ex.category, current + ex.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-50 mb-6">
      <h3 className="text-center text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">CATEGORY RATIO</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {/* ★修正: value: number を value: any に変更してエラー回避 */}
            <Tooltip formatter={(value: any) => `¥${Number(value).toLocaleString()}`} />
            <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}