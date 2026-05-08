import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

// --- UTILS ---
const generateId = () => Math.random().toString(36).substring(2, 9);
const OPTIONS = [1, 2, 3, 5, 8, 13, 21, 'Abstain'];

// --- 1. HOME COMPONENT (Req 1, 2) ---
function Home() {
    const navigate = useNavigate();

    const createRoom = async () => {
        const roomId = generateId();
        const adminToken = crypto.randomUUID(); // Secure token
        localStorage.setItem(`admin_${roomId}`, adminToken); // Save to browser

        await setDoc(doc(db, "rooms", roomId), {
            adminToken,
            currentTicket: null,
            status: 'waiting',
            createdAt: Date.now(),
            votes: {}
        });

        navigate(`/room/${roomId}`);
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
            <h1 className="text-5xl font-black mb-4">Welcome to Planning Poker!</h1>
            <p className="text-slate-400 mb-8">Create a session and share the link with your team.</p>
            <button onClick={createRoom} className="px-8 py-4 bg-sky-500 rounded-lg font-bold hover:bg-sky-600 transition">
                Create New Room
            </button>
        </div>
    );
}

// --- 2. ROOM COMPONENT ---
function Room() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState<any>(null);
    const [name, setName] = useState(localStorage.getItem('poker-name') || '');
    const [ticketInput, setTicketInput] = useState('');

    // Identify Admin (Req 3)
    const isAdmin = room?.adminToken === localStorage.getItem(`admin_${roomId!}`);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "rooms", roomId!), (docSnap) => {
            if (docSnap.exists()) setRoom(docSnap.data());
            else navigate('/'); // Room ended/deleted
        });
        return unsub;
    }, [roomId, navigate]);

    // Join the table (Req 5, 7)
    const joinTable = () => {
        if (!name) return;
        localStorage.setItem('poker-name', name);
        updateDoc(doc(db, "rooms", roomId!), {
            [`votes.${name}`]: { vote: null }
        });
    };

    const castVote = (val: number | string) => {
        updateDoc(doc(db, "rooms", roomId!), { [`votes.${name}.vote`]: val });
    };

    // Admin Actions (Req 4, 10)
    const startPoll = () => {
        const resetVotes = Object.keys(room.votes).reduce((acc: any, key) => {
            acc[key] = { vote: null }; return acc;
        }, {});

        updateDoc(doc(db, "rooms", roomId!), {
            currentTicket: ticketInput,
            status: 'voting',
            votes: resetVotes
        });
    };

    const revealVotes = () => updateDoc(doc(db, "rooms", roomId!), { status: 'revealed' });
    const endSession = async () => { await deleteDoc(doc(db, "rooms", roomId!)); navigate('/'); };

    // Calculate Mean (Req 11)
    const calculateMean = () => {
        const validVotes = Object.values(room?.votes || {})
            .map((v: any) => v.vote)
            .filter((v) => typeof v === 'number');
        if (validVotes.length === 0) return 0;
        return (validVotes.reduce((a, b) => a + b, 0) / validVotes.length).toFixed(1);
    };

    if (!room) return <div className="h-screen bg-slate-900" />;

    // User hasn't joined the table yet
    if (room.votes[name] === undefined) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-96 text-center">
                    <h2 className="text-2xl font-bold mb-6">Join Session</h2>
                    <input
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded mb-4 outline-none"
                        placeholder="Enter your name..." value={name} onChange={(e) => setName(e.target.value)}
                    />
                    <button onClick={joinTable} className="w-full py-3 bg-sky-500 rounded font-bold hover:bg-sky-400">Join Table</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 flex flex-col">

            {/* Header & Admin Controls */}
            <div className="flex justify-between items-start mb-12 bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div>
                    <h2 className="text-slate-400 uppercase tracking-widest text-sm mb-1">Current Topic</h2>
                    <h1 className="text-3xl font-black text-sky-400">{room.currentTicket || 'Waiting for Admin...'}</h1>
                </div>

                {isAdmin && (
                    <div className="flex gap-4 items-end">
                        <div className="flex flex-col">
                            <label className="text-xs text-slate-400 mb-1">New Ticket</label>
                            <input
                                className="p-2 bg-slate-900 rounded border border-slate-600 outline-none"
                                value={ticketInput} onChange={(e) => setTicketInput(e.target.value)}
                            />
                        </div>
                        <button onClick={startPoll} className="px-4 py-2 bg-emerald-600 rounded font-bold hover:bg-emerald-500">Start Poll</button>
                        <button onClick={revealVotes} className="px-4 py-2 bg-sky-600 rounded font-bold hover:bg-sky-500">Show Votes</button>
                        <button onClick={endSession} className="px-4 py-2 bg-red-600/20 text-red-400 rounded font-bold hover:bg-red-600/40">End Session</button>
                    </div>
                )}
            </div>

            {/* The Virtual Table (Req 6) */}
            <div className="flex-1 flex items-center justify-center relative mb-12">
                <div className="w-[600px] h-[300px] bg-slate-800 rounded-full border-8 border-slate-700 flex flex-col items-center justify-center shadow-2xl relative">

                    {/* Center Table Content */}
                    {room.status === 'revealed' ? (
                        <div className="text-center">
                            <div className="text-slate-400 text-sm tracking-widest uppercase">Mean Average</div>
                            <div className="text-6xl font-black text-emerald-400">{calculateMean()}</div>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-xl font-bold animate-pulse">
                            {room.status === 'voting' ? 'Voting in progress...' : 'Waiting to start...'}
                        </div>
                    )}

                    {/* Users seated around the table */}
                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-12 -m-16">
                        {Object.entries(room.votes).map(([user, data]: any) => (
                            <div key={user} className="flex flex-col items-center z-10">
                                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-black bg-slate-900
                  ${data.vote !== null ? 'border-emerald-500 text-emerald-400' : 'border-slate-600 text-slate-600'}`}>

                                    {/* Logic for Req 9 & 10 */}
                                    {room.status === 'revealed' ? data.vote
                                        : (isAdmin && data.vote !== null) ? data.vote
                                            : data.vote !== null ? '✅' : '?'}

                                </div>
                                <div className="mt-2 font-bold text-sm bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{user}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Voting Cards (Req 8) */}
            {room.status === 'voting' && (
                <div className="flex justify-center gap-3 mt-auto">
                    {OPTIONS.map(val => (
                        <button key={val} onClick={() => castVote(val)}
                                className="h-20 px-6 bg-slate-800 border-2 border-sky-500/30 rounded-lg text-xl font-bold hover:border-sky-400 hover:-translate-y-2 transition shadow-lg">
                            {val}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
        </Routes>
    );
}