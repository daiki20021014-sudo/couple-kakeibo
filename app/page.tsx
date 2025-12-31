"use client";

import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, addDoc, query, onSnapshot, orderBy, 
  Timestamp, deleteDoc, doc 
} from 'firebase/firestore';

// カテゴリのリスト定義
const CATEGORIES = ["食費", "日用品", "家賃・光熱費", "デート・外食", "その他"];

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: any;
  userName: string;
  userPhoto: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(data);
    });
    return () => unsubscribe();
  }, [user]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !user) return;

    await addDoc(collection(db, "expenses"), {
      title,
      amount: Number(amount),
      category,
      date: Timestamp.now(),
      uid: user.uid,
      userName: user.displayName || "匿名",
      userPhoto: user.photoURL || ""
    });

    setTitle("");
    setAmount("");
  };

  const deleteExpense = async (id: string) => {
    if (window.confirm("この支出を削除しますか？")) {
      await deleteDoc(doc(db, "expenses", id));
    }
  };

  // カテゴリ別の合計を計算する関数
  const categoryTotals = CATEGORIES.map(cat => {
    const total = expenses
      .filter(ex => ex.category === cat)
      .reduce((sum, item) => sum + item.amount, 0);
    return { name: cat, total };
  });

  const grandTotal = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-6 text-slate-900">
      <div className="w-full max-w-md">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">🏠 ふたりの家計簿</h1>
          {user ? (
            <img src={user.photoURL || ""} alt="icon" className="w-8 h-8 rounded-full border border-slate-200" onClick={() => signOut(auth)} />
          ) : (
            <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider())} className="bg-white px-4 py-1 rounded-full text-sm border">ログイン</button>
          )}
        </header>

        {user && (
          <>
            {/* 合計とカテゴリ別サマリー */}
            <section className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-slate-100">
              <p className="text-slate-500 text-xs text-center mb-1">今月の合計</p>
              <div className="text-3xl font-black text-center mb-4">¥{grandTotal.toLocaleString()}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {categoryTotals.map(cat => (
                  <div key={cat.name} className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400">{cat.name}</span>
                    <span className="font-bold">¥{cat.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 入力フォーム */}
            <form onSubmit={addExpense} className="bg-white p-4 rounded-2xl shadow-sm mb-6 space-y-3">
              <input type="text" placeholder="何に使った？" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none" />
              <div className="flex gap-2">
                <input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl outline-none" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-3 bg-slate-50 rounded-xl outline-none text-sm">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">支出を追加</button>
            </form>

            {/* 履歴 */}
            <div className="space-y-3 pb-20">
              {expenses.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={item.userPhoto} className="w-10 h-10 rounded-full border border-slate-100" />
                    <div>
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.category} ・ {item.userName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold">¥{item.amount.toLocaleString()}</p>
                    <button onClick={() => deleteExpense(item.id)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}