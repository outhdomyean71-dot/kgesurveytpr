/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SURVEY_QUESTIONS, SurveyResponse, GradeLevel } from '../types';
import { 
  Users, Award, ThumbsUp, MessageSquare, Search, Filter, Calendar, 
  Trash2, FileDown, CheckCircle, Sparkles, AlertCircle, Copy, Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardViewProps {
  responses: SurveyResponse[];
  onUpdateResponse: (updated: SurveyResponse) => void;
  onDeleteResponse: (id: string) => void;
}

export default function DashboardView({ responses, onUpdateResponse, onDeleteResponse }: DashboardViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel | 'ទាំងអស់'>('ទាំងអស់');
  const [selectedSubGrade, setSelectedSubGrade] = useState<string>('ទាំងអស់');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'list'>('analytics');
  const [copiedParentLink, setCopiedParentLink] = useState(false);
  
  // Selection for detailed view modal
  const [detailedResponse, setDetailedResponse] = useState<SurveyResponse | null>(null);
  const [teacherNotesEdit, setTeacherNotesEdit] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  // Filter responses
  const filteredResponses = responses.filter(r => {
    const matchesLevel = selectedLevel === 'ទាំងអស់' || r.gradeLevel === selectedLevel;
    const matchesSubGrade = selectedSubGrade === 'ទាំងអស់' || r.subGrade === selectedSubGrade;
    const matchesSearch = searchQuery === '' || 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSubGrade && matchesSearch;
  });

  // Calculate metrics
  const totalCount = filteredResponses.length;
  
  const averageSatisfaction = totalCount === 0 ? 0 : (() => {
    let sum = 0;
    let count = 0;
    filteredResponses.forEach(r => {
      Object.values(r.ratings).forEach(val => {
        sum += val;
        count++;
      });
    });
    return Number((sum / count).toFixed(2));
  })();

  // Satisfaction levels count (3 = ពេញចិត្តណាស់, 2 = ពេញចិត្ត, 1 = មិនពេញចិត្ត)
  const ratingCounts = { 1: 0, 2: 0, 3: 0 };
  let totalRatingsCount = 0;
  filteredResponses.forEach(r => {
    Object.values(r.ratings).forEach(val => {
      if (val === 1 || val === 2 || val === 3) {
        ratingCounts[val as 1 | 2 | 3]++;
        totalRatingsCount++;
      }
    });
  });

  const satisfiedPercent = totalRatingsCount === 0 ? 0 : Math.round(((ratingCounts[2] + ratingCounts[3]) / totalRatingsCount) * 100);
  const verySatisfiedPercent = totalRatingsCount === 0 ? 0 : Math.round((ratingCounts[3] / totalRatingsCount) * 100);

  // List of unique subGrades present
  const subGrades = Array.from(new Set(responses.map(r => r.subGrade)));

  // Calculate level-specific statistics for summary filtering cards
  const kgResponses = responses.filter(r => r.gradeLevel === 'មតេយ្យ');
  const kgCount = kgResponses.length;
  const kgAvg = kgCount === 0 ? 0 : (() => {
    let sum = 0;
    let count = 0;
    kgResponses.forEach(r => {
      Object.values(r.ratings).forEach(val => {
        sum += val;
        count++;
      });
    });
    return Number((sum / count).toFixed(2));
  })();

  const primaryResponses = responses.filter(r => r.gradeLevel === 'បឋមសិក្សា');
  const primaryCount = primaryResponses.length;
  const primaryAvg = primaryCount === 0 ? 0 : (() => {
    let sum = 0;
    let count = 0;
    primaryResponses.forEach(r => {
      Object.values(r.ratings).forEach(val => {
        sum += val;
        count++;
      });
    });
    return Number((sum / count).toFixed(2));
  })();

  // Open detailed survey response
  const openDetails = (response: SurveyResponse) => {
    setDetailedResponse(response);
    setTeacherNotesEdit(response.teacherNotes || '');
  };

  // Close details
  const closeDetails = () => {
    setDetailedResponse(null);
  };

  // Save Teacher Notes
  const saveTeacherNotes = () => {
    if (!detailedResponse) return;
    const updated: SurveyResponse = {
      ...detailedResponse,
      teacherNotes: teacherNotesEdit
    };
    onUpdateResponse(updated);
    setDetailedResponse(updated);
  };

  // Trigger Gemini Analysis
  const analyzeWithAI = async () => {
    if (!detailedResponse) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey: detailedResponse }),
      });
      const data = await res.json();
      if (data.analysis) {
        const updated: SurveyResponse = {
          ...detailedResponse,
          aiRecommendation: data.analysis
        };
        onUpdateResponse(updated);
        setDetailedResponse(updated);
      } else if (data.error) {
        alert("កំហុស៖ " + data.error);
      }
    } catch (err: any) {
      alert("បរាជ័យក្នុងការទំនាក់ទំនងជាមួយ AI៖ " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyAiText = () => {
    if (!detailedResponse?.aiRecommendation) return;
    navigator.clipboard.writeText(detailedResponse.aiRecommendation);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  // Export to CSV helper
  const exportToCSV = () => {
    if (filteredResponses.length === 0) return;
    
    // Header
    const csvRows = [
      [
        "កាលបរិច្ឆេទ", "ឈ្មោះអាណាព្យាបាល", "ឈ្មោះសិស្ស", "ភេទ", "កម្រិតថ្នាក់", "ថ្នាក់សិក្សា", "ឈ្មោះគ្រូ",
        "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "មតិយោបល់បន្ថែម", "កំណត់សម្គាល់របស់គ្រូ"
      ].join(",")
    ];

    filteredResponses.forEach(r => {
      const row = [
        `"${r.date}"`,
        `"${r.parentName}"`,
        `"${r.studentName}"`,
        `"${r.studentGender}"`,
        `"${r.gradeLevel}"`,
        `"${r.subGrade}"`,
        `"${r.teacherName}"`,
        r.ratings[1] || 1,
        r.ratings[2] || 1,
        r.ratings[3] || 1,
        r.ratings[4] || 1,
        r.ratings[5] || 1,
        r.ratings[6] || 1,
        r.ratings[7] || 1,
        r.ratings[8] || 1,
        r.ratings[9] || 1,
        r.ratings[10] || 1,
        `"${(r.additionalComments || "").replace(/"/g, '""')}"`,
        `"${(r.teacherNotes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `កម្រងសំណួរស្ទង់មតិ_${selectedLevel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Parent Share Link & Real-time Live Status Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-400 text-[#0f2a4a] rounded-xl shadow-inner shrink-0">
            <Users className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0f2a4a] flex flex-wrap items-center gap-2">
              តំណភ្ជាប់ស្ទង់មតិសម្រាប់មាតាបិតា/អាណាព្យាបាលសិស្ស
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                រត់ស្វ័យប្រវត្តិ (Real-time Sync Live)
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ចម្លងតំណភ្ជាប់ខាងក្រោមដើម្បីផ្ញើជូនអាណាព្យាបាលបំពេញសំណួរ។ ពេលអាណាព្យាបាលបំពេញរួច ទិន្នន័យនឹងលោតចូលក្នុងប្រព័ន្ធនេះដោយស្វ័យប្រវត្តិតែម្តង!
            </p>
            <div className="mt-2.5 flex items-center gap-2 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 w-full max-w-xl text-[11px] font-mono text-slate-600 overflow-x-auto select-all">
              <span>{typeof window !== 'undefined' ? `${window.location.origin}/?mode=parent` : 'https://sovannaphumi-survey.com/?mode=parent'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            const url = typeof window !== 'undefined' ? `${window.location.origin}/?mode=parent` : 'https://sovannaphumi-survey.com/?mode=parent';
            navigator.clipboard.writeText(url);
            setCopiedParentLink(true);
            setTimeout(() => setCopiedParentLink(false), 2000);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            copiedParentLink 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 hover:text-white shadow-sm'
          }`}
        >
          {copiedParentLink ? (
            <>
              <Check className="h-4 w-4" />
              ចម្លងជោគជ័យ!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              ចម្លងតំណភ្ជាប់
            </>
          )}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Level Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            {(['ទាំងអស់', 'មតេយ្យ', 'បឋមសិក្សា'] as const).map(level => (
              <button
                key={level}
                onClick={() => {
                  setSelectedLevel(level);
                  setSelectedSubGrade('ទាំងអស់');
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer ${
                  selectedLevel === level
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {level === 'ទាំងអស់' ? 'គ្រប់កម្រិតថ្នាក់' : level}
              </button>
            ))}
          </div>

          {/* Search Inputs & Export */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:justify-end">
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះសិស្ស អាណាព្យាបាល គ្រូ..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-xs outline-none"
              />
            </div>

            {/* Sub-Grade selector */}
            <div className="relative">
              <select
                value={selectedSubGrade}
                onChange={e => setSelectedSubGrade(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-700 text-xs outline-none cursor-pointer"
              >
                <option value="ទាំងអស់">ថ្នាក់នីមួយៗ (ទាំងអស់)</option>
                {(selectedLevel === 'ទាំងអស់' ? subGrades : subGrades.filter(s => {
                  if (selectedLevel === 'មតេយ្យ') return s.includes('មតេយ្យ') || s.includes('Nursery') || s.includes('Kindergarten');
                  return s.includes('ថ្នាក់');
                })).map(sg => (
                  <option key={sg} value={sg}>{sg}</option>
                ))}
              </select>
              <Filter className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={exportToCSV}
              disabled={filteredResponses.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer disabled:cursor-not-allowed transition"
            >
              <FileDown className="h-4 w-4" />
              ទាញយកជា CSV
            </button>
          </div>
        </div>
      </div>

      {/* Grade Level Interactive Reporting Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="grade-level-filters">
        {/* All Levels Card */}
        <div 
          onClick={() => {
            setSelectedLevel('ទាំងអស់');
            setSelectedSubGrade('ទាំងអស់');
          }}
          className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 cursor-pointer ${
            selectedLevel === 'ទាំងអស់'
              ? 'bg-gradient-to-br from-[#0f2a4a] to-[#1a3d66] text-white border-[#0f2a4a] ring-2 ring-blue-500/10'
              : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
          }`}
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              selectedLevel === 'ទាំងអស់' ? 'bg-amber-400 text-[#0f2a4a]' : 'bg-slate-100 text-slate-600'
            }`}>
              គ្រប់កម្រិតសិក្សា (All Levels)
            </span>
            <Users className={`h-5 w-5 ${selectedLevel === 'ទាំងអស់' ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xs font-semibold ${selectedLevel === 'ទាំងអស់' ? 'text-slate-300' : 'text-slate-400'}`}>ចម្លើយតបសរុបទាំងអស់</p>
          <h4 className="text-2xl font-bold font-sans mt-1">{responses.length} នាក់</h4>
          <p className={`text-[10px] mt-2 ${selectedLevel === 'ទាំងអស់' ? 'text-slate-400/80' : 'text-slate-400'}`}>
            {selectedLevel === 'ទាំងអស់' ? '● កំពុងបង្ហាញគ្រប់កម្រិតសិក្សា' : 'ចុចដើម្បីបង្ហាញទិន្នន័យរួមគ្រប់ថ្នាក់'}
          </p>
        </div>

        {/* Kindergarten Card */}
        <div 
          onClick={() => {
            setSelectedLevel('មតេយ្យ');
            setSelectedSubGrade('ទាំងអស់');
          }}
          className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 cursor-pointer ${
            selectedLevel === 'មតេយ្យ'
              ? 'bg-gradient-to-br from-orange-600 to-amber-700 text-white border-orange-600 ring-2 ring-orange-500/10'
              : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
          }`}
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              selectedLevel === 'មតេយ្យ' ? 'bg-white text-orange-700' : 'bg-orange-50 text-orange-600'
            }`}>
              កម្រិតមតេយ្យសិក្សា (Kindergarten)
            </span>
            <Sparkles className={`h-5 w-5 ${selectedLevel === 'មតេយ្យ' ? 'text-amber-300' : 'text-orange-400'}`} />
          </div>
          <div className="flex justify-between items-baseline">
            <div>
              <p className={`text-xs font-semibold ${selectedLevel === 'មតេយ្យ' ? 'text-orange-100' : 'text-slate-400'}`}>ចម្លើយស្ទង់មតិ</p>
              <h4 className="text-2xl font-bold font-sans mt-1">{kgCount} នាក់</h4>
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${selectedLevel === 'មតេយ្យ' ? 'text-orange-100' : 'text-slate-400'}`}>ពិន្ទុមធ្យម</p>
              <h4 className="text-lg font-bold font-sans mt-1">{kgAvg} / 3.0</h4>
            </div>
          </div>
          <p className={`text-[10px] mt-2 ${selectedLevel === 'មតេយ្យ' ? 'text-orange-200/80' : 'text-slate-400'}`}>
            {selectedLevel === 'មតេយ្យ' ? '● កំពុងច្រោះបង្ហាញកម្រិតមតេយ្យសិក្សា' : 'ចុចដើម្បីច្រោះមើលរបាយការណ៍មតេយ្យសិក្សា'}
          </p>
        </div>

        {/* Primary Card */}
        <div 
          onClick={() => {
            setSelectedLevel('បឋមសិក្សា');
            setSelectedSubGrade('ទាំងអស់');
          }}
          className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 cursor-pointer ${
            selectedLevel === 'បឋមសិក្សា'
              ? 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white border-blue-700 ring-2 ring-blue-500/10'
              : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
          }`}
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
              selectedLevel === 'បឋមសិក្សា' ? 'bg-white text-blue-700' : 'bg-blue-50 text-blue-600'
            }`}>
              កម្រិតបឋមសិក្សា (Primary)
            </span>
            <Award className={`h-5 w-5 ${selectedLevel === 'បឋមសិក្សា' ? 'text-amber-300' : 'text-blue-400'}`} />
          </div>
          <div className="flex justify-between items-baseline">
            <div>
              <p className={`text-xs font-semibold ${selectedLevel === 'បឋមសិក្សា' ? 'text-blue-100' : 'text-slate-400'}`}>ចម្លើយស្ទង់មតិ</p>
              <h4 className="text-2xl font-bold font-sans mt-1">{primaryCount} នាក់</h4>
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${selectedLevel === 'បឋមសិក្សា' ? 'text-blue-100' : 'text-slate-400'}`}>ពិន្ទុមធ្យម</p>
              <h4 className="text-lg font-bold font-sans mt-1">{primaryAvg} / 3.0</h4>
            </div>
          </div>
          <p className={`text-[10px] mt-2 ${selectedLevel === 'បឋមសិក្សា' ? 'text-blue-200/80' : 'text-slate-400'}`}>
            {selectedLevel === 'បឋមសិក្សា' ? '● កំពុងច្រោះបង្ហាញកម្រិតបឋមសិក្សា' : 'ចុចដើម្បីច្រោះមើលរបាយការណ៍បឋមសិក្សា'}
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">ចំនួនចម្លើយស្ទង់មតិ</p>
            <h4 className="text-2xl font-bold text-slate-800 font-sans mt-0.5">{totalCount} នាក់</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">កម្រិតពេញចិត្តមធ្យម</p>
            <h4 className="text-2xl font-bold text-slate-800 font-sans mt-0.5">{averageSatisfaction} / 3.0</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ThumbsUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">អត្រាពេញចិត្តសរុប</p>
            <h4 className="text-2xl font-bold text-slate-800 font-sans mt-0.5">{satisfiedPercent}%</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">អត្រាពេញចិត្តខ្លាំង</p>
            <h4 className="text-2xl font-bold text-slate-800 font-sans mt-0.5">{verySatisfiedPercent}%</h4>
          </div>
        </div>
      </div>

      {/* Main Container tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'analytics'
                  ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              វិភាគលទ្ធផលទូទៅ (Visual Analytics)
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'list'
                  ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              បញ្ជីចម្លើយស្ទង់មតិ ({filteredResponses.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredResponses.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">មិនទាន់មានទិន្នន័យស្ទង់មតិត្រូវគ្នានឹងការជ្រើសរើសរបស់អ្នកនៅឡើយទេ។</p>
            </div>
          ) : activeTab === 'analytics' ? (
            /* Visual Analytics Tab */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {SURVEY_QUESTIONS.map(q => {
                // Calculate score distribution for this question
                const dist = { 1: 0, 2: 0, 3: 0 };
                let qTotal = 0;
                filteredResponses.forEach(r => {
                  const rating = r.ratings[q.id];
                  if (rating === 1 || rating === 2 || rating === 3) {
                    dist[rating as 1 | 2 | 3]++;
                    qTotal++;
                  }
                });

                const percent1 = qTotal === 0 ? 0 : Math.round((dist[1] / qTotal) * 100);
                const percent2 = qTotal === 0 ? 0 : Math.round((dist[2] / qTotal) * 100);
                const percent3 = qTotal === 0 ? 0 : Math.round((dist[3] / qTotal) * 100);

                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-100 space-y-3 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-700 leading-relaxed min-h-[36px]">
                      {q.text}
                    </p>
                    
                    {/* SVG Progress bar representing the 1-3 distribution */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>មិនពេញចិត្ត 😞 ({dist[1]})</span>
                        <span className="font-semibold">{percent1}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full transition-all duration-500" style={{ width: `${percent1}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>ពេញចិត្ត 😐 ({dist[2]})</span>
                        <span className="font-semibold">{percent2}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${percent2}%` }} />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span>ពេញចិត្តណាស់ ☺ ({dist[3]})</span>
                        <span className="font-semibold">{percent3}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent3}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Submissions List Tab */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase bg-slate-50">
                    <th className="px-4 py-3">សិស្ស / អាណាព្យាបាល</th>
                    <th className="px-4 py-3">កម្រិតសិក្សា</th>
                    <th className="px-4 py-3">ថ្នាក់សិក្សា</th>
                    <th className="px-4 py-3">គ្រូបន្ទុកថ្នាក់</th>
                    <th className="px-4 py-3 text-center">ពិន្ទុមធ្យម</th>
                    <th className="px-4 py-3">កំណត់សម្គាល់</th>
                    <th className="px-4 py-3 text-center">សកម្មភាព</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredResponses.map(r => {
                    const avg = (() => {
                      let s = 0;
                      Object.values(r.ratings).forEach(v => s += v);
                      return (s / 10).toFixed(1);
                    })();

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition duration-150">
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-800">{r.studentName}</p>
                          <p className="text-[10px] text-slate-400">អាណាព្យាបាល៖ {r.parentName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            r.gradeLevel === 'មតេយ្យ' ? 'bg-orange-55 text-orange-600' : 'bg-blue-55 text-blue-600'
                          }`}>
                            {r.gradeLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-medium">{r.subGrade}</td>
                        <td className="px-4 py-3.5">{r.teacherName}</td>
                        <td className="px-4 py-3.5 text-center font-bold font-sans">
                          <span className={`px-2 py-1 rounded-lg ${
                            Number(avg) >= 2.5 ? 'text-emerald-700 bg-emerald-50' : 
                            Number(avg) >= 1.8 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                          }`}>
                            {avg}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {r.teacherNotes ? (
                            <span className="text-slate-500 line-clamp-1 italic max-w-[150px]">{r.teacherNotes}</span>
                          ) : (
                            <span className="text-slate-300 italic">គ្មានកំណត់សម្គាល់</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetails(r)}
                              className="px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer"
                            >
                              លម្អិត
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('តើអ្នកពិតជាចង់លុបចម្លើយនេះមែនទេ?')) {
                                  onDeleteResponse(r.id);
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detailed Modal */}
      <AnimatePresence>
        {detailedResponse && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={closeDetails}
              className="absolute inset-0 bg-black cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl bg-white h-full shadow-xl flex flex-col z-10 overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-[#0f2a4a] text-white p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-sans text-amber-400">ព័ត៌មានលម្អិតអំពីការវាយតម្លៃ</h3>
                  <p className="text-xs text-slate-300 mt-0.5">សិស្ស៖ {detailedResponse.studentName} | ថ្នាក់សិក្សា៖ {detailedResponse.subGrade}</p>
                </div>
                <button
                  onClick={closeDetails}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition cursor-pointer"
                >
                  បិទវិញ
                </button>
              </div>

              {/* Content body */}
              <div className="p-6 space-y-6 flex-1">
                {/* General Info Grid */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">ឈ្មោះអាណាព្យាបាល</span>
                    <strong className="text-slate-800 text-sm">{detailedResponse.parentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">ឈ្មោះសិស្ស (ភេទ)</span>
                    <strong className="text-slate-800 text-sm">{detailedResponse.studentName} ({detailedResponse.studentGender})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">គ្រូបន្ទុកថ្នាក់</span>
                    <strong className="text-slate-800 text-sm">{detailedResponse.teacherName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">កាលបរិច្ឆេទឆ្លើយតប</span>
                    <strong className="text-slate-800 text-sm flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {detailedResponse.date}
                    </strong>
                  </div>
                </div>

                {/* Question and Answers List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">ចម្លើយតបតាមសំណួរនីមួយៗ</h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-white">
                    {SURVEY_QUESTIONS.map(q => {
                      const score = detailedResponse.ratings[q.id];
                      const getLabel = (s: number) => {
                        if (s === 1) return { emoji: '😞', text: 'មិនពេញចិត្ត', style: 'bg-red-50 text-red-700' };
                        if (s === 2) return { emoji: '😐', text: 'ពេញចិត្ត', style: 'bg-amber-50 text-amber-700' };
                        return { emoji: '☺', text: 'ពេញចិត្តណាស់', style: 'bg-emerald-50 text-emerald-700' };
                      };
                      const val = getLabel(score);

                      return (
                        <div key={q.id} className="flex items-start justify-between gap-4 p-2 rounded-lg border border-slate-50 hover:bg-slate-50/50 transition text-[11px]">
                          <span className="text-slate-700 leading-relaxed font-medium">{q.text}</span>
                          <span className={`px-2.5 py-1 rounded-full shrink-0 font-bold flex items-center gap-1 ${val.style}`}>
                            <span>{val.emoji}</span>
                            <span>{score}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Comments from Parent */}
                {detailedResponse.additionalComments && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">មតិយោបល់បន្ថែមពីអាណាព្យាបាល</h4>
                    <div className="p-3.5 bg-slate-50 rounded-xl text-xs leading-relaxed text-slate-700 italic border-l-4 border-slate-400">
                      "{detailedResponse.additionalComments}"
                    </div>
                  </div>
                )}

                {/* Teacher Notes / Remarks */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      កំណត់សម្គាល់សម្រាប់សិស្សម្នាក់ៗ (Teacher's Notes)
                    </h4>
                    <button
                      onClick={saveTeacherNotes}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-[10px] text-white font-bold rounded-lg transition shadow-sm cursor-pointer"
                    >
                      រក្សាទុកកំណត់សម្គាល់
                    </button>
                  </div>
                  <textarea
                    value={teacherNotesEdit}
                    onChange={e => setTeacherNotesEdit(e.target.value)}
                    rows={3}
                    placeholder="សរសេរកំណត់សម្គាល់ពិសេសរបស់សិស្សម្នាក់នេះ ឬចំណាំផ្សេងៗដើម្បីងាយស្រួលគ្រប់គ្រង..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-800 text-xs outline-none"
                  />
                </div>

                {/* Gemini AI Recommendations Section */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                      ជំនួយការសិក្សា AI (Gemini ជំនួយការគរុកោសល្យ)
                    </h4>
                    <button
                      onClick={analyzeWithAI}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-[10px] font-bold text-white rounded-lg transition shadow-md cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />
                          កំពុងវិភាគ...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          វិភាគជាមួយ Gemini AI
                        </>
                      )}
                    </button>
                  </div>

                  {detailedResponse.aiRecommendation ? (
                    <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">វិភាគរួចរាល់</span>
                        <button
                          onClick={copyAiText}
                          className="p-1 hover:bg-purple-100 rounded-lg text-purple-700 transition"
                          title="Copy AI analysis"
                        >
                          {copiedAi ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {detailedResponse.aiRecommendation}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                      ចុចប៊ូតុង "វិភាគជាមួយ Gemini AI" ដើម្បីឲ្យ AI ជំនាញវិភាគលើចម្លើយស្ទង់មតិ និងបង្កើតផែនការគាំទ្រសិស្សម្នាក់នេះ។
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
