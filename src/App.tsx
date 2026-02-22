import { useState } from 'react';
import { useFamilyStore } from './store';
import FamilyTreeViewer from './components/FamilyTreeViewer';
import Sidebar from './components/Sidebar';

function App() {
  const [viewMode, setViewMode] = useState<'normal' | 'vertical' | 'polar'>('normal');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleExport = () => {
    const data = useFamilyStore.getState().members;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        useFamilyStore.getState().importData(JSON.parse(text));
      }
    };
    input.click();
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="h-14 bg-white shadow-sm border-b border-slate-200 flex items-center px-4 justify-between shrink-0 z-10">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">Family Tree</h1>
        <div className="flex gap-2">
          {/* Toolbar 預留 */}
          <select
            className="border border-slate-300 rounded-md px-3 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
          >
            <option value="normal">一般家庭樹</option>
            <option value="vertical">時間垂直對齊</option>
            <option value="polar">時間極座標</option>
          </select>
          <button onClick={handleExport} className="bg-slate-800 text-white px-4 py-1.5 rounded-md hover:bg-slate-700 text-sm font-medium transition-colors">匯出</button>
          <button onClick={handleImport} className="bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-md hover:bg-slate-200 text-sm font-medium transition-colors">匯入</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 主要畫布 */}
        <main className="flex-1 relative bg-slate-50/50 overflow-hidden">
          <FamilyTreeViewer viewMode={viewMode} onSelect={setSelectedId} />
        </main>

        {/* 側邊欄 */}
        <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
          <Sidebar selectedId={selectedId} onClose={() => setSelectedId(null)} />
        </aside>
      </div>
    </div>
  );
}

export default App;
