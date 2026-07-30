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

const RESPONSES_FILE = path.resolve(process.cwd(), 'exam_results.json');

// Helper to load responses from the file-based database
function loadResponses() {
  const INITIAL_RESPONSES = [
    {
      id: "1",
      studentName: "សុខ មុន្នី",
      studentGender: "ប្រុស",
      gradeLevel: "ថ្នាក់ទី៤",
      date: "2026-07-28",
      answers: { 1: "Mouse", 2: "Central Processing Unit", 3: "Monitor", 4: "Random Access Memory", 5: "Microsoft Word", 6: "ផ្ទុកទិន្នន័យ", 7: "Microsoft PowerPoint", 8: "Internet", 9: "Hardware", 10: "Google Chrome" },
      score: 10,
      totalScore: 10,
      teacherNotes: "សិស្សពូកែណាស់ ឆ្លើយត្រូវទាំងអស់។",
      createdAt: "2026-07-28T10:00:00.000Z"
    },
    {
      id: "2",
      studentName: "លី ដារ៉ា",
      studentGender: "ប្រុស",
      gradeLevel: "ថ្នាក់ទី៦",
      date: "2026-07-28",
      answers: { 1: "Mouse", 2: "Central Processing Unit", 3: "Keyboard", 4: "Random Access Memory", 5: "Microsoft Excel", 6: "ផ្ទុកទិន្នន័យ", 7: "Microsoft PowerPoint", 8: "Internet", 9: "Software", 10: "Google Chrome" },
      score: 7,
      totalScore: 10,
      teacherNotes: "ខំប្រឹងប្រែងបន្ថែមទៀតលើចំណុចដែលខុស។",
      createdAt: "2026-07-28T14:30:00.000Z"
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


const QUESTIONS_FILE = path.resolve(process.cwd(), 'exam_questions.json');

function loadQuestions() {
  const INITIAL_QUESTIONS = [
    {
      id: 1,
      text: "តើអ្វីទៅជាឧបករណ៍បញ្ចូលទិន្នន័យ (Input Device)?",
      options: ["Mouse", "Monitor", "Printer", "Speaker"],
      correctAnswer: "Mouse",
      gradeLevel: "ថ្នាក់ទី១"
    }
  ];
  if (!fs.existsSync(QUESTIONS_FILE)) {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(INITIAL_QUESTIONS, null, 2), 'utf-8');
    return INITIAL_QUESTIONS;
  }
  try {
    const data = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read questions database file:', err);
    return INITIAL_QUESTIONS;
  }
}

function saveQuestions(questions) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save questions to file:', err);
    return false;
  }
}

const CONFIGS_FILE = path.resolve(process.cwd(), 'exam_configs.json');

interface GradeExamConfig {
  durationMinutes: number;
  isOpen: boolean;
}

const DEFAULT_GRADE_CONFIGS: Record<string, GradeExamConfig> = {
  'ថ្នាក់ទី១': { durationMinutes: 30, isOpen: true },
  'ថ្នាក់ទី២': { durationMinutes: 30, isOpen: true },
  'ថ្នាក់ទី៣': { durationMinutes: 40, isOpen: true },
  'ថ្នាក់ទី៤': { durationMinutes: 45, isOpen: true },
  'ថ្នាក់ទី៥': { durationMinutes: 45, isOpen: true },
  'ថ្នាក់ទី៦': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី៧': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី៨': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី៩': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី១០': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី១១': { durationMinutes: 60, isOpen: true },
  'ថ្នាក់ទី១២': { durationMinutes: 60, isOpen: true },
};

function loadConfigs(): Record<string, GradeExamConfig> {
  if (!fs.existsSync(CONFIGS_FILE)) {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(DEFAULT_GRADE_CONFIGS, null, 2), 'utf-8');
    return DEFAULT_GRADE_CONFIGS;
  }
  try {
    const data = fs.readFileSync(CONFIGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const result: Record<string, GradeExamConfig> = { ...DEFAULT_GRADE_CONFIGS };
    for (const [grade, val] of Object.entries(parsed)) {
      if (typeof val === 'number') {
        result[grade] = { durationMinutes: val, isOpen: true };
      } else if (typeof val === 'object' && val !== null) {
        result[grade] = {
          durationMinutes: Number((val as any).durationMinutes) || 60,
          isOpen: (val as any).isOpen !== undefined ? Boolean((val as any).isOpen) : true
        };
      }
    }
    return result;
  } catch (err) {
    console.error('Failed to read configs database file:', err);
    return DEFAULT_GRADE_CONFIGS;
  }
}

function saveConfigs(configs: Record<string, GradeExamConfig>) {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save configs to file:', err);
    return false;
  }
}


// --- API ENDPOINTS ---

// 1. Get all exam results
app.get('/api/results', (req, res) => {
  const list = loadResponses();
  res.json(list);
});

// 2. Add a new result
app.post('/api/results', (req, res) => {
  try {
    const data = req.body;
    if (!data.studentName || !data.gradeLevel) {
      return res.status(400).json({ error: 'Missing required exam data (studentName, gradeLevel)' });
    }

    const currentList = loadResponses();
    
    // Construct standard response shape
    const newId = data.id || Date.now().toString();
    const newResponse = {
      id: newId,
      studentName: data.studentName,
      studentGender: data.studentGender || 'ប្រុស',
      gradeLevel: data.gradeLevel || 'ថ្នាក់ទី១',
      date: data.date || new Date().toISOString().split('T')[0],
      answers: data.answers || {},
      score: data.score || 0,
      totalScore: data.totalScore || 10,
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
    console.error('Error adding result:', err);
    res.status(500).json({ error: err.message || 'Failed to submit result' });
  }
});

// 3. Update an existing result
app.put('/api/results/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const currentList = loadResponses();
    
    const index = currentList.findIndex((r: any) => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Result not found' });
    }

    currentList[index] = {
      ...currentList[index],
      ...updatedData
    };

    saveResponses(currentList);
    res.json({ status: 'success', data: currentList[index] });
  } catch (err: any) {
    console.error('Error updating result:', err);
    res.status(500).json({ error: err.message || 'Failed to update result' });
  }
});

// 4. Delete a result
app.delete('/api/results/:id', (req, res) => {
  try {
    const { id } = req.params;
    const currentList = loadResponses();
    const updatedList = currentList.filter((r: any) => r.id !== id);

    saveResponses(updatedList);
    res.json({ status: 'success', message: 'Result deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting result:', err);
    res.status(500).json({ error: err.message || 'Failed to delete result' });
  }
});


// 5. Get all questions
app.get('/api/questions', (req, res) => {
  const gradeLevel = req.query.gradeLevel as string;
  let list = loadQuestions();
  if (gradeLevel) {
    list = list.filter(q => q.gradeLevel === gradeLevel);
  }
  res.json(list);
});

// 6. Save questions for a gradeLevel
app.put('/api/questions', (req, res) => {
  try {
    const { questions, gradeLevel, durationMinutes, isOpen } = req.body;
    if (!gradeLevel) {
      return res.status(400).json({ error: 'Missing gradeLevel' });
    }
    const currentList = loadQuestions();
    
    // Remove old questions for this grade
    const filteredList = currentList.filter(q => q.gradeLevel !== gradeLevel);
    
    // Add new questions
    const newList = [...filteredList, ...questions];
    saveQuestions(newList);

    // Save config if provided
    const configs = loadConfigs();
    const currentConfig = configs[gradeLevel] || { durationMinutes: 60, isOpen: true };
    configs[gradeLevel] = {
      durationMinutes: typeof durationMinutes === 'number' && durationMinutes > 0 ? durationMinutes : currentConfig.durationMinutes,
      isOpen: typeof isOpen === 'boolean' ? isOpen : currentConfig.isOpen
    };
    saveConfigs(configs);

    res.json({ status: 'success', data: questions, config: configs[gradeLevel] });
  } catch (err: any) {
    console.error('Error updating questions:', err);
    res.status(500).json({ error: err.message || 'Failed to update questions' });
  }
});

// 7. Get exam duration & status config
app.get('/api/exam-config', (req, res) => {
  const gradeLevel = req.query.gradeLevel as string;
  const configs = loadConfigs();
  if (gradeLevel) {
    const cfg = configs[gradeLevel] || { durationMinutes: 60, isOpen: true };
    return res.json({ gradeLevel, durationMinutes: cfg.durationMinutes, isOpen: cfg.isOpen });
  }
  res.json({ configs });
});

// 8. Save exam duration & status config
app.put('/api/exam-config', (req, res) => {
  try {
    const { gradeLevel, durationMinutes, isOpen } = req.body;
    if (!gradeLevel) {
      return res.status(400).json({ error: 'Missing gradeLevel' });
    }
    const configs = loadConfigs();
    const currentConfig = configs[gradeLevel] || { durationMinutes: 60, isOpen: true };
    configs[gradeLevel] = {
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : currentConfig.durationMinutes,
      isOpen: isOpen !== undefined ? Boolean(isOpen) : currentConfig.isOpen
    };
    saveConfigs(configs);
    res.json({ 
      status: 'success', 
      gradeLevel, 
      durationMinutes: configs[gradeLevel].durationMinutes,
      isOpen: configs[gradeLevel].isOpen 
    });
  } catch (err: any) {
    console.error('Error updating exam config:', err);
    res.status(500).json({ error: err.message || 'Failed to update exam config' });
  }
});

// Helper to lazily initialize Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// API endpoint for Gemini Analysis of exam results
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY មិនទាន់បានកំណត់ឡើយ' });
    }

    const { result } = req.body;
    if (!result) {
      return res.status(400).json({ error: 'Missing exam result data' });
    }

    const {
      studentName,
      studentGender,
      gradeLevel,
      score,
      totalScore
    } = result;

    const prompt = `
អ្នកគឺជាគ្រូបង្រៀនមុខវិជ្ជាកុំព្យូទ័រដែលមានបទពិសោធន៍។
សូមផ្តល់មតិយោបល់ និងការណែនាំខ្លីៗ ដើម្បីឲ្យសិស្សឈ្មោះ ${studentName} (ភេទ ${studentGender} រៀនថ្នាក់ ${gradeLevel}) ដែលទទួលបានពិន្ទុ ${score}/${totalScore} លើការប្រឡងមុខវិជ្ជាកុំព្យូទ័រនេះ អាចអភិវឌ្ឍសមត្ថភាពបន្ថែមទៀត។ សរសេរជាភាសាខ្មែរឲ្យបានច្បាស់លាស់ និងលើកទឹកចិត្ត។
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze result with Gemini' });
  }
});

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
