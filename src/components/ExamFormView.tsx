/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ExamQuestion, ExamResult, GradeLevel } from '../types';
import { CheckCircle, MonitorPlay, User, FileText, Calendar, BookOpen, Key, AlertCircle, Loader2, Clock, ShieldCheck, Sparkles, HelpCircle, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExamTimer from './ExamTimer';

interface ExamFormViewProps {
  onSubmit: (result: Omit<ExamResult, 'id' | 'createdAt' | 'teacherNotes'>) => Promise<{ success: boolean; score: number; total: number }>;
  webAppUrl?: string;
  schoolLogo?: string;
}

export default function ExamFormView({ onSubmit, webAppUrl, schoolLogo }: ExamFormViewProps) {
  const [step, setStep] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [studentGender, setStudentGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('ថ្នាក់ទី១');
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [scoreInfo, setScoreInfo] = useState<{ score: number, total: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  const [totalDurationMinutes, setTotalDurationMinutes] = useState<number>(60);
  const [isExamOpen, setIsExamOpen] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(3600); // Default 60 minutes

  useEffect(() => {
    fetchExamConfig(gradeLevel);
  }, [gradeLevel]);

  const fetchExamConfig = async (grade: GradeLevel) => {
    try {
      const res = await fetch(`/api/exam-config?gradeLevel=${grade}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.durationMinutes) {
            setTotalDurationMinutes(data.durationMinutes);
            if (step === 1) {
              setTimeLeft(data.durationMinutes * 60);
            }
          }
          setIsExamOpen(data.isOpen !== false);
        }
      }
    } catch (err) {
      console.error('Failed to load exam config:', err);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && !submitSuccess && !isSubmitting && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, submitSuccess, isSubmitting, timeLeft]);

  const handleTimeUp = useCallback(() => {
    if (step === 2 && !submitSuccess && !isSubmitting) {
      handleConfirmSubmit();
    }
  }, [step, submitSuccess, isSubmitting]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fetchQuestions = async (grade: GradeLevel) => {
    setIsLoadingQuestions(true);
    try {
      const [resQ, resC] = await Promise.all([
        fetch(`/api/questions?gradeLevel=${grade}`),
        fetch(`/api/exam-config?gradeLevel=${grade}`)
      ]);

      if (resC.ok) {
        const configData = await resC.json();
        const duration = configData.durationMinutes || 60;
        const isOpenStatus = configData.isOpen !== false;
        setTotalDurationMinutes(duration);
        setTimeLeft(duration * 60);
        setIsExamOpen(isOpenStatus);

        if (!isOpenStatus) {
          alert(`ការប្រឡងសម្រាប់ ${grade} ត្រូវបានបិទជាបណ្តោះអាសន្នដោយគ្រូបង្រៀន!`);
          setIsLoadingQuestions(false);
          return false;
        }
      }

      if (resQ.ok) {
        const data = await resQ.json();
        setQuestions(data);
        if (data.length === 0) {
          alert('មិនមានវិញ្ញាសាប្រឡងសម្រាប់ថ្នាក់នេះទេ! សូមទាក់ទងគ្រូរបស់អ្នក។');
          setIsLoadingQuestions(false);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
      alert('មានបញ្ហាក្នុងការទាញយកវិញ្ញាសាប្រឡង។');
    }
    setIsLoadingQuestions(false);
    return false;
  };

  const handleNext = async () => {
    if (studentName.trim() === '') {
      alert('សូមបញ្ចូលឈ្មោះសិស្ស!');
      return;
    }
    if (!isExamOpen) {
      alert(`ការប្រឡងសម្រាប់ ${gradeLevel} ត្រូវបានបិទជាបណ្តោះអាសន្នដោយគ្រូបង្រៀន!`);
      return;
    }
    const success = await fetchQuestions(gradeLevel);
    if (success) {
      setStep(2);
      setIsLoadingQuestions(false);
    }
  };

  const handleOptionSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handlePreSubmit = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    
    // Score calculation is now handled by the backend (or App.tsx logic) to prevent client-side manipulation.
    // We send 0 as placeholders.
    const newResult: Omit<ExamResult, 'id' | 'createdAt' | 'teacherNotes'> = {
      studentName,
      studentGender,
      gradeLevel,
      date: new Date().toISOString().split('T')[0],
      answers,
      score: 0,
      totalScore: 0,
    };

    try {
      const response = await onSubmit(newResult);
      if (response && response.success) {
        setScoreInfo({ score: response.score, total: response.total });
        setSubmitSuccess(true);
      }
    } catch (err) {
      alert("មានបញ្ហាក្នុងការបញ្ជូនទិន្នន័យ សូមព្យាយាមម្តងទៀត។");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setStudentName('');
    setStudentGender('ប្រុស');
    setGradeLevel('ថ្នាក់ទី១');
    setAnswers({});
    setSubmitSuccess(false);
    setScoreInfo(null);
  };

  if (submitSuccess && scoreInfo) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-lg border border-slate-100 print-content print:p-0 print:m-0 print:border-none print:shadow-none"
        >
          {/* Printable Official Header (Only visible when printing) */}
          <div className="hidden print:block text-center border-b border-slate-800 pb-4 mb-6">
            {schoolLogo && (
              <div className="flex justify-center mb-3">
                <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
              </div>
            )}
            <h1 className="text-base font-bold text-slate-900 tracking-wide">ព្រះរាជាណាចក្រកម្ពុជា</h1>
            <h2 className="text-sm font-bold text-slate-800 tracking-wider">ជាតិ សាសនា ព្រះមហាក្សត្រ</h2>
            <div className="w-24 h-0.5 bg-slate-800 mx-auto my-2"></div>
            <h3 className="text-lg font-bold text-[#0f2a4a] mt-3">ក្រដាសលទ្ធផលប្រឡងមុខវិជ្ជាកុំព្យូទ័រ</h3>
            <p className="text-xs text-slate-600">សាលារៀន / គ្រឹះស្ថានសិក្សា</p>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-800 mt-4 p-3 bg-slate-50 border border-slate-300 rounded-lg text-left">
              <div>
                <p><span className="font-bold">ឈ្មោះសិស្ស៖</span> {studentName}</p>
                <p><span className="font-bold">ភេទ៖</span> {studentGender}</p>
              </div>
              <div>
                <p><span className="font-bold">កម្រិតថ្នាក់៖</span> {gradeLevel}</p>
                <p><span className="font-bold">កាលបរិច្ឆេទប្រឡង៖</span> {new Date().toLocaleDateString('km-KH')}</p>
              </div>
            </div>
          </div>

          <div className="h-24 w-24 mx-auto rounded-full flex items-center justify-center mb-6 no-print bg-emerald-100 text-emerald-500">
            <CheckCircle className="h-12 w-12" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2 no-print">ការប្រឡងត្រូវបានបញ្ចប់!</h2>
          <p className="text-slate-500 mb-8 no-print">
            អបអរសាទរ {studentName} ទិន្នន័យប្រឡងត្រូវបានរក្សាទុកដោយជោគជ័យ។
          </p>


          {/* Official Signature Section for Print Template */}
          <div className="hidden print:grid grid-cols-2 gap-8 text-xs text-center mt-12 pt-6 border-t border-slate-300">
            <div>
              <p className="font-bold text-slate-800">សិស្សប្រឡង</p>
              <div className="h-16"></div>
              <p className="font-semibold text-slate-700">{studentName}</p>
            </div>
            <div>
              <p className="text-slate-600">ថ្ងៃទី........ ខែ........ ឆ្នាំ២០....</p>
              <p className="font-bold text-slate-800 mt-1">គ្រូបង្រៀន / អ្នកពិនិត្យ</p>
              <div className="h-12"></div>
              <p className="text-slate-400">( ហត្ថលេខា និង ឈ្មោះ )</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 no-print">
            <button
              onClick={resetForm}
              className="px-6 py-3.5 bg-[#0f2a4a] text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-md text-base"
            >
              ត្រឡប់ទៅកាន់ទំព័រដើម
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center">
          <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm transition-colors ${step === 1 ? 'bg-amber-400 text-[#0f2a4a] ring-4 ring-amber-100' : 'bg-emerald-500 text-white'}`}>
            {step > 1 ? <CheckCircle className="h-5 w-5" /> : '១'}
          </div>
          <div className={`w-16 h-1 transition-colors ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          <div className={`flex items-center justify-center h-10 w-10 rounded-full font-bold text-sm transition-colors ${step === 2 ? 'bg-amber-400 text-[#0f2a4a] ring-4 ring-amber-100' : 'bg-slate-200 text-slate-400'}`}>
            ២
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="bg-[#0f2a4a] px-8 py-8 text-center border-b-[4px] border-amber-400 relative overflow-hidden">
              <MonitorPlay className="h-24 w-24 absolute -right-4 -bottom-4 text-white/5 rotate-12" />
              <h2 className="text-2xl font-bold text-white mb-2 relative z-10">ព័ត៌មានសិស្សានុសិស្ស</h2>
              <p className="text-blue-100 text-sm relative z-10">សូមបំពេញព័ត៌មានខាងក្រោមមុនពេលចាប់ផ្តើមប្រឡង</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4 max-w-xl mx-auto">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">ឈ្មោះសិស្ស <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 outline-none transition"
                      placeholder="ឧ. សុខ មុន្នី"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ភេទ</label>
                    <select
                      value={studentGender}
                      onChange={e => setStudentGender(e.target.value as 'ប្រុស' | 'ស្រី')}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 outline-none transition cursor-pointer"
                    >
                      <option value="ប្រុស">ប្រុស</option>
                      <option value="ស្រី">ស្រី</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">កម្រិតថ្នាក់</label>
                    <select
                      value={gradeLevel}
                      onChange={e => setGradeLevel(e.target.value as GradeLevel)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 outline-none transition cursor-pointer"
                    >
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
                </div>

                {/* Exam Duration Info Badge & Rules Button */}
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-amber-950">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-400 text-[#0f2a4a] rounded-xl shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-amber-900">រយៈពេលធ្វើតេស្ត៖</span>{' '}
                      <span className="text-sm font-extrabold text-blue-900">{totalDurationMinutes} នាទី</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWelcomeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 rounded-xl transition cursor-pointer text-xs font-bold shadow-xs self-start sm:self-auto"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                    បទបញ្ជាប្រឡង
                  </button>
                </div>

                {/* Exam Closed Notice Banner */}
                {!isExamOpen && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-bold">
                    <AlertCircle className="h-6 w-6 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-rose-800 text-sm">ការប្រឡងសម្រាប់ {gradeLevel} ត្រូវបានបិទជាបណ្តោះអាសន្ន!</p>
                      <p className="text-rose-600 mt-0.5 font-medium">លោកគ្រូ/អ្នកគ្រូ បានបិទការប្រឡងថ្នាក់នេះ។ សូមទាក់ទងគ្រូបង្រៀនដើម្បីបើកការប្រឡងឡើងវិញ។</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8 text-center border-t border-slate-100">
                <button
                  onClick={handleNext}
                  disabled={isLoadingQuestions || !isExamOpen}
                  className={`px-8 py-3.5 font-bold rounded-xl transition cursor-pointer shadow-md inline-flex items-center gap-2 ${
                    !isExamOpen 
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-amber-400 text-[#0f2a4a] hover:bg-amber-300 disabled:opacity-70'
                  }`}
                >
                  {!isExamOpen ? (
                    <>ការប្រឡងត្រូវបានបិទ <AlertCircle className="h-4 w-4 text-rose-500" /></>
                  ) : isLoadingQuestions ? (
                    <>កំពុងទាញយក... <Loader2 className="h-4 w-4 animate-spin" /></>
                  ) : (
                    <>បន្ទាប់ <MonitorPlay className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" /> វិញ្ញាសាប្រឡងមុខវិជ្ជាកុំព្យូទ័រ
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    សិស្ស៖ <span className="font-bold text-slate-800">{studentName}</span> | 
                    ថ្នាក់៖ <span className="font-bold text-blue-700">{gradeLevel}</span>
                  </p>
                </div>
              </div>

              {/* Dedicated Exam Timer Component */}
              <ExamTimer
                timeLeft={timeLeft}
                totalDurationMinutes={totalDurationMinutes}
                isActive={step === 2 && !submitSuccess && !isSubmitting}
                onTimeUp={handleTimeUp}
                isSubmitting={isSubmitting}
              />

              {/* Exam Progress Bar */}
              {(() => {
                const answeredCount = Object.keys(answers).filter(qId => answers[Number(qId)] && answers[Number(qId)].trim() !== '').length;
                const totalCount = questions.length;
                const percent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
                return (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-blue-600" />
                        ដំណើរការឆ្លើយសំណួរ៖
                      </span>
                      <span className="text-blue-700 font-extrabold">
                        {answeredCount} / {totalCount} សំណួរ ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-600 via-blue-500 to-amber-400 h-full rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800">
                      <span className="text-amber-500 mr-2">{index + 1}.</span> 
                      {q.text}
                    </h3>
                    <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap">
                      {q.points || 1} ពិន្ទុ
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(!q.type || q.type === 'multiple_choice') && q.options.map((opt, i) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <div 
                          key={i}
                          onClick={() => handleOptionSelect(q.id, opt)}
                          className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-center gap-3 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-800 font-semibold' 
                              : 'border-slate-100 hover:border-slate-300 bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-blue-500' : 'border-slate-300'
                          }`}>
                            {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                          </div>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {q.type === 'fill_in_blank' && (
                    <div className="mt-4">
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                        placeholder="បំពេញចម្លើយនៅទីនេះ..."
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-lg text-slate-700 font-medium"
                      />
                    </div>
                  )}

                  {q.type === 'essay' && (
                    <div className="mt-4">
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                        placeholder="សរសេរចម្លើយរបស់អ្នកនៅទីនេះ..."
                        rows={5}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition text-slate-700 font-medium leading-relaxed resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 flex items-center justify-between sticky bottom-4 z-20">
              <button
                onClick={() => setStep(1)}
                className="px-4 sm:px-6 py-3 text-slate-500 hover:text-slate-800 font-semibold transition cursor-pointer text-sm sm:text-base"
              >
                ត្រឡប់ក្រោយ
              </button>
              
              <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700">
                <span>ឆ្លើយរួច៖</span>
                <span>{Object.keys(answers).filter(qId => answers[Number(qId)] && answers[Number(qId)].trim() !== '').length} / {questions.length} សំណួរ</span>
              </div>

              <button
                onClick={handlePreSubmit}
                disabled={isSubmitting}
                className="px-6 sm:px-8 py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>កំពុងបញ្ជូន...</>
                ) : (
                  <>
                    បញ្ចប់ការប្រឡង <CheckCircle className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative z-10 border border-slate-100 p-6 md:p-8 text-center"
            >
              <div className="mx-auto h-16 w-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-8 w-8" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">បញ្ជាក់ការបញ្ជូន</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                {Object.keys(answers).length < questions.length 
                  ? "អ្នកមិនទាន់បានឆ្លើយគ្រប់សំណួរទេ។ តើអ្នកពិតជាចង់បញ្ចប់ការប្រឡងមែនទេ?"
                  : "តើអ្នកពិតជាចង់បញ្ជូនការប្រឡងរបស់អ្នកមែនទេ? បន្ទាប់ពីបញ្ជូនអ្នកនឹងមិនអាចកែប្រែបានទេ។"
                }
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full px-6 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl transition cursor-pointer"
                >
                  ត្រឡប់ក្រោយ
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="w-full px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition cursor-pointer shadow-md shadow-emerald-500/20 flex justify-center items-center gap-2"
                >
                  បញ្ជូន
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome & Exam Rules Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowWelcomeModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative z-10 border border-slate-100 my-8"
            >
              {/* Top Banner */}
              <div className="bg-[#0f2a4a] text-white px-6 py-6 sm:px-8 text-center relative border-b-4 border-amber-400">
                <button
                  type="button"
                  onClick={() => setShowWelcomeModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="បិទ"
                >
                  <X className="h-5 w-5" />
                </button>

                {schoolLogo ? (
                  <img 
                    src={schoolLogo} 
                    alt="School Logo" 
                    className="h-16 w-16 mx-auto mb-3 object-contain rounded-full bg-white p-1 border-2 border-amber-400 shadow-md"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-amber-400 text-[#0f2a4a] flex items-center justify-center mx-auto mb-3 shadow-md border-2 border-white">
                    <MonitorPlay className="h-7 w-7" />
                  </div>
                )}

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                  ស្វាគមន៍មកកាន់ការប្រឡង
                </h2>
                <p className="text-xs sm:text-sm text-blue-200">
                  សូមអានបទបញ្ជា និងព័ត៌មានសំខាន់ៗមុនពេលចាប់ផ្តើមធ្វើតេស្ត
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 space-y-5">
                {/* Duration Highlight Box */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-400 text-[#0f2a4a] rounded-xl shrink-0 font-bold shadow-xs">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">រយៈពេលប្រឡងសរុប</p>
                      <p className="text-xs text-amber-800">កំណត់ដោយលោកគ្រូ អ្នកគ្រូ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#0f2a4a]">{totalDurationMinutes}</span>
                    <span className="text-xs font-bold text-slate-600 ml-1">នាទី</span>
                  </div>
                </div>

                {/* Rules List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    បទបញ្ជា និងការណែនាំក្នុងការប្រឡង
                  </h3>

                  <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed">
                    <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">1</span>
                      <p><strong className="text-slate-900">បំពេញព័ត៌មាន៖</strong> សូមបញ្ចូលឈ្មោះ ភេទ និងកម្រិតថ្នាក់របស់អ្នកឱ្យបានត្រឹមត្រូវមុនពេលចូលធ្វើតេស្ត។</p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">2</span>
                      <p><strong className="text-slate-900">នាឡិការាប់ថយក្រោយ៖</strong> នាឡិកានឹងចាប់ផ្តើមរាប់ថយក្រោយ <strong>{totalDurationMinutes} នាទី</strong> ភ្លាមៗបន្ទាប់ពីអ្នកចុច "បន្ទាប់"។</p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">3</span>
                      <p><strong className="text-slate-900">ការបញ្ជូនស្វ័យប្រវត្តិ៖</strong> នៅពេលវេលាកំណត់ត្រូវបានបញ្ចប់ ប្រព័ន្ធនឹងបញ្ជូនចម្លើយរបស់អ្នកទៅកាន់គ្រូដោយស្វ័យប្រវត្តិ។</p>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">4</span>
                      <p><strong className="text-slate-900">បម្រាម៖</strong> សូមកុំចាកចេញពីផ្ទាំងប្រឡង ឬ Refresh ទំព័រ អំឡុងពេលកំពុងធ្វើតេស្ត ដើម្បីចៀសវាងការបាត់បង់ទិន្នន័យ។</p>
                    </div>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  type="button"
                  onClick={() => setShowWelcomeModal(false)}
                  className="w-full py-3.5 px-6 bg-amber-400 hover:bg-amber-300 text-[#0f2a4a] font-black rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 text-sm mt-2"
                >
                  យល់ព្រម &amp; ចាប់ផ្តើម <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
