/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QuestionType = 'multiple_choice' | 'fill_in_blank' | 'essay';

export interface ExamQuestion {
  id: number;
  text: string;
  type?: QuestionType;
  options: string[];
  correctAnswer: string;
  gradeLevel: GradeLevel;
  points?: number;
}

export type GradeLevel = 'ថ្នាក់ទី១' | 'ថ្នាក់ទី២' | 'ថ្នាក់ទី៣' | 'ថ្នាក់ទី៤' | 'ថ្នាក់ទី៥' | 'ថ្នាក់ទី៦' | 'ថ្នាក់ទី៧' | 'ថ្នាក់ទី៨' | 'ថ្នាក់ទី៩' | 'ថ្នាក់ទី១០' | 'ថ្នាក់ទី១១' | 'ថ្នាក់ទី១២';

export interface ExamResult {
  id: string;
  studentName: string;
  studentGender: 'ប្រុស' | 'ស្រី';
  gradeLevel: GradeLevel;
  date: string;
  answers: { [questionId: number]: string };
  score: number;
  totalScore: number;
  teacherNotes: string;
  aiRecommendation?: string;
  createdAt: string;
}

export interface GoogleSheetsConfig {
  webAppUrl: string;
}

export interface UserFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface UserFile {
  id: string;
  name: string;
  storagePath?: string;
  downloadURL?: string;
  type?: string;
  folderId?: string;
  size: string;
  createdAt: string;
}

export interface UserNote {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  createdAt: string;
}
