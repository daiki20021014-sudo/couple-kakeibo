"use client";
import React from 'react';

type Props = {
  budget: number; // 目標予算
  totalExpense: number; // 今月の出費合計
};

export default function BudgetCard({ budget, totalExpense }: Props) {
  // 予算が0（未設定）のときは表示しない
  if (budget === 0) return null;

  const remaining = budget - totalExpense;
  const percent = Math.min(100, Math.max(0, (totalExpense / budget) * 100));
  
  // 今日の日付から「今月残り日数」を計算
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - today.getDate() + 1;
  const dailyBudget = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;

  // 予算の消費具合で色を変える
  let statusColor = "bg-emerald-400"; // 余裕
  if (percent > 50) statusColor = "bg-yellow-400"; // 半分超えた
  if (percent > 80) statusColor = "bg-orange-400"; // ピンチ
  if (percent >= 100) statusColor = "bg-rose-500"; // オーバー

  return (
    <div className="bg-white p-6 rounded-[30px] shadow-lg shadow-emerald-100/50 border border-emerald-50 mb-6 relative overflow-hidden">
      <div className="flex justify-between items-end mb-2 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remaining Budget</p>
          <p className={`text-3xl font-black tracking-tighter ${remaining < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
             ¥{remaining.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
           <p className="text-[10px] font-bold text-slate-400">Target: ¥{budget.toLocaleString()}</p>
           <p className="text-[10px] font-bold text-slate-400">{Math.round(percent)}% Used</p>
        </div>
      </div>

      {/* ゲージバー */}
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-3 relative z-10">
        <div 
          className={`h-full ${statusColor} transition-all duration-1000 ease-out relative`} 
          style={{ width: `${percent}%` }}
        >
            {percent >= 100 && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
        </div>
      </div>

      {/* 1日あたりの目安 */}
      {remaining > 0 && (
          <div className="bg-emerald-50 rounded-xl p-2 text-center relative z-10">
             <p className="text-[10px] font-bold text-emerald-600">
                あと{daysLeft}日 ➡ 1日あたり <span className="text-lg">¥{dailyBudget.toLocaleString()}</span> 使えます
             </p>
          </div>
      )}
      
      {/* 背景装飾 */}
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 ${statusColor}`}></div>
    </div>
  );
}