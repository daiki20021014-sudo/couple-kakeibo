"use client";
import React from 'react';

type Props = {
  onSettle: () => void;
  diffAmount: number; // 貸し借りの額
};

export default function SettlementButton({ onSettle, diffAmount }: Props) {
  const isPlus = diffAmount >= 0;
  
  // 貸し借りがないときはボタンを表示しない
  if (diffAmount === 0) return null;

  return (
    <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-lg mt-6 text-center">
      <p className="text-xs text-slate-400 mb-1">現在の貸し借り状況</p>
      <p className="text-xl font-bold mb-3">
        {isPlus ? '相手から' : '相手に'} 
        <span className={isPlus ? 'text-emerald-400 mx-1' : 'text-rose-400 mx-1'}>
          ¥{Math.abs(diffAmount).toLocaleString()}
        </span>
        {isPlus ? 'もらう' : '支払う'}
      </p>
      <button 
        onClick={() => {
          if (window.confirm('これまでの貸し借りを「清算済み」にして、カウントを0にリセットしますか？')) {
            onSettle();
          }
        }}
        className="bg-white text-slate-900 text-xs font-bold px-6 py-2 rounded-full hover:bg-slate-200 transition-colors"
      >
        ✅ 清算してリセット
      </button>
    </div>
  );
}