"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const CATEGORIES = ["食費", "日用品", "家賃・光熱費", "デート・外食", "その他"];
const ALLOWED_EMAILS = ["daiki.2002.1014@gmail.com", "彼女のメールアドレス@gmail.com"]; // ←彼女のアドレスを書き換えてください

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [viewMonth, setViewMonth] = useState<'current' | 'last'>('current');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. ログイン・権限チェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_EMAILS.map(e => e.toLowerCase()).includes(currentUser.email?.toLowerCase() || "")) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. データ取得
  useEffect(() => {
    if (!user || !isAllowed) return;
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user, isAllowed]);

  // 今月・先月のフィルタリング
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const targetMonth = viewMonth === 'current' ? now.getMonth() : now.getMonth() - 1;
    const targetYear = viewMonth === 'current' ? now.getFullYear() : (targetMonth < 0 ? now.getFullYear() - 1 : now.getFullYear());
    const adjustedMonth = targetMonth < 0 ? 11 : targetMonth;

    return expenses.filter(ex => {
      const d = ex.date?.toDate();
      return d && d.getMonth() === adjustedMonth && d.getFullYear() === targetYear;
    });
  }, [expenses, viewMonth]);

  // ダッシュボード用集計
  const totals = useMemo(() => {
    const res: any = { grand: 0, users: {}, categories: {} };
    CATEGORIES.forEach(c => res.categories[c] = 0);
    
    filteredExpenses.forEach(ex => {
      res.grand += ex.amount;
      res.categories[ex.category] = (res.categories[ex.category] || 0) + ex.amount;
      if (!res.users[ex.userName]) res.users[ex.userName] = { total: 0, photo: ex.userPhoto };
      res.users[ex.userName].total += ex.amount;
    });
    return res;
  }, [filteredExpenses]);

  // 保存・更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !user) return;

    if (editingId) {
      await updateDoc(doc(db, "expenses", editingId), {
        title, amount: Number(amount), category
      });
      setEditingId(null);
    } else {
      await addDoc(collection(db, "expenses"), {
        title, amount: Number(amount), category, date: Timestamp.now(),
        uid: user.uid, userName: user.displayName, userPhoto: user.photoURL
      });
    }
    setTitle(""); setAmount("");
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setTitle(item.title);
    setAmount(item.amount.toString());
    setCategory(item.category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-900 dark:text-white">読み込み中...</div>;

  if (user && !isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl">
          <h1 className="text-xl font-bold mb-2 dark:text-white">アクセス権限がありません</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">二人の専用アプリです。登録したアドレスでログインしてください。</p>
          <button onClick={() => signOut(auth)} className="text-blue-600 font-bold">ログアウト</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-200 font-sans antialiased pb-20 transition-colors duration-300">
      <div className="max-w-xl mx-auto px-6">
        
        {/* ヘッダー */}
        <header className="py-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">ふたりの家計簿</h1>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setViewMonth('current')} className={`text-xs px-3 py-1 rounded-full font-bold transition ${viewMonth === 'current' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>今月</button>
              <button onClick={() => setViewMonth('last')} className={`text-xs px-3 py-1 rounded-full font-bold transition ${viewMonth === 'last' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>先月</button>
            </div>
          </div>
          {user && (
            <button onClick={() => {if(confirm('ログアウトしますか？')) signOut(auth)}} className="hover:scale-110 transition active:scale-95">
              <img src={user.photoURL || ""} className="w-12 h-12 rounded-full border-4 border-white dark:border-slate-800 shadow-lg" title="ログアウト" />
            </button>
          )}
        </header>

        {!user ? (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="text-7xl mb-6 animate-bounce">🏠</div>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:translate-y-[-2px] transition-all active:translate-y-0">Googleでログイン</button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            
            {/* ダッシュボード：二人の合計 */}
            <section className="grid grid-cols-2 gap-4">
              {Object.entries(totals.users).map(([name, data]: any) => (
                <div key={name} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
                  <img src={data.photo} className="w-10 h-10 rounded-full mb-2 border-2 border-slate-50 dark:border-slate-700" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{name}</p>
                  <p className="text-xl font-black dark:text-white">¥{data.total.toLocaleString()}</p>
                </div>
              ))}
              {Object.keys(totals.users).length === 0 && (
                <div className="col-span-2 text-center py-4 text-slate-400 text-xs">データがありません</div>
              )}
            </section>

            {/* 合計金額表示 */}
            <section className="bg-slate-900 dark:bg-white p-8 rounded-[32px] shadow-2xl text-center relative overflow-hidden group">
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">合計支出</p>
              <div className="text-5xl font-black text-white dark:text-slate-900 tracking-tighter">¥{totals.grand.toLocaleString()}</div>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            </section>

            {/* カテゴリ別グラフ */}
            <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">カテゴリ別分析</h2>
              <div className="space-y-4">
                {CATEGORIES.map(cat => {
                  const amount = totals.categories[cat] || 0;
                  const percent = totals.grand > 0 ? (amount / totals.grand) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="dark:text-slate-400">{cat}</span>
                        <span className="dark:text-white">¥{amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 dark:bg-blue-500 transition-all duration-1000 ease-out" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 入力フォーム */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-lg border-2 border-slate-900 dark:border-blue-500 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-black dark:text-white">{editingId ? "✨ 支出を編集" : "📝 支出を追加"}</h2>
                {editingId && <button type="button" onClick={() => {setEditingId(null); setTitle(""); setAmount("");}} className="text-[10px] text-rose-500 font-bold uppercase">キャンセル</button>}
              </div>
              <input type="text" placeholder="何に使った？" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-4 ring-slate-100 dark:ring-blue-900/20 transition-all outline-none dark:text-white" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none dark:text-white" required />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none outline-none text-sm dark:text-white appearance-none">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button className={`w-full p-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg ${editingId ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-900 dark:bg-blue-500 text-white shadow-slate-200 dark:shadow-blue-900/20'}`}>
                {editingId ? "更新する" : "保存する"}
              </button>
            </form>

            {/* 履歴リスト */}
            <section className="space-y-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">最近の履歴</h2>
              <div className="space-y-3">
                {filteredExpenses.map((item) => (
                  <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] flex justify-between items-center border border-slate-100 dark:border-slate-800 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <img src={item.userPhoto} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{item.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.category} ・ {item.userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-black text-slate-900 dark:text-white">¥{item.amount.toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(item)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">✏️</button>
                        <button onClick={() => {if(confirm('削除しますか？')) deleteDoc(doc(db, "expenses", item.id))}} className="p-2 text-slate-300 hover:text-rose-500 transition-colors text-xs">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}