"use client";

import React, { useState, useEffect, useMemo } from 'react';
// ↓ パスを修正済みです
import { auth, db } from './firebase'; 
// ↓ ここを signInWithPopup に変更しました！
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, Timestamp, deleteDoc, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
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

// 初期カテゴリ
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

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonthStr, setCurrentMonthStr] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);
   
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  // 設定画面の開閉
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 設定データ（予算とカテゴリ）
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

  // 設定データの読み込み
  useEffect(() => {
    if (!user || !isAllowed) return;
    const unsubSettings = onSnapshot(doc(db, "settings", "common"), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setBudget(data.budget || 0);
            if (data.categories) setCategories(data.categories);
        }
    });

    // 支出データの読み込み
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubExpenses = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubSettings(); unsubExpenses(); };
  }, [user, isAllowed]);

  // 設定の保存処理
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
    // まず枠を作る
    ALLOWED_EMAILS.forEach(email => {
      res.users[email] = { paid: 0, shouldPay: 0, repaid: 0, received: 0, photo: '', name: '' };
    });

    // 自分と相手のメールアドレスを特定
    const myEmail = user?.email;
    const partnerEmail = ALLOWED_EMAILS.find(e => e !== myEmail);

    expenses.forEach(ex => {
      // 1. アイコンと名前の更新（ここを修正！）
      // 誰が払ったか(payerEmail)に関係なく、「入力した人(uid)」の情報を正しい箱に入れる
      
      if (user && ex.uid === user.uid) {
        // 自分が入力したデータなら、自分のアイコンとして採用
        if (myEmail && res.users[myEmail]) {
            res.users[myEmail].photo = ex.userPhoto;
            res.users[myEmail].name = ex.userName;
        }
      } else {
        // 自分じゃない人が入力したデータなら、それはパートナー（彼女）のアイコン
        // ※「自分以外＝彼女」とみなす
        if (partnerEmail && res.users[partnerEmail]) {
            res.users[partnerEmail].photo = ex.userPhoto;
            res.users[partnerEmail].name = ex.userName;
        }
      }

      // 2. お金の計算（ここは今まで通り）
      let payerEmail = ex.payerEmail;
      // 古いデータなどでpayerEmailがない場合の救済措置
      if (!payerEmail && ex.uid === user?.uid) payerEmail = user?.email;
      if (!payerEmail) return; // それでも不明なら計算しない

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

  const displayExpenses = useMemo(() => {
    return expenses.filter(ex => {
      const d = ex.date?.toDate();
      if (!d) return false;
      if (viewMode === 'calendar') {
        return format(d, 'yyyy-MM-dd') === selectedDateStr;
      } else {
        return format(d, 'yyyy-MM') === currentMonthStr;
      }
    });
  }, [expenses, viewMode, selectedDateStr, currentMonthStr]);

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
      }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast("編集モードです✏️");
  };

  // ログイン処理（ポップアップ方式に変更）
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed", error);
      toast.error("ログインに失敗しました");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FFF5F7] text-pink-400 font-bold animate-pulse">読み込み中...💕</div>;

  return (
    <main className="min-h-screen bg-[#FFF5F7] text-slate-600 pb-24 font-sans selection:bg-pink-200">
      <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: '20px', background: 'rgba(255,255,255,0.9)', color: '#333' } }} />
      
      <SettlementModal 
        isOpen={isSettleModalOpen} 
        onClose={() => setIsSettleModalOpen(false)}
        onSettle={handleSettleSubmit}
        maxAmount={myDiff}
        users={stats.users}
        currentUserEmail={user?.email || ""}
        partnerEmail={ALLOWED_EMAILS.find(e => e !== user?.email) || ""}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentBudget={budget}
        currentCategories={categories}
        onSave={handleSaveSettings}
      />

      <div className="max-w-md mx-auto px-5">
        <header className="pt-10 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-700">ふたりの家計簿 🧸</h1>
            <p className="text-[10px] text-pink-400 font-bold mt-1">Two people's household account book</p>
          </div>
          <div className="flex gap-3">
             {user && (
                 <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                     ⚙️
                 </button>
             )}
             {user && (
                <button onClick={() => { if(window.confirm('ログアウトしますか？')) signOut(auth) }} className="transition-transform hover:scale-110">
                <img src={user.photoURL || ""} className="w-10 h-10 rounded-full border-2 border-white shadow-md" />
                </button>
             )}
          </div>
        </header>

        {user && isAllowed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <div className="flex gap-2">
                <div className="bg-white p-1 rounded-full shadow-sm flex text-xs font-bold flex-1">
                    <button onClick={() => setViewMode('list')} className={`flex-1 py-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-pink-400 text-white shadow-md' : 'text-slate-400'}`}>📋 リスト</button>
                    <button onClick={() => setViewMode('calendar')} className={`flex-1 py-2 rounded-full transition-all ${viewMode === 'calendar' ? 'bg-pink-400 text-white shadow-md' : 'text-slate-400'}`}>📅 カレンダー</button>
                </div>
                {viewMode === 'list' && (
                    <div className="bg-white p-1 rounded-full shadow-sm flex items-center px-2 gap-2 text-xs font-bold text-pink-400">
                        <button onClick={() => {const d = new Date(currentMonthStr); d.setMonth(d.getMonth() - 1); setCurrentMonthStr(format(d, 'yyyy-MM'));}}>←</button>
                        <span>{currentMonthStr.split('-')[1]}月</span>
                        <button onClick={() => {const d = new Date(currentMonthStr); d.setMonth(d.getMonth() + 1); setCurrentMonthStr(format(d, 'yyyy-MM'));}}>→</button>
                    </div>
                )}
            </div>

            {viewMode === 'list' ? (
                <>
                    <BudgetCard budget={budget} totalExpense={currentMonthTotal} />

                    <section className="relative overflow-hidden bg-white p-6 rounded-[30px] shadow-lg shadow-pink-100 text-center border border-pink-50">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-300 to-orange-200"></div>
                        <p className="text-pink-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Expenses (Selected)</p>
                        <div className="text-4xl font-black text-slate-700 tracking-tighter">
                            <span className="text-lg text-slate-400 mr-1">¥</span>
                            {displayExpenses.filter(e => e.type !== 'settlement').reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                        </div>
                    </section>
                    
                    <BalanceStatus 
                        stats={stats} 
                        currentUserEmail={user?.email || ""} 
                        onOpenSettleModal={() => setIsSettleModalOpen(true)} 
                    />

                    <SummaryChart expenses={displayExpenses.filter(e => e.type !== 'settlement')} />
                </>
            ) : (
                <CalendarView expenses={expenses} currentDate={selectedDateStr} onDateChange={setSelectedDateStr} />
            )}

            <ExpenseForm 
                user={user}
                users={stats.users}
                categories={categories}
                onSubmit={handleSaveExpense}
                editingData={editingEx}
                onCancelEdit={() => { setEditingEx(null); toast("キャンセルしました"); }}
            />

            <HistoryList 
                expenses={displayExpenses} 
                users={stats.users} 
                categories={categories}
                onEdit={handleEdit} 
                onDelete={handleDelete} 
            />
          </div>
        ) : (
           !loading && (
             <div className="text-center py-20">
               {/* ↓ ここも signInWithPopup を使うように変更済み */}
               <button onClick={handleLogin} className="bg-slate-800 text-white px-8 py-4 rounded-full font-bold">
                 Googleでログイン
               </button>
             </div>
           )
        )}
      </div>
    </main>
  );
}