import React, { useState } from 'react';
import { CalendarCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, PageOrientation } from "docx";
import { saveAs } from "file-saver";
import TemplateLayout from './TemplateLayout';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const KmzhTemplate = () => {
  const [formData, setFormData] = useState({
    schoolName: 'Тараз қаласы, №67 Келешек мектебі',
    subject: '',
    grade: '5',
    quarter: '1-тоқсан',
    topic: '',
    learningGoals: '',
    lessonType: 'Жаңа білім беру',
    date: new Date().toISOString().split('T')[0],
    teacherName: 'Ерпаизова К.'
  });

  const [kmzhData, setKmzhData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isFormValid = formData.subject && formData.grade && formData.quarter && formData.topic && formData.learningGoals && formData.lessonType && formData.date;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateKmzh = async () => {
    if (!isFormValid) return;
    setLoading(true);
    setError(null);
    setKmzhData(null);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `Сен Қазақстан мектептеріне арналған қысқа мерзімді жоспарды (КМЖ) құру бойынша жоғары білікті мұғалім-әдіскердің көмекшісісің.
Берілген мәліметтерге сүйене отырып, ҚР Оқу-ағарту министрлігінің стандарттарына сай толыққанды сабақ жоспарын (КМЖ) жаса.

Бастапқы деректер:
- Пән: ${formData.subject}
- Сынып: ${formData.grade}
- Тоқсан: ${formData.quarter}
- Сабақтың тақырыбы: ${formData.topic}
- Оқу мақсаттары (ОМ): ${formData.learningGoals}
- Сабақ түрі: ${formData.lessonType}

КМЖ келесі бөлімдерді қамтуы керек: сабақтың мақсаты (барлық, басым бөлігі, кейбір оқушылар үшін), бағалау критерийлері, тілдік мақсаттар, құндылықтарды дарыту, пәнаралық байланыс, сабақ барысы (басы, ортасы, соңы - уақыт, іс-әрекет, ресурстар), саралау, бағалау, рефлексия. Барлық мәтін таза, сауатты қазақ тілінде болсын.

Нәтижені ҚАТАҢ ТҮРДЕ төмендегідей JSON форматында қайтар:
{
  "topic": "Сабақ тақырыбы / Бөлім",
  "learningGoals": "Оқу мақсаттары (код + мазмұны)",
  "lessonObjectives": "Сабақтың мақсаты",
  "assessmentCriteria": "Бағалау критерийлері",
  "languageObjectives": "Тілдік мақсаттар (егер қажет болса)",
  "values": "Құндылықтарды дарыту",
  "crossCurricularLinks": "Пәнаралық байланыс",
  "stages": [
    {
      "time": "Уақыт",
      "activity": "Мұғалім мен оқушының іс-әрекеті",
      "resources": "Ресурстар"
    }
  ],
  "differentiation": "Саралау (дифференциация)",
  "assessment": "Бағалау тәсілі",
  "reflection": "Рефлексия"
}
Тек JSON объектісін қайтар.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanedText = responseText.replace(/```(json)?/gi, '').trim();
      const parsedData = JSON.parse(cleanedText);
      
      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        setKmzhData(parsedData);
      } else {
        throw new Error("API қате форматтағы деректер қайтарды.");
      }

    } catch (err) {
      console.error(err);
      setError("КМЖ құру кезінде қате шықты. Енгізілген деректердің дұрыстығын тексеріп, қайта көріңіз.");
    } finally {
      setLoading(false);
    }
  };

  const exportToDocx = async () => {
    if (!kmzhData) return;

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: "Уақыт", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Педагогтің/оқушының іс-әрекеті", alignment: AlignmentType.CENTER })], width: { size: 55, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Бағалау", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: "Ресурстар", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        ]
      }),
      ...(kmzhData.stages || []).map(stage => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: String(stage.time || "") })] }),
          new TableCell({ children: [new Paragraph({ text: String(stage.activity || "") })] }),
          new TableCell({ children: [new Paragraph({ text: "ҚБ" })] }),
          new TableCell({ children: [new Paragraph({ text: String(stage.resources || "") })] }),
        ]
      }))
    ];

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 24,
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
          new Paragraph({ text: "Қысқа мерзімді сабақ жоспары (КМЖ)", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Пән: ${formData.subject}` }),
          new Paragraph({ text: `Сынып: ${formData.grade}` }),
          new Paragraph({ text: `Күні: ${formData.date}` }),
          new Paragraph({ text: `Мұғалім: ${formData.teacherName}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Сабақтың тақырыбы: ${kmzhData.topic || formData.topic}` }),
          new Paragraph({ text: `Оқу мақсаттары: ${kmzhData.learningGoals || formData.learningGoals}` }),
          new Paragraph({ text: `Сабақтың мақсаты: ${kmzhData.lessonObjectives || ""}` }),
          new Paragraph({ text: `Бағалау критерийлері: ${kmzhData.assessmentCriteria || ""}` }),
          new Paragraph({ text: `Тілдік мақсаттар: ${kmzhData.languageObjectives || ""}` }),
          new Paragraph({ text: `Құндылықтарды дарыту: ${kmzhData.values || ""}` }),
          new Paragraph({ text: `Пәнаралық байланыс: ${kmzhData.crossCurricularLinks || ""}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Сабақ барысы:", heading: HeadingLevel.HEADING_2 }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `Саралау: ${kmzhData.differentiation || ""}` }),
          new Paragraph({ text: `Бағалау: ${kmzhData.assessment || ""}` }),
          new Paragraph({ text: `Рефлексия: ${kmzhData.reflection || ""}` }),
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `КМЖ_${formData.subject}_${formData.grade}сынып.docx`);
  };

  const formContent = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Мектеп (Титул)</label>
        <input type="text" name="schoolName" value={formData.schoolName} readOnly className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 mb-4 cursor-not-allowed" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Пән <span className="text-red-500">*</span></label>
        <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} placeholder="Мысалы: Информатика" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Сынып <span className="text-red-500">*</span></label>
          <select name="grade" value={formData.grade} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
            {[1,2,3,4,5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тоқсан <span className="text-red-500">*</span></label>
          <select name="quarter" value={formData.quarter} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
            {["1-тоқсан", "2-тоқсан", "3-тоқсан", "4-тоқсан"].map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Сабақтың тақырыбы <span className="text-red-500">*</span></label>
        <input type="text" name="topic" value={formData.topic} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Оқу мақсаттары (ОМ коды) <span className="text-red-500">*</span></label>
        <textarea name="learningGoals" value={formData.learningGoals} onChange={handleInputChange} rows="3" placeholder="Оқу мақсаттарының кодын және мазмұнын енгізіңіз..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none"></textarea>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Сабақ түрі <span className="text-red-500">*</span></label>
          <select name="lessonType" value={formData.lessonType} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all">
            {["Жаңа білім беру", "Жаттығу", "Қайталау", "БЖБ", "ТЖБ"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Күні</label>
          <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Мұғалімнің аты-жөні</label>
        <input type="text" name="teacherName" value={formData.teacherName} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all" />
      </div>

      <button 
        onClick={generateKmzh}
        disabled={!isFormValid || loading}
        className={`w-full py-3 rounded-xl font-medium transition-all shadow-soft flex items-center justify-center gap-2 text-sm mt-4
          ${isFormValid && !loading ? 'bg-accent hover:bg-accent-dark text-white shadow-accent/20 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> AI құруда...</>
        ) : (
          <><CalendarCheck size={18} /> КМЖ құру</>
        )}
      </button>
      
      {!isFormValid && <p className="text-xs text-center text-gray-400 mt-2">Жұлдызшамен белгіленген міндетті өрістерді толтырыңыз</p>}
    </>
  );

  const previewContent = error ? (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <AlertCircle size={28} />
      </div>
      <p className="text-gray-700 font-medium mb-2">{error}</p>
      <button onClick={generateKmzh} className="text-accent hover:text-accent-dark font-medium flex items-center gap-2 mt-2">
        <RefreshCw size={16} /> Қайталау
      </button>
    </div>
  ) : kmzhData ? (
    <div className="overflow-y-auto max-h-[70vh] pr-2">
      <div className="font-serif text-sm space-y-4">
        <div className="text-center font-bold mb-6">Қысқа мерзімді сабақ жоспары (КМЖ)</div>
        
        <div className="grid grid-cols-2 gap-4 text-gray-800 border-b pb-4">
          <div><span className="font-semibold">Бөлім / Тақырып:</span> {kmzhData.topic}</div>
          <div><span className="font-semibold">Күні:</span> {formData.date}</div>
          <div><span className="font-semibold">Сынып:</span> {formData.grade}</div>
          <div><span className="font-semibold">Мұғалім:</span> {formData.teacherName}</div>
        </div>

        <div className="space-y-3">
          <div><span className="font-semibold">Оқу мақсаттары:</span> {kmzhData.learningGoals}</div>
          <div><span className="font-semibold">Сабақтың мақсаты:</span> {kmzhData.lessonObjectives}</div>
          <div><span className="font-semibold">Бағалау критерийлері:</span> {kmzhData.assessmentCriteria}</div>
          {kmzhData.languageObjectives && <div><span className="font-semibold">Тілдік мақсаттар:</span> {kmzhData.languageObjectives}</div>}
          <div><span className="font-semibold">Құндылықтарды дарыту:</span> {kmzhData.values}</div>
          <div><span className="font-semibold">Пәнаралық байланыс:</span> {kmzhData.crossCurricularLinks}</div>
        </div>

        <div className="mt-6">
          <h4 className="font-bold mb-2">Сабақ барысы:</h4>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="border border-gray-300 p-2 w-24">Уақыт</th>
                <th className="border border-gray-300 p-2">Іс-әрекет</th>
                <th className="border border-gray-300 p-2 w-32">Ресурстар</th>
              </tr>
            </thead>
            <tbody>
              {kmzhData.stages && kmzhData.stages.map((stage, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2 text-center text-xs">{stage.time}</td>
                  <td className="border border-gray-300 p-2 text-xs">{stage.activity}</td>
                  <td className="border border-gray-300 p-2 text-xs">{stage.resources}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 mt-6">
          <div><span className="font-semibold">Саралау:</span> {kmzhData.differentiation}</div>
          <div><span className="font-semibold">Бағалау тәсілі:</span> {kmzhData.assessment}</div>
          <div><span className="font-semibold">Рефлексия:</span> {kmzhData.reflection}</div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
      <CalendarCheck size={48} className="mb-4 opacity-50" />
      <p>Сол жақтағы форманы толтырып, «КМЖ құру» батырмасын басыңыз</p>
    </div>
  );

  return (
    <TemplateLayout
      title="КМЖ-шаблон"
      subtitle="AI көмегімен сабақ жоспарын құру"
      onExport={exportToDocx}
      showExport={!!kmzhData}
      formContent={formContent}
      previewContent={previewContent}
      previewTitle="КМЖ-ны алдын ала көру"
    />
  );
};

export default KmzhTemplate;
