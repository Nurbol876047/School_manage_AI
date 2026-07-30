import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KtjTemplate from './components/KtjTemplate';
import AIPsychologist from './components/AIPsychologist';
import DocumentCheck from './components/DocumentCheck';
import Performance from './components/Performance';
import ParentCommunication from './components/ParentCommunication';

function App() {
  const [activeTab, setActiveTab] = useState('ktj');
  const [parentMessageData, setParentMessageData] = useState(null);

  const handleSendMessage = (studentName) => {
    setParentMessageData({ studentName, reason: 'Үлгерім төмендеді' });
    setActiveTab('parents');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'ktj':
        return <KtjTemplate />;
      case 'ai-psychologist':
        return <AIPsychologist />;
      case 'documents':
        return <DocumentCheck />;
      case 'performance':
        return <Performance onSendMessage={handleSendMessage} />;
      case 'parents':
        return <ParentCommunication initialData={parentMessageData} clearInitialData={() => setParentMessageData(null)} />;
      default:
        return <KtjTemplate />;
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">
      {/* Sidebar - fixed on left */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - top bar */}
        <Header />

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
