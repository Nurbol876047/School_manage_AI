import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleHeart, Send, Loader2, User, PhoneCall, GraduationCap, Users, BookOpen } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const initialChats = {
  teacher: [
    { role: 'ai', text: 'Сәлеметсіз бе! Мұнда жұмыстағы қиындықтарды, шаршауды немесе сыныптағы күрделі жағдайларды өзіңізге ыңғайлы қарқында талқылауға болады.' }
  ],
  student: [
    { role: 'ai', text: 'Сәлем! Мұнда өзіңді мазалап жүрген нәрселермен еркін бөлісе аласың. Қалай бар, солай жаз — мен әрқашан жаныңдамын.' }
  ],
  parent: [
    { role: 'ai', text: 'Сәлеметсіз бе! Мұнда балаңызға мектеп мәселелерінде қалай жақсырақ қолдау көрсетуге болатынын сұрай аласыз — мен барлығын түсінікті әрі нақты етіп түсіндіруге тырысамын.' }
  ]
};

const systemPrompts = {
  teacher: `Сен — педагогқа арналған ИИ-сұхбаттасушысың, мектеп ортасын кәсіби түрде түсінетін әріптес-психолог рөлін атқарасың.
Сен кәсіби терминологияны (жану/выгорание, эмоционалдық жүктеме, шекаралар, мүдделер қақтығысы және т.б.) қолдана аласың.
Мұғалімге ойларын құрылымдауға көмектес: не болды, мұғалім не сезініп тұр, қандай әрекет нұсқалары бар.
Нақты педагогикалық немесе коммуникациялық әдістерді ұсына аласың (мысалы, қиын оқушымен немесе ата-анамен сөйлесу үшін).
Тон — құрметті, тең дәрежеде, ақылгөйсімейтін болуы керек.

ҚАУІПСІЗДІК ЕРЕЖЕЛЕРІ:
- Ешқашан диагноз қойма.
- Ешқашан дәрі-дәрмек туралы кеңес берме.
- Мұғалімнің өзінде қатты күйзеліс немесе кәсіби жану (выгорание) белгілері байқалса, міндетті түрде нағыз маманға (психотерапевт немесе психологқа) жүгінуге кеңес бер.
- Барлық диалог міндетті түрде тек қазақ тілінде жүргізілуі тиіс. Орысша жазса да, таза қазақ тілінде жауап бер.`,

  student: `Сен — оқушыға арналған жылы, түсінікті ИИ-сұхбаттасушысың.
Қарапайым, қысқа сөйлемдермен, күрделі терминдерсіз және ресми сөздерсіз сөйлес.
Достық, бірақ құрметті тонды қолдан — беделді ересек адам сияқты емес, үлкен дос ретінде сөйлес.
Ақыл айтпа және нотация оқыма.
Бір уақытта тек бір ғана сұрақ қой, сұхбаттасушыға өз ойын толық жеткізуге уақыт бер.
Бірден ақыл айтуға асықпай, оның сезімдеріне шынайы қызығушылық таныт.

ҚАУІПСІЗДІК ЕРЕЖЕЛЕРІ:
- Ешқашан диагноз қойма.
- Ешқашан дәрі-дәрмек туралы кеңес берме.
- Дағдарыс немесе өзіне зиян келтіру (суицид) белгілері байқалса, міндетті түрде мектеп психологына немесе үлкендерге жүгінуді сұра, сондай-ақ 150 (Қазақстан ұлттық сенім телефоны) нөмірін ұсын.
- Ешқашан баланы ересектерден оқшаулама.
- Барлық диалог міндетті түрде тек қазақ тілінде жүргізілуі тиіс. Орысша жазса да, таза қазақ тілінде жауап бер.`,

  parent: `Сен — мектеп және тәрбие мәселелері бойынша ата-аналарға арналған ИИ-кеңесшісің.
Педагогикалық және психологиялық терминдерсіз, қарапайым тілмен сөйлес — егер термин қажет болса, оны бірден қарапайым сөздермен түсіндір.
Ата-анаға жағдайды баланың көзқарасымен қарауға көмектес, жалпы сөздердің орнына нақты, практикалық қадамдар (не айту керек, әңгімені қалай бастау керек) ұсын.
Тон — жылы, қолдау көрсететін, ата-ананы кінәламайтын болуы керек.

ҚАУІПСІЗДІК ЕРЕЖЕЛЕРІ:
- Ешқашан балаға диагноз қойма.
- Дәрі-дәрмек туралы кеңес берме.
- Баланың қатты дистресс белгілері байқалса, міндетті түрде мектеп психологына немесе маманға жүгінуді ұсын, сондай-ақ 150 сенім телефонын бер.
- Барлық диалог міндетті түрде тек қазақ тілінде жүргізілуі тиіс. Орысша жазса да, таза қазақ тілінде жауап бер.`
};

const AIPsychologist = () => {
  const [activeTab, setActiveTab] = useState('student');
  const [chats, setChats] = useState(initialChats);
  const [inputs, setInputs] = useState({ teacher: '', student: '', parent: '' });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeTab]);

  const handleSendMessage = async () => {
    const currentInput = inputs[activeTab];
    if (!currentInput.trim() || isLoading) return;

    const userText = currentInput.trim();
    
    // Update input state and chat state
    setInputs(prev => ({ ...prev, [activeTab]: '' }));
    setChats(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { role: 'user', text: userText }]
    }));
    
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const systemPrompt = systemPrompts[activeTab];

      // Формируем историю чата для Gemini (для текущей вкладки)
      const history = [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Жақсы, түсіндім. Мен дайынмын." }],
        }
      ];

      // Добавляем предыдущие сообщения ИМЕННО ЭТОЙ ВКЛАДКИ из стейта
      chats[activeTab].forEach(msg => {
        history.push({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        });
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      setChats(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: 'ai', text: responseText }]
      }));

    } catch (error) {
      console.error("Chat error:", error);
      setChats(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: 'ai', text: 'Кешіріңіз, қазіргі уақытта жүйеде ақаулар болып жатыр. Сәлден соң қайталап көріңізші.' }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const tabs = [
    { id: 'teacher', label: 'Ұстаз', icon: BookOpen },
    { id: 'student', label: 'Оқушы', icon: GraduationCap },
    { id: 'parent', label: 'Ата-ана', icon: Users },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto h-[calc(100vh-140px)] flex flex-col pb-6 md:pb-0">
      
      <div className="mb-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI-психолог</h2>
          <p className="text-gray-500 mt-1">Эмоционалды жағдайды қолдау, талдау және психологиялық кеңес</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-accent shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 flex-1 flex flex-col overflow-hidden">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          {chats[activeTab].map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-tr from-accent to-blue-400 text-white' : 'bg-white border border-gray-200 text-accent'}`}>
                {msg.role === 'user' ? <User size={20} /> : <MessageCircleHeart size={22} />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-accent text-white rounded-br-sm shadow-accent/20 shadow-md' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
              }`}>
                {msg.text.split('\n').map((paragraph, i) => (
                  <React.Fragment key={i}>
                    {paragraph}
                    {i !== msg.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-end gap-3 flex-row">
              <div className="w-10 h-10 rounded-full bg-white border border-gray-200 text-accent flex items-center justify-center shrink-0 shadow-sm">
                <MessageCircleHeart size={22} />
              </div>
              <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl rounded-bl-sm px-5 py-3.5 text-sm shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Жауап жазып жатыр...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
            <textarea
              value={inputs[activeTab]}
              onChange={(e) => setInputs(prev => ({ ...prev, [activeTab]: e.target.value }))}
              onKeyDown={handleKeyPress}
              placeholder={
                activeTab === 'teacher' ? 'Қиындықтармен бөлісіңіз...' : 
                activeTab === 'student' ? 'Өзіңді мазалап жүрген ойды жаз...' : 
                'Балаңызға қатысты сұрағыңызды жазыңыз...'
              }
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] py-3 px-3 text-sm text-gray-700"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputs[activeTab].trim() || isLoading}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                inputs[activeTab].trim() && !isLoading 
                  ? 'bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20 cursor-pointer' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={18} className={inputs[activeTab].trim() && !isLoading ? 'translate-x-0.5' : ''} />
            </button>
          </div>
          
          {/* Warning Message (Always Visible) */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 mt-3 font-medium">
            <PhoneCall size={12} className="text-red-400" />
            <span>
              AI-психолог маманды алмастыра алмайды. Қиын жағдайда 
              <span className="text-red-400 font-bold ml-1">150</span> сенім телефонына хабарласыңыз.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIPsychologist;
