"use client";
import React from 'react';

type Props = {
  stats: any;
  currentUserEmail: string;
  onOpenSettleModal: () => void;
};

export default function BalanceStatus({ stats, currentUserEmail, onOpenSettleModal }: Props) {
  // 1. 自分と相手の特定
  const myData = stats.users[currentUserEmail];
  const partnerEmail = Object.keys(stats.users).find(e => e !== currentUserEmail);
  const partnerData = partnerEmail ? stats.users[partnerEmail] : null;

  if (!myData || !partnerData) return null;

  // 2. 貸し借りの計算 (正の値なら「受け取る」、負の値なら「支払う」)
  // 計算式: (自分が払った - 自分の負担額) + (返済した - 受け取った)
  const myBalance = (myData.paid - myData.shouldPay) + (myData.repaid - myData.received);
  const isPlus = myBalance >= 0; // 自分がプラス（受け取る側）か？
  const amount = Math.abs(myBalance);

  // 3. 表示用の変数整理
  // receiver: お金を受け取る人（矢印の先）
  // payer: お金を払う人（矢印の元）
  const receiverData = isPlus ? myData : partnerData;
  const payerData = isPlus ? partnerData : myData;

  // 4. 支払い比較バーの計算
  const totalPaid = myData.paid + partnerData.paid;
  const myBarPercent = totalPaid > 0 ? (myData.paid / totalPaid) * 100 : 50;

  // デフォルトアイコン
  const defaultIcon = "https://ui-avatars.com/api/?name=User&background=random";

  return (
    <div className="space-y-6 mb-8">
      
      {/* ① 直感的な矢印カード（貸し借りがある場合のみ表示） */}
      {amount > 0 ? (
        <div className="bg-white rounded-[30px] p-6 shadow-xl shadow-pink-100/50 border-2 border-slate-50 relative overflow-hidden">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            SETTLEMENT STATUS
          </p>
          
          <div className="flex items-center justify-between relative z-10">
            {/* 払う人（Payer） */}
            <div className="flex flex-col items-center w-20">
              <div className="relative">
                <img src={payerData.photo || defaultIcon} className="w-14 h-14 rounded-full border-4 border-slate-100 grayscale-[30%]" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">PAYER</span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-2 truncate max-w-full">{payerData.name || 'Partner'}</p>
            </div>

            {/* 中央の矢印と金額 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-slate-100 rounded-full relative overflow-hidden">
                {/* 動く矢印アニメーション */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-pink-300 to-transparent animate-shimmer"></div>
              </div>
              <div className="bg-pink-50 text-pink-500 font-black text-xl py-1 px-4 rounded-xl shadow-sm -mt-3.5 z-10 transform scale-110">
                ¥{amount.toLocaleString()}
              </div>
              <p className="text-[9px] font-bold text-pink-300 mt-1 animate-pulse">送る ➡</p>
            </div>

            {/* 受け取る人（Receiver） */}
            <div className="flex flex-col items-center w-20">
              <div className="relative">
                <img src={receiverData.photo || defaultIcon} className="w-14 h-14 rounded-full border-4 border-pink-200 shadow-lg shadow-pink-100" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">RECEIVER</span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-2 truncate max-w-full">{receiverData.name || 'Me'}</p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="mt-6">
            <button 
              onClick={onOpenSettleModal}
              className={`w-full py-3 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2
                ${!isPlus ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white border-2 border-pink-100 text-pink-400 hover:bg-pink-50'}`}
            >
              {!isPlus ? '💸 返済を記録する' : '📩 返済を催促する（冗談）'}
            </button>
            {!isPlus && <p className="text-[9px] text-center text-slate-400 mt-2">※ あなたが払う側です</p>}
             {isPlus && <button onClick={onOpenSettleModal} className="w-full mt-2 text-[10px] text-slate-400 underline">（または返済を受け取った記録をする）</button>}
          </div>
        </div>
      ) : (
        /* 貸し借りなしの場合 */
        <div className="bg-white/50 p-6 rounded-[30px] border border-slate-100 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-sm font-bold text-slate-600">現在、貸し借ちはありません！</p>
            <p className="text-xs text-slate-400">平和です。</p>
        </div>
      )}

      {/* ② 支払い比較バー（どちらが多く負担しているか） */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-50">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2">
            <span>YOUR PAYMENT</span>
            <span>PARTNER PAYMENT</span>
        </div>
        <div className="flex items-end justify-between mb-1">
             <span className="text-lg font-black text-slate-700">¥{myData.paid.toLocaleString()}</span>
             <span className="text-lg font-black text-slate-700">¥{partnerData.paid.toLocaleString()}</span>
        </div>
        
        {/* 比較バー */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
                className="h-full bg-gradient-to-r from-blue-300 to-blue-400" 
                style={{ width: `${myBarPercent}%` }}
            ></div>
            <div 
                className="h-full bg-gradient-to-r from-pink-300 to-pink-400" 
                style={{ width: `${100 - myBarPercent}%` }}
            ></div>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-2">
            支出の割合: あなた {Math.round(myBarPercent)}% / 相手 {Math.round(100 - myBarPercent)}%
        </p>
      </div>
    </div>
  );
}