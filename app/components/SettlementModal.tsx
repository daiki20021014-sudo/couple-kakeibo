"use client";
import React, { useState, useEffect } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSettle: (amount: number, method: string, payerEmail: string) => void;
  maxAmount: number; 
  users: any;
  currentUserEmail: string;
  partnerEmail: string;
};

export default function SettlementModal({ isOpen, onClose, onSettle, maxAmount, users, currentUserEmail, partnerEmail }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("現金");
  const [payer, setPayer] = useState(currentUserEmail);

  useEffect(() => {
    if (isOpen) {
      setAmount(Math.abs(maxAmount).toString());
      setMethod("現金");
      if (maxAmount > 0) {
        setPayer(partnerEmail);
      } else {
        setPayer(currentUserEmail);
      }
    }
  }, [isOpen, maxAmount, currentUserEmail, partnerEmail]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSettle(Number(amount), method, payer);
  };

  const receiver = payer === currentUserEmail ? partnerEmail : currentUserEmail;

  // ★画像がない時のためのデフォルトアイコンURL
  const defaultIcon = "https://ui-avatars.com/api/?name=User&background=random";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[30px] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-center font-bold text-lg text-slate-700 mb-4">💸 返済を記録</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-center text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-widest">WHO PAID?</p>
            <div className="flex items-center justify-between px-2">
                {/* 支払う人 */}
                <div className="flex flex-col items-center gap-1 w-20">
                    {/* ★修正: 空文字ではなく defaultIcon を使う */}
                    <img src={users[payer]?.photo || defaultIcon} className="w-12 h-12 rounded-full border-2 border-emerald-400 shadow-sm" />
                    <p className="text-[10px] font-bold text-slate-700 truncate w-full text-center">{users[payer]?.name || 'Payer'}</p>
                </div>

                <button 
                    type="button"
                    onClick={() => setPayer(receiver)}
                    className="flex-1 mx-2 bg-white border border-slate-200 rounded-full h-8 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 transition-all group"
                >
                    <span className="font-black text-xs group-hover:scale-110 transition-transform">➡ 送る ➡</span>
                </button>

                {/* 受け取る人 */}
                <div className="flex flex-col items-center gap-1 w-20 opacity-60">
                    {/* ★修正: 空文字ではなく defaultIcon を使う */}
                    <img src={users[receiver]?.photo || defaultIcon} className="w-10 h-10 rounded-full border-2 border-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 truncate w-full text-center">{users[receiver]?.name || 'Receiver'}</p>
                </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 ml-2">金額</label>
            <div className="relative">
                <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl font-black text-2xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 text-center"
                placeholder="0"
                required 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">円</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 ml-2">方法</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['現金', 'PayPay', 'LINE Pay', '振込', 'その他'].map(m => (
                <button 
                  key={m} 
                  type="button" 
                  onClick={() => setMethod(m)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${method === m ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95">
            この内容で記録する ✅
          </button>
        </form>

        <button onClick={onClose} className="w-full mt-4 text-xs font-bold text-slate-400 py-2 hover:text-slate-600">
          やめる
        </button>
      </div>
    </div>
  );
}