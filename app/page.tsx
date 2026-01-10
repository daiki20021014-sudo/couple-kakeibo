"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase'; 
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { format } from 'date-fns';

// コンポーネント
import SummaryChart from './components/SummaryChart';
import CalendarView from './components/CalendarView';
import SettlementModal from './components/SettlementModal';
import BalanceStatus from './components/BalanceStatus';
import ExpenseForm from './components/ExpenseForm';
import HistoryList from './components/HistoryList';
import BudgetCard from './components/BudgetCard'; 
import SettingsModal from './components/SettingsModal'; 

const ALLOWED_EMAILS = ["daiki.2002.1014@gmail.com", "negishi.akane1553@gmail.com"];

const DEFAULT_CATEGORIES = [
  { name: "食費", icon: "🍙" },
  { name: "日用品", icon: "🧻" },
  { name: "家賃・光熱費", icon: "🏠" },
  { name: "デート・外食", icon: "🥂" },
  { name: "交通費", icon: "🚃" },
  { name: "その他", icon: "🐈" }
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [editingEx, setEditingEx] = useState<any>(null);

  // タブ管理（home | history）に変更
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  // 履歴タブ内での表示モード（リスト or カレンダー）
  const [historyMode, setHistoryMode] = useState<'list' | 'calendar'>('list');

  const [currentMonthStr, setCurrentMonthStr] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
   
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);

  const [budget, setBudget] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && ALLOWED_EMAILS.includes(currentUser.email || "")) setIsAllowed(true);
      else setIsAllowed(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAllowed) return;
    const unsubSettings = onSnapshot(doc(db, "settings", "common"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setBudget(data.budget || 0);
            if (data.categories) setCategories(data.categories);
        }
    });

    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubExpenses = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubSettings(); unsubExpenses(); };
  }, [user, isAllowed]);

  const handleSaveSettings = async (newBudget: number, newCategories: any[]) => {
      try {
          await setDoc(doc(db, "settings", "common"), {
              budget: newBudget,
              categories: newCategories
          }, { merge: true });
          toast.success("設定を保存しました⚙️");
      } catch (e) {
          toast.error("設定の保存に失敗しました");
      }
  };

  const stats = useMemo(() => {
    const res: any = { total: 0, users: {} };
    ALLOWED_EMAILS.forEach(email => {
      res.users[email] = { paid: 0, shouldPay: 0, repaid: 0, received: 0, photo: '', name: '' };
    });

    const myEmail = user?.email;
    const partnerEmail = ALLOWED_EMAILS.find(e => e !== myEmail);

    expenses.forEach(ex => {
      // アイコン処理
      if (user && ex.uid === user.uid) {
        if (myEmail && res.users[myEmail]) {
            res.users[myEmail].photo = ex.userPhoto;
            res.users[myEmail].name = ex.userName;
        }
      } else {
        if (partnerEmail && res.users[partnerEmail]) {
            res.users[partnerEmail].photo = ex.userPhoto;
            res.users[partnerEmail].name = ex.userName;
        }
      }

      let payerEmail = ex.payerEmail;
      if (!payerEmail && ex.uid === user?.uid) payerEmail = user?.email;
      if (!payerEmail) return;

      if (ex.type === 'settlement') {
        const receiverEmail = ex.category;
        if (res.users[payerEmail]) res.users[payerEmail].repaid += ex.amount;
        if (res.users[receiverEmail]) res.users[receiverEmail].received += ex.amount;
      } else {
        const amt = ex.amount;
        res.total += amt;
        
        if (res.users[payerEmail]) res.users[payerEmail].paid += amt;
        
        const ratio = ex.myRatio ?? 100;
        const otherRatio = 100 - ratio;
        const otherEmail = ALLOWED_EMAILS.find(e => e !== payerEmail);

        if (res.users[payerEmail]) res.users[payerEmail].shouldPay += (amt * (ratio / 100));
        if (otherEmail && res.users[otherEmail]) res.users[otherEmail].shouldPay += (amt * (otherRatio / 100));
      }
    });
    return res;
  }, [expenses, user]);

  // 今月のデータのみ抽出（ダッシュボード用）
  const displayExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const d = ex.date?.toDate();
      if (!d) return false;
      if (activeTab === 'history' && historyMode === 'calendar') {
        return format(d, 'yyyy-MM-dd') === selectedDateStr;
      } else {
        return format(d, 'yyyy-MM') === currentMonthStr;
      }
    });
  }, [expenses, activeTab, historyMode, selectedDateStr, currentMonthStr]);

  const currentMonthTotal = useMemo(() => {
     return expenses.filter(ex => {
        const d = ex.date?.toDate();
        return d && format(d, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && ex.type !== 'settlement';
     }).reduce((sum, ex) => sum + ex.amount, 0);
  }, [expenses]);

  const myDiff = useMemo(() => {
      if (!user || !user.email) return 0;
      const d = stats.users[user.email];
      if (!d) return 0;
      return (d.paid - d.shouldPay) + (d.repaid - d.received);
  }, [stats, user]);

  // 2人の支出比較データ（今月の全支出における自分の割合など）
  const paymentRatio = useMemo(() => {
      if (!user?.email) return { myPay: 0, partnerPay: 0, myPercent: 0 };
      const myEmail = user.email;
      const partnerEmail = ALLOWED_EMAILS.find(e => e !== myEmail) || '';
      
      // 今月の支出（清算除く）で計算
      const thisMonthEx = expenses.filter(ex => {
          const d = ex.date?.toDate();
          return d && format(d, 'yyyy-MM') === currentMonthStr && ex.type !== 'settlement';
      });

      let myPay = 0;
      let partnerPay = 0;

      thisMonthEx.forEach(ex => {
          let payer = ex.payerEmail;
          if (!payer && ex.uid === user.uid) payer = myEmail;
          
          if (payer === myEmail) myPay += ex.amount;
          else if (payer === partnerEmail) partnerPay += ex.amount;
      });

      const total = myPay + partnerPay;
      const myPercent = total === 0 ? 0 : Math.round((myPay / total) * 100);

      return { myPay, partnerPay, myPercent };
  }, [expenses, currentMonthStr, user]);


  const handleSaveExpense = async (data: any) => {
    if (!user) return;
    const saveData = {
        ...data,
        date: Timestamp.fromDate(data.date),
        uid: user.uid,
        userName: user.displayName, 
        userPhoto: user.photoURL,
        type: 'expense'
    };
    try {
      if (editingEx) {
        await updateDoc(doc(db, "expenses", editingEx.id), saveData);
        toast.success("修正しました✨");
        setEditingEx(null);
      } else {
        await addDoc(collection(db, "expenses"), saveData);
        toast.success("記録しました！");
      }
      setIsInputModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました");
    }
  };

  const handleSettleSubmit = async (repayAmount: number, method: string, payerEmail: string) => {
      if (!user) return;
      const receiverEmail = ALLOWED_EMAILS.find(e => e !== payerEmail) || "";
      try {
          await addDoc(collection(db, "expenses"), {
              title: `返済 (${method})`, 
              amount: repayAmount,
              category: receiverEmail,
              date: Timestamp.now(),
              uid: user.uid, 
              userName: user.displayName, 
              userPhoto: user.photoURL,
              payerEmail: payerEmail,
              type: 'settlement',
              note: method
          });
          toast.success("返済を記録しました！🎉");
          setIsSettleModalOpen(false);
      } catch (e) {
          toast.error("記録に失敗しました");
      }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('削除しますか？')) {
        await deleteDoc(doc(db, "expenses", id));
        toast.success("削除しました");
    }
  }

  const handleEdit = (ex: any) => {
    if (ex.type === 'settlement') {
      if(window.confirm('清算履歴を削除しますか？')) handleDelete(ex.id);
      return;
    }
    setEditingEx(ex);
    setIsInputModalOpen(true);
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      toast.error("ログインに失敗しました");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FFF5F7] text-pink-400 font-bold animate-pulse">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#FFF5F7] text-slate-600 font-sans selection:bg-pink-200 pb-32">
      <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: '20px', background: 'rgba(255,255,255,0.9)', color: '#333' } }} />
      
      {/* モーダル類 */}
      <SettlementModal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} onSettle={handleSettleSubmit} maxAmount={myDiff} users={stats.users} currentUserEmail={user?.email || ""} partnerEmail={ALLOWED_EMAILS.find(e => e !== user?.email) || ""} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentBudget={budget} currentCategories={categories} onSave={handleSaveSettings} />

      {/* 入力用モーダル */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {if(e.target === e.currentTarget) setIsInputModalOpen(false)}}>
          <div className="bg-white w-full max-w-md rounded-t-[30px] p-6 animate-in slide-in-from-bottom duration-300">
             <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
             <ExpenseForm user={user} users={stats.users} categories={categories} onSubmit={handleSaveExpense} editingData={editingEx} onCancelEdit={() => { setEditingEx(null); setIsInputModalOpen(false); }} />
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-5">
        {/* ヘッダー */}
        <header className="pt-12 pb-4 flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tighter text-slate-800">
              {activeTab === 'home' ? 'Dashboard' : 'History'}
          </h1>
          <div className="flex gap-3">
             {user && (
                 <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">⚙️</button>
             )}
             {user && (
                <button onClick={() => { if(window.confirm('ログアウトしますか？')) signOut(auth) }} className="transition-transform hover:scale-110">
                <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border-2 border-white shadow-md" alt="icon" />
                </button>
             )}
          </div>
        </header>

        {user && isAllowed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* ★★★ 1. ホーム（ダッシュボード）タブ ★★★ */}
            {activeTab === 'home' && (
                <>
                    {/* ① 予算カード（既存） */}
                    <BudgetCard budget={budget} totalExpense={currentMonthTotal} />

                    {/* ② 貸し借り状況（ダッシュボードの主役） */}
                    <BalanceStatus stats={stats} currentUserEmail={user?.email || ""} onOpenSettleModal={() => setIsSettleModalOpen(true)} />

                    {/* ③ 二人の出費比較グラフ（新機能） */}
                    <section className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Payment Balance ({currentMonthStr.split('-')[1]}月)</h3>
                        <div className="flex items-end gap-2 h-24 mb-2">
                             {/* 自分のバー */}
                             <div className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                <span className="text-xs font-bold text-slate-700">¥{paymentRatio.myPay.toLocaleString()}</span>
                                <div className="w-full bg-blue-100 rounded-t-xl relative overflow-hidden transition-all group-hover:bg-blue-200" style={{ height: `${paymentRatio.myPercent}%` }}>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-400"></div>
                                </div>
                             </div>
                             {/* 相手のバー */}
                             <div className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                <span className="text-xs font-bold text-slate-700">¥{paymentRatio.partnerPay.toLocaleString()}</span>
                                <div className="w-full bg-pink-100 rounded-t-xl relative overflow-hidden transition-all group-hover:bg-pink-200" style={{ height: `${100 - paymentRatio.myPercent}%` }}>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-pink-400"></div>
                                </div>
                             </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-bold px-2">
                            <span>YOU ({paymentRatio.myPercent}%)</span>
                            <span>PARTNER ({100 - paymentRatio.myPercent}%)</span>
                        </div>
                    </section>

                    {/* ④ カテゴリ別チャート（既存） */}
                    <SummaryChart expenses={displayExpenses.filter(e => e.type !== 'settlement')} />
                </>
            )}

            {/* ★★★ 2. 履歴タブ ★★★ */}
            {activeTab === 'history' && (
                <>
                    {/* 月切り替えナビゲーション */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4 px-2">
                            <button onClick={() => {const d = new Date(currentMonthStr); d.setMonth(d.getMonth() - 1); setCurrentMonthStr(format(d, 'yyyy-MM'));}} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-pink-400 font-bold">←</button>
                            <span className="text-lg font-black text-slate-700">{currentMonthStr.split('-')[0]}<span className="text-xs font-normal text-gray-400 ml-1">年</span> {currentMonthStr.split('-')[1]}<span className="text-xs font-normal text-gray-400 ml-1">月</span></span>
                            <button onClick={() => {const d = new Date(currentMonthStr); d.setMonth(d.getMonth() + 1); setCurrentMonthStr(format(d, 'yyyy-MM'));}} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-pink-400 font-bold">→</button>
                        </div>
                        {/* カレンダー切り替えスイッチ */}
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setHistoryMode('list')} className={`p-2 rounded-md transition-all ${historyMode === 'list' ? 'bg-white shadow text-pink-500' : 'text-gray-400'}`}>📄</button>
                            <button onClick={() => setHistoryMode('calendar')} className={`p-2 rounded-md transition-all ${historyMode === 'calendar' ? 'bg-white shadow text-pink-500' : 'text-gray-400'}`}>📅</button>
                        </div>
                    </div>
                    
                    {/* コンテンツ */}
                    {historyMode === 'list' ? (
                        <HistoryList expenses={displayExpenses} users={stats.users} categories={categories} onEdit={handleEdit} onDelete={handleDelete} />
                    ) : (
                        <CalendarView expenses={expenses} currentDate={selectedDateStr} onDateChange={setSelectedDateStr} />
                    )}
                </>
            )}

          </div>
        ) : (
           !loading && (<div className="text-center py-20"><button onClick={handleLogin} className="bg-slate-800 text-white px-8 py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform">Googleでログイン</button></div>)
        )}
      </div>

      {/* FAB（プラスボタン） */}
      {user && isAllowed && (
        <button 
          onClick={() => { setEditingEx(null); setIsInputModalOpen(true); }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-slate-800 text-white rounded-full shadow-xl flex items-center justify-center text-3xl font-light hover:scale-110 active:scale-90 transition-all z-40"
        >
          ＋
        </button>
      )}

      {/* ボトムナビゲーション（ホーム / 履歴） */}
      {user && isAllowed && (
        <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 pb-safe pt-2 px-6 z-40">
           <div className="max-w-md mx-auto flex justify-around items-center h-16">
              <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 w-20 transition-colors ${activeTab === 'home' ? 'text-pink-500' : 'text-slate-300'}`}>
                <span className="text-2xl">{activeTab === 'home' ? '🏠' : '🛖'}</span>
                <span className="text-[10px] font-bold">ホーム</span>
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 w-20 transition-colors ${activeTab === 'history' ? 'text-pink-500' : 'text-slate-300'}`}>
                <span className="text-2xl">{activeTab === 'history' ? '📂' : '📁'}</span>
                <span className="text-[10px] font-bold">履歴</span>
              </button>
           </div>
        </nav>
      )}
    </main>
  );
}