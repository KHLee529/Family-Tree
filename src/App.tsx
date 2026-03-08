import { useState, useRef, useMemo } from 'react';
import { useFamilyStore } from './store';
import FamilyTreeViewer, { FamilyTreeViewerRef } from './components/FamilyTreeViewer';
import Sidebar from './components/Sidebar';
import { Settings } from 'lucide-react';

function getTreeMaxDepth(members: Record<string, any>) {
  const all = Object.values(members);
  const isParent = (id: string) => all.some(m => m.parentId1 === id);
  const realRoot = all.find(m => !m.parentId1 && isParent(m.id)) || all.find(m => !m.parentId1);
  if (!realRoot) return 0;

  function getDepth(id: string): number {
    let maxChildDepth = 0;
    const spouseId = members[id]?.spouseId;
    const children = all.filter(m => m.parentId1 === id || (spouseId && m.parentId1 === spouseId));
    for (const child of children) {
      maxChildDepth = Math.max(maxChildDepth, getDepth(child.id));
    }
    return 1 + maxChildDepth;
  }
  return getDepth(realRoot.id);
}

function getStringVisualWidth(str: string): number {
  if (!str) return 0;
  let width = 0;
  for (const char of str) {
    // CJK characters take full em width, everything else takes roughly ~0.55 em width
    width += /[\u3400-\u9FBF]/.test(char) ? 1 : 0.55;
  }
  return width;
}

function App() {
  const [viewMode, setViewMode] = useState<'normal' | 'vertical' | 'polar' | 'polar-time'>('normal');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const viewerRef = useRef<FamilyTreeViewerRef>(null);

  const { members, uiConfig, updateUIConfig } = useFamilyStore();

  const maxDepth = useMemo(() => getTreeMaxDepth(members), [members]);

  // Dynamically calculate the safe minimum generation spacing to prevent overlap
  const minSpacing = useMemo(() => {
    const isHorizontal = uiConfig.nodeWritingMode === 'horizontal-tb';
    const allMembersArr = Object.values(members);
    const maxNameWidth = Math.max(...allMembersArr.map(m => getStringVisualWidth(m.name)), 2);

    // Calculate RectHeight just like FamilyTreeViewer does
    const RectHeight = isHorizontal ? 40 : Math.max(80, (maxNameWidth * 17.5) + 30);
    // Return distance + safety padding
    return Math.ceil(RectHeight * 2 + 50);
  }, [members, uiConfig.nodeWritingMode]);

  const maxSpacingNormal = Math.max(800, minSpacing + 400);

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

  const handleExportPng = () => {
    viewerRef.current?.exportAsPNG();
  };

  const handleExportPdf = () => {
    viewerRef.current?.exportAsPDF();
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
            <option value="polar">極座標</option>
            <option value="polar-time">時間極座標</option>
          </select>
          <div className="flex gap-2 relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-200 text-sm font-medium transition-colors"
            >
              <Settings size={16} />
              視覺設定
            </button>
            <button onClick={handleExport} className="bg-slate-800 text-white px-4 py-1.5 rounded-md hover:bg-slate-700 text-sm font-medium transition-colors">匯出 JSON</button>
            <button onClick={handleImport} className="bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-md hover:bg-slate-200 text-sm font-medium transition-colors">匯入 JSON</button>
            <button onClick={handleExportPng} className="bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-md hover:bg-slate-200 text-sm font-medium transition-colors">匯出 PNG</button>
            <button onClick={handleExportPdf} className="bg-slate-100 border border-slate-300 px-4 py-1.5 rounded-md hover:bg-slate-200 text-sm font-medium transition-colors">匯出 PDF</button>

            {/* Settings Dropdown Panel */}
            {showSettings && (
              <div className="absolute top-10 right-0 w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-4 z-50 text-sm">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-700">視覺設定</h3>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uiConfig.showBirthYear}
                      onChange={(e) => updateUIConfig({ showBirthYear: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">顯示出生年份</span>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-slate-700">文字方向</span>
                    <select
                      className="border border-slate-300 rounded px-2 py-1.5 bg-white"
                      value={uiConfig.nodeWritingMode}
                      onChange={(e) => updateUIConfig({ nodeWritingMode: e.target.value as any })}
                    >
                      <option value="horizontal-tb">水平排列</option>
                      <option value="vertical-rl">垂直排列</option>
                    </select>
                  </label>

                  {(viewMode === 'vertical' || viewMode === 'polar-time') && (
                    <label className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-slate-700">每年時間間距</span>
                        <span className="text-slate-500">{uiConfig.yearSpacing}px</span>
                      </div>
                      <input
                        type="range"
                        min="5" max="100" step="1"
                        value={uiConfig.yearSpacing}
                        onChange={(e) => updateUIConfig({ yearSpacing: Number(e.target.value) })}
                        className="w-full"
                      />
                    </label>
                  )}

                  {(viewMode === 'normal') && (
                    <label className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-slate-700">每一代間隔</span>
                      </div>
                      <input
                        type="range"
                        min={minSpacing} max={maxSpacingNormal} step="10"
                        value={uiConfig.generationSpacingNormal}
                        onChange={(e) => updateUIConfig({ generationSpacingNormal: Number(e.target.value) })}
                        className="w-full"
                      />
                    </label>
                  )}

                  {viewMode === 'polar' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-slate-700">各世代間隔 (極座標)</span>
                      {Array.from({ length: Math.min(maxDepth, 10) }).map((_, idx) => (
                        <label key={idx} className="flex flex-col gap-1 pl-2 border-l-2 border-slate-200">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600">第 {idx + 1} 代半徑</span>
                          </div>
                          <input
                            type="range"
                            min={minSpacing} max={Math.max(800, minSpacing + 500)} step="10"
                            value={uiConfig.polarGenerationRadii[idx] !== undefined ? uiConfig.polarGenerationRadii[idx] : Math.max(250, minSpacing)}
                            onChange={(e) => {
                              const newArr = [...uiConfig.polarGenerationRadii];
                              newArr[idx] = Number(e.target.value);
                              updateUIConfig({ polarGenerationRadii: newArr });
                            }}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 主要畫布 */}
        <main className="flex-1 relative bg-slate-50/50 overflow-hidden">
          <FamilyTreeViewer ref={viewerRef} viewMode={viewMode} onSelect={setSelectedId} />
        </main>

        {/* 側邊欄 - 只有選中節點時才顯示 */}
        {selectedId && (
          <aside className="w-80 bg-white border-l border-slate-200 p-5 overflow-y-auto shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
            <Sidebar selectedId={selectedId} onClose={() => setSelectedId(null)} />
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
