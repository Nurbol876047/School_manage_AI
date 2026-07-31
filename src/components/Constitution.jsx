import React, { useState, useRef, useEffect } from 'react';
import { Book, Volume2, Pause, Mic, MicOff, ChevronRight, AlertTriangle, MessageCircleHeart, Send, Loader2, User } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import constitutionData from '../data/constitution.json';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const AZURE_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

export default function Constitution() {
  const [activeSection, setActiveSection] = useState(constitutionData.sections[0]);
  
  // Audio playback state
  const [playingArticle, setPlayingArticle] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(null);
  
  // AI Chat state
  const [chats, setChats] = useState([{ role: 'ai', text: 'Сәлеметсіз бе! Мен Конституция бойынша ИИ-көмекшімін. Дауыспен немесе мәтінмен сұрақ қойсаңыз болады.' }]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [qaAudio, setQaAudio] = useState(null);
  const [azureError, setAzureError] = useState(false);
  const [micError, setMicError] = useState('');
  const [sttError, setSttError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }
      if (qaAudio) {
        qaAudio.pause();
        URL.revokeObjectURL(qaAudio.src);
      }
    };
  }, [audioElement, qaAudio]);

  const getAzureTTS = async (text) => {
    if (!AZURE_KEY || !AZURE_REGION) {
      setAzureError(true);
      throw new Error('no_azure');
    }
    const ssml = `<speak version="1.0" xml:lang="kk-KZ"><voice xml:lang="kk-KZ" xml:gender="Female" name="kk-KZ-AigulNeural">${text}</voice></speak>`;
    const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });
    if (!res.ok) throw new Error('azure_tts_failed');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  const getAzureSTT = async (audioBlob) => {
    if (!AZURE_KEY || !AZURE_REGION) {
      setAzureError(true);
      throw new Error('no_azure');
    }
    const res = await fetch(`https://${AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=kk-KZ`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Accept': 'application/json'
      },
      body: audioBlob
    });
    if (!res.ok) throw new Error('azure_stt_failed');
    const data = await res.json();
    if (data.RecognitionStatus === 'Success') {
      return data.DisplayText;
    } else {
      throw new Error('no_speech');
    }
  };

  const playArticleAudio = async (text, articleNum) => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    if (playingArticle === articleNum) {
      setPlayingArticle(null);
      return;
    }

    setIsSynthesizing(articleNum);
    
    try {
      const url = await getAzureTTS(text);
      const audio = new Audio(url);
      
      audio.onended = () => {
        setPlayingArticle(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingArticle(null);
        setIsSynthesizing(null);
      };
      
      setAudioElement(audio);
      setPlayingArticle(articleNum);
      setIsSynthesizing(null);
      audio.play().catch(e => {
        console.error("Playback failed", e);
        setPlayingArticle(null);
      });
    } catch (err) {
      console.error(err);
      setIsSynthesizing(null);
      if (err.message !== 'no_azure') {
        alert("Дыбыстық қызмет уақытша қолжетімсіз.");
      }
    }
  };

  const playQaAudio = async (text) => {
    if (qaAudio) {
      qaAudio.pause();
      setQaAudio(null);
    }
    try {
      const url = await getAzureTTS(text);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      setQaAudio(audio);
      audio.play().catch(console.error);
    } catch (err) {
      console.log("TTS QA skipped or failed", err);
    }
  };

  const handleSendMessage = async (overrideText = null) => {
    const textToAsk = typeof overrideText === 'string' ? overrideText : inputText;
    if (!textToAsk.trim() || isLoading) return;

    setInputText('');
    setChats(prev => [...prev, { role: 'user', text: textToAsk }]);
    setIsLoading(true);

    const fullContext = constitutionData.sections.map(s => 
      `${s.title}\n` + s.articles.map(a => `${a.number}-бап. ${a.text}`).join('\n')
    ).join('\n\n');

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `Ты — помощник по Конституции Республики Казахстан. Отвечай на вопросы ТОЛЬКО на основе предоставленного текста Конституции ниже. Если ответа в тексте нет — честно скажи, что вопрос выходит за рамки Конституции, не выдумывай. Отвечай на казахском языке, просто и понятно, указывая номер статьи, на основе которой дан ответ.
      
Мәтін:
${fullContext}

Сұрақ: ${textToAsk}`;

      const result = await model.generateContent(prompt);
      const answer = result.response.text();
      
      setChats(prev => [...prev, { role: 'ai', text: answer }]);
      playQaAudio(answer);
    } catch (error) {
      console.error(error);
      setChats(prev => [...prev, { role: 'ai', text: 'Кешіріңіз, жүйе қателігі орын алды. Қайтадан байқап көріңізші.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    setMicError('');
    setSttError('');
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
        audioData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
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
          
          let totalLength = audioData.reduce((acc, val) => acc + val.length, 0);
          const pcmData = new Float32Array(totalLength);
          let offset = 0;
          for (let chunk of audioData) {
            pcmData.set(chunk, offset);
            offset += chunk.length;
          }
          
          const buffer = new ArrayBuffer(44 + pcmData.length * 2);
          const view = new DataView(buffer);
          const writeString = (view, offset, string) => {
            for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
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
            setSttError('Дыбыс жазылмады.');
            return;
          }

          processVoiceAudio(audioBlob);
        }
      };
    } catch(err) {
      console.error(err);
      setMicError('Микрофонға рұқсат берілмеген. Браузер баптауларын тексеріңіз.');
    }
  };

  const processVoiceAudio = async (blob) => {
    setIsLoading(true);
    setSttError('');
    try {
      const text = await getAzureSTT(blob);
      handleSendMessage(text);
    } catch (err) {
      setIsLoading(false);
      console.error(err);
      if (err.message === 'no_speech') {
        setSttError('Сөзіңізді тани алмадым, қайталап көріңіз.');
      } else if (err.message === 'no_azure' || err.message === 'azure_stt_failed') {
        setAzureError(true);
        setSttError('Дауыстық қызмет уақытша қолжетімсіз. Мәтінмен жалғастырыңыз.');
      } else {
        setSttError('Қате орын алды.');
      }
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-10 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Book className="text-accent" /> Конституция
        </h2>
        <p className="text-gray-500 mt-2">
          Қазақстан Республикасының Конституциясымен танысыңыз. Мәтінді дауыстап тыңдаңыз немесе дауыспен сұрақ қойып, жауап алыңыз.
        </p>
      </div>

      {micError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 border border-red-100">
          <AlertTriangle size={18} /> {micError}
        </div>
      )}

      {/* AI Assistant Chat Card */}
      <div className="bg-white rounded-[16px] shadow-soft border border-gray-50 flex flex-col overflow-hidden h-[450px]">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <MessageCircleHeart className="text-accent" size={20} />
          <h3 className="font-semibold text-gray-800">ИИ-көмекші</h3>
          {azureError && (
            <span className="ml-auto text-[11px] text-red-500 font-medium">
              Дауыс қызметі өшірулі
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          {chats.map((msg, idx) => (
            <div key={idx} className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-tr from-accent to-blue-400 text-white' : 'bg-white border border-gray-200 text-accent'}`}>
                {msg.role === 'user' ? <User size={20} /> : <MessageCircleHeart size={22} />}
              </div>
              <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-accent text-white rounded-br-sm shadow-accent/20 shadow-md' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'user' && <div className="text-[10px] opacity-70 mb-1">Сіз сұрадыңыз:</div>}
                {msg.text.split('\n').map((p, i) => (
                  <React.Fragment key={i}>{p}{i !== msg.text.split('\n').length - 1 && <br />}</React.Fragment>
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
                <Loader2 size={16} className="animate-spin" /> {isRecording ? "Тыңдап тұр..." : "Жауап жазып жатыр..."}
              </div>
            </div>
          )}
          {sttError && (
            <div className="flex justify-center">
              <div className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                {sttError}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
            {!azureError && (
              <button
                onClick={startRecording}
                disabled={isLoading && !isRecording}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-200 text-gray-500 hover:text-accent hover:bg-accent/10'
                }`}
              >
                {isRecording ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
            )}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder={isRecording ? "Сөйлеңіз..." : "Сұрағыңызды жазыңыз..."}
              className="flex-1 bg-transparent border-none outline-none resize-none min-h-[44px] py-3 px-3 text-sm text-gray-700"
              rows="1"
              disabled={isLoading && !isRecording}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                inputText.trim() && !isLoading 
                  ? 'bg-accent text-white hover:bg-accent-dark shadow-md shadow-accent/20 cursor-pointer' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send size={18} className={inputText.trim() && !isLoading ? 'translate-x-0.5' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Constitution Reader */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-72 bg-white rounded-[16px] shadow-soft border border-gray-50 p-4 shrink-0 h-fit">
          <nav className="space-y-1">
            {constitutionData.sections.map(section => {
              const isActive = activeSection.id === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 flex justify-between items-center ${
                    isActive 
                      ? 'bg-accent text-white shadow-md shadow-accent/20 font-medium' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span className="text-[13px] leading-snug">{section.title}</span>
                  {isActive && <ChevronRight size={16} />}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-[16px] shadow-soft border border-gray-50 p-6 lg:p-8 min-h-[400px]">
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
            {activeSection.title}
          </h3>
          <div className="space-y-6">
            {activeSection.articles.map(article => (
              <div key={article.number} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow group relative pr-20">
                <div className="flex items-start gap-3 flex-col sm:flex-row">
                  <div className="font-bold text-gray-900 shrink-0 mt-0.5">
                    {article.number}-бап
                  </div>
                  <p className="text-gray-700 text-[14px] leading-relaxed">
                    {article.text}
                  </p>
                </div>
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                  <button 
                    onClick={() => playArticleAudio(article.text, article.number)}
                    disabled={isSynthesizing !== null && isSynthesizing !== article.number}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm border ${
                      playingArticle === article.number 
                        ? 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100' 
                        : 'bg-white text-accent border-accent/20 hover:border-accent hover:bg-accent/5'
                    } disabled:opacity-50`}
                  >
                    {isSynthesizing === article.number ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : playingArticle === article.number ? (
                      <Pause size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )}
                    <span className="hidden sm:inline">
                      {playingArticle === article.number ? 'Тоқтату' : 'Тыңдау'}
                    </span>
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
