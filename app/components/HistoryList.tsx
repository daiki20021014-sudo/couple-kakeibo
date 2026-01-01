"use client";
import React, { useState } from 'react';
import { format } from 'date-fns';

type Category = { name: string; icon: string };

type Props = {
  expenses: any[];
  users: any;
  categories: Category[]; // ★親から受け取る
  onEdit: (ex: any) => void;
  onDelete: (id: string) => void;
};

export default function HistoryList({ expenses, users, categories, onEdit, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExpenses = expenses.filter(ex => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
        ex.title?.toLowerCase().includes(term) ||
        ex.category?.includes(term) ||
        ex.note?.includes(term) || 
        ex.amount.toString().includes(term)
    );
  });

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between px-2">
         <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">- HISTORY -</h2>
         <div className="bg-white px-3 py-1 rounded-full border border-slate-100 flex items-center gap-2 w-40">
            <span className="text-xs">🔍</span>
            <input 
                type="text" 
                placeholder="検索..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs outline-none font-bold text-slate-600 bg-transparent"
            />
         </div>
      </div>

      {filteredExpenses.map((ex) => {
        const date = ex.date?.toDate();
        const dateStr = date ? format(date, 'M/d') : '';
        
        if (ex.type === 'settlement') {
            const payerName = users[ex.payerEmail]?.name || 'Payer';
            const receiverName = users[ex.category]?.name || 'Receiver';
            return (
                <div key={ex.id} className="bg-emerald-50 p-4 rounded-[20px] flex justify-between items-center border border-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shadow-sm border border-emerald-100">🤝</div>
                        <div>
                            <div className="flex items-center gap-1 font-bold text-sm text-emerald-800">
                                <span>{payerName}</span>
                                <span className="text-[8px] text-emerald-400">▶</span>
                                <span>{receiverName}</span>
                            </div>
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{dateStr} <span className="opacity-50">|</span> {ex.note}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-sm text-emerald-600">¥{ex.amount.toLocaleString()}</p>
                        <p className="text-[8px] text-emerald-400 mt-1">rec by {ex.userName}</p>
                    </div>
                </div>
            )
        }

        // 動的カテゴリからアイコンを探す
        const cat = categories.find(c => c.name === ex.category);
        const icon = cat ? cat.icon : "🐈";
        const payerIcon = users[ex.payerEmail]?.photo;
        const defaultIcon = "https://ui-avatars.com/api/?name=User";

        return (
          <div key={ex.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center shadow-sm border border-slate-50 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-lg">{icon}</div>
              <div>
                <p className="font-bold text-sm text-slate-700">{ex.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-bold">{dateStr}</p>
                    <span className="text-[8px] text-slate-300">|</span>
                    <img src={payerIcon || defaultIcon} className="w-3 h-3 rounded-full border border-slate-200" />
                    <span className="text-[9px] text-slate-400 font-bold">{users[ex.payerEmail]?.name}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-sm text-slate-700">¥{ex.amount.toLocaleString()}</p>
              <div className="flex justify-end gap-3 mt-1 opacity-20 hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(ex)}>✏️</button>
                <button onClick={() => onDelete(ex.id)}>🗑️</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}