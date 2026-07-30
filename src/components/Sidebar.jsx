import React from 'react';
import { CalendarDays, MessageCircleHeart, FolderCheck, LineChart, Users, Menu } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'ktj', label: 'КТЖ-шаблон', icon: CalendarDays },
    { id: 'ai-psychologist', label: 'AI-психолог', icon: MessageCircleHeart },
    { id: 'documents', label: 'Құжаттарды тексеру', icon: FolderCheck },
    { id: 'performance', label: 'Үлгерім', icon: LineChart },
    { id: 'parents', label: 'Ата-аналармен байланыс', icon: Users },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Placeholder - could be expanded later */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around p-3 z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all ${
              activeTab === item.id ? 'text-accent' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'fill-accent-light/50' : ''} />
            <span className="text-[10px] mt-1 font-medium">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 bg-white h-full flex-col border-r border-gray-100 shadow-sm z-40 transition-all duration-300">
        {/* Logo Section */}
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-soft shadow-accent/30 text-white font-bold text-xl">
            КМ
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-gray-900 tracking-tight leading-tight">Келешек<br/>мектебі</h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-accent-light text-accent-dark font-medium shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <item.icon 
                  size={22} 
                  className={`transition-colors ${isActive ? 'text-accent' : 'text-gray-400 group-hover:text-gray-600'}`} 
                />
                <span className="text-[15px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info or settings could go here */}
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-accent/10 to-transparent p-4 rounded-2xl border border-accent/10">
            <p className="text-xs text-gray-500 mb-2">Платформа</p>
            <p className="text-sm font-medium text-gray-800">Нұсқа 1.0.0</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
