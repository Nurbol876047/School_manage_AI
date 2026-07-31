import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  Gamepad2, Plus, ArrowLeft, Loader2, CheckCircle, XCircle, AlertTriangle, 
  RefreshCw, Clock, Play, HelpCircle, CheckSquare, Layers, Target, RotateCw, Zap, Save,
  Pencil, Trash2
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const GAME_TYPES = [
  { id: 'quiz', title: 'Quiz Game', desc: 'Сұрақ-жауап викторинасы', icon: HelpCircle, color: 'bg-blue-100 text-blue-600', hasCount: true },
  { id: 'true_false', title: 'True / False', desc: 'Дұрыс/Бұрыс ойыны', icon: CheckSquare, color: 'bg-green-100 text-green-600', hasCount: true },
  { id: 'memory', title: 'Memory Cards', desc: 'Жұп карталарды табу', icon: Layers, color: 'bg-purple-100 text-purple-600', hasPairs: true },
  { id: 'spin_wheel', title: 'Spin Wheel', desc: 'Айналдырма дөңгелек', icon: RotateCw, color: 'bg-yellow-100 text-yellow-600', hasCount: true },
  { id: 'match', title: 'Match Game', desc: 'Сәйкестендіру ойыны', icon: Target, color: 'bg-orange-100 text-orange-600', hasPairs: true },
  { id: 'speed_quiz', title: 'Speed Quiz', desc: 'Жылдамдық сынағы', icon: Zap, color: 'bg-red-100 text-red-600', hasCount: true },
];

export default function Games() {
  const [role, setRole] = useState('teacher'); // 'teacher' | 'student'
  const [gamesList, setGamesList] = useState([]);

  // Teacher states
  const [teacherView, setTeacherView] = useState('list'); // 'list' | 'select' | 'setup' | 'generating' | 'preview'
  const [selectedType, setSelectedType] = useState(null);
  const [setupForm, setSetupForm] = useState({ subject: '', grade: '5', count: '5' });
  const [generatedData, setGeneratedData] = useState(null);
  const [error, setError] = useState('');

  // Student states
  const [studentView, setStudentView] = useState('list'); // 'list' | 'playing' | 'result'
  const [activeGame, setActiveGame] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  const handleGenerate = async () => {
    if (!setupForm.subject.trim()) {
      setError('Пән/тақырыпты енгізіңіз');
      return;
    }
    setError('');
    setTeacherView('generating');

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const typeDef = GAME_TYPES.find(t => t.id === selectedType);
      const isPair = typeDef.hasPairs;
      const countLabel = isPair ? setupForm.count : setupForm.count;

      let promptBase = `Ты — помощник учителя по созданию учебной игры для ${setupForm.grade} класса по теме '${setupForm.subject}'. Материал должен строго соответствовать школьной программе РК по этой теме, без выхода за её рамки. Формулировки чёткие и понятные для указанного возраста. Язык: казахский.`;
      
      let format = '';
      if (selectedType === 'quiz' || selectedType === 'speed_quiz') {
        format = `Составь ${countLabel} тестовых вопросов. Верни СТРОГО JSON: { "questions": [{ "question": "текст", "options": ["вариант1", "вариант2", "вариант3", "вариант4"], "correctIndex": 0 }] }`;
      } else if (selectedType === 'true_false') {
        format = `Составь ${countLabel} утверждений (часть верных, часть неверных). Верни СТРОГО JSON: { "questions": [{ "statement": "утверждение", "isTrue": true/false, "explanation": "краткое объяснение" }] }`;
      } else if (selectedType === 'memory' || selectedType === 'match') {
        format = `Составь ${countLabel} пар: термин и его краткое определение по теме (определение до 5 слов). Верни СТРОГО JSON: { "pairs": [{ "term": "термин", "definition": "определение" }] }`;
      } else if (selectedType === 'spin_wheel') {
        format = `Составь ${countLabel} коротких открытых вопросов для колеса вопросов. Верни СТРОГО JSON: { "questions": [{ "question": "вопрос", "answer": "краткий ответ" }] }`;
      }

      const prompt = `${promptBase}\n\n${format}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```(json)?/gi, '').trim();
      const data = JSON.parse(text);

      setGeneratedData(data);
      setTeacherView('preview');
    } catch (err) {
      console.error(err);
      setError('Ойын мазмұнын жасау кезінде қате пайда болды. Қайталап көріңіз.');
      setTeacherView('setup');
    }
  };

  const handleSaveGame = () => {
    const typeDef = GAME_TYPES.find(t => t.id === selectedType);
    const newGame = {
      id: Date.now().toString(),
      type: selectedType,
      typeTitle: typeDef.title,
      subject: setupForm.subject,
      grade: setupForm.grade,
      data: generatedData,
      createdAt: new Date(),
    };
    setGamesList([newGame, ...gamesList]);
    setTeacherView('list');
    setGeneratedData(null);
    setSetupForm({ subject: '', grade: '5', count: '5' });
  };

  const playStudentGame = (game) => {
    setActiveGame(game);
    setStudentView('playing');
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gamepad2 className="text-accent" /> Ойындар
          </h2>
          <p className="text-gray-600 mt-2 text-sm max-w-2xl">
            Сабақ тақырыбына сәйкес интерактивті ойындар жасаңыз. Жасанды интеллект тақырып бойынша сұрақтар мен материалды автоматты түрде дайындайды.
          </p>
        </div>
        
        {/* Role Switcher */}
        <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner self-stretch md:self-auto shrink-0">
          <button 
            onClick={() => { setRole('teacher'); setTeacherView('list'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${role === 'teacher' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Мұғалім
          </button>
          <button 
            onClick={() => { setRole('student'); setStudentView('list'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${role === 'student' ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Оқушы
          </button>
        </div>
      </div>

      {role === 'teacher' && (
        <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[500px] p-6 lg:p-8">
          {teacherView === 'list' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Менің ойындарым</h3>
                <button 
                  onClick={() => setTeacherView('select')}
                  className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors"
                >
                  <Plus size={18} /> Жаңа ойын жасау
                </button>
              </div>
              
              {gamesList.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Gamepad2 size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Сіз әлі ойын жасамадыңыз</p>
                  <button onClick={() => setTeacherView('select')} className="text-accent font-medium mt-2 hover:underline">Бірінші ойынды жасау</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gamesList.map(game => {
                    const t = GAME_TYPES.find(x => x.id === game.type);
                    return (
                      <div key={game.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.color}`}>
                            <t.icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{t.title}</h4>
                            <span className="text-xs text-gray-500">{game.grade} сынып</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-4 line-clamp-2">{game.subject}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{game.createdAt.toLocaleDateString()}</span>
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium">Жарияланған</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {teacherView === 'select' && (
            <div>
              <button onClick={() => setTeacherView('list')} className="text-gray-500 hover:text-gray-800 flex items-center gap-2 mb-6 text-sm font-medium">
                <ArrowLeft size={16} /> Артқа
              </button>
              <h3 className="text-xl font-bold text-gray-800 mb-6">1-қадам: Ойын түрін таңдаңыз</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_TYPES.map(type => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedType(type.id); setTeacherView('setup'); }}
                      className={`text-left p-5 rounded-2xl border-2 transition-all group hover:border-accent hover:shadow-md ${isSelected ? 'border-accent bg-accent/5' : 'border-gray-100'}`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isSelected ? type.color : 'bg-gray-100 text-gray-500 group-hover:' + type.color.split(' ')[0] + ' group-hover:' + type.color.split(' ')[1]}`}>
                        <type.icon size={24} />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">{type.title}</h4>
                      <p className="text-sm text-gray-500">{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {teacherView === 'setup' && (
            <div className="max-w-md mx-auto">
              <button onClick={() => setTeacherView('select')} className="text-gray-500 hover:text-gray-800 flex items-center gap-2 mb-6 text-sm font-medium">
                <ArrowLeft size={16} /> Ойын түрлеріне қайту
              </button>
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">2-қадам: Ойын баптаулары</h3>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 mb-6">
                  <AlertTriangle size={18} /> {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Пән / Тақырып</label>
                  <input 
                    type="text" 
                    value={setupForm.subject}
                    onChange={(e) => setSetupForm({...setupForm, subject: e.target.value})}
                    placeholder="Мысалы: Биология — Жасуша құрылымы"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                  />
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Сынып</label>
                    <select 
                      value={setupForm.grade}
                      onChange={(e) => setSetupForm({...setupForm, grade: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                    >
                      {[5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{g} сынып</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {GAME_TYPES.find(t => t.id === selectedType)?.hasPairs ? 'Жұп саны' : 'Сұрақ саны'}
                    </label>
                    <select 
                      value={setupForm.count}
                      onChange={(e) => setSetupForm({...setupForm, count: e.target.value})}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors"
                    >
                      {GAME_TYPES.find(t => t.id === selectedType)?.hasPairs 
                        ? [6,8,10].map(c => <option key={c} value={c}>{c}</option>)
                        : [5,10,15].map(c => <option key={c} value={c}>{c}</option>)
                      }
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  className="w-full mt-6 bg-accent hover:bg-accent-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Ойынды жасау
                </button>
              </div>
            </div>
          )}

          {teacherView === 'generating' && (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                 <Loader2 size={32} className="text-accent animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ойын дайындалып жатыр...</h3>
              <p className="text-gray-500 text-sm">AI материалдарды талдап, сұрақтарды құрастыруда</p>
            </div>
          )}

          {teacherView === 'preview' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Мазмұнды алдын ала қарау</h3>
                <div className="flex gap-2">
                  <button onClick={handleGenerate} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                    <RefreshCw size={16} /> Қайта жасау
                  </button>
                  <button onClick={handleSaveGame} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                    <Save size={16} /> Сақтау және жариялау
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <PreviewEditor data={generatedData} setData={setGeneratedData} type={selectedType} />
              </div>
            </div>
          )}
        </div>
      )}

      {role === 'student' && (
        <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[500px] p-6 lg:p-8">
          {studentView === 'list' && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-6">Қолжетімді ойындар</h3>
              {gamesList.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Gamepad2 size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Қазіргі уақытта қолжетімді ойындар жоқ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gamesList.map(game => {
                    const t = GAME_TYPES.find(x => x.id === game.type);
                    return (
                      <div key={game.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.color}`}>
                            <t.icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">{t.title}</h4>
                            <span className="text-xs text-gray-500">{game.grade} сынып</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-4 line-clamp-2 flex-1">{game.subject}</p>
                        <button 
                          onClick={() => playStudentGame(game)}
                          className="w-full flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent text-accent hover:text-white font-semibold py-2.5 rounded-xl transition-colors"
                        >
                          <Play size={16} /> Ойнау
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {studentView === 'playing' && activeGame && (
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <button onClick={() => setStudentView('list')} className="text-gray-500 hover:text-gray-800 flex items-center gap-2 text-sm font-medium">
                  <ArrowLeft size={16} /> Ойындар тізіміне
                </button>
                <div className="font-bold text-gray-800 flex items-center gap-2">
                  {GAME_TYPES.find(t => t.id === activeGame.type)?.title}
                </div>
              </div>

              <div className="mt-4">
                {activeGame.type === 'quiz' && <QuizGamePlayer data={activeGame.data} onFinish={(res) => {setGameResult(res); setStudentView('result');}} />}
                {activeGame.type === 'speed_quiz' && <QuizGamePlayer data={activeGame.data} isSpeed onFinish={(res) => {setGameResult(res); setStudentView('result');}} />}
                {activeGame.type === 'true_false' && <TrueFalsePlayer data={activeGame.data} onFinish={(res) => {setGameResult(res); setStudentView('result');}} />}
                {activeGame.type === 'memory' && <MemoryPlayer data={activeGame.data} onFinish={(res) => {setGameResult(res); setStudentView('result');}} />}
                {activeGame.type === 'match' && <MatchPlayer data={activeGame.data} onFinish={(res) => {setGameResult(res); setStudentView('result');}} />}
                {activeGame.type === 'spin_wheel' && <SpinWheelPlayer data={activeGame.data} />}
              </div>
            </div>
          )}

          {studentView === 'result' && (
            <div className="text-center py-12 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={48} />
              </div>
              <h2 className="text-3xl font-black text-gray-800 mb-2">Ойын аяқталды!</h2>
              <p className="text-xl font-medium text-gray-600 mb-8">
                Сенің нәтижең: <span className="text-accent font-bold">{gameResult?.score}</span>
              </p>
              
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => setStudentView('list')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
                >
                  Тізімге қайту
                </button>
                <button 
                  onClick={() => playStudentGame(activeGame)}
                  className="px-6 py-3 bg-accent hover:bg-accent-dark text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  <RotateCw size={18} /> Тағы ойнау
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= PLAYERS =================

function QuizGamePlayer({ data, isSpeed, onFinish }) {
  const questions = data.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (isSpeed) {
      setTimeLeft(15);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAnswer(-1); // timeout
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  const handleAnswer = (idx) => {
    const isCorrect = idx === questions[currentIndex].correctIndex;
    if (isCorrect) setScore(s => s + 1);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      clearInterval(timerRef.current);
      onFinish({ score: `${isCorrect ? score + 1 : score} / ${questions.length}` });
    }
  };

  if (!questions.length) return <div>Қате: Сұрақтар жоқ</div>;
  const q = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-500 font-medium">Сұрақ {currentIndex + 1} / {questions.length}</span>
        {isSpeed && (
          <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg">
            <Clock size={18} /> {timeLeft} сек
          </div>
        )}
      </div>
      <h3 className="text-xl font-medium text-gray-800 mb-6">{q.question}</h3>
      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleAnswer(i)}
            className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-accent hover:bg-accent/5 transition-all"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function TrueFalsePlayer({ data, onFinish }) {
  const questions = data.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  const handleAnswer = (answer) => {
    const isCorrect = answer === questions[currentIndex].isTrue;
    if (isCorrect) setScore(s => s + 1);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish({ score: `${isCorrect ? score + 1 : score} / ${questions.length}` });
    }
  };

  if (!questions.length) return <div>Қате: Сұрақтар жоқ</div>;
  const q = questions[currentIndex];

  return (
    <div className="max-w-xl mx-auto text-center py-10">
      <span className="text-gray-500 font-medium mb-4 block">Утверждение {currentIndex + 1} / {questions.length}</span>
      <h3 className="text-2xl font-bold text-gray-800 mb-10 leading-relaxed min-h-[100px]">{q.statement}</h3>
      <div className="flex justify-center gap-6">
        <button 
          onClick={() => handleAnswer(true)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-5 rounded-2xl text-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          Дұрыс
        </button>
        <button 
          onClick={() => handleAnswer(false)}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-5 rounded-2xl text-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
        >
          Бұрыс
        </button>
      </div>
    </div>
  );
}

function MemoryPlayer({ data, onFinish }) {
  const pairs = data.pairs || [];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    const formatted = [];
    pairs.forEach((p, idx) => {
      formatted.push({ id: `t_${idx}`, text: p.term, pairId: idx });
      formatted.push({ id: `d_${idx}`, text: p.definition, pairId: idx });
    });
    setCards(formatted.sort(() => Math.random() - 0.5));
  }, [data]);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(cards[idx].pairId)) return;
    
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const match = cards[newFlipped[0]].pairId === cards[newFlipped[1]].pairId;
      if (match) {
        setMatched([...matched, cards[newFlipped[0]].pairId]);
        setFlipped([]);
        if (matched.length + 1 === pairs.length) {
          setTimeout(() => onFinish({ score: `${moves + 1} қадам` }), 500);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  return (
    <div>
      <div className="text-center mb-6 text-gray-600 font-medium">Қадамдар саны: {moves}</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {cards.map((c, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(c.pairId);
          return (
            <button
              key={c.id}
              onClick={() => handleFlip(idx)}
              className={`aspect-square rounded-xl p-3 text-sm flex items-center justify-center text-center transition-all duration-300 transform-gpu perspective-1000 ${
                isFlipped 
                  ? matched.includes(c.pairId) ? 'bg-green-100 border-green-200 text-green-800' : 'bg-white border-2 border-accent text-gray-800 shadow-md rotate-y-0' 
                  : 'bg-accent text-accent hover:bg-accent-dark shadow-sm rotate-y-180'
              }`}
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'none' : 'rotateY(180deg)' }}
            >
              <span className={isFlipped ? 'opacity-100' : 'opacity-0'}>{c.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchPlayer({ data, onFinish }) {
  const pairs = data.pairs || [];
  const [leftCol, setLeftCol] = useState([]);
  const [rightCol, setRightCol] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);

  useEffect(() => {
    const left = pairs.map((p, i) => ({ id: i, text: p.term })).sort(() => Math.random() - 0.5);
    const right = pairs.map((p, i) => ({ id: i, text: p.definition })).sort(() => Math.random() - 0.5);
    setLeftCol(left);
    setRightCol(right);
  }, [data]);

  useEffect(() => {
    if (selectedLeft !== null && selectedRight !== null) {
      if (selectedLeft === selectedRight) {
        const newMatched = [...matchedPairs, selectedLeft];
        setMatchedPairs(newMatched);
        setSelectedLeft(null);
        setSelectedRight(null);
        if (newMatched.length === pairs.length) {
          setTimeout(() => onFinish({ score: '100%' }), 500);
        }
      } else {
        setTimeout(() => {
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 800);
      }
    }
  }, [selectedLeft, selectedRight]);

  return (
    <div className="flex gap-8 max-w-4xl mx-auto">
      <div className="flex-1 space-y-3">
        {leftCol.map((item) => {
          const isMatched = matchedPairs.includes(item.id);
          const isSelected = selectedLeft === item.id;
          let style = "bg-white border-gray-200 text-gray-700 hover:border-accent";
          if (isMatched) style = "bg-green-50 border-green-200 text-green-700 opacity-50";
          else if (isSelected) style = "bg-accent/10 border-accent text-accent shadow-sm scale-105";
          
          return (
            <button 
              key={`l_${item.id}`}
              disabled={isMatched}
              onClick={() => setSelectedLeft(item.id)}
              className={`w-full p-4 border-2 rounded-xl text-left transition-all ${style}`}
            >
              {item.text}
            </button>
          );
        })}
      </div>
      <div className="flex-1 space-y-3">
        {rightCol.map((item) => {
          const isMatched = matchedPairs.includes(item.id);
          const isSelected = selectedRight === item.id;
          let style = "bg-white border-gray-200 text-gray-700 hover:border-accent";
          if (isMatched) style = "bg-green-50 border-green-200 text-green-700 opacity-50";
          else if (isSelected) style = "bg-accent/10 border-accent text-accent shadow-sm scale-105";

          return (
            <button 
              key={`r_${item.id}`}
              disabled={isMatched}
              onClick={() => setSelectedRight(item.id)}
              className={`w-full p-4 border-2 rounded-xl text-left transition-all ${style}`}
            >
              {item.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpinWheelPlayer({ data }) {
  const questions = data.questions || [];
  const [spinning, setSpinning] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const spin = () => {
    setSpinning(true);
    setShowAnswer(false);
    setSelectedIdx(null);
    setTimeout(() => {
      setSelectedIdx(Math.floor(Math.random() * questions.length));
      setSpinning(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`w-64 h-64 rounded-full border-8 border-accent shadow-xl flex items-center justify-center mb-8 relative overflow-hidden transition-transform duration-[2000ms] ${spinning ? 'rotate-[1080deg]' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-accent to-accent-light opacity-20"></div>
        {spinning ? (
          <RotateCw size={48} className="text-accent animate-spin" style={{ animationDuration: '0.5s' }} />
        ) : (
          <span className="text-3xl font-black text-accent">{selectedIdx !== null ? '?' : 'START'}</span>
        )}
      </div>

      <button 
        onClick={spin}
        disabled={spinning}
        className="px-8 py-4 bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-bold rounded-full text-xl shadow-lg hover:shadow-xl transition-all"
      >
        Айналдыру
      </button>

      {selectedIdx !== null && !spinning && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-2xl max-w-xl w-full text-center animate-in slide-in-from-bottom-4">
          <h3 className="text-xl font-medium text-gray-800 mb-4">{questions[selectedIdx].question}</h3>
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} className="text-accent font-medium hover:underline">Жауапты көрсету</button>
          ) : (
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-800 font-medium">
              {questions[selectedIdx].answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ================= PREVIEW EDITOR =================

function PreviewEditor({ data, setData, type }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const isQuiz = type === 'quiz' || type === 'speed_quiz';
  const isTrueFalse = type === 'true_false';
  const isPairs = type === 'memory' || type === 'match';
  const isSpin = type === 'spin_wheel';

  const items = isPairs ? data.pairs : data.questions;

  const handleEdit = (idx) => {
    setEditingIdx(idx);
    setEditForm(JSON.parse(JSON.stringify(items[idx]))); // deep copy
  };

  const handleDelete = (idx) => {
    const newItems = [...items];
    newItems.splice(idx, 1);
    if (isPairs) setData({ ...data, pairs: newItems });
    else setData({ ...data, questions: newItems });
  };

  const handleSaveEdit = () => {
    const newItems = [...items];
    newItems[editingIdx] = editForm;
    if (isPairs) setData({ ...data, pairs: newItems });
    else setData({ ...data, questions: newItems });
    setEditingIdx(null);
    setEditForm(null);
  };

  const handleCancelEdit = () => {
    setEditingIdx(null);
    setEditForm(null);
  };

  if (!items || items.length === 0) return <div className="text-gray-500 text-center py-4">Мәліметтер жоқ</div>;

  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const isEditing = editingIdx === idx;

        if (isEditing) {
          return (
            <div key={idx} className="bg-white border-2 border-accent rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-accent">{idx + 1}-жазбаны өңдеу</span>
              </div>
              
              {isQuiz && (
                <div className="space-y-3">
                  <input className="w-full border p-2 rounded" value={editForm.question} onChange={e => setEditForm({...editForm, question: e.target.value})} />
                  {editForm.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input type="radio" checked={editForm.correctIndex === oIdx} onChange={() => setEditForm({...editForm, correctIndex: oIdx})} />
                      <input className="flex-1 border p-2 rounded text-sm" value={opt} onChange={e => {
                        const newOpts = [...editForm.options];
                        newOpts[oIdx] = e.target.value;
                        setEditForm({...editForm, options: newOpts});
                      }} />
                    </div>
                  ))}
                </div>
              )}

              {isTrueFalse && (
                <div className="space-y-3">
                  <input className="w-full border p-2 rounded" value={editForm.statement} onChange={e => setEditForm({...editForm, statement: e.target.value})} />
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={editForm.isTrue === true} onChange={() => setEditForm({...editForm, isTrue: true})} /> Дұрыс</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={editForm.isTrue === false} onChange={() => setEditForm({...editForm, isTrue: false})} /> Бұрыс</label>
                  </div>
                  <input className="w-full border p-2 rounded text-sm" placeholder="Түсініктеме" value={editForm.explanation || ''} onChange={e => setEditForm({...editForm, explanation: e.target.value})} />
                </div>
              )}

              {isPairs && (
                <div className="space-y-3">
                  <input className="w-full border p-2 rounded" placeholder="Термин" value={editForm.term} onChange={e => setEditForm({...editForm, term: e.target.value})} />
                  <input className="w-full border p-2 rounded" placeholder="Анықтама" value={editForm.definition} onChange={e => setEditForm({...editForm, definition: e.target.value})} />
                </div>
              )}

              {isSpin && (
                <div className="space-y-3">
                  <input className="w-full border p-2 rounded" placeholder="Сұрақ" value={editForm.question} onChange={e => setEditForm({...editForm, question: e.target.value})} />
                  <input className="w-full border p-2 rounded" placeholder="Жауап" value={editForm.answer} onChange={e => setEditForm({...editForm, answer: e.target.value})} />
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveEdit} className="bg-accent text-white px-4 py-2 rounded text-sm font-medium">Сақтау</button>
                <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium">Бас тарту</button>
              </div>
            </div>
          );
        }

        // View Mode
        return (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(idx)} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(idx)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
            </div>
            
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{idx + 1}-{isPairs ? 'жұп' : 'сұрақ'}</span>
            
            {isQuiz && (
              <>
                <h4 className="text-lg font-bold text-gray-800 mb-3 pr-16">{item.question}</h4>
                <div className="space-y-2">
                  {item.options.map((opt, oIdx) => {
                    const isCorrect = item.correctIndex === oIdx;
                    const labels = ['A', 'Ә', 'Б', 'В'];
                    return (
                      <div key={oIdx} className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                        <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${isCorrect ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>{labels[oIdx]}</span>
                        <span className={`flex-1 text-sm ${isCorrect ? 'text-green-800 font-medium' : 'text-gray-700'}`}>{opt}</span>
                        {isCorrect && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {isTrueFalse && (
              <>
                <h4 className="text-lg font-bold text-gray-800 mb-3 pr-16">{item.statement}</h4>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${item.isTrue ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.isTrue ? 'Дұрыс' : 'Бұрыс'}
                </div>
                {item.explanation && <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">{item.explanation}</p>}
              </>
            )}

            {isPairs && (
              <div className="grid grid-cols-2 gap-4 pr-16">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Термин</span>
                  <div className="font-bold text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">{item.term}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Анықтама</span>
                  <div className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{item.definition}</div>
                </div>
              </div>
            )}

            {isSpin && (
              <>
                <h4 className="text-lg font-bold text-gray-800 mb-2 pr-16">{item.question}</h4>
                <div className="text-sm text-green-700 font-medium bg-green-50 p-2 rounded border border-green-100 inline-block">Жауап: {item.answer}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
