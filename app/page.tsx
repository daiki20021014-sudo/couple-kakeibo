"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../lib/firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const CATEGORIES = ["食費", "日用品", "家賃・光熱費", "デート・外食", "その他"];

// ★修正：環境変数からアドレスを読み込む（セキュリティ対策）
const ALLOWED_EMAILS = ["daiki.2002.1014@gmail.com", "negishi.akane1553@gmail.com"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [splitType, setSplitType] = useState<'full' | 'half' | 'ratio'>('full');
  const [myRatio, setMyRatio] = useState("50");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [viewMonth, setViewMonth] = useState<'this' | 'last'>('this');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. ログイン監視と権限チェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_EMAILS.map(e => e.trim().toLowerCase()).includes(currentUser.email?.toLowerCase() || "")) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. データのリアルタイム取得
  useEffect(() => {
    if (!user || !isAllowed) return;
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user, isAllowed]);

  // 表示月のフィルタリング
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

  // 貸し借り・統計計算
  const stats = useMemo(() => {
    const res: any = { total: 0, users: {}, categories: {} };
    CATEGORIES.forEach(c => res.categories[c] = 0);
    ALLOWED_EMAILS.forEach(email => {
      // 空白除去してからキーにする
      const cleanEmail = email.trim();
      res.users[cleanEmail] = { paid: 0, shouldPay: 0, photo: '', name: '' };
    });

    filteredExpenses.forEach(ex => {
      const amt = ex.amount;
      res.total += amt;
      res.categories[ex.category] += amt;

      // 支払い者の特定
      let payerEmail = ex.payerEmail;
      if (!payerEmail && ex.uid === auth.currentUser?.uid) payerEmail = auth.currentUser?.email;
      // 過去データなどでemailが特定できない場合のフォールバック
      if (!payerEmail) return;

      if (res.users[payerEmail]) {
        res.users[payerEmail].paid += amt;
        res.users[payerEmail].photo = ex.userPhoto;
        res.users[payerEmail].name = ex.userName;
      }

      const ratio = ex.myRatio ?? 100;
      const otherRatio = 100 - ratio;
      // 相手のアドレスを探す
      const otherEmail = ALLOWED_EMAILS.map(e=>e.trim()).find(e => e !== payerEmail);

      if (res.users[payerEmail]) res.users[payerEmail].shouldPay += (amt * (ratio / 100));
      if (otherEmail && res.users[otherEmail]) res.users[otherEmail].shouldPay += (amt * (otherRatio / 100));
    });
    return res;
  }, [filteredExpenses]);

  // 保存・更新処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !user) return;

    const data = {
      title,
      amount: Number(amount),
      category,
      splitType,
      myRatio: splitType === 'ratio' ? Number(myRatio) : (splitType === 'half' ? 50 : 100),
      userName: user.displayName,
      userPhoto: user.photoURL,
      payerEmail: user.email,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "expenses", editingId), data);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "expenses"), { ...data, date: Timestamp.now(), uid: user.uid });
      }
      setTitle(""); setAmount(""); setSplitType('full'); setMyRatio("50");
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("保存に失敗しました。");
    }
  };

  const handleEdit = (ex: any) => {
    setEditingId(ex.id);
    setTitle(ex.title);
    setAmount(ex.amount.toString());
    setCategory(ex.category);
    setSplitType(ex.splitType || 'full');
    setMyRatio(ex.myRatio?.toString() || "50");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-950 dark:text-white font-black animate-pulse">読み込み中...</div>;

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20 font-sans">
      <div className="max-w-xl mx-auto px-6">
        
        <header className="pt-10 pb-6 flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter">ふたりの家計簿</h1>
          <div className="flex gap-2">
            <button onClick={() => setViewMonth('this')} className={`text-[10px] px-3 py-1 rounded-full font-bold ${viewMonth === 'this' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>今月</button>
            <button onClick={() => setViewMonth('last')} className={`text-[10px] px-3 py-1 rounded-full font-bold ${viewMonth === 'last' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>先月</button>
          </div>
          {user && <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-lg cursor-pointer ml-4" onClick={() => confirm('ログアウトしますか？') && signOut(auth)} />}
        </header>

        {user && isAllowed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 清算パネル */}
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(stats.users).map(([email, data]: any) => {
                const diff = data.paid - data.shouldPay;
                return (
                  <div key={email} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                    <img src={data.photo || "https://ui-avatars.com/api/?name=User"} className="w-10 h-10 rounded-full mx-auto mb-2 border-2 border-slate-50 dark:border-slate-800" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate mb-1">{data.name || 'ゲスト'}</p>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-400 text-[9px]">支出: ¥{data.paid.toLocaleString()}</p>
                      <p className={`text-sm font-black ${diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {diff >= 0 ? `+¥${Math.abs(diff).toLocaleString()}` : `-¥${Math.abs(diff).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 合計表示 */}
            <section className="bg-slate-900 dark:bg-white p-8 rounded-[32px] shadow-2xl text-center">
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">二人の合計支出</p>
              <div className="text-5xl font-black text-white dark:text-slate-900 tracking-tighter">¥{stats.total.toLocaleString()}</div>
            </section>

            {/* 入力フォーム */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-xl border-2 border-slate-900 dark:border-blue-600 space-y-4">
              <h2 className="font-black text-sm text-center">{editingId ? '✨ 支出を修正中' : '📝 新しい支出を入力'}</h2>
              <input type="text" placeholder="何に使った？" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none focus:ring-4 ring-blue-500/10 dark:text-white" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none dark:text-white" required />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none text-sm dark:text-white appearance-none">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest">支払い割合設定</p>
                <div className="flex gap-2">
                  {['full', 'half', 'ratio'].map(t => (
                    <button key={t} type="button" onClick={() => setSplitType(t as any)} className={`flex-1 py-2 text-[10px] font-bold rounded-xl transition-all ${splitType === t ? 'bg-slate-900 text-white dark:bg-blue-600' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                      {t === 'full' ? '自分全額' : t === 'half' ? '50:50' : '割合指定'}
                    </button>
                  ))}
                </div>
                {splitType === 'ratio' && (
                  <div className="flex items-center gap-3 pt-2">
                    <input type="range" min="0" max="100" step="10" value={myRatio} onChange={(e) => setMyRatio(e.target.value)} className="flex-1 accent-slate-900 dark:accent-blue-500" />
                    <span className="text-xs font-black w-8">{myRatio}%</span>
                  </div>
                )}
              </div>
              <button className={`w-full p-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all ${editingId ? 'bg-blue-600' : 'bg-slate-900 dark:bg-blue-600'}`}>
                {editingId ? '内容を更新する' : 'この支出を保存する'}
              </button>
              {editingId && <button type="button" onClick={() => setEditingId(null)} className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">キャンセル</button>}
            </form>

            {/* 履歴リスト */}
            <div className="space-y-3 pb-10">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">最近の履歴</h2>
              {filteredExpenses.map((ex) => {
                const date = ex.date?.toDate();
                const timeStr = date ? `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}` : '';
                return (
                  <div key={ex.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group shadow-sm">
                    <div className="flex items-center gap-3">
                      <img src={ex.userPhoto} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800" />
                      <div>
                        <p className="font-bold text-sm leading-tight">{ex.title}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{timeStr} ・ {ex.category}</p>
                        {ex.splitType !== 'full' && <p className="text-[9px] font-black text-blue-500 mt-0.5">負担比率: {ex.myRatio}%</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-sm text-slate-800 dark:text-white">¥{ex.amount.toLocaleString()}</p>
                      
                      {/* ★修正：操作ボタンを見やすく、押しやすく変更 */}
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(ex)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:bg-blue-500 hover:text-white transition-all">
                          ✏️
                        </button>
                        <button onClick={() => confirm('本当に削除しますか？') && deleteDoc(doc(db, "expenses", ex.id))} className="w-8 h-8 flex items-center justify-center bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredExpenses.length === 0 && <p className="text-center text-xs text-slate-400 py-4">まだ履歴がありません</p>}
            </div>
          </div>
        ) : (
          /* ★修正：ログインボタンを追加 */
          !loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="text-center space-y-2">
                <p className="text-lg font-black text-slate-900 dark:text-white">ようこそ</p>
                <p className="text-slate-400 text-sm">二人だけの共有家計簿へ</p>
              </div>
              <button 
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Googleでログインして開始</span>
              </button>
              <p className="text-[10px] text-slate-400">※許可されたアカウントのみ利用可能です</p>
            </div>
          )
        )}
      </div>
    </main>
  );
}