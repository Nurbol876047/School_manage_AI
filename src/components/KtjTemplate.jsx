import React, { useState } from 'react';
import { CalendarDays, Plus, Download, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel, PageOrientation } from "docx";
import { saveAs } from "file-saver";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const KtjTemplate = () => {
  const [formData, setFormData] = useState({
    subject: '',
    grade: '5',
    hoursPerWeek: '1',
    year: '2025-2026',
    teacherName: '',
    schoolName: 'Тараз қаласы, №67 Келешек мектебі',
    topics: ''
  });

  const [quarters, setQuarters] = useState([
    { id: 1, lessons: 8 },
    { id: 2, lessons: 8 },
    { id: 3, lessons: 10 },
    { id: 4, lessons: 8 }
  ]);

  const [ktjData, setKtjData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFormValid = formData.subject && formData.grade && formData.hoursPerWeek && formData.topics;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuarterChange = (index, value) => {
    const newQuarters = [...quarters];
    newQuarters[index].lessons = parseInt(value) || 0;
    setQuarters(newQuarters);
  };

  const handleCellEdit = (index, field, value) => {
    const newData = [...ktjData];
    newData[index][field] = value;
    setKtjData(newData);
  };

  const generateKtj = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setKtjData([]);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Сен Қазақстан мектептеріне арналған күнтізбелік-тақырыптық жоспарды (КТЖ) құру бойынша жоғары білікті, зияткер мұғалім-әдіскердің көмекшісісің. 
Мұғалім берген тақырыптар мен оқу мақсаттарының тізіміне немесе кілт сөздеріне сүйене отырып, толыққанды, кәсіби деңгейдегі оқу жоспарын жаса.

Бастапқы деректер:
- Пән: ${formData.subject}
- Сынып: ${formData.grade}
- Аптасына сағат саны: ${formData.hoursPerWeek}
- Тоқсандар бойынша сабақ саны: 1-ші (${quarters[0].lessons}), 2-ші (${quarters[1].lessons}), 3-ші (${quarters[2].lessons}), 4-ші (${quarters[3].lessons})
- Мұғалім енгізген негізгі тақырыптар немесе кілт сөздер:
${formData.topics}

СЕНІҢ НЕГІЗГІ МІНДЕТТЕРІҢ:
1. ТАЛДАУ ЖӘНЕ КЕҢЕЙТУ: Мұғалім өте қысқа, қате немесе толық емес тақырып берсе де, сен оның негізгі мағынасын түсініп, осы пән мен сыныпқа сай келетін ауқымды, мағыналы әрі нақты тақырыптарды өзің құрастыруың керек.
2. ҚАТЕЛЕРДІ ТҮЗЕТУ ЖӘНЕ АУДАРУ: Егер мәтінде орысша сөздер, қате жазылған қазақша сөздер немесе "қазақша емес" (шала қазақша) сөйлемдер болса, оларды Қазақстан Республикасының Білім беру стандартына сай, таза, сауатты әдеби қазақ тіліне аудар және өңде.
3. БІРЕГЕЙЛІК ЖӘНЕ ӘРТҮРЛІЛІК: Сабақтардың саны көп болса да, бір тақырып пен оқу мақсатын қайталай берме! Әр сабақтың тақырыбы мен оқу мақсаты БІРЕГЕЙ (unique) болуы тиіс. Бір үлкен тақырыпты кішігірім логикалық бөлімдерге (мысалы: теория, практика, есептер шығару, зерттеу, бақылау жұмысы, қайталау) бөл.
4. ТОЛЫҚ ҚАМТУ: Мұғалім сұраған барлық сабақ санын толық қамтамасыз ет (тоқсандардағы сабақ санын қатаң сақта). Барлық жауаптар міндетті түрде сауатты қазақ тілінде болуы тиіс.

Нәтижені ҚАТАҢ ТҮРДЕ JSON-массив форматында қайтар, мұндағы әрбір элемент келесі өрістері бар нысан (object) болып табылады:
{ 
  "number": "сабақтың реттік нөмірі (сан)", 
  "quarter": "тоқсан нөмірі (сан)", 
  "topic": "сабақтың тақырыбы қазақ тілінде (мүлдем қайталанбайтын, нақтыланған)", 
  "learningGoal": "оқу мақсаты қазақ тілінде (сабақ тақырыбына сай, қайталанбайтын)", 
  "hours": "сағат саны (әдетте 1)", 
  "date": "бос жол қалдыр" 
}
Тек JSON массивін қайтар, ешқандай түсініктеме, markdown немесе артық мәтін қоспа.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Санитизация ответа: удаляем возможные markdown-блоки
      const cleanedText = responseText.replace(/```(json)?/gi, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      if (Array.isArray(parsedData)) {
        setKtjData(parsedData);
      } else {
        throw new Error("API қате форматтағы деректер қайтарды (массив емес).");
      }

    } catch (err) {
      console.error(err);
      setError("КТЖ құру кезінде қате шықты. Енгізілген деректердің дұрыстығын тексеріп, қайта көріңіз.");
    } finally {
      setLoading(false);
    }
  };

  const exportToDocx = async () => {
    if (ktjData.length === 0) return;

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Сабақтың тақырыбы" })], width: { size: 40, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Оқу мақсаттары" })], width: { size: 35, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Сағат", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Күні", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        ]
      }),
      ...ktjData.map(row => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(row.number), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.topic) })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.learningGoal) })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.hours), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: String(row.date), alignment: AlignmentType.CENTER })] }),
        ]
      }))
    ];

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24, // 12pt in half-points
            }
          }
        }
      },
      sections: [{
        properties: {
            page: { 
              margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
              size: { orientation: PageOrientation.LANDSCAPE }
            }
        },
        children: [
          new Paragraph({ text: formData.schoolName, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "Күнтізбелік-тақырыптық жоспар", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Пән: ${formData.subject}` }),
          new Paragraph({ text: `Сынып: ${formData.grade}` }),
          new Paragraph({ text: `Аптасына сағат саны: ${formData.hoursPerWeek}` }),
          new Paragraph({ text: `Оқу жылы: ${formData.year}` }),
          new Paragraph({ text: `Мұғалім: ${formData.teacherName}` }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `КТЖ_${formData.subject}_${formData.grade}сынып.docx`);
  };



  return (
    <div className="animate-in fade-in duration-500 max-w-full mx-auto pb-24 md:pb-0">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">КТЖ-шаблон</h2>
          <p className="text-gray-500 mt-1">AI көмегімен жоспар құру</p>
        </div>
        
        {ktjData.length > 0 && (
          <button 
            onClick={exportToDocx}
            className="bg-white border border-gray-200 hover:border-accent hover:text-accent text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Download size={18} />
            Word (.docx) түрінде жүктеу
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ЛЕВАЯ ЧАСТЬ - ФОРМА */}
        <div className="lg:w-1/3 bg-white rounded-[16px] shadow-soft p-6 border border-gray-50 flex flex-col h-fit">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Деректерді енгізу</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Мектеп (Титул)</label>
              <input type="text" name="schoolName" value={formData.schoolName} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all mb-4" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пән <span className="text-red-500">*</span></label>
              <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Мысалы: Информатика" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сынып <span className="text-red-500">*</span></label>
                <select name="grade" value={formData.grade} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
                  {[5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Аптасына сағат саны <span className="text-red-500">*</span></label>
                <input type="number" name="hoursPerWeek" value={formData.hoursPerWeek} onChange={handleInputChange} min="1" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Оқу жылы</label>
                <input type="text" name="year" value={formData.year} onChange={handleInputChange} placeholder="2025-2026" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Мұғалімнің аты-жөні</label>
                <input type="text" name="teacherName" value={formData.teacherName} onChange={handleInputChange} placeholder="Мысалы: Ерпаизова К." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тоқсандар бойынша сабақ саны</label>
              <div className="grid grid-cols-4 gap-2">
                {quarters.map((q, idx) => (
                  <div key={q.id}>
                    <span className="text-xs text-gray-500 block mb-1 text-center">{q.id}-тоқ.</span>
                    <input type="number" value={q.lessons} onChange={(e) => handleQuarterChange(idx, e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тақырыптар мен оқу мақсаттары <span className="text-red-500">*</span></label>
              <textarea name="topics" value={formData.topics} onChange={handleInputChange} rows="8" placeholder="Оқу бағдарламасынан тақырыптар мен мақсаттар тізімін енгізіңіз..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"></textarea>
            </div>

            <button 
              onClick={generateKtj}
              disabled={!isFormValid || loading}
              className={`w-full py-3 rounded-xl font-medium transition-all shadow-soft flex items-center justify-center gap-2 text-sm
                ${isFormValid && !loading ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/20 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> AI құруда...</>
              ) : (
                <><CalendarDays size={18} /> КТЖ құру</>
              )}
            </button>
            
            {!isFormValid && <p className="text-xs text-center text-gray-400 mt-2">Жұлдызшамен белгіленген міндетті өрістерді толтырыңыз</p>}
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - ПРЕДПРОСМОТР */}
        <div className="lg:w-2/3 bg-white rounded-[16px] shadow-soft p-6 border border-gray-50 min-h-[500px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">КТЖ-ны алдын ала көру</h3>
          
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={28} />
              </div>
              <p className="text-gray-700 font-medium mb-2">{error}</p>
              <button onClick={generateKtj} className="text-accent hover:text-accent-dark font-medium flex items-center gap-2 mt-2">
                <RefreshCw size={16} /> Қайталау
              </button>
            </div>
          ) : ktjData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[700px] font-serif text-sm">
                <div className="text-center font-bold mb-4">{formData.schoolName}</div>
                <div className="text-center font-bold mb-4">Күнтізбелік-тақырыптық жоспар</div>
                <div className="grid grid-cols-2 gap-2 mb-4 text-gray-800">
                  <div><span className="font-semibold">Пән:</span> {formData.subject}</div>
                  <div><span className="font-semibold">Сынып:</span> {formData.grade}</div>
                  <div><span className="font-semibold">Аптасына сағат саны:</span> {formData.hoursPerWeek}</div>
                  <div><span className="font-semibold">Оқу жылы:</span> {formData.year}</div>
                  <div><span className="font-semibold">Мұғалім:</span> {formData.teacherName}</div>
                </div>

                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border border-gray-300 p-2 text-center w-12">№</th>
                      <th className="border border-gray-300 p-2 w-16">Тоқсан</th>
                      <th className="border border-gray-300 p-2">Сабақтың тақырыбы</th>
                      <th className="border border-gray-300 p-2">Оқу мақсаттары</th>
                      <th className="border border-gray-300 p-2 text-center w-16">Сағат</th>
                      <th className="border border-gray-300 p-2 text-center w-24">Күні</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ktjData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="border border-gray-300 p-1 text-center">
                          <input type="text" value={row.number} onChange={(e) => handleCellEdit(idx, 'number', e.target.value)} className="w-full text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded" />
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          <input type="text" value={row.quarter} onChange={(e) => handleCellEdit(idx, 'quarter', e.target.value)} className="w-full text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded" />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <textarea value={row.topic} onChange={(e) => handleCellEdit(idx, 'topic', e.target.value)} rows="2" className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded resize-none text-sm leading-tight" />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <textarea value={row.learningGoal} onChange={(e) => handleCellEdit(idx, 'learningGoal', e.target.value)} rows="2" className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded resize-none text-sm leading-tight" />
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          <input type="text" value={row.hours} onChange={(e) => handleCellEdit(idx, 'hours', e.target.value)} className="w-full text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded" />
                        </td>
                        <td className="border border-gray-300 p-1 text-center">
                          <input type="text" value={row.date} onChange={(e) => handleCellEdit(idx, 'date', e.target.value)} placeholder="КК.АА" className="w-full text-center bg-transparent border-none outline-none focus:ring-1 focus:ring-accent focus:bg-white rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
              <CalendarDays size={48} className="mb-4 opacity-50" />
              <p>Сол жақтағы форманы толтырып, «КТЖ құру» батырмасын басыңыз</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default KtjTemplate;
