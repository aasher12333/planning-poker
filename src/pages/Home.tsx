import { useNavigate } from 'react-router-dom';
import { createNewRoom } from '../services/pokerService';

export default function Home() {
    const navigate = useNavigate();

    const handleCreateRoom = async () => {
        try {
            console.log("Attempting to create room...");
            const newRoomId = await createNewRoom();
            navigate(`/room/${newRoomId}`);
        } catch (error: any) {
            console.error("Failed to create room:", error);
            alert(`Backend Error: ${error.message}\nCheck your console for details.`);
        }
    };

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white font-sans">
            <h1 className="text-6xl font-black mb-2 text-red-500 uppercase tracking-tighter drop-shadow-lg">
                Planning Poker
            </h1>
            <p className="text-zinc-400 mb-10 tracking-widest text-sm uppercase">
                Initiate a session. Secure the objective.
            </p>
            <button
                onClick={handleCreateRoom}
                className="px-10 py-4 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-500 hover:-translate-y-1 transition-all border-b-4 border-red-800 active:translate-y-0 active:border-b-0"
            >
                Create New Room
            </button>
        </div>
    );
}