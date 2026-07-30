const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

const helperCode = `
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

`;

serverCode = serverCode.replace(
  "// --- API ENDPOINTS ---",
  helperCode + "\n// --- API ENDPOINTS ---"
);

const apiCode = `
// 5. Get all questions
app.get('/api/questions', (req, res) => {
  const gradeLevel = req.query.gradeLevel;
  let list = loadQuestions();
  if (gradeLevel) {
    list = list.filter(q => q.gradeLevel === gradeLevel);
  }
  res.json(list);
});

// 6. Save questions for a gradeLevel
app.put('/api/questions', (req, res) => {
  try {
    const { questions, gradeLevel } = req.body;
    if (!gradeLevel) {
      return res.status(400).json({ error: 'Missing gradeLevel' });
    }
    const currentList = loadQuestions();
    
    // Remove old questions for this grade
    const filteredList = currentList.filter(q => q.gradeLevel !== gradeLevel);
    
    // Add new questions
    const newList = [...filteredList, ...questions];
    
    saveQuestions(newList);
    res.json({ status: 'success', data: questions });
  } catch (err) {
    console.error('Error updating questions:', err);
    res.status(500).json({ error: err.message || 'Failed to update questions' });
  }
});
`;

serverCode = serverCode.replace(
  "// Initialize Gemini Client",
  apiCode + "\n// Initialize Gemini Client"
);

fs.writeFileSync('server.ts', serverCode, 'utf-8');
