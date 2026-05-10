import { db } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const createNewRoom = async (): Promise<string> => {
    console.log("createNewRoom: Generating ID...");
    const roomId = generateId();
    console.log("createNewRoom: Generated ID:", roomId);
    
    let adminToken = "fallback-token";
    try {
        adminToken = crypto.randomUUID();
    } catch (e) {
        console.warn("crypto.randomUUID() failed, using fallback.", e);
        adminToken = Math.random().toString(36) + Date.now().toString(36);
    }
    
    console.log("createNewRoom: Saving admin token...");
    localStorage.setItem(`admin_${roomId}`, adminToken);

    console.log("createNewRoom: Calling setDoc...");
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firebase write timed out after 5 seconds. This is usually caused by missing/strict Firestore Security Rules, or the Firebase project isn't fully configured/reachable.")), 5000)
    );

    try {
        await Promise.race([
            setDoc(doc(db, "rooms", roomId), {
                adminToken,
                currentTicket: null,
                status: 'waiting',
                createdAt: Date.now(),
                votes: {}
            }),
            timeoutPromise
        ]);
        console.log("createNewRoom: setDoc completed successfully.");
    } catch (err) {
        console.error("createNewRoom: setDoc threw an error!", err);
        throw err;
    }

    return roomId;
};

export const joinPokerTable = async (roomId: string, name: string, avatarUrl: string) => {
    localStorage.setItem('poker-name', name);
    localStorage.setItem('poker-avatar', avatarUrl);
    await updateDoc(doc(db, "rooms", roomId), {
        [`votes.${name}`]: { vote: null, avatar: avatarUrl }
    });
};

export const submitVote = async (roomId: string, name: string, value: number | string) => {
    await updateDoc(doc(db, "rooms", roomId), {
        [`votes.${name}.vote`]: value
    });
};

export const startNewPoll = async (roomId: string, nextTicket: string, currentRoomData: any) => {
    const { votes } = currentRoomData;

    const resetVotes = Object.keys(votes).reduce((acc: any, key) => {
        acc[key] = { vote: null, avatar: votes[key]?.avatar || '' };
        return acc;
    }, {});

    await updateDoc(doc(db, "rooms", roomId), {
        currentTicket: nextTicket,
        status: 'voting',
        votes: resetVotes
    });
};

export const revealAllVotes = async (roomId: string, currentRoomData: any, medianResult: number | string) => {
    if (currentRoomData.status === 'revealed') return;

    const { currentTicket, votes, history = [] } = currentRoomData;
    let updatedHistory = [...history];
    
    if (currentTicket) {
        const validVotes = Object.values(votes).map((v: any) => v.vote).filter(v => typeof v === 'number') as number[];
        
        updatedHistory.push({
            ticket: currentTicket,
            result: medianResult,
            timestamp: Date.now(),
            alignment: validVotes.length > 1 ? Math.max(0, 100 - (Math.max(...validVotes) - Math.min(...validVotes)) * 10) : 100
        });
    }

    await updateDoc(doc(db, "rooms", roomId), { 
        status: 'revealed',
        history: updatedHistory
    });
};

export const deleteSession = async (roomId: string) => {
    await deleteDoc(doc(db, "rooms", roomId));
};