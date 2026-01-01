"use client";
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// ★変更点: ここにあった CATEGORIES 定数を削除

type Category = { name: string; icon: string };

type Props = {
  user: any;
  users: any;
  categories: Category[]; // ★親から受け取る
  onSubmit: (data: any) => Promise<void>;
  editingData?: any;
  onCancelEdit?: () => void;
};

export default function ExpenseForm({ user, users, categories, onSubmit, editingData, onCancelEdit }: Props) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  // 初期値は受け取ったカテゴリの先頭にする
  const [categoryName, setCategoryName] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'full' | 'half' | 'ratio'>('full');
  const [myRatio, setMyRatio] = useState("50");
  const [payerEmail, setPayerEmail] = useState(user?.email || "");

  // カテゴリ一覧が変わったら初期値をセット
  useEffect(() => {
    if (categories.length > 0 && !categoryName) {
        setCategoryName(categories[0].name);
    }
  }, [categories]);

  useEffect(() => {
    if (editingData) {
      setTitle(editingData.title);
      setAmount(editingData.amount.toString());
      setCategoryName(editingData.category);
      const d = editingData.date?.toDate();
      if(d) setDateStr(d.toISOString().split('T')[0]);
      setSplitType(editingData.splitType || 'full');
      setMyRatio(editingData.myRatio?.toString() || "50");
      setPayerEmail(editingData.payerEmail || user?.email);
    } else {
      setPayerEmail(user?.email || "");
    }
  }, [editingData, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    const selectedDate = new Date(dateStr);
    selectedDate.setHours(12, 0, 0, 0);

    const data = {
      title,
      amount: Number(amount),
      // もしカテゴリが削除されていても、そのまま保存するか、デフォルトにするか。ここではそのまま保存。
      category: categoryName || (categories[0]?.name || "その他"), 
      splitType,
      myRatio: splitType === 'ratio' ? Number(myRatio) : (splitType === 'half' ? 50 : 100),
      date: selectedDate,
      payerEmail: payerEmail,
    };

    await onSubmit(data);
    
    if (!editingData) {
      setTitle("");
      setAmount("");
      setSplitType('full');
      setMyRatio("50");
      toast.success("保存しました💖");
    }
  };

  const defaultIcon = "https://ui-avatars.com/api/?name=User&background=random";
  const partnerEmail = Object.keys(users).find(e => e !== user?.email) || "";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] shadow-xl shadow-pink-100/50 space-y-5 border border-white mt-8">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">
          {editingData ? '✏️ 編集中' : '✨ 新しい記録'}
        </span>
        <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="bg-pink-50 text-pink-500 text-xs font-bold px-3 py-1 rounded-full outline-none" />
      </div>

      <div className="bg-slate-50 p-2 rounded-2xl flex items-center justify-between border border-slate-100">
         <span className="text-[10px] font-bold text-slate-400 pl-2">支払った人:</span>
         <div className="flex gap-2">
            {[user?.email, partnerEmail].filter(e => e).map((email) => {
                const isActive = payerEmail === email;
                const u = users[email];
                if (!u) return null;
                return (
                    <button
                        key={email}
                        type="button"
                        onClick={() => setPayerEmail(email)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border-2 ${isActive ? 'bg-white border-pink-400 shadow-sm' : 'bg-transparent border-transparent opacity-50 hover:opacity-100'}`}
                    >
                        <img src={u.photo || defaultIcon} className="w-5 h-5 rounded-full" />
                        <span className={`text-[10px] font-bold ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                            {email === user?.email ? '私' : u.name || '相手'}
                        </span>
                    </button>
                )
            })}
         </div>
      </div>

      <input type="text" placeholder="用途 (例: カフェ)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:bg-pink-50 focus:text-pink-600 transition-colors font-bold text-sm" required />
      
      <div className="relative">
         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
         <input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 pl-8 bg-slate-50 rounded-2xl outline-none focus:bg-pink-50 focus:text-pink-600 transition-colors font-bold text-xl" required />
      </div>

      {/* アイコンタップ式カテゴリ選択（動的） */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 mb-2 pl-2">カテゴリ</p>
        <div className="grid grid-cols-6 gap-2">
            {categories.map(cat => (
                <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategoryName(cat.name)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${categoryName === cat.name ? 'bg-pink-400 text-white shadow-md scale-105' : 'bg-slate-50 text-slate-400 hover:bg-pink-50'}`}
                >
                    <span className="text-lg">{cat.icon}</span>
                </button>
            ))}
        </div>
        <p className="text-center text-[10px] font-bold text-pink-400 mt-1 h-4">{categoryName}</p>
      </div>

      <div className="bg-slate-50 p-1 rounded-2xl flex text-[10px] font-bold">
          {['full', 'half', 'ratio'].map(t => (
            <button key={t} type="button" onClick={() => setSplitType(t as any)} className={`flex-1 py-3 rounded-xl transition-all ${splitType === t ? 'bg-white text-pink-500 shadow-sm' : 'text-slate-400'}`}>
              {t === 'full' ? '自分全額' : t === 'half' ? '半分' : '割合'}
            </button>
          ))}
      </div>
      {splitType === 'ratio' && (
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400">自分負担:</span>
            <input type="range" min="0" max="100" step="10" value={myRatio} onChange={(e) => setMyRatio(e.target.value)} className="flex-1 accent-pink-400" />
            <span className="text-xs font-black w-8 text-right text-pink-400">{myRatio}%</span>
          </div>
      )}

      <div className="flex gap-2">
        <button className={`flex-1 p-4 rounded-2xl font-bold text-white shadow-lg shadow-pink-200 active:scale-95 transition-all bg-gradient-to-r from-pink-400 to-orange-300 hover:opacity-90`}>
            {editingData ? '更新する ✨' : '保存する 💖'}
        </button>
        {editingData && (
            <button type="button" onClick={onCancelEdit} className="px-6 rounded-2xl font-bold text-slate-400 bg-slate-100 hover:bg-slate-200">
                ×
            </button>
        )}
      </div>
    </form>
  );
}