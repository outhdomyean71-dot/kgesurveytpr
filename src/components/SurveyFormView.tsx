/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SURVEY_QUESTIONS, GradeLevel, SurveyResponse } from '../types';
import { Send, CheckCircle2, User, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

interface SurveyFormViewProps {
  onSubmit: (response: Omit<SurveyResponse, 'id' | 'createdAt' | 'teacherNotes'>) => Promise<boolean>;
  webAppUrl: string;
}

export default function SurveyFormView({ onSubmit, webAppUrl }: SurveyFormViewProps) {
  const [parentName, setParentName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentGender, setStudentGender] = useState<'ប្រុស' | 'ស្រី'>('ប្រុស');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('បឋមសិក្សា');
  const [subGrade, setSubGrade] = useState('ថ្នាក់ទី១');
  const [teacherName, setTeacherName] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  
  // Rating states (1-10) - Defaulting to 3 (ពេញចិត្តណាស់)
  const [ratings, setRatings] = useState<{ [id: number]: number }>({
    1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle grade level changes to adjust defaults
  const handleGradeLevelChange = (level: GradeLevel) => {
    setGradeLevel(level);
    if (level === 'មតេយ្យ') {
      setSubGrade('មតេយ្យកម្រិតខ្ពស់ (Kindergarten)');
    } else {
      setSubGrade('ថ្នាក់ទី១');
    }
  };

  const handleRatingChange = (qId: number, value: number) => {
    setRatings(prev => ({ ...prev, [qId]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!parentName.trim() || !studentName.trim() || !teacherName.trim()) {
      setErrorMsg('សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់ (ឈ្មោះអាណាព្យាបាល ឈ្មោះសិស្ស និងឈ្មោះគ្រូ)!');
      return;
    }

    setIsSubmitting(true);
    
    const surveyData = {
      parentName,
      studentName,
      studentGender,
      gradeLevel,
      subGrade,
      teacherName,
      date: new Date().toISOString().split('T')[0],
      ratings,
      additionalComments
    };

    try {
      const success = await onSubmit(surveyData);
      if (success) {
        setSubmitSuccess(true);
        // Reset form
        setParentName('');
        setStudentName('');
        setTeacherName('');
        setAdditionalComments('');
        setRatings({ 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 });
      } else {
        setErrorMsg('មានបញ្ហាក្នុងការផ្ញើទិន្នន័យ។ សូមព្យាយាមម្តងទៀត!');
      }
    } catch (error: any) {
      setErrorMsg('កំហុស៖ ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subGradeOptions = gradeLevel === 'មតេយ្យ' 
    ? [
        "មតេយ្យកម្រិតទាប (Nursery)", 
        "មតេយ្យកម្រិតមធ្យម (Pre-Kindergarten)", 
        "មតេយ្យកម្រិតខ្ពស់ (Kindergarten)"
      ]
    : ["ថ្នាក់ទី១", "ថ្នាក់ទី២", "ថ្នាក់ទី៣", "ថ្នាក់ទី៤", "ថ្នាក់ទី៥", "ថ្នាក់ទី៦"];

  if (submitSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto bg-white rounded-2xl border border-emerald-100 p-8 text-center shadow-lg"
      >
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="h-20 w-20 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 font-sans">ផ្ញើចម្លើយជោគជ័យ!</h2>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-md mx-auto">
          សូមអរគុណមាតាបិតា/អាណាព្យាបាលសិស្សសម្រាប់ការចូលរួមបំពេញកម្រងសំណួរស្ទង់មតិការសិក្សានេះ។ មតិយោបល់របស់លោកអ្នកមានតម្លៃបំផុតក្នុងការកែលម្អគុណភាពអប់រំ។
        </p>

        {webAppUrl && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 rounded-xl text-emerald-800 text-xs inline-flex items-center gap-1.5 border border-emerald-100">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            ទិន្នន័យត្រូវបានបញ្ជូនទៅកាន់ Google Sheet របស់សាលារួចរាល់
          </div>
        )}

        <button
          onClick={() => setSubmitSuccess(false)}
          className="mt-8 px-6 py-2.5 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 text-sm font-medium rounded-xl transition duration-150 cursor-pointer"
        >
          បំពេញកម្រងសំណួរថ្មីម្តងទៀត
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" id="survey-form-view">
      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Banner with Instructions */}
        <div className="bg-[#0f2a4a] text-white rounded-2xl p-6 md:p-8 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/10 rounded-full -mr-12 -mt-12" />
          <h2 className="text-xl md:text-2xl font-bold font-sans text-amber-400 flex items-center gap-2">
            កម្រងសំណួរពីអាណាព្យាបាលសិស្ស
          </h2>
          <p className="text-slate-200 text-sm mt-2 leading-relaxed">
            សូមគោរពអាណាព្យាបាលសិស្សានុសិស្សទាំងអស់! កម្រងសំណួរនេះត្រូវបានបង្កើតឡើងក្នុងគោលបំណងប្រមូលមតិយោបល់ និងស្វែងយល់បន្ថែមពីស្ថានភាពសិក្សារបស់កូនៗលោកអ្នក ដើម្បីឱ្យលោកគ្រូ-អ្នកគ្រូ និងសាលារៀន អាចយកចិត្តទុកដាក់គាំទ្រពួកគេកាន់តែប្រសើរឡើង។
          </p>
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-700/50 text-xs text-amber-200">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> ១ = មិនពេញចិត្ត 😞
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" /> ២ = ពេញចិត្ត 😐
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> ៣ = ពេញចិត្តណាស់ ☺
            </span>
          </div>
        </div>

        {/* Section 1: Demographics */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-[#0f2a4a]" />
            ព័ត៌មានទូទៅ (Demographics)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ឈ្មោះអាណាព្យាបាលសិស្ស *</label>
              <input
                type="text"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                placeholder="ឧ. សុខ ផល្លា"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ឈ្មោះសិស្សានុសិស្ស *</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="ឧ. ផល្លា មុន្នី"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ភេទសិស្ស *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['ប្រុស', 'ស្រី'] as const).map(gender => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => setStudentGender(gender)}
                    className={`py-2.5 px-4 text-sm font-medium rounded-xl border transition-all duration-150 cursor-pointer ${
                      studentGender === gender
                        ? 'border-[#0f2a4a] bg-[#0f2a4a]/5 text-[#0f2a4a]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">កម្រិតសិក្សា *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['មតេយ្យ', 'បឋមសិក្សា'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleGradeLevelChange(level)}
                    className={`py-2.5 px-4 text-sm font-medium rounded-xl border transition-all duration-150 cursor-pointer ${
                      gradeLevel === level
                        ? 'border-[#0f2a4a] bg-[#0f2a4a]/5 text-[#0f2a4a]'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ថ្នាក់សិក្សា *</label>
              <select
                value={subGrade}
                onChange={e => setSubGrade(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-sm outline-none"
              >
                {subGradeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ឈ្មោះគ្រូបន្ទុកថ្នាក់ *</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                placeholder="ឧ. អ្នកគ្រូ សូភី"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Questions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#0f2a4a]" />
            សំណួរវាយតម្លៃទាំង ១០ (Evaluation Questions)
          </h3>

          <div className="space-y-6 divide-y divide-slate-100">
            {SURVEY_QUESTIONS.map((question, idx) => (
              <div key={question.id} className={`pt-6 ${idx === 0 ? 'pt-0' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <p className="text-slate-800 font-medium text-sm leading-relaxed">
                      {question.text}
                    </p>
                    {question.example && (
                      <p className="text-xs text-slate-400 italic">
                        {question.example}
                      </p>
                    )}
                  </div>

                  {/* Rating Selector */}
                  <div className="flex gap-2 shrink-0 self-end md:self-center">
                    {[1, 2, 3].map((score) => {
                      const getEmoji = (s: number) => {
                        if (s === 1) return { emoji: '😞', text: 'មិនពេញចិត្ត', color: 'hover:border-red-400 hover:bg-red-50 text-red-600 bg-red-50/50 border-red-200', active: 'bg-red-500 border-red-500 text-white' };
                        if (s === 2) return { emoji: '😐', text: 'ពេញចិត្ត', color: 'hover:border-amber-400 hover:bg-amber-50 text-amber-600 bg-amber-50/50 border-amber-200', active: 'bg-amber-500 border-amber-500 text-white' };
                        return { emoji: '☺', text: 'ពេញចិត្តណាស់', color: 'hover:border-emerald-400 hover:bg-emerald-50 text-emerald-600 bg-emerald-50/50 border-emerald-200', active: 'bg-emerald-500 border-emerald-500 text-white' };
                      };
                      const option = getEmoji(score);
                      const isSelected = ratings[question.id] === score;

                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => handleRatingChange(question.id, score)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? option.active 
                              : `border-slate-150 text-slate-500 bg-slate-50 hover:bg-slate-100`
                          }`}
                        >
                          <span className="text-sm">{option.emoji}</span>
                          <span>{score}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Comments */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-4">
          <label className="block text-sm font-bold text-slate-800">
            សូមបញ្ចេញមតិបន្ថែមអំពីគ្រូរបស់កូននៅទីនេះ (Additional Comments)
          </label>
          <textarea
            value={additionalComments}
            onChange={e => setAdditionalComments(e.target.value)}
            rows={4}
            placeholder="ឧ. លោកគ្រូ/អ្នកគ្រូយកចិត្តទុកដាក់ខ្លាំងណាស់... ឬ សំណូមពរឱ្យសាលារៀនជួយកែសម្រួល..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition duration-150 text-slate-800 text-sm outline-none resize-none"
          />
        </div>

        {/* Error Block */}
        {errorMsg && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 font-medium rounded-xl shadow-md cursor-pointer transition duration-150 disabled:cursor-not-allowed text-sm border border-amber-400/20"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                កំពុងផ្ញើចម្លើយ...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                ផ្ញើកម្រងសំណួរស្ទង់មតិ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
