import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  FileQuestion, Loader2, CheckCircle, XCircle, AlertTriangle, 
  ChevronRight, ChevronLeft, RefreshCw, Clock
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const EntTest = ({ onTestComplete }) => {
  const [screen, setScreen] = useState('setup'); // setup | generating | testing | result
  
  // Setup state
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('Қазақ тілі');
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

  const generateQuestions = async () => {
    if (!studentName.trim()) {
      setError('Оқушының аты-жөнін енгізіңіз');
      return;
    }
    setError('');
    setScreen('generating');

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Ты — составитель тестовых заданий в формате ЕНТ (Ұлттық бірыңғай тестілеу) для 9 класса школ Казахстана. Составь ${count} тестовых вопросов по предмету '${subject}' уровня сложности '${difficulty}', соответствующих школьной программе 9 класса РК и стилю заданий ЕНТ.

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

Язык вопросов — казахский, если предмет 'Қазақ тілі' или гуманитарный; для точных наук можно использовать термины как в учебниках РК.`;

      const result = await model.generateContent(prompt);
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
    
    // Calculate score
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

    // Save result to App state
    if (onTestComplete) {
      onTestComplete({
        studentName,
        subject,
        date: new Date().toLocaleDateString('kk-KZ'),
        percent,
        score: `${correctCount}/${questions.length}`,
        difficulty
      });
    }

    // Generate feedback based on mistakes
    if (wrongTopics.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const feedbackPrompt = `Ты — ИИ-учитель. Ученик 9 класса сдал ЕНТ тест по предмету '${subject}'.
Он ответил неправильно на вопросы, связанные со следующими темами/вопросами:
${wrongTopics.join('; ')}

Сформулируй 2-3 предложения на КАЗАХСКОМ языке: на какие конкретно темы стоит обратить внимание ученику. Будь вежлив и конструктивен.`;
        
        const result = await model.generateContent(feedbackPrompt);
        setAiFeedback(result.response.text());
      } catch (err) {
        console.error("Failed to generate AI feedback", err);
      }
    } else {
      setAiFeedback("Жарайсың! Барлық сұрақтарға дұрыс жауап бердің. Осы қарқынды жоғалтпа!");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resetTest = () => {
    setScreen('setup');
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
          <FileQuestion className="text-accent" /> ЕНТ тест
        </h2>
        <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
          <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
            9-сынып оқушыларына арналған ЕНТ (Ұлттық бірыңғай тестілеу) форматындағы тест. Жасанды интеллект таңдалған пән бойынша тест сұрақтарын жасайды, оқушы тестті өтеді және нәтижесі бойынша толық талдау алады.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[400px] flex flex-col p-6 lg:p-8">
        
        {/* SETUP SCREEN */}
        {screen === 'setup' && (
          <div className="max-w-md mx-auto w-full space-y-6">
            <h3 className="text-xl font-bold text-gray-800 text-center mb-6">Тест баптаулары</h3>
            
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
                  <option value="Қазақ тілі">Қазақ тілі</option>
                  <option value="Қазақ әдебиеті">Қазақ әдебиеті</option>
                  <option value="Орыс тілі">Орыс тілі</option>
                  <option value="Орыс әдебиеті">Орыс әдебиеті</option>
                  <option value="Ағылшын тілі">Ағылшын тілі</option>
                  <option value="Алгебра">Алгебра</option>
                  <option value="Геометрия">Геометрия</option>
                  <option value="Информатика">Информатика</option>
                  <option value="Қазақстан тарихы">Қазақстан тарихы</option>
                  <option value="Дүниежүзі тарихы">Дүниежүзі тарихы</option>
                  <option value="География">География</option>
                  <option value="Биология">Биология</option>
                  <option value="Физика">Физика</option>
                  <option value="Химия">Химия</option>
                  <option value="Құқық негіздері">Құқық негіздері</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Сұрақ саны</label>
                  <select 
                    value={count} 
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                </div>
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
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <span className="bg-accent/10 text-accent font-semibold px-3 py-1.5 rounded-lg text-sm">
                {currentQIndex + 1} / {questions.length} сұрақ
              </span>
              <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                <Clock size={16} /> {formatTime(timeElapsed)}
              </div>
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
                          ? 'border-accent bg-accent/5 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
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
                  Тестті аяқтау <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* RESULT SCREEN */}
        {screen === 'result' && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Нәтиже</h3>
              
              {(() => {
                let correctCount = 0;
                questions.forEach((q, idx) => {
                  if (answers[idx] === q.correctIndex) correctCount++;
                });
                const percent = Math.round((correctCount / questions.length) * 100);
                
                let colorClass = 'text-red-500';
                let bgClass = 'bg-red-50';
                if (percent >= 80) { colorClass = 'text-green-500'; bgClass = 'bg-green-50'; }
                else if (percent >= 50) { colorClass = 'text-yellow-500'; bgClass = 'bg-yellow-50'; }

                return (
                  <div className={`inline-block ${bgClass} ${colorClass} px-6 py-3 rounded-2xl`}>
                    <span className="text-4xl font-black">{correctCount} / {questions.length}</span>
                    <span className="text-xl ml-2 font-semibold">({percent}%)</span>
                  </div>
                );
              })()}
            </div>

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
                          <XCircle className="text-red-500 shrink-0" size={20} />
                        )}
                        <span className="font-medium text-gray-700 text-sm">{idx + 1}. {q.question}</span>
                      </div>
                      <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-gray-100 space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                            <span className="block text-xs font-semibold text-red-600 mb-1 uppercase tracking-wider">Сенің жауабың</span>
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

            <div className="flex justify-center">
              <button 
                onClick={resetTest}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-6 py-3 rounded-xl transition-colors"
              >
                <RefreshCw size={18} /> Жаңа тест бастау
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EntTest;
