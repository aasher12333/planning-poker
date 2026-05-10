import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { joinPokerTable, submitVote, startNewPoll, revealAllVotes, deleteSession } from '../services/pokerService';
import { motion, AnimatePresence } from 'framer-motion';

const OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 'Abstain'];
const AVATAR_SEEDS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];

export default function Room() {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();

    const [room, setRoom] = useState<any>(null);
    const [name, setName] = useState(localStorage.getItem('poker-name') || '');
    const [selectedAvatar, setSelectedAvatar] = useState(localStorage.getItem('poker-avatar') || `https://api.dicebear.com/7.x/bottts/svg?seed=Alpha`);
    const [ticketInput, setTicketInput] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const isAdmin = room?.adminToken === localStorage.getItem(`admin_${roomId}`);

    useEffect(() => {
        if (!roomId) return;
        const unsub = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
            if (docSnap.exists()) setRoom(docSnap.data());
            else navigate('/');
        });
        return unsub;
    }, [roomId, navigate]);

    const calculateMedian = () => {
        const validVotes = Object.values(room?.votes || {})
            .map((v: any) => v.vote)
            .filter((v) => typeof v === 'number')
            .sort((a, b) => a - b);
        
        if (validVotes.length === 0) return 0;
        
        let median;
        const mid = Math.floor(validVotes.length / 2);
        if (validVotes.length % 2 !== 0) {
            median = validVotes[mid];
        } else {
            median = (validVotes[mid - 1] + validVotes[mid]) / 2;
        }

        const numOptions = OPTIONS.filter(o => typeof o === 'number') as number[];
        const closest = numOptions.reduce((prev, curr) => 
            Math.abs(curr - median) < Math.abs(prev - median) ? curr : prev
        );
        return closest;
    };

    if (!room) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-none animate-spin"></div></div>;

    if (room.votes[name] === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50"></div>
                <div className="bg-zinc-900 p-8 md:p-10 border border-zinc-800 w-full max-w-md text-center shadow-2xl rounded-none relative z-10 mx-4">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-600 opacity-50"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-600 opacity-50"></div>
                    
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-white">Identify</h2>
                    <p className="text-zinc-500 text-xs tracking-widest uppercase mb-6 font-mono">Select your tactical avatar</p>
                    
                    {/* Avatar Selection Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {AVATAR_SEEDS.map((seed) => {
                            const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
                            const isSelected = selectedAvatar === url;
                            return (
                                <button 
                                    key={seed}
                                    onClick={() => setSelectedAvatar(url)}
                                    className={`relative p-2 border transition-all rounded-none ${isSelected ? 'border-red-600 bg-red-600/10 scale-105' : 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-500 hover:bg-zinc-800'}`}
                                >
                                    <img src={url} alt={seed} className="w-full h-16 object-contain" />
                                    {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-none"></div>}
                                </button>
                            );
                        })}
                    </div>

                    <input
                        className="w-full p-4 bg-zinc-950 border border-zinc-700 mb-6 outline-none focus:border-red-600 text-center uppercase tracking-widest font-bold transition-all text-white placeholder-zinc-700 rounded-none"
                        placeholder="Rioter Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && name.trim() && joinPokerTable(roomId!, name.trim(), selectedAvatar)}
                    />
                    <button
                        onClick={() => name.trim() && joinPokerTable(roomId!, name.trim(), selectedAvatar)}
                        disabled={!name.trim()}
                        className="w-full py-4 bg-red-600 font-bold uppercase tracking-widest hover:bg-red-500 transition-all rounded-none disabled:opacity-50 disabled:hover:bg-red-600 active:scale-95"
                    >
                        Deploy
                    </button>
                </div>
            </div>
        );
    }
// Calculate rectangular positions
    const getRectPosition = (index: number, total: number, w: number, h: number) => {
        if (total === 1) return { x: 0, y: -h/2 };
        const perimeter = 2 * w + 2 * h;
        const d = ((index + 0.5) / total) * perimeter;
        
        if (d <= w) return { x: -w/2 + d, y: -h/2 }; // Top
        if (d <= w + h) return { x: w/2, y: -h/2 + (d - w) }; // Right
        if (d <= 2*w + h) return { x: w/2 - (d - w - h), y: h/2 }; // Bottom
        return { x: -w/2, y: h/2 - (d - 2*w - h) }; // Left
    };

    // Outlier calculation
    const allValidVotes = Object.values(room.votes).map((v: any) => v.vote).filter(v => typeof v === 'number') as number[];
    const minVote = allValidVotes.length > 0 ? Math.min(...allValidVotes) : null;
    const maxVote = allValidVotes.length > 0 ? Math.max(...allValidVotes) : null;
    const hasDisagreement = minVote !== maxVote;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 flex flex-col relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50"></div>

            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 bg-zinc-900 p-6 border border-zinc-800 shadow-lg rounded-none relative z-10">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                
                <div className="pl-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-red-600 rounded-none animate-pulse"></div>
                        <h2 className="text-zinc-500 uppercase tracking-[0.2em] text-xs font-mono">Current Ticket</h2>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
                        {room.currentTicket || 'AWAITING ORDERS'}
                    </h1>
                </div>

                {isAdmin && (
                    <div className="flex flex-wrap gap-3 items-center bg-zinc-950 p-3 border border-zinc-800 rounded-none">
                        <input
                            className="w-40 p-2.5 bg-zinc-900 border border-zinc-700 outline-none focus:border-red-600 text-sm font-bold uppercase tracking-wider text-white placeholder-zinc-600 transition-colors rounded-none"
                            placeholder="TICKET ID..."
                            value={ticketInput}
                            onChange={(e) => setTicketInput(e.target.value)}
                        />
                        <button 
                            onClick={() => startNewPoll(roomId!, ticketInput, room)} 
                            className="px-5 py-2.5 bg-zinc-800 border border-zinc-600 text-white font-bold text-xs uppercase tracking-widest hover:border-red-600 hover:bg-zinc-700 transition-all rounded-none"
                        >
                            Start Poll
                        </button>
                        <button 
                            onClick={() => revealAllVotes(roomId!, room, calculateMedian())} 
                            className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-red-500 transition-all rounded-none"
                        >
                            Show Votes
                        </button>
                        <button 
                            onClick={() => setShowHistory(true)} 
                            className="px-5 py-2.5 bg-zinc-800 border border-zinc-600 text-white font-bold text-xs uppercase tracking-widest hover:border-zinc-400 transition-all rounded-none"
                        >
                            History
                        </button>
                        <button 
                            onClick={() => { deleteSession(roomId!); navigate('/'); }} 
                            className="px-4 py-2.5 bg-transparent text-zinc-500 hover:text-red-600 font-bold text-xs uppercase tracking-widest transition-colors ml-auto rounded-none"
                        >
                            End Session
                        </button>
                    </div>
                )}
            </div>

            {/* The Virtual Table */}
            <div className="flex-1 flex items-center justify-center relative mb-12 z-10 w-full max-w-5xl mx-auto mt-10">
                <div className="relative flex items-center justify-center w-full h-[300px] md:h-[400px]">
                    
                    {/* Tactical Rectangular Table */}
                    <div className="absolute w-[280px] h-[180px] md:w-[600px] md:h-[260px] bg-zinc-900 border border-red-600/30 rounded-sm flex items-center justify-center">
                        {/* Center Display / Hologram Base */}
                        <div className="relative z-20 flex flex-col items-center justify-center w-48 h-32 bg-zinc-950 border border-zinc-800 shadow-inner rounded-none">
                            {room.status === 'revealed' ? (
                                <div className="text-center animate-in fade-in zoom-in duration-300">
                                    <div className="text-zinc-500 text-[10px] font-bold tracking-[0.2em] uppercase mb-1 font-mono">Result (Median)</div>
                                    <div className="text-6xl font-black text-white text-glow font-mono">{calculateMedian()}</div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className={`text-xs font-bold uppercase tracking-widest font-mono ${room.status === 'voting' ? 'text-red-600 animate-pulse' : 'text-zinc-600'}`}>
                                        {room.status === 'voting' ? 'SCANNING' : 'STANDBY'}
                                    </div>
                                    {room.status === 'voting' && (
                                        <div className="mt-4 flex gap-1 justify-center">
                                            <div className="w-1.5 h-1.5 bg-red-600 rounded-none animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-red-600 rounded-none animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-red-600 rounded-none animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Players Orbiting the Table */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {Object.entries(room.votes).map(([user, data]: any, index, arr) => {
                            const isMobile = window.innerWidth < 768;
                            const tableW = isMobile ? 320 : 660; 
                            const tableH = isMobile ? 220 : 320;
                            
                            const pos = getRectPosition(index, arr.length, tableW, tableH);
                            const hasUserVoted = data.vote !== null;
                            const isCurrentUser = user === name;
                            
                            let frameClasses = "bg-zinc-950 border border-zinc-800 text-zinc-700";
                            
                            if (hasUserVoted && room.status !== 'revealed') {
                                frameClasses = "bg-zinc-900 border-2 border-red-600 text-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]";
                            } else if (room.status === 'revealed') {
                                const isOutlier = hasDisagreement && (data.vote === minVote || data.vote === maxVote);
                                if (isOutlier) {
                                    frameClasses = "bg-zinc-900 border-2 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse";
                                } else {
                                    frameClasses = "bg-zinc-800 border-2 border-zinc-600 text-white";
                                }
                            }

                            return (
                                <div 
                                    key={user} 
                                    className="absolute flex flex-col items-center z-30 transition-all duration-700 ease-out"
                                    style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
                                >
                                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-none flex flex-col items-center justify-center font-mono font-black transition-all duration-300 relative ${frameClasses}`}>
                                        {/* Avatar or Vote result */}
                                        {room.status === 'revealed' ? (
                                            <span className="text-2xl">{data.vote}</span>
                                        ) : (isAdmin && hasUserVoted) ? (
                                            <span className="text-2xl opacity-50">{data.vote}</span>
                                        ) : (
                                            <img 
                                                src={data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user}`} 
                                                alt={user} 
                                                className={`w-10 h-10 md:w-12 md:h-12 object-contain opacity-80 ${hasUserVoted ? 'grayscale-0' : 'grayscale'}`} 
                                            />
                                        )}
                                    </div>
                                    <div className={`mt-2 font-bold text-[10px] md:text-xs uppercase px-3 py-1 bg-zinc-950 border whitespace-nowrap rounded-none
                                        ${isCurrentUser ? 'border-red-600 text-white' : 'border-zinc-800 text-zinc-400'}`}>
                                        {user}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Voting Deck */}
            {room.status === 'voting' && (
                <div className="relative z-20 mt-auto bg-zinc-900 p-4 md:p-8 border-t border-zinc-800 -mx-4 md:-mx-8 -mb-4 md:-mb-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-4 text-center font-mono">
                            Select Story Points
                        </div>
                        <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
                            {OPTIONS.map(val => {
                                const isSelected = room.votes[name]?.vote === val;
                                return (
                                    <button 
                                        key={val} 
                                        onClick={() => submitVote(roomId!, name, val)}
                                        className={`group relative h-16 md:h-24 px-4 md:px-6 flex items-center justify-center font-mono font-black text-lg md:text-2xl transition-all duration-200 rounded-none
                                            ${isSelected 
                                                ? 'bg-red-600 text-white scale-110 shadow-[0_10px_30px_rgba(220,38,38,0.4)] z-10 border border-red-500' 
                                                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-red-600 hover:bg-zinc-900 hover:text-white hover:-translate-y-2'}`}
                                    >
                                        {val}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Tactical History Drawer */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                            onClick={() => setShowHistory(false)}
                        />
                        <motion.div 
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-zinc-950 border-l border-red-600/30 z-50 p-6 flex flex-col shadow-2xl overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
                                <h2 className="text-xl font-black uppercase tracking-tighter text-white">Session History</h2>
                                <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {(!room.history || room.history.length === 0) ? (
                                <div className="text-zinc-500 font-mono text-sm text-center mt-10">NO PREVIOUS DATA</div>
                            ) : (
                                <div className="space-y-4">
                                    {[...room.history].reverse().map((entry: any, i: number) => (
                                        <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-none">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-zinc-500 text-[10px] uppercase font-mono tracking-widest mb-1">Ticket ID</div>
                                                    <div className="font-black text-white uppercase tracking-tight">{entry.ticket}</div>
                                                </div>
                                                <div className="bg-red-600 text-white px-3 py-1 font-mono font-bold text-sm rounded-none border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                                                    {entry.result}
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4">
                                                <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
                                                    <span>Alignment Score</span>
                                                    <span className={entry.alignment >= 80 ? 'text-emerald-500' : entry.alignment >= 50 ? 'text-yellow-500' : 'text-red-500'}>
                                                        {entry.alignment}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-zinc-950 rounded-none overflow-hidden">
                                                    <div 
                                                        className={`h-full ${entry.alignment >= 80 ? 'bg-emerald-500' : entry.alignment >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                        style={{ width: `${entry.alignment}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}