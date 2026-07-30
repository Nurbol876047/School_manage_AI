import React, { useState, useEffect } from 'react';
import { 
  Send, Plus, TrendingDown, UserX, AlertOctagon, Trophy, Calendar, Edit3, 
  Loader2, Check, User, Clock, RefreshCw
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const situations = [
  { id: 'Үлгерім төмендеді', icon: TrendingDown, label: 'Үлгерім төмендеді', color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'Сабаққа қатыспады', icon: UserX, label: 'Сабаққа қатыспады', color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'Тәртіп бұзушылық', icon: AlertOctagon, label: 'Тәртіп бұзушылық', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'Жетістік', icon: Trophy, label: 'Жетістік', color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'Жиналысқа шақыру', icon: Calendar, label: 'Жиналысқа шақыру', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'Өз тақырыбы', icon: Edit3, label: 'Өз тақырыбы', color: 'text-purple-500', bg: 'bg-purple-50' },
];

const mockStudents = [
  "Ахметов Азамат", "Серікова Арайлым", "Болатұлы Дастан", "Қайратқызы Мәдина"
];

const ParentCommunication = ({ initialData, clearInitialData }) => {
  const [viewRole, setViewRole] = useState('teacher'); // teacher | parent
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSituation, setSelectedSituation] = useState('');
  const [note, setNote] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      student: "Ахметов Азамат",
      situation: "Сабаққа қатыспады",
      date: new Date(Date.now() - 86400000).toISOString(),
      text: "Құрметті Азаматтың ата-анасы! Азамат бүгінгі сабақтарға қатыспағанын хабарлаймын. Оның денсаулығы жақсы ма, бәрі дұрыс па? Уайымдап жатырмын. Мүмкіндік болғанда маған хабарласуыңызды сұраймын.",
      read: true,
      reply: "Сәлеметсіз бе! Азамат ауырып қалды, ертең анықтама әкеледі."
    }
  ]);
  
  // Обработка перехода из "Үлгерім"
  useEffect(() => {
    if (initialData) {
      setViewRole('teacher');
      setSelectedStudent(initialData.studentName || '');
      setSelectedSituation(initialData.reason || '');
      setIsModalOpen(true);
      if (clearInitialData) clearInitialData();
    }
  }, [initialData, clearInitialData]);

  const handleGenerate = async () => {
    if (!selectedStudent || !selectedSituation) return;
    
    setIsGenerating(true);
    setGeneratedMessage('');
    
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let fullNote = note;
      if (selectedSituation === 'Жиналысқа шақыру' && meetingDate && meetingTime) {
        fullNote += ` (Уақыты: ${meetingDate} ${meetingTime})`;
      }

      const prompt = `Ты — помощник учителя, который превращает короткую рабочую заметку в вежливое, понятное и доброжелательное сообщение для родителя ученика. 

Входные данные: 
- Ситуация: ${selectedSituation}
- Заметка учителя: ${fullNote || 'Нет заметки'}
- Имя ученика: ${selectedStudent}

Правила:
- Пиши СТРОГО на казахском языке, простым и тёплым тоном, без обвинительных формулировок.
- Для негативных ситуаций сохраняй уважительный, конструктивный тон, без давления.
- Для позитивной ситуации ('Жетістік') — искренне, тепло похвали ученика.
- Сообщение должно быть коротким: 3-5 предложений.
- Верни только готовый текст сообщения, без пояснений.`;

      const result = await model.generateContent(prompt);
      setGeneratedMessage(result.response.text().trim());
      
    } catch (error) {
      console.error(error);
      setGeneratedMessage("Хабарлама жасау кезінде қате пайда болды. Қайталап көріңіз.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    if (!generatedMessage) return;
    
    const newMsg = {
      id: Date.now(),
      student: selectedStudent,
      situation: selectedSituation,
      date: new Date().toISOString(),
      text: generatedMessage,
      read: false,
      reply: null
    };
    
    setMessages([newMsg, ...messages]);
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedStudent('');
    setSelectedSituation('');
    setNote('');
    setMeetingDate('');
    setMeetingTime('');
    setGeneratedMessage('');
  };

  const handleReply = (id, replyText) => {
    if (!replyText.trim()) return;
    setMessages(messages.map(m => m.id === id ? { ...m, reply: replyText, read: true } : m));
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-24 md:pb-0">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Ата-аналармен байланыс</h2>
          <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
            <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
              Мұғалім оқушы туралы жағдайды таңдап, бір түймемен ата-анаға түсінікті әрі сыпайы хабарлама жібереді — жасанды интеллект қысқа жазбаны толық, жылы да нақты мәтінге айналдырады.
            </p>
          </div>
        </div>
        
        {viewRole === 'teacher' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-accent/20 flex items-center gap-2 text-sm shrink-0 mt-1"
          >
            <Send size={18} /> Жаңа хабарлама
          </button>
        )}
      </div>

      {/* Tabs for Unified Interface Demo */}
      <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-fit mb-6">
        <button
          onClick={() => setViewRole('teacher')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewRole === 'teacher' ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Мұғалім көрінісі
        </button>
        <button
          onClick={() => setViewRole('parent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewRole === 'parent' ? 'bg-white text-accent shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Ата-ана көрінісі
        </button>
      </div>

      {/* Message Feed */}
      <div className="space-y-4">
        {messages.map(msg => {
          const sit = situations.find(s => s.id === msg.situation) || situations[0];
          const Icon = sit.icon;
          
          return (
            <div key={msg.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${sit.bg} ${sit.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800">
                      {viewRole === 'teacher' ? msg.student : 'Сынып жетекшісі'}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.date).toLocaleDateString('kk-KZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider mb-2 ${sit.bg} ${sit.color}`}>
                    {msg.situation}
                  </span>
                  
                  <div className="bg-gray-50 p-4 rounded-xl rounded-tl-sm text-sm text-gray-700 leading-relaxed mb-3">
                    {msg.text}
                  </div>
                  
                  {/* Status for Teacher */}
                  {viewRole === 'teacher' && (
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-400 mb-2">
                      <Check size={14} className={msg.read ? 'text-accent' : ''} /> 
                      {msg.read ? 'Оқылды' : 'Оқылмады'}
                    </div>
                  )}

                  {/* Reply Section */}
                  {msg.reply ? (
                    <div className="bg-accent/5 p-4 rounded-xl rounded-tr-sm text-sm text-gray-700 leading-relaxed ml-8 border border-accent/10">
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-accent" />
                        <span className="font-semibold text-accent text-xs uppercase tracking-wider">
                          {viewRole === 'teacher' ? 'Ата-ана жауабы' : 'Сіздің жауабыңыз'}
                        </span>
                      </div>
                      {msg.reply}
                    </div>
                  ) : (
                    viewRole === 'parent' && (
                      <form 
                        className="ml-8 mt-2 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = e.target.elements.reply.value;
                          handleReply(msg.id, val);
                        }}
                      >
                        <input 
                          type="text" 
                          name="reply"
                          placeholder="Жауап жазу..." 
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                        <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Жіберу
                        </button>
                      </form>
                    )
                  )}

                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">Хабарламалар жоқ</div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">Жаңа хабарлама</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 p-1">
                <UserX size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">1. Оқушының аты-жөні</label>
                <input 
                  type="text"
                  value={selectedStudent} 
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  placeholder="Оқушының аты-жөнін жазыңыз..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">2. Жағдайды таңдаңыз</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {situations.map(sit => {
                    const Icon = sit.icon;
                    const isSelected = selectedSituation === sit.id;
                    return (
                      <button
                        key={sit.id}
                        onClick={() => setSelectedSituation(sit.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                          isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-gray-200 bg-white hover:border-accent/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${sit.bg} ${sit.color}`}>
                          <Icon size={20} />
                        </div>
                        <span className={`text-xs font-semibold text-center ${isSelected ? 'text-accent' : 'text-gray-600'}`}>
                          {sit.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">3. Қысқаша жазба (міндетті емес)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Мысалы: соңғы 3 бақылау жұмысы нашар..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:bg-white resize-none h-20"
                />
              </div>

              {selectedSituation === 'Жиналысқа шақыру' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Күні</label>
                    <input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Уақыты</label>
                    <input type="time" value={meetingTime} onChange={e => setMeetingTime(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                  </div>
                </div>
              )}

              {generatedMessage && (
                <div className="mt-6">
                  <label className="block text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                    <Check size={16} /> AI құрастырған хабарлама:
                  </label>
                  <textarea
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    className="w-full bg-accent/5 border border-accent/20 rounded-xl px-4 py-4 text-sm text-gray-800 focus:outline-none focus:border-accent min-h-[120px]"
                  />
                </div>
              )}

            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              {!generatedMessage ? (
                <button
                  onClick={handleGenerate}
                  disabled={!selectedStudent || !selectedSituation || isGenerating}
                  className="bg-accent hover:bg-accent-dark disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2"
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Хабарлама жасау
                </button>
              ) : (
                <>
                  <button onClick={handleGenerate} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                    <RefreshCw size={18} /> Қайта жасау
                  </button>
                  <button onClick={handleSend} className="bg-accent hover:bg-accent-dark text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-md flex items-center gap-2">
                    <Send size={18} /> Жіберу
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ParentCommunication;
