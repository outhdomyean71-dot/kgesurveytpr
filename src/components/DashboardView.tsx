/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExamQuestion, ExamResult, GradeLevel } from '../types';
import { auth } from '../firebase';
import MyFilesSection from './MyFilesSection';
import MyNotesSection from './MyNotesSection';
import TeamMembersSection from './TeamMembersSection';
import { 
  Users, Award, Search, Filter, Calendar, 
  Trash2, FileDown, CheckCircle, X, Printer, Check, Copy,
  HardDrive, StickyNote, FileText, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardViewProps {
  results: ExamResult[];
  onUpdateResult: (updated: ExamResult) => void;
  onDeleteResult: (id: string) => void;
  schoolLogo?: string;
  userId?: string;
}

export default function DashboardView({ results, onUpdateResult, onDeleteResult, schoolLogo, userId }: DashboardViewProps) {
  const [dashboardTab, setDashboardTab] = useState<'results' | 'files' | 'notes' | 'team'>('results');
  const [selectedLevel, setSelectedLevel] = useState<GradeLevel | 'ទាំងអស់'>('ទាំងអស់');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const effectiveUserId = userId || auth.currentUser?.uid || '';
  
  // Selection for detailed view modal
  const [detailedResult, setDetailedResult] = useState<ExamResult | null>(null);
  const [teacherNotesEdit, setTeacherNotesEdit] = useState('');
  const [detailedQuestions, setDetailedQuestions] = useState<ExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Filter responses
  const filteredResults = results.filter(r => {
    const matchesLevel = selectedLevel === 'ទាំងអស់' || r.gradeLevel === selectedLevel;
    const matchesSearch = searchQuery === '' || 
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Calculate metrics
  const totalCount = filteredResults.length;
  
  const averageScore = totalCount === 0 ? 0 : (() => {
    let sum = 0;
    filteredResults.forEach(r => sum += r.score);
    return Number((sum / totalCount).toFixed(2));
  })();

  const passedCount = filteredResults.filter(r => (r.score / r.totalScore) >= 0.5).length;
  const passedPercent = totalCount === 0 ? 0 : Math.round((passedCount / totalCount) * 100);

  // Open detailed survey response
  const openDetails = async (result: ExamResult) => {
    setDetailedResult(result);
    setTeacherNotesEdit(result.teacherNotes || '');
    setLoadingQuestions(true);
    setDetailedQuestions([]);
    try {
      const res = await fetch(`/api/questions?gradeLevel=${encodeURIComponent(result.gradeLevel)}`);
      if (res.ok) {
        const qData = await res.json();
        setDetailedQuestions(qData || []);
      }
    } catch (err) {
      console.error('Failed to load questions for detailed result:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const closeDetails = () => {
    setDetailedResult(null);
  };

  const saveTeacherNotes = () => {
    if (!detailedResult) return;
    const updated: ExamResult = {
      ...detailedResult,
      teacherNotes: teacherNotesEdit
    };
    onUpdateResult(updated);
    setDetailedResult(updated);
  };

  const exportToCSV = () => {
    if (filteredResults.length === 0) return;
    const csvRows = [
      ["កាលបរិច្ឆេទ", "ឈ្មោះសិស្ស", "ភេទ", "កម្រិតថ្នាក់", "ពិន្ទុសរុប", "មតិយោបល់គ្រូ"].join(",")
    ];
    filteredResults.forEach(r => {
      const row = [
        `"${r.date}"`,
        `"${r.studentName}"`,
        `"${r.studentGender}"`,
        `"${r.gradeLevel}"`,
        `"${r.score}/${r.totalScore}"`,
        `"${(r.teacherNotes || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `computer-exam-results-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* SaaS Dashboard Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setDashboardTab('results')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              dashboardTab === 'results'
                ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>លទ្ធផលប្រឡង (Exam Results)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-extrabold">
              {results.length}
            </span>
          </button>

          <button
            onClick={() => setDashboardTab('files')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              dashboardTab === 'files'
                ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <HardDrive className="h-4 w-4 text-amber-500" />
            <span>My Files</span>
          </button>

          <button
            onClick={() => setDashboardTab('notes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              dashboardTab === 'notes'
                ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <StickyNote className="h-4 w-4 text-blue-500" />
            <span>My Notes</span>
          </button>

          <button
            onClick={() => setDashboardTab('team')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              dashboardTab === 'team'
                ? 'bg-[#0f2a4a] text-amber-400 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 text-emerald-500" />
            <span>Team Members</span>
          </button>
        </div>
      </div>

      {/* Render Active Section */}
      {dashboardTab === 'files' && (
        <MyFilesSection userId={effectiveUserId} />
      )}

      {dashboardTab === 'notes' && (
        <MyNotesSection userId={effectiveUserId} />
      )}

      {dashboardTab === 'team' && (
        <TeamMembersSection userId={effectiveUserId} />
      )}

      {dashboardTab === 'results' && (
        <>
          {/* Student Share Link */}
      <div className="bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-400 text-[#0f2a4a] rounded-xl shadow-inner shrink-0">
            <Users className="h-5 w-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0f2a4a] flex flex-wrap items-center gap-2">
              តំណភ្ជាប់សម្រាប់សិស្សប្រឡង
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                រត់ស្វ័យប្រវត្តិ
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ចម្លងតំណភ្ជាប់ខាងក្រោមដើម្បីផ្ញើជូនសិស្សសម្រាប់ការប្រឡង។ ពិន្ទុនឹងចូលមកកាន់ប្រព័ន្ធស្វ័យប្រវត្តិ។
            </p>
            <div className="mt-2.5 flex items-center gap-2 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 w-full max-w-xl text-[11px] font-mono text-slate-600 overflow-x-auto select-all">
              <span>{typeof window !== 'undefined' ? `${window.location.origin}/?mode=student` : 'https://exam.com/?mode=student'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            const url = typeof window !== 'undefined' ? `${window.location.origin}/?mode=student` : 'https://exam.com/?mode=student';
            navigator.clipboard.writeText(url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
            copiedLink 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 shadow-sm'
          }`}
        >
          {copiedLink ? <><Check className="h-4 w-4" />ចម្លងជោគជ័យ!</> : <><Copy className="h-4 w-4" />ចម្លងតំណភ្ជាប់</>}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">សិស្សប្រឡងសរុប</p>
            <p className="text-2xl font-bold text-slate-800">{totalCount} <span className="text-sm font-normal text-slate-400">នាក់</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">ពិន្ទុមធ្យម</p>
            <p className="text-2xl font-bold text-slate-800">{averageScore} / 10</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">អត្រាជាប់</p>
            <p className="text-2xl font-bold text-slate-800">{passedPercent}% <span className="text-sm font-normal text-slate-400">({passedCount} នាក់)</span></p>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះសិស្ស..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-64"
              />
            </div>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as GradeLevel | 'ទាំងអស់')}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none cursor-pointer bg-white"
            >
              <option value="ទាំងអស់">គ្រប់កម្រិតថ្នាក់</option>
              <option value="ថ្នាក់ទី១">ថ្នាក់ទី១</option>
              <option value="ថ្នាក់ទី២">ថ្នាក់ទី២</option>
              <option value="ថ្នាក់ទី៣">ថ្នាក់ទី៣</option>
              <option value="ថ្នាក់ទី៤">ថ្នាក់ទី៤</option>
              <option value="ថ្នាក់ទី៥">ថ្នាក់ទី៥</option>
              <option value="ថ្នាក់ទី៦">ថ្នាក់ទី៦</option>
              <option value="ថ្នាក់ទី៧">ថ្នាក់ទី៧</option>
              <option value="ថ្នាក់ទី៨">ថ្នាក់ទី៨</option>
              <option value="ថ្នាក់ទី៩">ថ្នាក់ទី៩</option>
              <option value="ថ្នាក់ទី១០">ថ្នាក់ទី១០</option>
              <option value="ថ្នាក់ទី១១">ថ្នាក់ទី១១</option>
              <option value="ថ្នាក់ទី១២">ថ្នាក់ទី១២</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#0f2a4a] rounded-xl text-sm font-bold transition cursor-pointer shadow-sm"
              title="បោះពុម្ពលទ្ធផលតាមថ្នាក់"
            >
              <Printer className="h-4 w-4" /> បោះពុម្ពតាមថ្នាក់
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              <FileDown className="h-4 w-4" /> ទាញយក CSV
            </button>
          </div>
        </div>

        {/* Printable Class Results Container */}
        <div className={`space-y-4 ${detailedResult ? 'no-print' : 'print-content'}`}>
          {/* Printable Header for Class Results */}
          <div className="hidden print:block mb-4 p-4 border-b text-center">
            {schoolLogo && (
              <div className="flex justify-center mb-2">
                <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
              </div>
            )}
            <h1 className="text-base font-bold text-slate-900 tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</h1>
            <h2 className="text-sm font-bold text-slate-800 tracking-wider">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
            <div className="w-20 h-0.5 bg-slate-800 mx-auto my-1"></div>
            <h2 className="text-lg font-bold text-[#0f2a4a] mt-2">បញ្ជីលទ្ធផលប្រឡងមុខវិជ្ជាកុំព្យូទ័រ</h2>
            <p className="text-center text-sm text-slate-700 mt-1">
              កម្រិតថ្នាក់៖ <strong className="text-blue-900">{selectedLevel}</strong> | ចំនួនសិស្សសរុប៖ <strong>{totalCount} នាក់</strong> | កាលបរិច្ឆេទ៖ {new Date().toLocaleDateString('km-KH')}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">ឈ្មោះសិស្ស</th>
                  <th className="px-4 py-3">កម្រិតថ្នាក់</th>
                  <th className="px-4 py-3 text-center">ពិន្ទុ</th>
                  <th className="px-4 py-3">កាលបរិច្ឆេទ</th>
                  <th className="px-4 py-3 text-right no-print">សកម្មភាព</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {filteredResults.length > 0 ? (
                  filteredResults.map(r => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => openDetails(r)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{r.studentName}</div>
                        <div className="text-xs text-slate-400">ភេទ៖ {r.studentGender}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {r.gradeLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${r.totalScore === 0 ? 'text-blue-600' : (r.score / r.totalScore) >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {r.totalScore === 0 ? 'រង់ចាំ' : `${r.score} / ${r.totalScore}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {r.date}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 no-print">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(r);
                              setTimeout(() => window.print(), 300);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition border border-amber-200 cursor-pointer flex items-center gap-1"
                            title="បោះពុម្ពក្រដាសប្រឡងសិស្ស"
                          >
                            <Printer className="h-3.5 w-3.5" /> បោះពុម្ព
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(r);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition border border-blue-200 cursor-pointer flex items-center gap-1"
                          >
                            លម្អិត
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?")) {
                                onDeleteResult(r.id);
                              }
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition border border-red-200 cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> លុប
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      មិនមានទិន្នន័យត្រូវគ្នានឹងការស្វែងរករបស់អ្នកទេ
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Official Signature Section for Class List Print Template */}
        <div className="hidden print:grid grid-cols-2 gap-8 text-xs text-center mt-12 pt-6 border-t border-slate-300">
          <div>
            <p className="font-bold text-slate-800">បានឃើញ និងពិនិត្យត្រឹមត្រូវ</p>
            <p className="font-semibold text-slate-600 mt-1">នាយក/នាយិកាសាលា</p>
            <div className="h-16"></div>
            <p className="text-slate-400">( ហត្ថលេខា និង ត្រា )</p>
          </div>
          <div>
            <p className="text-slate-600">ថ្ងៃទី........ ខែ........ ឆ្នាំ២០....</p>
            <p className="font-bold text-slate-800 mt-1">គ្រូបង្រៀនទទួលបន្ទុក</p>
            <div className="h-16"></div>
            <p className="text-slate-400">( ហត្ថលេខា និង ឈ្មោះ )</p>
          </div>
        </div>
      </div>
    </div>
  </>
)}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm no-print"
              onClick={closeDetails}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 border border-slate-200 print-content print:max-h-none print:shadow-none print:border-none"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-20 print:bg-white print:border-b-2 print:border-slate-800 print:p-0 print:mb-6">
                <div className="hidden print:block text-center w-full mb-4">
                  {schoolLogo && (
                    <div className="flex justify-center mb-2">
                      <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
                    </div>
                  )}
                  <h1 className="text-base font-bold text-slate-900 tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</h1>
                  <h2 className="text-sm font-bold text-slate-800 tracking-wider">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
                  <div className="w-20 h-0.5 bg-slate-800 mx-auto my-1"></div>
                  <h2 className="text-lg font-bold text-[#0f2a4a] mt-2">លទ្ធផលប្រឡងសិស្សម្នាក់ៗ - មុខវិជ្ជាកុំព្យូទ័រ</h2>
                </div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 print:hidden">
                  <Award className="h-5 w-5 text-amber-500 print:hidden" />
                  លទ្ធផលប្រឡងលម្អិត
                </h3>
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0f2a4a] font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Printer className="h-4 w-4" /> បោះពុម្ព
                  </button>
                  <button
                    onClick={() => {
                      onDeleteResult(detailedResult.id);
                      closeDetails();
                    }}
                    className="p-1.5 px-3 rounded-lg hover:bg-rose-100 text-rose-600 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" /> លុប
                  </button>
                  <button 
                    onClick={closeDetails}
                    className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white print:overflow-visible print:p-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:border print:border-slate-300 print:p-3 print:rounded-lg">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border-none">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 print:text-slate-600">ឈ្មោះសិស្ស</p>
                    <p className="font-semibold text-slate-800">{detailedResult.studentName}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border-none">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 print:text-slate-600">ថ្នាក់</p>
                    <p className="font-semibold text-slate-800">{detailedResult.gradeLevel}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 print:bg-white print:border-none">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 print:text-slate-600">កាលបរិច្ឆេទ</p>
                    <p className="font-semibold text-slate-800">{detailedResult.date}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 print:bg-white print:border-none">
                    <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-0.5 print:text-slate-600">ពិន្ទុសរុប</p>
                    <p className={`font-bold text-lg ${detailedResult.totalScore === 0 ? 'text-blue-600' : (detailedResult.score / detailedResult.totalScore) >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {detailedResult.totalScore === 0 ? 'រង់ចាំការវាយតម្លៃ' : `${detailedResult.score} / ${detailedResult.totalScore}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-700">មតិយោបល់របស់គ្រូ / Teacher Notes</h4>
                  <textarea
                    value={teacherNotesEdit}
                    onChange={(e) => setTeacherNotesEdit(e.target.value)}
                    placeholder="បញ្ចូលការកត់សម្គាល់ ឬចំណុចខ្សោយរបស់សិស្សនៅទីនេះ..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none print:hidden"
                  />
                  <div className="hidden print:block p-3 border border-slate-300 rounded-lg min-h-[60px] text-xs text-slate-800">
                    {teacherNotesEdit || "(មិនមានការកត់សម្គាល់)"}
                  </div>
                  <button
                    onClick={saveTeacherNotes}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer no-print"
                  >
                    រក្សាទុកកំណត់សម្គាល់
                  </button>
                </div>

                {/* Exam Questions & Student Answers breakdown (វិញ្ញាសា និងចម្លើយ) */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-[#0f2a4a] flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-amber-500" />
                      វិញ្ញាសាប្រឡង និងចម្លើយរបស់សិស្ស (Exam Questions & Student Answers)
                    </h4>
                    {!loadingQuestions && detailedQuestions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ត្រូវ {detailedQuestions.filter(q => {
                            const ans = detailedResult.answers ? (detailedResult.answers[q.id] ?? detailedResult.answers[String(q.id)]) : undefined;
                            return q.type !== 'essay' && ans !== undefined && String(ans).trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
                          }).length}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          ខុស {detailedQuestions.filter(q => {
                            const ans = detailedResult.answers ? (detailedResult.answers[q.id] ?? detailedResult.answers[String(q.id)]) : undefined;
                            return q.type !== 'essay' && (ans === undefined || String(ans).trim().toLowerCase() !== String(q.correctAnswer || '').trim().toLowerCase());
                          }).length}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
                          សរុប {detailedQuestions.length} សំណួរ
                        </span>
                      </div>
                    )}
                  </div>

                  {loadingQuestions ? (
                    <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2 bg-slate-50 rounded-2xl border border-slate-100">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                      <span className="text-xs font-semibold">កំពុងទាញយកទិន្នន័យវិញ្ញាសា...</span>
                    </div>
                  ) : detailedQuestions.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                      {detailedResult.answers && Object.keys(detailedResult.answers).length > 0 ? (
                        <div className="space-y-2">
                          <p className="font-bold text-slate-700 mb-2">ចម្លើយដែលសិស្សបានជ្រើសរើស៖</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(detailedResult.answers).map(([qKey, ansVal]) => (
                              <div key={qKey} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-600 text-[11px]">សំណួរ #{qKey}:</span>
                                <span className="font-semibold text-slate-800 text-xs">{String(ansVal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center">មិនមានទិន្នន័យវិញ្ញាសាសម្រាប់កម្រិតថ្នាក់នេះទេ</p>
                      )}
                    </div>
                  ) : (
                    /* Scrollable questions list focusing cleanly on question text and student's answer */
                    <div className="max-h-[450px] overflow-y-auto pr-1.5 space-y-3 print:max-h-none print:overflow-visible print:pr-0">
                      {detailedQuestions.map((q, idx) => {
                        const rawStudentAns = detailedResult.answers ? (detailedResult.answers[q.id] ?? detailedResult.answers[String(q.id)]) : undefined;
                        const studentAnsStr = rawStudentAns !== undefined && rawStudentAns !== null ? String(rawStudentAns).trim() : '';
                        const correctAnsStr = String(q.correctAnswer || '').trim();
                        const isEssay = q.type === 'essay';
                        const isCorrect = !isEssay && studentAnsStr.length > 0 && studentAnsStr.toLowerCase() === correctAnsStr.toLowerCase();

                        return (
                          <div 
                            key={q.id || idx} 
                            className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 print:bg-white print:border-slate-300 ${
                              isEssay 
                                ? 'bg-slate-50/80 border-slate-200' 
                                : isCorrect 
                                  ? 'bg-emerald-50/60 border-emerald-300 shadow-xs' 
                                  : 'bg-rose-50/60 border-rose-300 shadow-xs'
                            }`}
                          >
                            {/* Question Header & Correct/Incorrect Badge */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className={`h-6 w-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                  isEssay
                                    ? 'bg-slate-200 text-slate-700'
                                    : isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-rose-600 text-white'
                                }`}>
                                  {idx + 1}
                                </span>
                                <p className="font-bold text-[#0f2a4a] text-xs sm:text-sm leading-snug">
                                  {q.text}
                                </p>
                              </div>

                              {!isEssay && (
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-xs ${
                                  isCorrect 
                                    ? 'bg-emerald-600 text-white border border-emerald-700' 
                                    : 'bg-rose-600 text-white border border-rose-700'
                                }`}>
                                  {isCorrect ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>ត្រឹមត្រូវ</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span>មិនត្រឹមត្រូវ</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Clean summary boxes: Student Answer vs Correct Answer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                              <div className={`p-2.5 rounded-xl border ${
                                isEssay
                                  ? 'bg-white border-slate-200'
                                  : isCorrect
                                    ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950'
                                    : 'bg-rose-100/90 border-rose-300 text-rose-950'
                              }`}>
                                <span className={`text-[10px] font-bold block mb-0.5 ${
                                  isEssay ? 'text-slate-400' : isCorrect ? 'text-emerald-800' : 'text-rose-800'
                                }`}>
                                  ចម្លើយសិស្ស (Student's Answer):
                                </span>
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`font-bold text-xs sm:text-sm ${studentAnsStr ? 'text-slate-900' : 'text-rose-600 italic font-semibold'}`}>
                                    {studentAnsStr || '(មិនបានឆ្លើយ / Unanswered)'}
                                  </span>
                                  {!isEssay && studentAnsStr && (
                                    isCorrect ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                    )
                                  )}
                                </div>
                              </div>

                              {!isEssay && (
                                <div className="p-2.5 bg-emerald-100/90 rounded-xl border border-emerald-300 text-emerald-950">
                                  <span className="text-[10px] text-emerald-800 font-bold block mb-0.5">
                                    ចម្លើយត្រឹមត្រូវ (Correct Answer):
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                                      {q.correctAnswer}
                                    </span>
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Printable Signature Block for Teacher */}
                <div className="hidden print:grid grid-cols-2 gap-8 text-xs text-center mt-10 pt-4 border-t border-slate-300">
                  <div>
                    <p className="font-bold text-slate-800">សិស្សសាម៉ី</p>
                    <div className="h-16"></div>
                    <p className="font-semibold text-slate-700">{detailedResult.studentName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">ថ្ងៃទី........ ខែ........ ឆ្នាំ២០....</p>
                    <p className="font-bold text-slate-800 mt-1">គ្រូបង្រៀនទទួលបន្ទុក</p>
                    <div className="h-12"></div>
                    <p className="text-slate-400">( ហត្ថលេខា និង ឈ្មោះ )</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
