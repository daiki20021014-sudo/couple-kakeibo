"use client";

import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';

const CATEGORIES = ["食費", "日用品", "家賃・光熱費", "デート・外食", "その他"];
// ここに許可するメールアドレスを入力
const ALLOWED_EMAILS = ["あなたのメールアドレス@gmail.com", "彼女のメールアドレス@gmail.com"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_EMAILS.includes(currentUser.email || "")) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
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

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !user) return;
    await addDoc(collection(db, "expenses"), {
      title, amount: Number(amount), category, date: Timestamp.now(),
      uid: user.uid, userName: user.displayName, userPhoto: user.photoURL
    });
    setTitle(""); setAmount("");
  };

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  // 権限がない場合の表示
  if (user && !isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">アクセス権限がありません</h1>
          <p className="text-slate-500 mb-6">このアプリは登録された二人の専用サイトです。</p>
          <button onClick={() => signOut(auth)} className="text-blue-600 font-medium">ログアウト</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans antialiased pb-12">
      <div className="max-w-xl mx-auto px-6">
        
        {/* Header: ミニマルなデザイン */}
        <header className="py-10 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Our Home Ledger</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Shared Finances</p>
          </div>
          {user && (
            <button onClick={() => signOut(auth)} className="group relative">
              <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:opacity-75 transition" />
            </button>
          )}
        </header>

        {!user ? (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <div className="text-6xl mb-6">🏠</div>
            <button 
              onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold shadow-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* Total Balance: 高級感のあるカード */}
            <section className="relative overflow-hidden bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50">
              <div className="relative z-10 text-center">
                <p className="text-slate-400 text-sm font-medium mb-2">Total Monthly Expenses</p>
                <div className="text-5xl font-bold tracking-tighter text-slate-900">
                  <span className="text-2xl mr-1 text-slate-400">¥</span>{total.toLocaleString()}
                </div>
              </div>
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            </section>

            {/* Form: 洗練された入力欄 */}
            <form onSubmit={addExpense} className="bg-white/60 backdrop-blur-md p-6 rounded-[24px] shadow-sm border border-white space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Description</label>
                <input 
                  type="text" placeholder="スーパー 買い出し" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:border-blue-300 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Amount</label>
                  <input 
                    type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:border-blue-300 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-widest">Category</label>
                  <select 
                    value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-4 bg-white rounded-2xl border border-slate-100 focus:border-blue-300 outline-none appearance-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold shadow-lg shadow-slate-200 hover:shadow-xl transition-all active:scale-[0.98]">
                Add Expense
              </button>
            </form>

            {/* History: タイムライン風のリスト */}
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] px-2">Transactions</h2>
              <div className="space-y-3">
                {expenses.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-[20px] flex justify-between items-center border border-slate-100 hover:border-slate-200 transition-colors shadow-sm group">
                    <div className="flex items-center gap-4">
                      <img src={item.userPhoto} className="w-10 h-10 rounded-full border border-slate-50 shadow-sm" />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {item.category} • {item.userName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-slate-700">¥{item.amount.toLocaleString()}</p>
                      <button 
                        onClick={() => deleteDoc(doc(db, "expenses", item.id))}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 transition-all"
                      >
                        ✕
                      </button>
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