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

export const startNewPoll = async (roomId: string, ticketName: string, currentVotes: any) => {
    const resetVotes = Object.keys(currentVotes || {}).reduce((acc: any, key) => {
        acc[key] = { vote: null, avatar: currentVotes[key]?.avatar || '' };
        return acc;
    }, {});

    await updateDoc(doc(db, "rooms", roomId), {
        currentTicket: ticketName,
        status: 'voting',
        votes: resetVotes
    });
};

export const revealAllVotes = async (roomId: string) => {
    await updateDoc(doc(db, "rooms", roomId), { status: 'revealed' });
};

export const deleteSession = async (roomId: string) => {
    await deleteDoc(doc(db, "rooms", roomId));
};