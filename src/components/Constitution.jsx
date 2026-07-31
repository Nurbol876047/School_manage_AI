import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Book, Volume2, Pause, Mic, MicOff, Search, ChevronRight, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import constitutionData from '../data/constitution.json';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Constitution() {
  const [activeSection, setActiveSection] = useState(constitutionData.sections[0]);
  const [playingArticle, setPlayingArticle] = useState(null); // number of article playing
  const [audioElement, setAudioElement] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(null); // article number being generated
  const [error, setError] = useState('');
  
  // Audio Record State
  const [isRecording, setIsRecording] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qaAudio, setQaAudio] = useState(null);
  const [isQaAudioPlaying, setIsQaAudioPlaying] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Azure API call for TTS
  const playTTS = async (text, articleNum) => {
    // If something is already playing, stop it
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    window.speechSynthesis.cancel();
    
    if (playingArticle === articleNum) {
      setPlayingArticle(null);
      return;
    }

    setIsSynthesizing(articleNum);
    setError('');

    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      
      audio.oncanplay = () => {
        setIsSynthesizing(null);
        setPlayingArticle(articleNum);
      };

      audio.onended = () => {
        setPlayingArticle(null);
      };
      
      audio.onerror = () => {
        console.error("Audio playback error");
        setPlayingArticle(null);
        setIsSynthesizing(null);
        setError("Дыбыс ойнатуда қате шықты. Серверді тексеріңіз.");
      };
      
      setAudioElement(audio);
      audio.play().catch(e => {
        console.error(e);
        setPlayingArticle(null);
        setIsSynthesizing(null);
      });
      
    } catch (err) {
      console.error(err);
      setError('Дыбыстық қызметке қосылу мүмкін болмады.');
      setIsSynthesizing(null);
    }
  };

  // Play QA answer
  const playQaTTS = async (text) => {
    if (qaAudio) {
      qaAudio.pause();
      setQaAudio(null);
    }
    
    try {
      const url = `/api/tts?text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      
      audio.onended = () => {
        setIsQaAudioPlaying(false);
      };
      
      audio.onerror = () => {
        setIsQaAudioPlaying(false);
      };
      
      setQaAudio(audio);
      setIsQaAudioPlaying(true);
      audio.play().catch(e => {
        console.error("QA Audio failed", e);
        setIsQaAudioPlaying(false);
      });
    } catch(err) {
      console.log("TTS for QA failed, just showing text.", err);
    }
  };

  const startRecording = async () => {
    setError('');

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      const audioData = [];
      
      processor.onaudioprocess = (e) => {
        const channelData = e.inputBuffer.getChannelData(0);
        audioData.push(new Float32Array(channelData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      
      mediaRecorderRef.current = {
        state: 'recording',
        stop: () => {
          mediaRecorderRef.current.state = 'inactive';
          source.disconnect();
          processor.disconnect();
          stream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          
          let totalLength = 0;
          for (let i = 0; i < audioData.length; i++) {
            totalLength += audioData[i].length;
          }
          const pcmData = new Float32Array(totalLength);
          let offset = 0;
          for (let i = 0; i < audioData.length; i++) {
            pcmData.set(audioData[i], offset);
            offset += audioData[i].length;
          }
          
          const buffer = new ArrayBuffer(44 + pcmData.length * 2);
          const view = new DataView(buffer);
          
          const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) {
              view.setUint8(offset + i, string.charCodeAt(i));
            }
          };
          
          writeString(view, 0, 'RIFF');
          view.setUint32(4, 36 + pcmData.length * 2, true);
          writeString(view, 8, 'WAVE');
          writeString(view, 12, 'fmt ');
          view.setUint32(16, 16, true);
          view.setUint16(20, 1, true);
          view.setUint16(22, 1, true);
          view.setUint32(24, 16000, true);
          view.setUint32(28, 16000 * 2, true);
          view.setUint16(32, 2, true);
          view.setUint16(34, 16, true);
          writeString(view, 36, 'data');
          view.setUint32(40, pcmData.length * 2, true);
          
          let pcmOffset = 44;
          for (let i = 0; i < pcmData.length; i++, pcmOffset += 2) {
            let s = Math.max(-1, Math.min(1, pcmData[i]));
            view.setInt16(pcmOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          
          const audioBlob = new Blob([view], { type: 'audio/wav' });
          
          if (audioBlob.size <= 44) {
            setError('Микрофоннан дыбыс жазылмады. Құрылғыны тексеріңіз.');
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            try {
              setQuestionText('Дауыс танылуда (AI)...');
              const genAI = new GoogleGenerativeAI(GEMINI_KEY);
              const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
              
              const promptStr = "Транскрибируй это аудио в текст. Напиши только распознанный текст. Если аудио пустое или непонятное, напиши ровно одно слово: Ештеңе";
              
              const result = await model.generateContent([
                promptStr,
                {
                  inlineData: {
                    mimeType: "audio/wav",
                    data: base64Data
                  }
                }
              ]);
              
              const textResult = result.response.text().trim();
              if (!textResult || textResult.includes('Ештеңе') || textResult.length < 2) {
                setQuestionText('');
                setError('ИИ дауысыңызды түсінбеді. Қайталап көріңіз.');
              } else {
                // Automatically send to AI
                askGemini(textResult);
              }
            } catch (err) {
              console.error("STT Error:", err);
              setError(`Қате: ${err.message || 'Формат қолдау таппады'}`);
              setQuestionText('');
            }
          };
        }
      };
      
    } catch(err) {
      console.error(err);
      setError('Микрофонға рұқсат берілмеген немесе микрофон табылмады.');
    }
  };

  const askGemini = async (overrideText = null) => {
    const textToAsk = typeof overrideText === 'string' ? overrideText : questionText;
    if (!textToAsk.trim()) return;
    
    setIsProcessing(true);
    setChatLog(prev => [...prev, { role: 'user', text: textToAsk }]);
    setQuestionText('');
    
    // Prepare full constitution text for context
    const fullContext = constitutionData.sections.map(s => 
      `${s.title}\n` + s.articles.map(a => `${a.number}-бап. ${a.text}`).join('\n')
    ).join('\n\n');

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Ты — помощник по Конституции Республики Казахстан. Отвечай на вопросы ТОЛЬКО на основе предоставленного текста Конституции ниже. Если ответа в тексте нет — честно скажи, что этот вопрос выходит за рамки Конституции, и не выдумывай. Отвечай на казахском языке, просто и понятно, с указанием номера статьи, на основе которой дан ответ.
      
Мәтін:
${fullContext}

Сұрақ: ${textToAsk}`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text();
      
      setChatLog(prev => [...prev, { role: 'ai', text: answer }]);
      setQuestionText('');
      
      // Auto play TTS for answer
      playQaTTS(answer);

    } catch (err) {
      console.error(err);
      setChatLog(prev => [...prev, { role: 'ai', text: 'Кешіріңіз, қате пайда болды. Қайталап көріңіз.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioElement) audioElement.pause();
      if (qaAudio) qaAudio.pause();
    };
  }, [audioElement, qaAudio]);

  return (
    <div className="max-w-6xl mx-auto pb-24 md:pb-0 animate-in fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Book className="text-accent" /> Конституция
        </h2>
        <div className="mt-4 bg-accent/5 border border-accent/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <p className="text-[15px] text-gray-700 leading-relaxed font-medium max-w-2xl">
            Қазақстан Республикасының Конституциясымен танысыңыз. Мәтінді дауыстап тыңдаңыз немесе дауыспен сұрақ қойып, жауап алыңыз.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 border border-red-100">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Voice QA Section */}
      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-500" /> ИИ-көмекші (Сұрақ-Жауап)
        </h3>
        
        <div className="bg-gray-50 rounded-xl p-4 mb-4 min-h-[100px] max-h-[300px] overflow-y-auto space-y-4 border border-gray-100">
          {chatLog.length === 0 ? (
            <div className="text-center text-gray-400 py-6">Сұрақ қою үшін микрофонды басыңыз немесе мәтінмен жазыңыз</div>
          ) : (
            chatLog.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))
          )}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 text-gray-500">
                <Loader2 size={16} className="animate-spin" /> Жауап ізделуде...
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button 
            onClick={startRecording}
            className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full transition-all ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title="Дауыспен сұрау"
          >
            {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          
          <input 
            type="text" 
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askGemini()}
            placeholder={isRecording ? "Тыңдап тұрмын..." : "Сұрағыңызды жазыңыз немесе айтыңыз..."}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-accent transition-colors"
          />
          
          <button 
            onClick={askGemini}
            disabled={!questionText.trim() || isProcessing}
            className="bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Жіберу
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* TOC Sidebar */}
        <div className="w-full lg:w-1/3 bg-white rounded-[16px] shadow-soft border border-gray-50 p-4 h-fit">
          <h3 className="font-bold text-gray-800 mb-4 px-2 uppercase tracking-wide text-sm">Мазмұны</h3>
          <nav className="space-y-1">
            {constitutionData.sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section)}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                  activeSection.id === section.id 
                    ? 'bg-accent/10 text-accent font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-sm">{section.title}</span>
                {activeSection.id === section.id && <ChevronRight size={16} />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="w-full lg:w-2/3 bg-white rounded-[16px] shadow-soft border border-gray-50 p-6 lg:p-8 min-h-[500px]">
          <h3 className="text-2xl font-black text-gray-800 mb-8 border-b border-gray-100 pb-4">
            {activeSection.title}
          </h3>
          
          <div className="space-y-6">
            {activeSection.articles.map(article => (
              <div key={article.number} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow group relative pr-16">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-700 shrink-0 shadow-sm">
                    {article.number}
                  </div>
                  <p className="text-gray-800 leading-relaxed pt-1.5">{article.text}</p>
                </div>

                <div className="absolute top-5 right-5">
                  <button 
                    onClick={() => playTTS(article.text, article.number)}
                    disabled={isSynthesizing !== null && isSynthesizing !== article.number}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                      playingArticle === article.number 
                        ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' 
                        : 'bg-white text-accent border-gray-200 hover:border-accent hover:text-accent-dark'
                    } disabled:opacity-50`}
                    title="Тыңдау"
                  >
                    {isSynthesizing === article.number ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : playingArticle === article.number ? (
                      <Pause size={18} />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
