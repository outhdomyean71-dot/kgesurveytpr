/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: number;
  text: string;
  example?: string;
  type: 'rating' | 'text';
}

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "តើការបង្រៀនរបស់លោកគ្រូ-អ្នកគ្រូ មាតាបិតាសិស្ស/អាណាព្យាបាលពេញចិត្តដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 2,
    text: "ចំពោះចំណេះដឹងរបស់បុត្រធីតា តើទទួលបានការអភិវឌ្ឍសមស្របដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 3,
    text: "ចំពោះកិច្ចការផ្ទះ ឬមេរៀន តើលោកគ្រូ-អ្នកគ្រូបានផ្តល់ជូនទៅសិស្សគ្រប់គ្នាដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 4,
    text: "តើអ្វីដែលលោកអ្នកពេញចិត្តខ្លាំងចំពោះគ្រូបន្ទុកថ្នាក់ ឬគ្រូបង្រៀន?",
    type: 'rating'
  },
  {
    id: 5,
    text: "នៅក្នុងមួយឆ្នាំសិក្សានេះ តើបុត្រធីតារបស់អ្នកមានការរីកចម្រើនខ្លាំងដែរឬទេ?",
    example: "ឧទាហរណ៍៖ ចំណេះដឹង ជំនាញ សីលធម៌ សុជីវធម៌",
    type: 'rating'
  },
  {
    id: 6,
    text: "តើការទំនាក់ទំនងរវាងគ្រូបន្ទុកថ្នាក់ ជាមួយអាណាព្យាបាលសិស្សមានភាពល្អប្រសើរដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 7,
    text: "តើគ្រូបន្ទុកថ្នាក់បានរាយការណ៍ ឬជម្រាបជូនអំពីលទ្ធផលសិក្សារបស់សិស្សច្បាស់លាស់ដែរឬទេ?",
    example: "ឧទាហរណ៍៖ ចំណុចខ្លាំង / ចំណុចខ្សោយ",
    type: 'rating'
  },
  {
    id: 8,
    text: "តើលោកគ្រូ-អ្នកគ្រូបានបង្ហោះរូបភាព និងសកម្មភាពសិក្សារបស់សិស្សក្នុងគ្រុបបានទៀងទាត់ដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 9,
    text: "តើមាតាបិតា/អាណាព្យាបាលពេញចិត្តនឹងឱ្យកូនៗចូលរួមធ្វើសកម្មភាពបំណិនជីវិតដែរឬទេ?",
    type: 'rating'
  },
  {
    id: 10,
    text: "តើមាតាបិតាអាណាព្យាបាលសិស្សមានអ្វីសំណូមពរមកកាន់សាលារៀន ឬក៏គ្រូបន្ទុកថ្នាក់ដែរឬទេ?",
    type: 'rating'
  }
];

export type GradeLevel = 'មតេយ្យ' | 'បឋមសិក្សា';

export interface SurveyResponse {
  id: string;
  studentName: string;
  studentGender: 'ប្រុស' | 'ស្រី';
  gradeLevel: GradeLevel;
  subGrade: string; // e.g., "មតេយ្យកម្រិតទាប", "ថ្នាក់ទី១"
  teacherName: string;
  parentName: string;
  date: string;
  ratings: { [questionId: number]: number }; // 1: មិនពេញចិត្ត, 2: ពេញចិត្ត, 3: ពេញចិត្តណាស់
  additionalComments: string; // "សូមបញ្ចេញមតិបន្ថែមអំពីគ្រូរបស់កូននៅទីនេះ"
  teacherNotes: string; // Custom notes added by teacher/admin
  aiRecommendation?: string; // AI recommendations generated via Gemini
  createdAt: string;
}

export interface GoogleSheetsConfig {
  webAppUrl: string;
}
