import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KtjTemplate from './components/KtjTemplate';
import KmzhTemplate from './components/KmzhTemplate';
import AIPsychologist from './components/AIPsychologist';
import DocumentCheck from './components/DocumentCheck';
import Performance from './components/Performance';
import ParentCommunication from './components/ParentCommunication';
import EntTest from './components/EntTest';
import Games from './components/Games';
import Constitution from './components/Constitution';

function App() {
  const [activeTab, setActiveTab] = useState('ktj');
  const [parentMessageData, setParentMessageData] = useState(null);
  const [entResults, setEntResults] = useState([]);

  const handleSendMessage = (studentName) => {
    setParentMessageData({ studentName, reason: 'Үлгерім төмендеді' });
    setActiveTab('parents');
  };

  const handleTestComplete = (result) => {
    setEntResults(prev => [result, ...prev]);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'ktj':
        return <KtjTemplate />;
      case 'kmzh':
        return <KmzhTemplate />;
      case 'ai-psychologist':
        return <AIPsychologist />;
      case 'documents':
        return <DocumentCheck />;
      case 'performance':
        return <Performance onSendMessage={handleSendMessage} entResults={entResults} />;
      case 'parents':
        return <ParentCommunication initialData={parentMessageData} clearInitialData={() => setParentMessageData(null)} />;
      case 'ent':
        return <EntTest onTestComplete={handleTestComplete} />;
      case 'games':
        return <Games />;
      case 'constitution':
        return <Constitution />;
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
