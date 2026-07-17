/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SurveyResponse, GradeLevel, GoogleSheetsConfig } from './types';
import SurveyFormView from './components/SurveyFormView';
import DashboardView from './components/DashboardView';
import AppsScriptView from './components/AppsScriptView';
import { 
  FileSpreadsheet, ClipboardList, Database, Key, HelpCircle, 
  Settings, Check, X, Sparkles, AlertCircle 
} from 'lucide-react';

const INITIAL_RESPONSES: SurveyResponse[] = [
  {
    id: "1",
    studentName: "សុខ មុន្នី",
    studentGender: "ប្រុស",
    gradeLevel: "បឋមសិក្សា",
    subGrade: "ថ្នាក់ទី១",
    teacherName: "អ្នកគ្រូ សូភី",
    parentName: "សុខ ផល្លា",
    date: "2026-07-10",
    ratings: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 3, 8: 3, 9: 3, 10: 2 },
    additionalComments: "គ្រូបន្ទុកថ្នាក់យកចិត្តទុកដាក់បង្រៀនល្អណាស់ កូនខ្ញុំរីកចម្រើនច្រើនផ្នែកសីលធម៌ និងការអាន។",
    teacherNotes: "សិស្សរហ័សរហួន និងស្តាប់បង្គាប់ល្អ។",
    createdAt: "2026-07-10T10:00:00.000Z"
  },
  {
    id: "2",
    studentName: "លី ដារ៉ា",
    studentGender: "ប្រុស",
    gradeLevel: "បឋមសិក្សា",
    subGrade: "ថ្នាក់ទី៣",
    teacherName: "លោកគ្រូ វណ្ណា",
    parentName: "លី ហួ",
    date: "2026-07-12",
    ratings: { 1: 2, 2: 2, 3: 3, 4: 2, 5: 3, 6: 1, 7: 2, 8: 2, 9: 3, 10: 1 },
    additionalComments: "សំណូមពរឱ្យលោកគ្រូជួយផ្ញើកិច្ចការផ្ទះក្នុងគ្រុបតេឡេក្រាមឱ្យបានលឿនបន្តិច ព្រោះពេលខ្លះយប់ពេកពិបាកបង្រៀនកូន។",
    teacherNotes: "ត្រូវបង្កើនការទំនាក់ទំនងជាមួយអាណាព្យាបាលសិស្សបន្ថែម។",
    createdAt: "2026-07-12T14:30:00.000Z"
  },
  {
    id: "3",
    studentName: "គឹម សុជាតា",
    studentGender: "ស្រី",
    gradeLevel: "មតេយ្យ",
    subGrade: "មតេយ្យកម្រិតខ្ពស់ (Kindergarten)",
    teacherName: "អ្នកគ្រូ ចិន្តា",
    parentName: "ជា សុខឃីម",
    date: "2026-07-15",
    ratings: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 },
    additionalComments: "ពេញចិត្តខ្លាំងណាស់ចំពោះសកម្មភាពបំណិនជីវិត និងការលេងកម្សាន្តរបស់កូនៗ។",
    teacherNotes: "ចូលចិត្តលេងជាមួយមិត្តភក្តិ និងរួសរាយ។",
    createdAt: "2026-07-15T09:15:00.000Z"
  }
];

export default function App() {
  const [activeView, setActiveView] = useState<'survey' | 'dashboard' | 'script'>('dashboard');
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [webAppUrl, setWebAppUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isParentView, setIsParentView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration and check URL params
  useEffect(() => {
    const savedUrl = localStorage.getItem('sovannaphumi_sheets_webapp_url');
    if (savedUrl) {
      setWebAppUrl(savedUrl);
      setTempUrl(savedUrl);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'parent' || params.get('role') === 'parent') {
      setIsParentView(true);
      setActiveView('survey');
    }
  }, []);

  // Function to load responses from backend Express server
  const fetchResponsesFromServer = async () => {
    try {
      const res = await fetch('/api/responses');
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
      }
    } catch (err) {
      console.error('Failed to load responses from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load and poll state from server
  useEffect(() => {
    fetchResponsesFromServer();

    // Set up polling for real-time updates when on dashboard
    let interval: NodeJS.Timeout | null = null;
    if (activeView === 'dashboard' && !isParentView) {
      interval = setInterval(() => {
        fetchResponsesFromServer();
      }, 5000); // 5 seconds polling
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeView, isParentView]);

  // Submit hander
  const handleSurveySubmit = async (newSurvey: Omit<SurveyResponse, 'id' | 'createdAt' | 'teacherNotes'>) => {
    const createdResponse = {
      ...newSurvey,
      teacherNotes: '',
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdResponse)
      });
      
      if (res.ok) {
        const result = await res.json();
        setResponses(prev => [result.data, ...prev]);
        
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
        return true;
      }
    } catch (err) {
      console.error("Failed to save survey to server:", err);
    }

    // Fallback if server API is unavailable
    const id = Date.now().toString();
    const fallbackResponse: SurveyResponse = {
      ...createdResponse,
      id,
    };
    const updatedList = [fallbackResponse, ...responses];
    setResponses(updatedList);
    localStorage.setItem('sovannaphumi_survey_responses', JSON.stringify(updatedList));
    return true;
  };

  const handleUpdateResponse = async (updated: SurveyResponse) => {
    try {
      const res = await fetch(`/api/responses/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        const result = await res.json();
        setResponses(prev => prev.map(r => r.id === result.data.id ? result.data : r));
        return;
      }
    } catch (err) {
      console.error("Failed to update response on server:", err);
    }

    // Fallback
    const updatedList = responses.map(r => r.id === updated.id ? updated : r);
    setResponses(updatedList);
    localStorage.setItem('sovannaphumi_survey_responses', JSON.stringify(updatedList));
  };

  const handleDeleteResponse = async (id: string) => {
    try {
      const res = await fetch(`/api/responses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setResponses(prev => prev.filter(r => r.id !== id));
        return;
      }
    } catch (err) {
      console.error("Failed to delete response on server:", err);
    }

    // Fallback
    const updatedList = responses.filter(r => r.id !== id);
    setResponses(updatedList);
    localStorage.setItem('sovannaphumi_survey_responses', JSON.stringify(updatedList));
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setWebAppUrl(tempUrl);
    localStorage.setItem('sovannaphumi_sheets_webapp_url', tempUrl);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      {!isParentView ? (
        <header className="bg-[#0f2a4a] text-white border-b-2 border-amber-400 shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              {/* Logo and Brand */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-400 flex items-center justify-center font-sans font-bold text-[#0f2a4a] shadow-inner text-lg border-2 border-white">
                  SPS
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight font-sans text-amber-400">
                    សាលារៀនសុវណ្ណភូមិ
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-200 uppercase tracking-widest font-semibold">
                    Sovannaphumi School Survey
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
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
                  onClick={() => setActiveView('survey')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeView === 'survey'
                      ? 'bg-amber-400 text-[#0f2a4a]'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">បំពេញសំណួរ</span>
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
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition cursor-pointer"
                  title="Google Sheets Configuration"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </nav>
            </div>
          </div>
        </header>
      ) : (
        <header className="bg-[#0f2a4a] text-white border-b-2 border-amber-400 shadow-md py-6 text-center">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-full bg-amber-400 flex items-center justify-center font-bold text-[#0f2a4a] shadow-md border-2 border-white">
              SPS
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-400 font-sans">
                សាលារៀនសុវណ្ណភូមិ
              </h1>
              <p className="text-xs text-slate-200 uppercase tracking-widest font-semibold mt-0.5">
                ទម្រង់ស្ទង់មតិការសិក្សាសម្រាប់មាតាបិតា/អាណាព្យាបាលសិស្ស
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
              <Key className="h-5 w-5 text-amber-500" />
              ការកំណត់ការភ្ជាប់ Google Sheet
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              បញ្ចូល <strong className="text-slate-600">Google Apps Script Web App URL</strong> ដែលបានមកពីការ Deploy របស់អ្នក ដើម្បីបញ្ជូនទិន្នន័យស្វ័យប្រវត្តិទៅកាន់ Google Sheet។
            </p>

            <form onSubmit={saveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Web App API URL</label>
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
      {!webAppUrl && activeView !== 'script' && !isParentView && (
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
        {activeView === 'survey' && (
          <SurveyFormView onSubmit={handleSurveySubmit} webAppUrl={webAppUrl} />
        )}
        {activeView === 'dashboard' && (
          <DashboardView 
            responses={responses} 
            onUpdateResponse={handleUpdateResponse}
            onDeleteResponse={handleDeleteResponse}
          />
        )}
        {activeView === 'script' && (
          <AppsScriptView />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© {new Date().getFullYear()} សាលារៀនសុវណ្ណភូមិ (Sovannaphumi School). រក្សាសិទ្ធិគ្រប់យ៉ាង។</p>
          <p className="text-[10px] text-slate-300">ប្រព័ន្ធគ្រប់គ្រងការស្ទង់មតិ និងស្វ័យប្រវត្តិតារាងទិន្នន័យ Google Workspace</p>
        </div>
      </footer>
    </div>
  );
}
