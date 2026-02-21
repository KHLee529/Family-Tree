import { useState, useEffect } from 'react';

function App() {
  const [members, setMembers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load the default data on initial render
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/family-data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMembers(data.members);
        setFamilies(data.families);
      } catch (e) {
        setError(e.message);
        console.error("Failed to load family data:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex flex-col h-screen font-sans">
      <header className="bg-gray-800 text-white p-4 text-center">
        <h1 className="text-2xl">家庭樹應用程式</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-100 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold mb-2">成員列表</h2>
          {loading && <p>載入中...</p>}
          {error && <p className="text-red-500">錯誤: {error}</p>}
          <ul>{members.map(m => <li key={m.id}>{m.name}</li>)}</ul>
        </aside>
        <main className="flex-1 bg-gray-200 p-4">
          <p>這裡是未來顯示家庭樹圖的位置。</p>
        </main>
      </div>
    </div>
  );
}

export default App;