import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  FileQuestion, Loader2, CheckCircle, XCircle, AlertTriangle, 
  ChevronRight, ChevronLeft, RefreshCw, Clock, GraduationCap, BookOpen, ArrowLeft
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const ENT_SUBJECTS = [
  'Қазақ тілі', 'Қазақ әдебиеті', 'Орыс тілі', 'Орыс әдебиеті', 
  'Ағылшын тілі', 'Алгебра', 'Геометрия', 'Информатика', 
  'Қазақстан тарихы', 'Дүниежүзі тарихы', 'География', 
  'Биология', 'Физика', 'Химия', 'Құқық негіздері'
];

const BILIM_SUBJECTS = [
  'Қазақ тілі', 'Математика', 'Жаратылыстану', 'Ағылшын тілі', 
  'Дүниетану', 'Қазақ әдебиеті', 'Информатика'
];

const EntTest = ({ onTestComplete }) => {
  const [screen, setScreen] = useState('modeselect'); // modeselect | setup | generating | testing | result
  const [mode, setMode] = useState(null); // 'ent' | 'bilim'
  
  // Setup state
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('5');
  const [difficulty, setDifficulty] = useState('Орташа');
  const [error, setError] = useState('');

  // Test state
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionIndex: selectedOptionIndex }
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Result state
  const [aiFeedback, setAiFeedback] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    let timer;
    if (screen === 'testing') {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [screen]);

  const selectMode = (selectedMode) => {
    setMode(selectedMode);
    if (selectedMode === 'ent') {
      setSubject(ENT_SUBJECTS[0]);
      setCount('5');
      setDifficulty('Орташа');
    } else {
      setSubject(BILIM_SUBJECTS[0]);
      setCount('5');
      setTopic('');
    }
    setScreen('setup');
  };

  const generateQuestions = async () => {
    if (!studentName.trim()) {
      setError('Оқушының аты-жөнін енгізіңіз');
      return;
    }
    setError('');
    setScreen('generating');

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const aiModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      let prompt = '';
      if (mode === 'ent') {
        prompt = `Ты — составитель тестовых заданий в формате ЕНТ (Ұлттық бірыңғай тестілеу) для 9 класса школ Казахстана. Составь ${count} тестовых вопросов по предмету '${subject}' уровня сложности '${difficulty}', соответствующих школьной программе 9 класса РК и стилю заданий ЕНТ.

Требования:
- Каждый вопрос — с 4 вариантами ответа, только один правильный
- Вопросы должны соответствовать реальной программе 9 класса, без выхода за её рамки
- Формулировки чёткие, без двусмысленности
- Для каждого вопроса подготовь краткое объяснение правильного ответа (1-2 предложения) — понадобится после теста

Верни ответ СТРОГО в формате JSON:
{
  "questions": [
    { 
      "id": 1,
      "question": "текст вопроса",
      "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
      "correctIndex": 0,
      "explanation": "краткое объяснение правильного ответа"
    }
  ]
}

Язык вопросов — казахский.`;
      } else {
        prompt = `Ты — составитель тестовых заданий для 5 класса школ Казахстана. Составь ${count} тестовых вопросов по предмету '${subject}' ${topic ? `по теме '${topic}'` : ''}, строго в рамках программы 5 класса РК.

Требования:
- Простой, дружелюбный язык, понятный ребёнку 10-11 лет — короткие предложения, без сложных терминов. Язык - казахский.
- Каждый вопрос — с 4 вариантами ответа, только один правильный
- Вопросы не должны быть пугающими или слишком сложными — цель теста не проверить на прочность, а закрепить пройденный материал в лёгкой игровой форме
- Для каждого вопроса — короткое, доброжелательное объяснение правильного ответа (1 предложение), можно с поддерживающей формулировкой при ошибке (например: 'Жақсы әрекет! Дұрыс жауабы...')

Верни ответ СТРОГО в формате JSON (структура как описано ниже):
{
  "questions": [
    { 
      "id": 1,
      "question": "текст вопроса",
      "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
      "correctIndex": 0,
      "explanation": "краткое, доброе объяснение"
    }
  ]
}`;
      }

      const result = await aiModel.generateContent(prompt);
      const text = result.response.text().replace(/```(json)?/gi, '').trim();
      const data = JSON.parse(text);

      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setCurrentQIndex(0);
        setAnswers({});
        setTimeElapsed(0);
        setScreen('testing');
      } else {
        throw new Error('Invalid JSON format');
      }
    } catch (err) {
      console.error(err);
      setError('Тест сұрақтарын жасау кезінде қате пайда болды. Қайталап көріңіз.');
      setScreen('setup');
    }
  };

  const handleSelectOption = (index) => {
    setAnswers({ ...answers, [currentQIndex]: index });
  };

  const nextQuestion = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(currentQIndex - 1);
    }
  };

  const finishTest = async () => {
    setScreen('result');
    
    let correctCount = 0;
    const wrongTopics = [];
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) {
        correctCount++;
      } else {
        wrongTopics.push(q.question);
      }
    });

    const percent = Math.round((correctCount / questions.length) * 100);

    if (onTestComplete) {
      onTestComplete({
        studentName,
        subject,
        date: new Date().toLocaleDateString('kk-KZ'),
        percent,
        score: `${correctCount}/${questions.length}`,
        difficulty: mode === 'ent' ? difficulty : 'Жеңіл',
        testType: mode === 'ent' ? 'ЕНТ тест' : 'Білім тексеру'
      });
    }

    if (mode === 'ent') {
      if (wrongTopics.length > 0) {
        try {
          const genAI = new GoogleGenerativeAI(API_KEY);
          const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const feedbackPrompt = `Ты — ИИ-учитель. Ученик 9 класса сдал ЕНТ тест по предмету '${subject}'.
Он ответил неправильно на вопросы, связанные со следующими темами/вопросами:
${wrongTopics.join('; ')}

Сформулируй 2-3 предложения на КАЗАХСКОМ языке: на какие конкретно темы стоит обратить внимание ученику. Будь вежлив и конструктивен.`;
          
          const result = await aiModel.generateContent(feedbackPrompt);
          setAiFeedback(result.response.text());
        } catch (err) {
          console.error("Failed to generate AI feedback", err);
        }
      } else {
        setAiFeedback("Жарайсың! Барлық сұрақтарға дұрыс жауап бердің. Осы қарқынды жоғалтпа!");
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetTest = () => {
    setScreen('modeselect');
    setMode(null);
    setQuestions([]);
    setAnswers({});
    setCurrentQIndex(0);
    setAiFeedback('');
    setExpandedQuestion(null);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto pb-24 md:pb-0">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileQuestion className="text-accent" /> Тест және Өзіндік жұмыс
        </h2>
        <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
          <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
            Жасанды интеллект таңдалған пән мен сынып бойынша тест сұрақтарын автоматты түрде жасайды. 
            Оқушы тестті өтеді және нәтижесі бойынша кері байланыс алады.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[400px] flex flex-col p-6 lg:p-8">
        
        {/* MODE SELECT SCREEN */}
        {screen === 'modeselect' && (
          <div className="w-full">
            <h3 className="text-xl font-bold text-gray-800 text-center mb-8">Режимді таңдаңыз</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              
              <button 
                onClick={() => selectMode('ent')}
                className="flex flex-col text-left p-6 rounded-2xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 hover:shadow-md transition-all group"
              >
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap size={28} />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">ЕНТ дайындық</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  9-сынып оқушыларына арналған, ҰБТ форматындағы күрделірек тест. Уақытты бақылаумен және толық AI талдаумен.
                </p>
              </button>

              <button 
                onClick={() => selectMode('bilim')}
                className="flex flex-col text-left p-6 rounded-2xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 hover:shadow-md transition-all group"
              >
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={28} />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Білім тексеру</h4>
                <p className="text-sm text-gray-500 leading-relaxed">
                  5-сынып оқушыларына арналған, оқу материалын бекітуге бағытталған жеңіл әрі қызықты тест. Уақыт шектеусіз.
                </p>
              </button>

            </div>
          </div>
        )}

        {/* SETUP SCREEN */}
        {screen === 'setup' && (
          <div className="max-w-md mx-auto w-full space-y-6">
            <button 
              onClick={() => setScreen('modeselect')} 
              className="text-gray-500 hover:text-gray-800 flex items-center gap-2 mb-2 text-sm font-medium"
            >
              <ArrowLeft size={16} /> Артқа
            </button>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-6">
              {mode === 'ent' ? 'ЕНТ тест баптаулары' : 'Білім тексеру баптаулары'}
            </h3>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Оқушының аты-жөні</label>
                <input 
                  type="text" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Мысалы: Азамат Серіков"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Пән</label>
                <select 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                >
                  {(mode === 'ent' ? ENT_SUBJECTS : BILIM_SUBJECTS).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {mode === 'bilim' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Тақырып (міндетті емес)</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Мысалы: Бөлшектер"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Сұрақ саны</label>
                  <select 
                    value={count} 
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                  >
                    {mode === 'ent' ? (
                      <>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="15">15</option>
                      </>
                    ) : (
                      <>
                        <option value="5">5</option>
                        <option value="8">8</option>
                        <option value="10">10</option>
                      </>
                    )}
                  </select>
                </div>
                {mode === 'ent' && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Қиындығы</label>
                    <select 
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                    >
                      <option value="Оңай">Оңай</option>
                      <option value="Орташа">Орташа</option>
                      <option value="Қиын">Қиын</option>
                    </select>
                  </div>
                )}
              </div>

              <button 
                onClick={generateQuestions}
                className="w-full mt-6 bg-accent hover:bg-accent-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                Тестті бастау
              </button>
            </div>
          </div>
        )}

        {/* GENERATING SCREEN */}
        {screen === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
               <Loader2 size={32} className="text-accent animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Сұрақтар дайындалып жатыр...</h3>
            <p className="text-gray-500 text-sm">Жасанды интеллект таңдалған пән бойынша тест құрастыруда</p>
          </div>
        )}

        {/* TESTING SCREEN */}
        {screen === 'testing' && questions.length > 0 && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300 max-w-3xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <span className="bg-accent/10 text-accent font-semibold px-3 py-1.5 rounded-lg text-sm">
                {currentQIndex + 1} / {questions.length} сұрақ
              </span>
              {mode === 'ent' && (
                <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                  <Clock size={16} /> {formatTime(timeElapsed)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-medium text-gray-800 mb-6 leading-relaxed">
                {questions[currentQIndex].question}
              </h3>

              <div className="space-y-3">
                {questions[currentQIndex].options.map((opt, idx) => {
                  const isSelected = answers[currentQIndex] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-accent bg-accent/5 shadow-sm scale-[1.01]' 
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-accent bg-accent text-white' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                        </div>
                        <span className={`text-base ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {opt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
              <button 
                onClick={prevQuestion}
                disabled={currentQIndex === 0}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 px-4 py-2"
              >
                <ChevronLeft size={20} /> Артқа
              </button>

              {currentQIndex < questions.length - 1 ? (
                <button 
                  onClick={nextQuestion}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-6 py-2 rounded-xl transition-colors"
                >
                  Келесі <ChevronRight size={20} />
                </button>
              ) : (
                <button 
                  onClick={finishTest}
                  disabled={answers[currentQIndex] === undefined}
                  className="flex items-center gap-1 bg-accent hover:bg-accent-dark text-white font-medium px-6 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  Аяқтау <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULT SCREEN */}
        {screen === 'result' && (
          <div className="animate-in fade-in duration-500 max-w-3xl mx-auto w-full">
            <div className="text-center mb-8">
              
              {(() => {
                let correctCount = 0;
                questions.forEach((q, idx) => {
                  if (answers[idx] === q.correctIndex) correctCount++;
                });
                const percent = Math.round((correctCount / questions.length) * 100);
                
                if (mode === 'bilim') {
                  let text = "Бәрі жақсы болады, тағы жаттығайық! 🙂";
                  let colorClass = 'text-blue-500';
                  let bgClass = 'bg-blue-50';
                  
                  if (percent >= 80) { 
                    text = "Тамаша! 🎉"; 
                    colorClass = 'text-green-500'; 
                    bgClass = 'bg-green-50'; 
                  } else if (percent >= 50) { 
                    text = "Жақсы, жалғастыра бер! 💪"; 
                    colorClass = 'text-yellow-600'; 
                    bgClass = 'bg-yellow-50'; 
                  }

                  return (
                    <>
                      <div className={`inline-block ${bgClass} ${colorClass} px-6 py-3 rounded-2xl mb-4`}>
                        <span className="text-4xl font-black">{correctCount} / {questions.length}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">{text}</h3>
                    </>
                  );
                } else {
                  // ENT Mode
                  let colorClass = 'text-red-500';
                  let bgClass = 'bg-red-50';
                  if (percent >= 80) { colorClass = 'text-green-500'; bgClass = 'bg-green-50'; }
                  else if (percent >= 50) { colorClass = 'text-yellow-500'; bgClass = 'bg-yellow-50'; }

                  return (
                    <>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">Нәтиже</h3>
                      <div className={`inline-block ${bgClass} ${colorClass} px-6 py-3 rounded-2xl`}>
                        <span className="text-4xl font-black">{correctCount} / {questions.length}</span>
                        <span className="text-xl ml-2 font-semibold">({percent}%)</span>
                      </div>
                    </>
                  );
                }
              })()}
            </div>

            {mode === 'ent' && (
              <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl mb-8 flex gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <FileQuestion size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">AI-талдау:</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {aiFeedback || "Талдау жүктелуде..."}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-8">
              <h4 className="font-bold text-gray-800 mb-4">Сұрақтарды шолу:</h4>
              {questions.map((q, idx) => {
                const isCorrect = answers[idx] === q.correctIndex;
                const isExpanded = expandedQuestion === idx;
                
                return (
                  <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <button 
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 pr-4">
                        {isCorrect ? (
                          <CheckCircle className="text-green-500 shrink-0" size={20} />
                        ) : (
                          <XCircle className={mode === 'bilim' ? "text-orange-400 shrink-0" : "text-red-500 shrink-0"} size={20} />
                        )}
                        <span className="font-medium text-gray-700 text-sm">{idx + 1}. {q.question}</span>
                      </div>
                      <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-100 space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className={`${mode === 'bilim' ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'} p-3 rounded-lg border`}>
                            <span className={`block text-xs font-semibold ${mode === 'bilim' ? 'text-orange-600' : 'text-red-600'} mb-1 uppercase tracking-wider`}>
                              Сенің жауабың
                            </span>
                            <span className="text-gray-800">{answers[idx] !== undefined ? q.options[answers[idx]] : "Жауап берілмеді"}</span>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <span className="block text-xs font-semibold text-green-600 mb-1 uppercase tracking-wider">Дұрыс жауап</span>
                            <span className="text-gray-800">{q.options[q.correctIndex]}</span>
                          </div>
                        </div>
                        <div className="bg-accent/5 p-3 rounded-lg border border-accent/10 mt-3">
                          <span className="block text-xs font-semibold text-accent mb-1 uppercase tracking-wider">Түсініктеме</span>
                          <span className="text-gray-700">{q.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <button 
                onClick={resetTest}
                className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-md"
              >
                <RefreshCw size={18} /> Жаңадан бастау
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EntTest;
