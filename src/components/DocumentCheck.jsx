import React, { useState, useRef } from 'react';
import { FolderCheck, UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, FileUp } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Настраиваем worker для PDF.js через CDN, используя версию из установленного пакета (обычно 4.x)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const DocumentCheck = () => {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('КТЖ');
  const [status, setStatus] = useState('idle'); // idle | analyzing | result | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const docTypes = [
    { id: 'КТЖ', label: 'КТЖ (календарлық-тақырыптық жоспар)' },
    { id: 'Есеп', label: 'Есеп (отчёт)' },
    { id: 'Анықтама', label: 'Анықтама (справка)' },
    { id: 'Өзге', label: 'Өзге құжат (другой документ)' },
  ];

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('idle');
      setResult(null);
      setErrorMessage('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus('idle');
      setResult(null);
      setErrorMessage('');
    }
  };

  const extractTextFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    
    try {
      if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } else if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map(item => item.str);
          text += strings.join(' ') + '\n';
        }
        return text;
      } else if (extension === 'txt') {
        return await file.text();
      } else {
        throw new Error("Формат қолдау таппайды. .docx немесе .pdf жүктеңіз.");
      }
    } catch (err) {
      console.error(err);
      throw new Error("Файлдан мәтінді анықтау мүмкін болмады, өтінеміз мәтіндік құжат жүктеңіз.");
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    
    setStatus('analyzing');
    setErrorMessage('');
    
    try {
      const extractedText = await extractTextFromFile(file);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error("Құжатта мәтін табылмады немесе ол тым қысқа. Мүмкін бұл сурет/скан болар?");
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const systemPrompt = `Сен — Қазақстандағы мектеп құжаттамасын тексеру бойынша ИИ-сарапшысың. 
Саған берілген құжат түрі: ${docType}. Осы құжаттың стандартты құрылымына сәйкестігін тексеріп, баға бер.

Тексеру керек:
- Барлық міндетті бөлімдердің болуы (КТЖ үшін: пән/сынып/сағат жазылған титул, тоқсандар бойынша сағаттарды бөлу, оқу мақсаттары бар тақырыптар кестесі; есеп үшін: кіріспе, негізгі бөлім, қорытынды; анықтама үшін — тиісті деректемелер).
- Логикалық жүйелілік және толықтығы.
- Айқын қателер немесе сәйкессіздіктер (мысалы, тоқсандардағы сағаттар қосындысы жалпы сағатпен сәйкес келмеуі).

Жауапты ҚАТАҢ ТҮРДЕ төмендегідей JSON форматында қайтар:
{
  "overallScore": 0 мен 100 аралығындағы сан,
  "summary": "1-2 сөйлемнен тұратын қысқаша қорытынды",
  "checklist": [
    { 
      "item": "тексеру пунктінің атауы", 
      "status": "ok" немесе "warning" немесе "missing", 
      "comment": "қысқаша түсініктеме" 
    }
  ]
}

Мәтінде жоқ проблемаларды ойдан шығарма. Түсініктемелерде объективті және нақты бол. Барлық жауаптар қазақ тілінде болсын.

ҚҰЖАТ МӘТІНІ:
${extractedText.substring(0, 30000)} /* Шектеулі ұзындық */
`;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();
      
      const cleanedText = responseText.replace(/```(json)?/gi, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      if (parsedData.overallScore !== undefined && Array.isArray(parsedData.checklist)) {
        setResult(parsedData);
        setStatus('result');
      } else {
        throw new Error("AI қате форматта жауап берді.");
      }

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Талдау кезінде белгісіз қате пайда болды.");
      setStatus('error');
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderScoreIndicator = (score) => {
    let colorClass = "text-red-500 border-red-500";
    if (score >= 80) colorClass = "text-green-500 border-green-500";
    else if (score >= 50) colorClass = "text-yellow-500 border-yellow-500";

    return (
      <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center mx-auto mb-4 ${colorClass}`}>
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-sm font-medium opacity-60 ml-1 mt-2">/100</span>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-24 md:pb-0">
      
      {/* ЗАГОЛОВОК И ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Құжаттарды тексеру</h2>
          
          <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
            <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
              Мектеп құжаттамасын автоматты түрде тексеретін жасанды интеллект. 
              Құжатты (КТЖ, есеп, анықтама) толықтай оқып шығып, стандартты 
              құрылымға сәйкестігін, қателер мен кемшіліктерді бірнеше секундта 
              анықтайды — мұғалім немесе оқу ісі меңгерушісіне қолмен тексеруге уақыт 
              жұмсаудың қажеті жоқ.
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleFileClick}
          className="bg-white border border-gray-200 hover:border-accent hover:text-accent text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 text-sm shrink-0 mt-1"
        >
          <UploadCloud size={18} />
          Құжатты жүктеу
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".docx,.pdf,.txt"
          className="hidden" 
        />
      </div>

      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 min-h-[400px] flex flex-col p-6 lg:p-10">
        
        {/* СОСТОЯНИЕ IDLE / ЗАГРУЗКА ФАЙЛА */}
        {(status === 'idle' || status === 'error') && !file && (
          <div 
            className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={handleFileClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileUp size={28} className="text-gray-400 group-hover:text-accent transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Файлды осы жерге сүйреңіз немесе басыңыз</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              Қолдау көрсетілетін форматтар: .docx, .pdf<br/>
              (Мәтіні танылатын құжаттар)
            </p>
          </div>
        )}

        {/* ФАЙЛ ВЫБРАН */}
        {file && (status === 'idle' || status === 'error') && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-8">
            <div className="w-full flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                <FileText size={24} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); resetForm(); }} className="text-gray-400 hover:text-red-500 p-2">
                <XCircle size={20} />
              </button>
            </div>

            <div className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Құжат түрін таңдаңыз</label>
                <select 
                  value={docType} 
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all cursor-pointer"
                >
                  {docTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={startAnalysis}
                className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-medium transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                Талдау бастау
              </button>
              
              {status === 'error' && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3 mt-4 border border-red-100">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p>{errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* СОСТОЯНИЕ ЗАГРУЗКИ (АНАЛИЗ) */}
        {status === 'analyzing' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
               <Loader2 size={32} className="text-accent animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Талдау жүріп жатыр...</h3>
            <p className="text-gray-500">Жасанды интеллект құжаттың құрылымы мен мазмұнын тексеруде</p>
          </div>
        )}

        {/* ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА */}
        {status === 'result' && result && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto w-full py-4">
            
            <div className="text-center mb-8">
              {renderScoreIndicator(result.overallScore)}
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Талдау нәтижесі</h3>
              <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
                {result.summary}
              </p>
            </div>

            <div className="space-y-3 mb-10">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Чек-лист</h4>
              
              {result.checklist.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="shrink-0 mt-0.5">
                    {item.status === 'ok' && <CheckCircle2 size={22} className="text-green-500" />}
                    {item.status === 'warning' && <AlertTriangle size={22} className="text-yellow-500" />}
                    {item.status === 'missing' && <XCircle size={22} className="text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm mb-1">{item.item}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.comment}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={resetForm}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm shadow-sm"
              >
                <RefreshCw size={18} />
                Жаңа құжат тексеру
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DocumentCheck;
