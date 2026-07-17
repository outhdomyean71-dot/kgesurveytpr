/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const RESPONSES_FILE = path.resolve(process.cwd(), 'responses.json');

// Helper to load responses from the file-based database
function loadResponses() {
  const INITIAL_RESPONSES = [
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

  if (!fs.existsSync(RESPONSES_FILE)) {
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(INITIAL_RESPONSES, null, 2), 'utf-8');
    return INITIAL_RESPONSES;
  }
  try {
    const data = fs.readFileSync(RESPONSES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read responses database file:', err);
    return INITIAL_RESPONSES;
  }
}

// Helper to save responses
function saveResponses(responses: any[]) {
  try {
    fs.writeFileSync(RESPONSES_FILE, JSON.stringify(responses, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save responses to file:', err);
    return false;
  }
}

// --- API ENDPOINTS ---

// 1. Get all survey responses
app.get('/api/responses', (req, res) => {
  const list = loadResponses();
  res.json(list);
});

// 2. Add a new response (handles both Direct Submit & Google Sheet trigger Webhook)
app.post('/api/responses', (req, res) => {
  try {
    const data = req.body;
    if (!data.studentName || !data.parentName) {
      return res.status(400).json({ error: 'Missing required survey data (studentName, parentName)' });
    }

    const currentList = loadResponses();
    
    // Construct standard response shape
    const newId = data.id || Date.now().toString();
    const newResponse = {
      id: newId,
      studentName: data.studentName,
      studentGender: data.studentGender || 'ប្រុស',
      gradeLevel: data.gradeLevel || 'បឋមសិក្សា',
      subGrade: data.subGrade || 'ថ្នាក់ទី១',
      teacherName: data.teacherName || 'គ្រូបន្ទុកថ្នាក់',
      parentName: data.parentName,
      date: data.date || new Date().toISOString().split('T')[0],
      ratings: data.ratings || { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 },
      additionalComments: data.additionalComments || '',
      teacherNotes: data.teacherNotes || '',
      aiRecommendation: data.aiRecommendation || '',
      createdAt: data.createdAt || new Date().toISOString()
    };

    // Prevent duplicates if same ID is re-submitted
    const existingIndex = currentList.findIndex((r: any) => r.id === newResponse.id);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { ...currentList[existingIndex], ...newResponse };
    } else {
      currentList.unshift(newResponse);
    }

    saveResponses(currentList);
    res.status(201).json({ status: 'success', data: newResponse });
  } catch (err: any) {
    console.error('Error adding response:', err);
    res.status(500).json({ error: err.message || 'Failed to submit response' });
  }
});

// 3. Update an existing response (e.g., saving teacher notes or adding AI analysis)
app.put('/api/responses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const currentList = loadResponses();
    
    const index = currentList.findIndex((r: any) => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Response not found' });
    }

    currentList[index] = {
      ...currentList[index],
      ...updatedData
    };

    saveResponses(currentList);
    res.json({ status: 'success', data: currentList[index] });
  } catch (err: any) {
    console.error('Error updating response:', err);
    res.status(500).json({ error: err.message || 'Failed to update response' });
  }
});

// 4. Delete a response
app.delete('/api/responses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const currentList = loadResponses();
    const updatedList = currentList.filter((r: any) => r.id !== id);

    saveResponses(updatedList);
    res.json({ status: 'success', message: 'Response deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting response:', err);
    res.status(500).json({ error: err.message || 'Failed to delete response' });
  }
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API endpoint for Gemini Analysis of survey responses
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { survey } = req.body;
    if (!survey) {
      return res.status(400).json({ error: 'Missing survey data' });
    }

    const {
      studentName,
      studentGender,
      gradeLevel,
      subGrade,
      teacherName,
      parentName,
      ratings,
      additionalComments
    } = survey;

    // Map ratings to text descriptions
    const ratingTexts = [
      "១. តើការបង្រៀនរបស់លោកគ្រូ-អ្នកគ្រូ មាតាបិតាសិស្ស/អាណាព្យាបាលពេញចិត្តដែរឬទេ?: " + getRatingLabel(ratings[1]),
      "២. ចំពោះចំណេះដឹងរបស់បុត្រធីតា តើទទួលបានការអភិវឌ្ឍសមស្របដែរឬទេ?: " + getRatingLabel(ratings[2]),
      "៣. ចំពោះកិច្ចការផ្ទះ ឬមេរៀន តើលោកគ្រូ-អ្នកគ្រូបានផ្តល់ជូនទៅសិស្សគ្រប់គ្នាដែរឬទេ?: " + getRatingLabel(ratings[3]),
      "៤. តើអ្វីដែលលោកអ្នកពេញចិត្តខ្លាំងចំពោះគ្រូបន្ទុកថ្នាក់ ឬគ្រូបង្រៀន?: " + getRatingLabel(ratings[4]),
      "៥. នៅក្នុងមួយឆ្នាំសិក្សានេះ តើបុត្រធីតារបស់អ្នកមានការរីកចម្រើនខ្លាំងដែរឬទេ?: " + getRatingLabel(ratings[5]),
      "៦. តើការទំនាក់ទំនងរវាងគ្រូបន្ទុកថ្នាក់ ជាមួយអាណាព្យាបាលសិស្សមានភាពល្អប្រសើរដែរឬទេ?: " + getRatingLabel(ratings[6]),
      "៧. តើគ្រូបន្ទុកថ្នាក់បានរាយការណ៍ ឬជម្រាបជូនអំពីលទ្ធផលសិក្សារបស់សិស្សច្បាស់លាស់ដែរឬទេ?: " + getRatingLabel(ratings[7]),
      "៨. តើលោកគ្រូ-អ្នកគ្រូបានបង្ហោះរូបភាព និងសកម្មភាពសិក្សារបស់សិស្សក្នុងគ្រុបបានទៀងទាត់ដែរឬទេ?: " + getRatingLabel(ratings[8]),
      "៩. តើមាតាបិតា/អាណាព្យាបាលពេញចិត្តនឹងឱ្យកូនៗចូលរួមធ្វើសកម្មភាពបំណិនជីវិតដែរឬទេ?: " + getRatingLabel(ratings[9]),
      "១០. តើមាតាបិតាអាណាព្យាបាលសិស្សមានអ្វីសំណូមពរមកកាន់សាលារៀន ឬក៏គ្រូបន្ទុកថ្នាក់ដែរឬទេ?: " + getRatingLabel(ratings[10])
    ].join("\n");

    const prompt = `
អ្នកគឺជាជំនួយការផ្នែកគរុកោសល្យ និងចិត្តវិទ្យាកុមារដែលមានជំនាញខ្ពស់ប្រចាំសាលារៀនសុវណ្ណភូមិ។
សូមធ្វើការវិភាគលើលទ្ធផលនៃការស្ទង់មតិពីអាណាព្យាបាលរបស់សិស្សខាងក្រោមនេះ និងបង្កើតអនុសាសន៍គរុកោសល្យ (Pedagogical Recommendations) និងផែនការសកម្មភាព (Action Plan) សម្រាប់គ្រូបន្ទុកថ្នាក់ជាភាសាខ្មែរឲ្យបានច្បាស់លាស់ វិជ្ជាជីវៈ និងទន់ភ្លន់។

ព័ត៌មានលម្អិតអំពីការស្ទង់មតិ៖
- ឈ្មោះសិស្ស៖ ${studentName} (ភេទ៖ ${studentGender})
- កម្រិតថ្នាក់៖ ${gradeLevel} (${subGrade})
- ឈ្មោះគ្រូបន្ទុកថ្នាក់៖ ${teacherName}
- ឈ្មោះអាណាព្យាបាល៖ ${parentName}

លទ្ធផលពិន្ទុនៃការស្ទង់មតិ (ពិន្ទុ ១=មិនពេញចិត្ត, ២=ពេញចិត្ត, ៣=ពេញចិត្តណាស់)៖
${ratingTexts}

មតិយោបល់បន្ថែមពីអាណាព្យាបាល៖
"${additionalComments || 'គ្មានមតិយោបល់បន្ថែមទេ'}"

សូមរៀបចំការវិភាគ និងអនុសាសន៍ជា ៣ ផ្នែកធំៗ៖
១. **ការវាយតម្លៃជារួម (Overall Evaluation)**៖ សង្ខេបអំពីកម្រិតនៃការពេញចិត្តរបស់អាណាព្យាបាល (ឧទាហរណ៍៖ ខ្ពស់ មធ្យម ឬទាប) និងវិភាគលើចំណុចវិជ្ជមានដែលគ្រូធ្វើបានល្អ។
២. **ចំណុចដែលត្រូវកែលម្អ (Areas for Improvement)**៖ រកមើលសំណួរណាដែលមានពិន្ទុទាប (ពិន្ទុ ១ ឬ ២) ឬមតិយោបល់អវិជ្ជមាន រួចបកស្រាយពីបញ្ហាប្រឈមដែលអាចកើតមាន។
៣. **អនុសាសន៍គរុកោសល្យ និងផែនការសកម្មភាព (Actionable Recommendations)**៖ ផ្តល់នូវដំណោះស្រាយជាក់ស្តែងសម្រាប់គ្រូបន្ទុកថ្នាក់ ដើម្បីកែលម្អការបង្រៀន ការទំនាក់ទំនង ឬការជួយគាំទ្រសិស្ស ${studentName} ឲ្យកាន់តែល្អប្រសើរ។

សូមសរសេរជាភាសាខ្មែរផ្លូវការ គួរឲ្យគោរព និងលើកទឹកចិត្តដល់លោកគ្រូ-អ្នកគ្រូ។
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze survey with Gemini' });
  }
});

function getRatingLabel(score: number): string {
  if (score === 1) return "មិនពេញចិត្ត (១)";
  if (score === 2) return "ពេញចិត្ត (២)";
  if (score === 3) return "ពេញចិត្តណាស់ (៣)";
  return "មិនបានឆ្លើយ";
}

// Vite and static file routing setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
