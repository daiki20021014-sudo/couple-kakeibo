"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const CATEGORIES = ["食費", "日用品", "家賃・光熱費", "デート・外食", "その他"];
// 二人のメールアドレスを登録済み
const ALLOWED_EMAILS = ["daiki.2002.1014@gmail.com", "negishi.akane1553@gmail.com"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [viewMonth, setViewMonth] = useState<'this' | 'last'>('this');
  const [editingId, setEditingId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!user || !isAllowed) return;
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user, isAllowed]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const targetMonth = viewMonth === 'this' ? now.getMonth() : now.getMonth() - 1;
    const targetYear = viewMonth === 'this' ? now.getFullYear() : (targetMonth < 0 ? now.getFullYear() - 1 : now.getFullYear());
    const adjustedMonth = targetMonth < 0 ? 11 : targetMonth;

    return expenses.filter(ex => {
      const d = ex.date?.toDate();
      return d && d.getMonth() === adjustedMonth && d.getFullYear() === targetYear;
    });
  }, [expenses, viewMonth]);

  const stats = useMemo(() => {
    const res: any = { total: 0, byUser: {}, byCategory: {} };
    CATEGORIES.forEach(c => res.byCategory[c] = 0);
    
    filteredExpenses.forEach(ex => {
      res.total += ex.amount;
      res.byCategory[ex.category] += ex.amount;
      if (!res.byUser[ex.userName]) res.byUser[ex.userName] = { total: 0, photo: ex.userPhoto };
      res.byUser[ex.userName].total += ex.amount;
    });
    return res;
  }, [filteredExpenses]);

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

  const handleEdit = (ex: any) => {
    setEditingId(ex.id);
    setTitle(ex.title);
    setAmount(ex.amount.toString());
    setCategory(ex.category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white font-bold">読み込み中...</div>;

  if (user && !isAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <h1 className="text-xl font-bold dark:text-white mb-2">アクセス権限がありません</h1>
        <p className="text-slate-500 text-sm mb-6">登録されたメールアドレス（{user.email}）は許可されていません。</p>
        <button onClick={() => signOut(auth)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">ログアウト</button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20">
      <div className="max-w-xl mx-auto px-6">
        
        <header className="pt-10 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight">ふたりの家計簿</h1>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setViewMonth('this')} className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${viewMonth === 'this' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>今月</button>
              <button onClick={() => setViewMonth('last')} className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${viewMonth === 'last' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>先月</button>
            </div>
          </div>
          {user && (
            <img src={user.photoURL || ""} className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-xl cursor-pointer" onClick={() => confirm('ログアウトしますか？') && signOut(auth)} />
          )}
        </header>

        {!user ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-6">🏠</div>
            <h2 className="text-lg font-bold mb-6">共有家計簿へようこそ</h2>
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl active:scale-95 transition-transform">Googleでログイン</button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.byUser).map(([name, data]: any) => (
                <div key={name} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
                  <img src={data.photo} className="w-10 h-10 rounded-full mb-2 border-2 border-slate-50 dark:border-slate-700" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{name}</p>
                  <p className="text-xl font-black">¥{data.total.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-1">{viewMonth === 'this' ? '今月' : '先月'}の合計</p>
              <div className="text-5xl font-black tracking-tighter">¥{stats.total.toLocaleString()}</div>
            </section>

            <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">カテゴリ別分析</h2>
              <div className="space-y-4">
                {CATEGORIES.map(cat => {
                  const amount = stats.byCategory[cat];
                  const percent = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold px-1">
                        <span>{cat}</span>
                        <span>¥{amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 dark:bg-blue-500 transition-all duration-1000 ease-out shadow-sm" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-xl border-2 border-slate-900 dark:border-blue-500 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="font-black text-sm">{editingId ? '✨ 支出を編集' : '📝 支出を入力'}</h2>
                {editingId && <button type="button" onClick={() => {setEditingId(null); setTitle(""); setAmount("");}} className="text-[10px] font-bold text-rose-500 underline">キャンセル</button>}
              </div>
              <input type="text" placeholder="何に使った？" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 dark:text-white transition-all" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white" required />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-sm dark:text-white appearance-none cursor-pointer">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button className={`w-full p-4 rounded-2xl font-black text-white transition-all active:scale-[0.98] shadow-lg ${editingId ? 'bg-blue-600 shadow-blue-200' : 'bg-slate-900 dark:bg-blue-500 shadow-slate-200'}`}>
                {editingId ? '更新する' : '保存する'}
              </button>
            </form>

            <div className="space-y-3 pb-10">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">最近の履歴</h2>
              {filteredExpenses.length === 0 ? (
                <p className="text-center py-10 text-slate-400 text-sm italic">履歴がありません</p>
              ) : (
                filteredExpenses.map((ex) => (
                  <div key={ex.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <img src={ex.userPhoto} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
                      <div>
                        <p className="font-bold text-sm leading-tight">{ex.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{ex.category} ・ {ex.userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black">¥{ex.amount.toLocaleString()}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(ex)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">✏️</button>
                        <button onClick={() => confirm('削除しますか？') && deleteDoc(doc(db, "expenses", ex.id))} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-500 transition-colors">✕</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}