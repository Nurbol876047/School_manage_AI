import React, { useState, useRef } from 'react';
import { 
  LineChart as LucideLineChart, Filter, Info, FileUp, XCircle, FileSpreadsheet, 
  Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Send 
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as XLSX from 'xlsx';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Мини-график (Sparkline) для каждого ученика
const Sparkline = ({ data }) => {
  if (!data || data.length === 0) return <span className="text-gray-400 text-xs">Деректер жоқ</span>;
  const chartData = data.map((val, idx) => ({ name: idx, value: val }));
  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Performance = ({ onSendMessage }) => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | analyzing | result | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedStudent, setExpandedStudent] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileClick = () => fileInputRef.current?.click();

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setStatus('idle');
    setErrorMessage('');
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Ищем заголовки, чтобы убедиться, что файл валидный (простая эвристика)
      if (json.length < 2) throw new Error("Файл бос немесе қате пішімделген.");
      
      // Превращаем в CSV для промпта
      const csvString = XLSX.utils.sheet_to_csv(worksheet);
      startAnalysis(csvString, json.length - 1);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage("Файл құрылымын анықтау мүмкін болмады. Файлда оқушының аты-жөні, пән, күні және баға бағандары болуы керек.");
    }
  };

  const startAnalysis = async (csvData, rowsCount) => {
    setStatus('analyzing');
    
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const systemPrompt = `Ты — ИИ-аналитик успеваемости в казахстанской школе. Тебе дан набор данных об оценках учеников (CSV).
Проанализируй и определи для каждого ученика:
- Общую динамику (улучшается / стабильно / ухудшается)
- Статус: 'stable' (тұрақты), 'attention' (назар аудару қажет - небольшое снижение), 'risk' (тәуекел тобында - сильное падение)
- Краткий комментарий на КАЗАХСКОМ языке (1 предложение) — почему такой статус.

Посчитай статистику по классу. Верни СТРОГО JSON формат:
{
  "classSummary": { 
    "averageScore": число (например, 4.2), 
    "stableCount": число, 
    "attentionCount": число, 
    "riskCount": число,
    "classTrend": [массив из 4-5 чисел, средний балл по периодам для графика]
  },
  "students": [
    { 
      "name": "ФИО", 
      "averageScore": число, 
      "status": "stable" | "attention" | "risk", 
      "comment": "комментарий на казахском", 
      "trend": [массив чисел (оценок) для графика, 3-5 значений] 
    }
  ]
}

Не выдумывай имена, которых нет в файле. Все комментарии должны быть строго на казахском языке.
Данные (первые 20000 символов):
${csvData.substring(0, 20000)}`;

      const apiResult = await model.generateContent(systemPrompt);
      const responseText = apiResult.response.text();
      
      const cleanedText = responseText.replace(/```(json)?/gi, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      if (parsedData.classSummary && parsedData.students) {
        setResult(parsedData);
        setStatus('result');
      } else {
        throw new Error("AI қате форматта жауап берді.");
      }

    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage("Талдау кезінде қате пайда болды. Қайталап көріңіз.");
    }
  };

  const getStatusBadge = (statusStr) => {
    switch (statusStr) {
      case 'stable': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-semibold">Тұрақты</span>;
      case 'attention': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-semibold">Назар аудару</span>;
      case 'risk': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-semibold">Тәуекел</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold">Белгісіз</span>;
    }
  };

  const classTrendData = result?.classSummary?.classTrend?.map((val, i) => ({ name: "Кезең " + (i+1), score: val })) || [];

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 md:pb-0">
      
      {/* HEADER & INSTRUCTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Үлгерім</h2>
            <button 
              onClick={() => setShowInstructions(true)}
              className="text-sm font-medium text-accent hover:text-accent-dark hover:underline flex items-center gap-1 bg-accent/5 px-3 py-1.5 rounded-lg"
            >
              Деректерді қайдан алуға болады? <Info size={14} />
            </button>
          </div>
          
          <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
            <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
              Оқушылардың үлгерімін жасанды интеллект арқылы талдау. 
              Kundelik.kz электронды журналынан немесе Excel файлынан бағалар мен қатысу 
              туралы деректерді жүктеңіз — жүйе әр оқушының үлгерім динамикасын 
              автоматты түрде талдап, назар аудару қажет оқушыларды анықтайды.
            </p>
          </div>
        </div>
        
        {status === 'result' && (
          <button className="bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 text-sm shrink-0 mt-1">
            <Filter size={16} className="text-gray-500" /> Сүзгілер
          </button>
        )}
      </div>

      {/* MODAL INSTRUCTIONS */}
      {showInstructions && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Kundelik.kz-тен деректерді жүктеу нұсқаулығы</h3>
              <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-gray-700 p-1">
                <XCircle size={24} />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p><strong>1-қадам:</strong> Kundelik.kz жүйесіне мұғалім аккаунтыңызбен кіріңіз.</p>
              <p><strong>2-қадам:</strong> Сол жақ мәзірден "Есептер" немесе "Журнал" бөлімін таңдаңыз.</p>
              <p><strong>3-қадам:</strong> Кластың электронды журналын ашып, керекті пән мен кезеңді (тоқсан/ай) таңдаңыз.</p>
              <p><strong>4-қадам:</strong> Беттің жоғарғы жағында "Excel-ге экспорттау" немесе "Жүктеп алу" түймесін басыңыз.</p>
              <p><strong>5-қадам:</strong> Жүктелген файлды компьютеріңізде сақтаңыз (әдетте .xlsx форматында).</p>
              <p><strong>6-қадам:</strong> Осы бетте "Файл жүктеу" түймесін басып, сақталған файлды таңдаңыз.</p>
            </div>
            <div className="mt-6 bg-blue-50 text-blue-800 p-3 rounded-lg text-xs font-medium">
              Ескертпе: егер сізде Kundelik.kz болмаса, кез келген Excel файлын жүктеуге болады — онда оқушының аты-жөні, пән, күні және бағасы болуы жеткілікті.
            </div>
            <button onClick={() => setShowInstructions(false)} className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2.5 rounded-xl transition-colors">
              Түсінікті, жабу
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[400px] flex flex-col p-6 lg:p-8">
        
        {/* IDLE / ERROR (Upload Area) */}
        {(status === 'idle' || status === 'error') && !file && (
          <div 
            className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={handleFileClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); processFile(e.dataTransfer.files[0]); }}
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={28} className="text-gray-400 group-hover:text-accent transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Файлды осы жерге сүйреңіз немесе басыңыз</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
              Қолдау көрсетілетін форматтар: .xlsx, .xls, .csv
            </p>
            <button className="bg-accent text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-accent-dark shadow-sm">
              Файл жүктеу
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => processFile(e.target.files[0])} 
              accept=".xlsx,.xls,.csv"
              className="hidden" 
            />
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="mt-4 bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center justify-between border border-red-100">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} />
              <p>{errorMessage}</p>
            </div>
            <button onClick={() => {setFile(null); setStatus('idle');}} className="font-bold underline ml-4">
              Қайта жүктеу
            </button>
          </div>
        )}

        {/* ANALYZING STATE */}
        {status === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
               <Loader2 size={32} className="text-accent animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Деректер талдануда...</h3>
            <p className="text-gray-500 text-sm">Файл: {file?.name}</p>
          </div>
        )}

        {/* RESULT STATE */}
        {status === 'result' && result && (
          <div className="animate-in fade-in zoom-in-95 duration-500 w-full">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Талдау нәтижесі: {file?.name}</h3>
              <button 
                onClick={() => {setFile(null); setResult(null); setStatus('idle');}}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <RefreshCw size={14} /> Жаңа құжат
              </button>
            </div>

            {/* 4 SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{result.classSummary.averageScore}</span>
                <span className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Орташа балл</span>
              </div>
              <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-green-600">{result.classSummary.stableCount}</span>
                <span className="text-xs text-green-700/70 mt-1 uppercase tracking-wider font-semibold text-center">Тұрақты</span>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-yellow-600">{result.classSummary.attentionCount}</span>
                <span className="text-xs text-yellow-700/70 mt-1 uppercase tracking-wider font-semibold text-center">Назар аудару</span>
              </div>
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-red-600">{result.classSummary.riskCount}</span>
                <span className="text-xs text-red-700/70 mt-1 uppercase tracking-wider font-semibold text-center">Тәуекел тобында</span>
              </div>
            </div>

            {/* CLASS TREND CHART */}
            {classTrendData.length > 0 && (
              <div className="mb-8 border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 ml-2">Сынып динамикасы</h4>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={classTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                      <YAxis domain={['dataMin - 0.5', 5]} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} width={30} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="score" name="Орташа балл" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* STUDENTS TABLE */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                  <tr>
                    <th className="p-4 w-1/3">Аты-жөні</th>
                    <th className="p-4 text-center">Орташа балл</th>
                    <th className="p-4 text-center">Статус</th>
                    <th className="p-4 text-center hidden sm:table-cell">Динамика</th>
                    <th className="p-4 text-center">Әрекет</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.students.map((student, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-gray-50/50 transition-colors bg-white">
                        <td className="p-4 font-medium text-gray-800 text-sm">{student.name}</td>
                        <td className="p-4 text-center text-sm font-semibold text-gray-700">{student.averageScore}</td>
                        <td className="p-4 text-center">{getStatusBadge(student.status)}</td>
                        <td className="p-4 text-center hidden sm:table-cell">
                          <div className="flex justify-center"><Sparkline data={student.trend} /></div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setExpandedStudent(expandedStudent === idx ? null : idx)}
                              className="text-xs font-medium text-accent hover:bg-accent/10 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                              {expandedStudent === idx ? 'Жабу' : 'Толығырақ'}
                              {expandedStudent === idx ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {student.status === 'risk' && onSendMessage && (
                              <button 
                                onClick={() => onSendMessage(student.name)}
                                className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                title="Ата-анаға хабарлама жіберу"
                              >
                                <Send size={14}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* КОММЕНТАРИЙ ИИ (Раскрывающийся) */}
                      {expandedStudent === idx && (
                        <tr className="bg-accent/5">
                          <td colSpan="5" className="p-4 text-sm text-gray-700">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 mt-0.5">
                                <LucideLineChart size={12} />
                              </div>
                              <p className="leading-relaxed"><strong>AI-талдау:</strong> {student.comment}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Performance;
