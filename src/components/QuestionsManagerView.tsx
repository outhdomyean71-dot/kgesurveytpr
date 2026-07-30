/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ExamQuestion, GradeLevel, QuestionType } from '../types';
import { Plus, Trash2, Save, FileEdit, BookOpen, AlertCircle, CheckCircle, Clock, Power, ShieldCheck, Lock, Unlock } from 'lucide-react';

const ALL_GRADES: GradeLevel[] = [
  'ថ្នាក់ទី១', 'ថ្នាក់ទី២', 'ថ្នាក់ទី៣', 'ថ្នាក់ទី៤', 'ថ្នាក់ទី៥', 'ថ្នាក់ទី៦',
  'ថ្នាក់ទី៧', 'ថ្នាក់ទី៨', 'ថ្នាក់ទី៩', 'ថ្នាក់ទី១០', 'ថ្នាក់ទី១១', 'ថ្នាក់ទី១២'
];

export default function QuestionsManagerView() {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('ថ្នាក់ទី១');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [allConfigs, setAllConfigs] = useState<Record<string, { durationMinutes: number; isOpen: boolean }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedGrade]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resQ, resC, resAll] = await Promise.all([
        fetch(`/api/questions?gradeLevel=${selectedGrade}`),
        fetch(`/api/exam-config?gradeLevel=${selectedGrade}`),
        fetch(`/api/exam-config`)
      ]);

      if (resQ.ok) {
        const data = await resQ.json();
        setQuestions(data.map((q: ExamQuestion) => ({
          ...q,
          type: q.type || 'multiple_choice'
        })));
      }

      if (resC.ok) {
        const configData = await resC.json();
        if (configData) {
          if (configData.durationMinutes) setDurationMinutes(configData.durationMinutes);
          setIsOpen(configData.isOpen !== false);
        }
      }

      if (resAll.ok) {
        const allData = await resAll.json();
        if (allData && allData.configs) {
          setAllConfigs(allData.configs);
        }
      }
    } catch (error) {
      console.error('Failed to load questions or configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = !isOpen;
    setIsOpen(nextStatus);
    setAllConfigs(prev => ({
      ...prev,
      [selectedGrade]: { durationMinutes, isOpen: nextStatus }
    }));

    try {
      await fetch('/api/exam-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: selectedGrade,
          durationMinutes,
          isOpen: nextStatus
        })
      });
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleSave = async () => {
    // Validation
    const invalidQuestion = questions.find(q => {
      if (!q.text.trim()) return true;
      if (q.type === 'multiple_choice' && (q.options.some(opt => !opt.trim()) || !q.correctAnswer.trim())) return true;
      if (q.type === 'fill_in_blank' && !q.correctAnswer.trim()) return true;
      return false;
    });

    if (invalidQuestion) {
      alert('សូមបំពេញចន្លោះទាំងអស់សម្រាប់រាល់សំណួរ!');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questions, 
          gradeLevel: selectedGrade,
          durationMinutes: Number(durationMinutes) || 60,
          isOpen
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setAllConfigs(prev => ({
          ...prev,
          [selectedGrade]: { durationMinutes: Number(durationMinutes) || 60, isOpen }
        }));
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save questions:', error);
      alert('មានបញ្ហាក្នុងការរក្សាទុក។ សូមព្យាយាមម្តងទៀត។');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = (type: QuestionType = 'multiple_choice') => {
    const newId = Date.now();
    setQuestions([
      ...questions,
      {
        id: newId,
        text: '',
        type,
        options: ['', '', '', ''],
        correctAnswer: '',
        gradeLevel: selectedGrade,
        points: 1
      }
    ]);
  };

  const updateQuestionText = (id: number, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
  };

  const updateQuestionPoints = (id: number, points: number) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, points } : q));
  };

  const updateQuestionType = (id: number, type: QuestionType) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, type, correctAnswer: '' } : q));
  };

  const updateOption = (qId: number, optIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        
        let newCorrectAnswer = q.correctAnswer;
        if (q.correctAnswer === q.options[optIndex]) {
           newCorrectAnswer = value;
        }

        return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
      }
      return q;
    }));
  };

  const setCorrectAnswer = (qId: number, answer: string) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, correctAnswer: answer } : q));
  };

  const removeQuestion = (id: number) => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?')) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & Quick Grade Selector with Live Status Badges */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#0f2a4a] text-amber-400 rounded-2xl shadow-xs">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">គ្រប់គ្រងវិញ្ញាសា &amp; ស្ថានភាពប្រឡង</h2>
              <p className="text-xs text-slate-500">កំណត់សំណួរ ថិរវេលា និងអាច **បើក ឬបិទ** ការប្រឡងតាមថ្នាក់នីមួយៗបានគ្រប់ពេល</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0f2a4a] text-amber-400 font-bold rounded-xl hover:bg-slate-800 transition shadow-sm disabled:opacity-70 whitespace-nowrap cursor-pointer text-sm w-full md:w-auto justify-center"
          >
            {isSaving ? 'កំពុងរក្សាទុក...' : (
              <>
                {saveSuccess ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
                រក្សាទុកការកំណត់ &amp; វិញ្ញាសា
              </>
            )}
          </button>
        </div>

        {/* Grade Quick Selector Chips */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ជ្រើសរើសថ្នាក់ដើម្បីគ្រប់គ្រង៖</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {ALL_GRADES.map(grade => {
              const cfg = allConfigs[grade];
              const isGradeOpen = cfg ? cfg.isOpen !== false : true;
              const isSelected = selectedGrade === grade;

              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected 
                      ? 'bg-[#0f2a4a] text-white border-[#0f2a4a] shadow-md ring-2 ring-amber-400/50' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{grade}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 ${
                    isGradeOpen 
                      ? (isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800')
                      : (isSelected ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-100 text-rose-800')
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isGradeOpen ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {isGradeOpen ? 'បើក' : 'បិទ'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Bar for Currently Selected Grade */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm font-black text-[#0f2a4a]">{selectedGrade}៖</span>
            
            {/* Status Toggle Button */}
            <button
              type="button"
              onClick={handleToggleStatus}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs ${
                isOpen 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <Power className="h-4 w-4" />
              {isOpen ? 'ស្ថានភាព៖ បើកការប្រឡង (សិស្សអាចប្រឡងបាន)' : 'ស្ថានភាព៖ បិទការប្រឡង (ផ្អាកការប្រឡង)'}
            </button>
          </div>

          {/* Exam Duration Input */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 w-full sm:w-auto justify-center">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-900 whitespace-nowrap">រយៈពេលប្រឡង៖</span>
            <input
              type="number"
              min="1"
              max="360"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-center font-extrabold text-[#0f2a4a] outline-none focus:ring-2 focus:ring-amber-400 text-xs"
            />
            <span className="text-amber-900">នាទី</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 font-medium">កំពុងទាញយកទិន្នន័យវិញ្ញាសា...</div>
      ) : (
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center">
              <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-600 font-semibold mb-4">មិនទាន់មានសំណួរសម្រាប់ {selectedGrade} នៅឡើយទេ</p>
              <button 
                onClick={() => addQuestion()}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm cursor-pointer text-sm"
              >
                <Plus className="h-4 w-4" /> បង្កើតសំណួរដំបូង
              </button>
            </div>
          ) : (
            <>
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-slate-700 text-sm">សំណួរទី {index + 1}</span>
                      <select
                        value={q.type || 'multiple_choice'}
                        onChange={(e) => updateQuestionType(q.id, e.target.value as QuestionType)}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 outline-none cursor-pointer"
                      >
                        <option value="multiple_choice">ជ្រើសរើស (Multiple Choice)</option>
                        <option value="fill_in_blank">បំពេញពាក្យ (Fill in the blank)</option>
                        <option value="essay">សរសេរ (Essay)</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 font-semibold">ពិន្ទុ:</label>
                        <input 
                          type="number"
                          min="1"
                          value={q.points || 1}
                          onChange={(e) => updateQuestionPoints(q.id, parseInt(e.target.value) || 1)}
                          className="w-14 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removeQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="លុបសំណួរ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-5 space-y-5">
                    <div>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestionText(q.id, e.target.value)}
                        placeholder="បញ្ចូលសំណួរ..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition font-semibold text-sm"
                      />
                    </div>
                    
                    {(!q.type || q.type === 'multiple_choice') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="relative flex items-center">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOption(q.id, oIndex, e.target.value)}
                              placeholder={`ជម្រើសទី ${oIndex + 1}`}
                              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-sm"
                            />
                            <div className="absolute right-2">
                              <input 
                                type="radio" 
                                name={`correct-${q.id}`} 
                                checked={q.correctAnswer === opt && opt !== ''}
                                onChange={() => setCorrectAnswer(q.id, opt)}
                                disabled={!opt.trim()}
                                className="h-4 w-4 text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                                title="កំណត់ជាចម្លើយត្រឹមត្រូវ"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'fill_in_blank' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">ចម្លើយត្រឹមត្រូវ (ពាក្យត្រូវបំពេញ)</label>
                        <input
                          type="text"
                          value={q.correctAnswer}
                          onChange={(e) => setCorrectAnswer(q.id, e.target.value)}
                          placeholder="ឧទាហរណ៍: កុំព្យូទ័រ"
                          className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none transition text-emerald-800 text-sm"
                        />
                      </div>
                    )}

                    {q.type === 'essay' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">ចម្លើយគំរូ / ពាក្យគន្លឹះ (មិនចាំបាច់ក៏បាន)</label>
                        <textarea
                          value={q.correctAnswer}
                          onChange={(e) => setCorrectAnswer(q.id, e.target.value)}
                          placeholder="បញ្ចូលចម្លើយគំរូ សម្រាប់ងាយស្រួលផ្ទៀងផ្ទាត់..."
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => addQuestion()}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Plus className="h-5 w-5" /> បន្ថែមសំណួរថ្មី
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
