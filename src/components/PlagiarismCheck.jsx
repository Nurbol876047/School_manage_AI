import React, { useState, useRef } from 'react';
import { Search, UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, FileUp, FileSearch } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Настраиваем worker для PDF.js через CDN, используя версию из установленного пакета
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const PlagiarismCheck = () => {
  const [file, setFile] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | analyzing | result | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      await processFileSelection(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFileSelection(droppedFile);
    }
  };

  const processFileSelection = async (selectedFile) => {
    setFile(selectedFile);
    setStatus('idle');
    setResult(null);
    setErrorMessage('');
    
    try {
      const text = await extractTextFromFile(selectedFile);
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
    } catch (err) {
      setWordCount(0);
      // We will handle the error when the user clicks 'Start' or we can show it immediately
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
      throw new Error("Файлдан мәтінді анықтау мүмкін болмады, мәтіндік құжат жүктеңіз.");
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    
    setStatus('analyzing');
    setErrorMessage('');
    
    try {
      const extractedText = await extractTextFromFile(file);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error("Файлдан мәтінді анықтау мүмкін болмады, мәтіндік құжат жүктеңіз.");
      }

      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const systemPrompt = `Ты — ИИ-аналитик текста, который оценивает вероятность того, что 
части документа не являются самостоятельно написанными (скопированы, 
переписаны из другого источника без переработки или сгенерированы 
без адаптации под контекст). 

Проанализируй текст и найди фрагменты, которые вызывают подозрение по 
следующим признакам:
- Резкая смена стиля письма (словарный запас, длина предложений, 
  уровень сложности) по сравнению с остальным текстом
- Слишком общие, шаблонные academic-формулировки, не связанные 
  напрямую с конкретной темой документа
- Фрагменты, которые выглядят вырванными из контекста другого документа 
  (нелогичные переходы, обрыв мысли)
- Специфическая терминология/факты, не характерные для явного уровня 
  автора (например, для ученической работы — слишком 'взрослый' 
  академический стиль)

Для каждого найденного фрагмента укажи причину подозрения. НЕ утверждай 
наверняка, что это плагиат — только вероятность и основание.

Также посчитай общий 'индекс оригинальности' текста (0-100%, где 100% — 
нет подозрительных фрагментов). Отвечай на казахском языке (описание summary и причины (reason) должны быть на казахском языке).

Верни ответ СТРОГО в формате JSON:
{
  "originalityScore": число от 0 до 100,
  "summary": "краткий вывод в 1-2 предложения (қазақ тілінде)",
  "flaggedSegments": [
    { "text": "подозрительный фрагмент текста (до 200 символов)", 
      "reason": "почему вызывает подозрение (қазақ тілінде)", 
      "confidence": "low"|"medium"|"high" }
  ]
}

Текст для анализа:
${extractedText.substring(0, 35000)}`;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text();
      
      const cleanedText = responseText.replace(/```(json)?/gi, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      if (parsedData.originalityScore !== undefined) {
        setResult(parsedData);
        setStatus('result');
      } else {
        throw new Error("Талдау кезінде қате пайда болды. Қайталап көріңіз.");
      }

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message.includes("Файлдан мәтінді анықтау мүмкін болмады") 
        ? "Файлдан мәтінді анықтау мүмкін болмады, мәтіндік құжат жүктеңіз." 
        : "Талдау кезінде қате пайда болды. Қайталап көріңіз.");
      setStatus('error');
    }
  };

  const resetForm = () => {
    setFile(null);
    setWordCount(0);
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
      <div className={`w-32 h-32 rounded-full border-[6px] flex flex-col items-center justify-center mx-auto mb-4 bg-white shadow-sm ${colorClass}`}>
        <div className="flex items-baseline">
          <span className="text-4xl font-bold">{score}</span>
          <span className="text-lg font-medium opacity-70 ml-1">%</span>
        </div>
        <span className="text-xs font-medium text-gray-500 mt-1">Түпнұсқалық</span>
      </div>
    );
  };

  const getConfidenceBadge = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'low':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">🟢 төмен</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">🟡 орташа</span>;
      case 'high':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">🔴 жоғары</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">белгісіз</span>;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-24 md:pb-0">
      
      {/* ЗАГОЛОВОК И ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">Плагиат тексеру</h2>
          
          <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4">
            <p className="text-[15px] text-gray-700 leading-relaxed font-medium">
              Құжаттың мәтінін ИИ талдап, түпнұсқалыққа күмән тудыратын тұстарды анықтайды. Нәтиже болжамды сипатта — соңғы шешімді әрдайым адам қабылдауы қажет.
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
              Қолдау көрсетілетін форматтар: .docx, .pdf, .txt<br/>
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • {wordCount > 0 ? `${wordCount} сөз анықталды` : 'Сөздер есептелуде...'}
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); resetForm(); }} className="text-gray-400 hover:text-red-500 p-2">
                <XCircle size={20} />
              </button>
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={startAnalysis}
                className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-medium transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                Тексеруді бастау
              </button>
              
              {status === 'error' && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-start gap-3 mt-4 border border-red-100">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{errorMessage}</p>
                    <button onClick={startAnalysis} className="mt-2 text-red-700 font-medium hover:underline text-xs">Қайталап көру</button>
                  </div>
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
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Мәтін талданып жатыр...</h3>
            <p className="text-gray-500 text-sm max-w-sm">Бұл процесс құжаттың көлеміне байланысты бірнеше секундқа созылуы мүмкін</p>
          </div>
        )}

        {/* ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА */}
        {status === 'result' && result && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-3xl mx-auto w-full py-4">
            
            <div className="text-center mb-8">
              <h3 className="text-lg font-medium text-gray-500 mb-4">Түпнұсқалық индексі</h3>
              {renderScoreIndicator(result.originalityScore)}
              <p className="text-gray-700 font-medium bg-gray-50 p-4 rounded-xl text-[15px] leading-relaxed border border-gray-100 mt-6 shadow-sm">
                {result.summary}
              </p>
            </div>

            {result.flaggedSegments && result.flaggedSegments.length > 0 && (
              <div className="space-y-4 mb-10">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-500" />
                  Күдікті фрагменттер ({result.flaggedSegments.length})
                </h4>
                
                {result.flaggedSegments.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3 gap-4">
                      {getConfidenceBadge(item.confidence)}
                    </div>
                    
                    <div className="bg-gray-50/80 border-l-4 border-gray-300 p-3 mb-3 rounded-r-lg">
                      <p className="text-gray-600 text-sm italic leading-relaxed">
                        «{item.text}»
                      </p>
                    </div>
                    
                    <p className="text-sm text-gray-800 font-medium flex gap-2 items-start">
                      <span className="text-accent shrink-0 mt-0.5">•</span>
                      <span>{item.reason}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {result.flaggedSegments && result.flaggedSegments.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 bg-green-50/50 border border-green-100 rounded-2xl mb-10 text-center">
                <CheckCircle2 size={36} className="text-green-500 mb-3" />
                <h4 className="text-green-800 font-medium mb-1">Күдікті фрагменттер табылған жоқ</h4>
                <p className="text-green-600/80 text-sm">Мәтін түпнұсқа деп танылды</p>
              </div>
            )}

            <div className="flex justify-center border-t border-gray-100 pt-8 mt-4">
              <button 
                onClick={resetForm}
                className="bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm shadow-sm"
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

export default PlagiarismCheck;
