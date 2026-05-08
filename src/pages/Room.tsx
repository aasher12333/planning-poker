import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { joinPokerTable, submitVote, startNewPoll, revealAllVotes, deleteSession } from '../services/pokerService';

const OPTIONS = [1, 2, 3, 5, 8, 13, 21, 'Abstain'];

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    const [room, setRoom] = useState<any>(null);
    const [name, setName] = useState(localStorage.getItem('poker-name') || '');
    const [ticketInput, setTicketInput] = useState('');

    const isAdmin = room?.adminToken === localStorage.getItem(`admin_${roomId}`);

    useEffect(() => {
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
            if (docSnap.exists()) setRoom(docSnap.data());
            else navigate('/');
        });
        return unsub;
    }, [roomId, navigate]);

    const calculateMean = () => {
        const validVotes = Object.values(room?.votes || {})
            .map((v: any) => v.vote)
            .filter((v) => typeof v === 'number');
        if (validVotes.length === 0) return 0;
        return (validVotes.reduce((a: number, b: number) => a + b, 0) / validVotes.length).toFixed(1);
    };

    if (!room) return <div className="h-screen bg-zinc-950" />;

    if (room.votes[name] === undefined) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
                <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 w-96 text-center shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-red-500 uppercase tracking-widest">Join Session</h2>
                    <input
                        className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded mb-4 outline-none focus:border-red-500 text-center"
                        placeholder="Enter your callsign..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button
                        onClick={() => joinPokerTable(roomId!, name)}
                        className="w-full py-3 bg-red-600 rounded font-bold uppercase hover:bg-red-500 transition-colors"
                    >
                        Enter Table
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8 flex flex-col font-sans">
            {/* Header & Controls */}
            <div className="flex justify-between items-start mb-12 bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg">
                <div>
                    <h2 className="text-zinc-400 uppercase tracking-widest text-sm mb-1">Current Objective</h2>
                    <h1 className="text-3xl font-black text-white">{room.currentTicket || 'Awaiting Orders...'}</h1>
                </div>

                {isAdmin && (
                    <div className="flex gap-4 items-end">
                        <div className="flex flex-col">
                            <input
                                className="p-2 bg-zinc-950 rounded border border-zinc-800 outline-none focus:border-red-500 text-sm"
                                placeholder="Ticket ID..."
                                value={ticketInput}
                                onChange={(e) => setTicketInput(e.target.value)}
                            />
                        </div>
                        <button onClick={() => startNewPoll(roomId!, ticketInput, room.votes)} className="px-4 py-2 bg-emerald-600 rounded font-bold text-sm uppercase hover:bg-emerald-500 transition-colors">Start Poll</button>
                        <button onClick={() => revealAllVotes(roomId!)} className="px-4 py-2 bg-blue-600 rounded font-bold text-sm uppercase hover:bg-blue-500 transition-colors">Show Votes</button>
                        <button onClick={() => { deleteSession(roomId!); navigate('/'); }} className="px-4 py-2 bg-red-600/20 text-red-400 rounded font-bold text-sm uppercase hover:bg-red-600/40 transition-colors">End Session</button>
                    </div>
                )}
            </div>

            {/* The Virtual Table */}
            <div className="flex-1 flex items-center justify-center relative mb-12">
                <div className="w-[600px] h-[300px] bg-zinc-900 rounded-full border-4 border-zinc-800 flex flex-col items-center justify-center shadow-2xl relative">

                    {room.status === 'revealed' ? (
                        <div className="text-center">
                            <div className="text-zinc-500 text-sm tracking-widest uppercase mb-2">Team Average</div>
                            <div className="text-6xl font-black text-emerald-500">{calculateMean()}</div>
                        </div>
                    ) : (
                        <div className="text-zinc-500 text-xl font-bold uppercase tracking-widest animate-pulse">
                            {room.status === 'voting' ? 'Estimation in progress' : 'Standby'}
                        </div>
                    )}

                    <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-12 -m-16">
                        {Object.entries(room.votes).map(([user, data]: any) => (
                            <div key={user} className="flex flex-col items-center z-10">
                                <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-black bg-zinc-950 transition-colors duration-300
                  ${data.vote !== null ? 'border-emerald-500 text-emerald-400' : 'border-zinc-700 text-zinc-700'}`}>
                                    {room.status === 'revealed' ? data.vote
                                        : (isAdmin && data.vote !== null) ? data.vote
                                            : data.vote !== null ? '✓' : '?'}
                                </div>
                                <div className="mt-2 font-bold text-xs uppercase bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 text-zinc-300">{user}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Voting Deck */}
            {room.status === 'voting' && (
                <div className="flex justify-center gap-3 mt-auto flex-wrap">
                    {OPTIONS.map(val => (
                        <button key={val} onClick={() => submitVote(roomId!, name, val)}
                                className="h-20 px-6 bg-zinc-900 border border-zinc-800 rounded-lg text-xl font-bold hover:border-red-500 hover:-translate-y-2 transition-all shadow-lg text-zinc-300 hover:text-white">
                            {val}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}