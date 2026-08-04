import React from 'react';
import { Download } from 'lucide-react';

const TemplateLayout = ({ 
  title, 
  subtitle, 
  onExport, 
  showExport, 
  exportText, 
  formContent, 
  previewContent, 
  previewTitle 
}) => {
  return (
    <div className="animate-in fade-in duration-500 max-w-full mx-auto pb-24 md:pb-0">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        
        {showExport && onExport && (
          <button 
            onClick={onExport}
            className="bg-white border border-gray-200 hover:border-accent hover:text-accent text-gray-700 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Download size={18} />
            {exportText || "Word (.docx) түрінде жүктеу"}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ЛЕВАЯ ЧАСТЬ - ФОРМА */}
        <div className="lg:w-1/3 bg-white rounded-[16px] shadow-soft p-6 border border-gray-50 flex flex-col h-fit">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Деректерді енгізу</h3>
          <div className="space-y-4">
            {formContent}
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - ПРЕДПРОСМОТР */}
        <div className="lg:w-2/3 bg-white rounded-[16px] shadow-soft p-6 border border-gray-50 min-h-[500px] flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{previewTitle}</h3>
          {previewContent}
        </div>

      </div>
    </div>
  );
};

export default TemplateLayout;
