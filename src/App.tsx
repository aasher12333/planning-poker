import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getAvatarUrl } from './utils';

function App() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  const [roomData, setRoomData] = useState<any>(null);
  const [userName, setUserName] = useState(localStorage.getItem('poker-user') || '');

  // 1. Sync with Firebase
  useEffect(() => {
    if (!roomId) return;

    const docRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoomData(docSnap.data());
      } else if (isAdmin) {
        // Initialize room if it doesn't exist and user is admin
        setDoc(docRef, { currentTicket: 'New Ticket', showVotes: false, votes: {} });
      }
    });
    return unsub;
  }, [roomId, isAdmin]);

  // 2. Voting Logic
  const handleVote = async (value: number) => {
    if (!userName || !roomId) return alert("Enter a name!");
    localStorage.setItem('poker-user', userName);

    await updateDoc(doc(db, "rooms", roomId), {
      [`votes.${userName.replace(/\s/g, '_')}`]: {
        name: userName,
        vote: value,
        votedAt: Date.now()
      }
    });
  };

  if (!roomId) {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
          <h1 className="text-4xl font-bold mb-6">Planning Poker</h1>
          <button
              onClick={() => window.location.href = `/room/${Math.random().toString(36).substring(7)}?admin=true`}
              className="px-6 py-3 bg-sky-500 rounded-lg font-bold hover:bg-sky-600 transition"
          >
            Create New Room
          </button>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-900 p-8 text-white">
        {/* Header Info */}
        <div className="mb-12 text-center">
          <h2 className="text-xl text-slate-400">Estimating:</h2>
          <h1 className="text-5xl font-black text-sky-400">{roomData?.currentTicket || '...'}</h1>
        </div>

        {/* User Setup */}
        {!localStorage.getItem('poker-user') && (
            <div className="max-w-md mx-auto mb-8 p-6 bg-slate-800 rounded-xl border border-slate-700">
              <input
                  className="w-full p-3 bg-slate-700 rounded border border-slate-600 mb-4"
                  placeholder="Your Name (e.g. Amish)"
                  onChange={(e) => setUserName(e.target.value)}
              />
            </div>
        )}

        {/* Voting Cards */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[1, 2, 3, 5, 8, 13, 21].map(num => (
              <button
                  key={num}
                  onClick={() => handleVote(num)}
                  className="h-24 w-16 bg-slate-800 border-2 border-sky-500/30 rounded-lg flex items-center justify-center text-2xl font-bold hover:border-sky-400 hover:scale-110 transition cursor-pointer"
              >
                {num}
              </button>
          ))}
        </div>

        {/* Results Board */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {roomData?.votes && Object.entries(roomData.votes).map(([key, data]: any) => (
              <div key={key} className="flex flex-col items-center p-4 bg-slate-800 rounded-xl border border-slate-700">
                <img src={getAvatarUrl(data.name)} className="w-16 h-16 rounded-full mb-3 border-2 border-slate-600" />
                <span className="font-medium">{data.name}</span>
                <div className="mt-2 text-2xl font-black text-sky-400">
                  {roomData.showVotes ? data.vote : '✅'}
                </div>
              </div>
          ))}
        </div>
      </div>
  );
}

export default App;