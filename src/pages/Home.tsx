import { useNavigate } from 'react-router-dom';
import { createNewRoom } from '../services/pokerService';

export default function Home() {
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        try {
            console.log("Create room...");
            const newRoomId = await createNewRoom();
            navigate(`/room/${newRoomId}`);
        } catch (error: any) {
            console.error("Failed to create room:", error);
            alert(`Backend Error: ${error.message}\nCheck your console for details.`);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50"></div>
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-900/10 blur-[100px] rounded-full"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl px-6">
                <div className="inline-block px-3 py-1 border border-red-500/30 bg-red-500/10 text-red-400 text-xs tracking-[0.3em] font-bold uppercase mb-8 val-clip scanline">
                    Welcome to...
                </div>

                <h1 className="text-7xl md:text-8xl font-display font-black mb-4 text-white uppercase tracking-tighter drop-shadow-lg leading-none">
                    Planning <span className="text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-red-700 text-glow">Poker</span>
                </h1>
                
                <p className="text-zinc-400 mb-12 tracking-widest text-sm uppercase max-w-md mx-auto leading-relaxed border-l-2 border-red-600/50 pl-4 text-left">
                    Initiate a poker session. Discuss the ticket. Estimate story points.
                </p>

                <div className="relative group">
                    {/* Decorative outer box */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-800 rounded-sm blur opacity-25 group-hover:opacity-60 transition duration-500 group-hover:duration-200"></div>
                    
                    <button
                        onClick={handleCreateRoom}
                        className="relative flex items-center justify-center px-12 py-5 bg-zinc-900 text-white font-bold text-lg uppercase tracking-widest val-clip border border-zinc-700 hover:border-red-500 hover:bg-zinc-800 transition-all active:scale-95 group-hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            Create New Room
                            <svg className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}