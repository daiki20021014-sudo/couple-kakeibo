"use client";
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type Category = { name: string; icon: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currentCategories: Category[];
  onSave: (budget: number, categories: Category[]) => void;
};

export default function SettingsModal({ isOpen, onClose, currentBudget, currentCategories, onSave }: Props) {
  const [budgetStr, setBudgetStr] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  
  // 新規カテゴリ入力用
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("✨");

  useEffect(() => {
    if (isOpen) {
      setBudgetStr(currentBudget.toString());
      setCategories(currentCategories);
    }
  }, [isOpen, currentBudget, currentCategories]);

  if (!isOpen) return null;

  const handleAddCategory = () => {
    if (!newCatName) return;
    if (categories.some(c => c.name === newCatName)) {
        toast.error("同じ名前のカテゴリがあります");
        return;
    }
    setCategories([...categories, { name: newCatName, icon: newCatIcon }]);
    setNewCatName("");
    setNewCatIcon("✨");
  };

  const handleDeleteCategory = (name: string) => {
    if (window.confirm(`「${name}」を削除してもいいですか？`)) {
        setCategories(categories.filter(c => c.name !== name));
    }
  };

  const handleSave = () => {
    onSave(Number(budgetStr), categories);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[30px] p-6 shadow-2xl animate-in zoom-in-95">
        <h3 className="text-center font-bold text-lg text-slate-700 mb-6">⚙️ 設定</h3>

        {/* 予算設定 */}
        <section className="mb-8">
            <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">今月の目標予算</h4>
            <div className="relative">
                <input 
                    type="number" 
                    value={budgetStr} 
                    onChange={(e) => setBudgetStr(e.target.value)}
                    className="w-full p-4 pl-8 bg-slate-50 rounded-2xl font-black text-2xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">¥</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 pl-2">※ 0円にするとゲージは非表示になります</p>
        </section>

        {/* カテゴリ設定 */}
        <section className="mb-8">
            <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">カテゴリ編集</h4>
            
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between bg-white border border-slate-100 p-2 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xl bg-slate-50 w-8 h-8 flex items-center justify-center rounded-lg">{cat.icon}</span>
                            <span className="font-bold text-sm text-slate-700">{cat.name}</span>
                        </div>
                        <button onClick={() => handleDeleteCategory(cat.name)} className="text-slate-300 hover:text-rose-500 px-2">×</button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400 mb-2">新規追加</p>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        value={newCatIcon} 
                        onChange={(e) => setNewCatIcon(e.target.value)} 
                        className="w-10 p-2 text-center rounded-xl border border-slate-200 text-lg outline-none"
                        placeholder="絵"
                    />
                    <input 
                        type="text" 
                        value={newCatName} 
                        onChange={(e) => setNewCatName(e.target.value)} 
                        className="flex-1 p-2 rounded-xl border border-slate-200 text-sm font-bold outline-none"
                        placeholder="カテゴリ名 (例: 推し活)"
                    />
                </div>
                <button onClick={handleAddCategory} className="w-full bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl shadow-md active:scale-95">
                    ＋ 追加する
                </button>
            </div>
        </section>

        <button onClick={handleSave} className="w-full bg-slate-800 text-white font-bold p-4 rounded-2xl shadow-lg active:scale-95 mb-3">
           保存して閉じる ✅
        </button>
        <button onClick={onClose} className="w-full text-xs font-bold text-slate-400 py-2">
           キャンセル
        </button>
      </div>
    </div>
  );
}