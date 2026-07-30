/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ExamResult, GradeLevel, GoogleSheetsConfig, ExamQuestion } from './types';
import ExamFormView from './components/ExamFormView';
import DashboardView from './components/DashboardView';
import AppsScriptView from './components/AppsScriptView';
import QuestionsManagerView from './components/QuestionsManagerView';
import AuthView from './components/AuthView';
import { 
  FileSpreadsheet, ClipboardList, Database, Key, HelpCircle, 
  Settings, Check, X, Sparkles, AlertCircle, MonitorPlay,
  BookOpen, Upload, Image as ImageIcon, Trash2, LogOut, User as UserIcon
} from 'lucide-react';
import { SOVANNAPHUMI_LOGO_DATA_URL } from './assets/sovannaphumiLogo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<'survey' | 'dashboard' | 'script' | 'questions'>('dashboard');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [schoolLogo, setSchoolLogo] = useState(SOVANNAPHUMI_LOGO_DATA_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [tempLogo, setTempLogo] = useState(SOVANNAPHUMI_LOGO_DATA_URL);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isStudentView, setIsStudentView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.emailVerified) {
        await signOut(auth);
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
              await setDoc(userRef, {
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                plan: 'Pro Plan',
                createdAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (e) {
            console.warn('Error syncing user profile to Firestore:', e);
          }
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load configuration and check URL params
  useEffect(() => {
    const savedUrl = localStorage.getItem('computer_exam_sheets_webapp_url');
    if (savedUrl) {
      setWebAppUrl(savedUrl);
      setTempUrl(savedUrl);
    }

    const savedLogo = localStorage.getItem('computer_exam_school_logo');
    if (savedLogo && savedLogo.startsWith('data:image')) {
      setSchoolLogo(savedLogo);
      setTempLogo(savedLogo);
    } else {
      setSchoolLogo(SOVANNAPHUMI_LOGO_DATA_URL);
      setTempLogo(SOVANNAPHUMI_LOGO_DATA_URL);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'student' || params.get('role') === 'student') {
      setIsStudentView(true);
      setActiveView('survey');
    }
  }, []);

  // Function to load responses from backend Express server
  const fetchResultsFromServer = async () => {
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to load results from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load and poll state from server
  useEffect(() => {
    fetchResultsFromServer();

    // Set up polling for real-time updates when on dashboard
    let interval: NodeJS.Timeout | null = null;
    if (activeView === 'dashboard' && !isStudentView) {
      interval = setInterval(() => {
        fetchResultsFromServer();
      }, 5000); // 5 seconds polling
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeView, isStudentView]);

  // Submit hander
  const handleExamSubmit = async (newExam: Omit<ExamResult, 'id' | 'createdAt' | 'teacherNotes'>) => {
    let calculatedScore = 0;
    let calculatedTotalScore = 0;

    try {
      const qRes = await fetch(`/api/questions?gradeLevel=${newExam.gradeLevel}`);
      if (qRes.ok) {
        const questions: ExamQuestion[] = await qRes.json();
        
        questions.forEach(q => {
          const studentAnswer = (newExam.answers[q.id] || '').toString().trim().toLowerCase();
          const correctAnswer = (q.correctAnswer || '').toString().trim().toLowerCase();
          const points = q.points || 1;
          
          if (q.type !== 'essay') {
            calculatedTotalScore += points;
            if (studentAnswer === correctAnswer) {
              calculatedScore += points;
            }
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch questions for scoring", err);
    }

    const createdResult = {
      ...newExam,
      score: calculatedScore,
      totalScore: calculatedTotalScore,
      teacherNotes: '',
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdResult)
      });
      
      if (res.ok) {
        const result = await res.json();
        setResults(prev => [result.data, ...prev]);
        
        // If Google Sheet Web App URL is configured, push to Google Sheets automatically!
        if (webAppUrl) {
          try {
            await fetch(webAppUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(result.data)
            });
          } catch (err) {
            console.error("Failed to sync with Google Sheet:", err);
          }
        }
        return { success: true, score: calculatedScore, total: calculatedTotalScore };
      }
    } catch (err) {
      console.error("Failed to save exam to server:", err);
    }

    // Fallback if server API is unavailable
    const id = Date.now().toString();
    const fallbackResult: ExamResult = {
      ...createdResult,
      id,
    };
    const updatedList = [fallbackResult, ...results];
    setResults(updatedList);
    localStorage.setItem('computer_exam_results', JSON.stringify(updatedList));
    return { success: true, score: calculatedScore, total: calculatedTotalScore };
  };

  const handleUpdateResult = async (updated: ExamResult) => {
    try {
      const res = await fetch(`/api/results/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const result = await res.json();
        setResults(prev => prev.map(r => r.id === result.data.id ? result.data : r));
        return;
      }
    } catch (err) {
      console.error("Failed to update result on server:", err);
    }

    // Fallback
    const updatedList = results.map(r => r.id === updated.id ? updated : r);
    setResults(updatedList);
    localStorage.setItem('computer_exam_results', JSON.stringify(updatedList));
  };

  const handleDeleteResult = async (id: string) => {
    try {
      const res = await fetch(`/api/results/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setResults(prev => prev.filter(r => r.id !== id));
        return;
      }
    } catch (err) {
      console.error("Failed to delete result on server:", err);
    }

    // Fallback
    const updatedList = results.filter(r => r.id !== id);
    setResults(updatedList);
    localStorage.setItem('computer_exam_results', JSON.stringify(updatedList));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ទំហំរូបភាពធំពេក! សូមជ្រើសរើសរូបភាពដែលមានទំហំក្រោម 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setTempLogo('');
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setWebAppUrl(tempUrl);
    setSchoolLogo(tempLogo);
    localStorage.setItem('computer_exam_sheets_webapp_url', tempUrl);
    localStorage.setItem('computer_exam_school_logo', tempLogo);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      {!isStudentView ? (
        <header className="bg-[#0f2a4a] text-white border-b-2 border-amber-400 shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo and Brand */}
              <div className="flex items-center gap-3">
                {schoolLogo ? (
                  <img 
                    src={schoolLogo} 
                    alt="School Logo" 
                    className="h-12 w-12 rounded-full object-contain border-2 border-white shadow-sm bg-white shrink-0 p-0.5" 
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-amber-400 flex items-center justify-center font-sans font-bold text-[#0f2a4a] shadow-inner text-lg border-2 border-white shrink-0">
                    <MonitorPlay className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight font-sans text-amber-400">
                    ប្រព័ន្ធប្រឡងកុំព្យូទ័រ
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-200 uppercase tracking-widest font-semibold">
                    Computer Subject Exam
                  </p>
                </div>
              </div>

              {/* Navigation Tabs (Only when authenticated) */}
              {currentUser && (
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeView === 'dashboard'
                        ? 'bg-amber-400 text-[#0f2a4a]'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Database className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">ផ្ទាំងគ្រប់គ្រង</span>
                  </button>

                  <button
                    onClick={() => setActiveView('questions')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeView === 'questions'
                        ? 'bg-amber-400 text-[#0f2a4a]'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">គ្រប់គ្រងវិញ្ញាសា</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveView('survey')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeView === 'survey'
                        ? 'bg-amber-400 text-[#0f2a4a]'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">ផ្ទាំងប្រឡង</span>
                  </button>

                  <button
                    onClick={() => setActiveView('script')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      activeView === 'script'
                        ? 'bg-amber-400 text-[#0f2a4a]'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <FileSpreadsheet className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">កូដ Google Script</span>
                  </button>

                  <button
                    onClick={() => {
                      setTempUrl(webAppUrl);
                      setTempLogo(schoolLogo);
                      setShowSettings(true);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                    title="ការកំណត់ប្រព័ន្ធ"
                  >
                    <Settings className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-700">
                    <span className="hidden lg:inline text-xs text-amber-200 font-medium truncate max-w-[140px]" title={currentUser.email || ''}>
                      {currentUser.email}
                    </span>
                    <button
                      onClick={() => setShowSignOutConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition cursor-pointer"
                      title="ចាកចេញ (Sign Out)"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">ចាកចេញ</span>
                    </button>
                  </div>
                </nav>
              )}
            </div>
          </div>
        </header>
      ) : (
        <header className="bg-[#0f2a4a] text-white border-b-2 border-amber-400 shadow-md py-6 text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
            {schoolLogo ? (
              <img 
                src={schoolLogo} 
                alt="School Logo" 
                className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-md bg-white shrink-0" 
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-amber-400 flex items-center justify-center font-bold text-[#0f2a4a] shadow-md border-2 border-white shrink-0">
                <MonitorPlay className="h-7 w-7" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 font-sans">
                ការប្រឡងមុខវិជ្ជាកុំព្យូទ័រ
              </h1>
              <p className="text-xs text-slate-200 uppercase tracking-widest font-semibold mt-0.5">
                សម្រាប់សិស្សានុសិស្សចាប់ពីថ្នាក់ទី១ ដល់ថ្នាក់ទី១២
              </p>
            </div>
          </div>
        </header>
      )}

      {/* Settings Dialog Overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSettings(false)} />
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 relative z-10">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Settings className="h-5 w-5 text-amber-500" />
              ការកំណត់ប្រព័ន្ធ (System Settings)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              គ្រប់គ្រងការភ្ជាប់ Google Sheet សម្រាប់ស្វ័យប្រវត្តិតារាងទិន្នន័យប្រឡង។
            </p>

            <form onSubmit={saveSettings} className="space-y-4">
              {/* Google Sheets WebApp URL */}

              {/* Google Sheets WebApp URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-amber-500" />
                  Web App API URL (Google Sheet)
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={tempUrl}
                  onChange={e => setTempUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs outline-none"
                />
              </div>

              {settingsSaved && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>រក្សាទុកដោយជោគជ័យ!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sheet Banner alerting user to configure webhook if not already done */}
      {!webAppUrl && activeView !== 'script' && !isStudentView && currentUser && (
        <div className="bg-amber-50 border-b border-amber-100 text-amber-800 py-3 px-4 text-xs font-medium">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
            <span className="flex items-center gap-1.5 leading-relaxed">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              អ្នកមិនទាន់បានភ្ជាប់ Google Sheet របស់សាលានៅឡើយទេ។ ចម្លងកូដ Apps Script ឥតគិតថ្លៃរបស់យើងដើម្បីតភ្ជាប់ឥឡូវនេះ!
            </span>
            <button
              onClick={() => setActiveView('script')}
              className="underline hover:text-[#0f2a4a] font-bold self-start sm:self-auto cursor-pointer"
            >
              របៀបតភ្ជាប់ &gt;
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin text-2xl text-amber-500">⏳</div>
          </div>
        ) : !currentUser && !isStudentView ? (
          <AuthView 
            schoolLogo={schoolLogo} 
            onSuccessRedirect={() => setActiveView('dashboard')} 
          />
        ) : (
          <>
            {activeView === 'survey' && (
              <ExamFormView onSubmit={handleExamSubmit} webAppUrl={webAppUrl} schoolLogo={schoolLogo} />
            )}
            {activeView === 'questions' && (
              <QuestionsManagerView />
            )}
            {activeView === 'dashboard' && (
              <DashboardView 
                results={results} 
                onUpdateResult={handleUpdateResult}
                onDeleteResult={handleDeleteResult}
                schoolLogo={schoolLogo}
                userId={currentUser?.uid}
              />
            )}
            {activeView === 'script' && (
              <AppsScriptView />
            )}
          </>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© {new Date().getFullYear()} ប្រព័ន្ធប្រឡងកុំព្យូទ័រ (Computer Exam System). រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
          <p className="text-[20px] text-slate-300">លោកគ្រូ យៀន ឧត្តម</p>
        </div>
      </footer>

      {/* SIGN OUT CONFIRMATION MODAL */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-150 text-center">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
              <LogOut className="h-6 w-6" />
            </div>

            <h3 className="text-base font-bold text-[#0f2a4a]">
              បញ្ជាក់ការចាកចេញ (Confirm Sign Out)
            </h3>
            
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              តើអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ? អ្នកនឹងត្រូវចូលប្រើប្រាស់ឡើងវិញ ដើម្បីមើល និងគ្រប់គ្រងទិន្នន័យ។
            </p>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                បោះបង់ (Cancel)
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signOut(auth);
                    setActiveView('dashboard');
                  } catch (err) {
                    console.error('Error signing out:', err);
                  } finally {
                    setShowSignOutConfirm(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>ចាកចេញ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
