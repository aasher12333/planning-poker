import { db } from '../firebase';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const createNewRoom = async (): Promise<string> => {
    const roomId = generateId();
    const adminToken = crypto.randomUUID();

    localStorage.setItem(`admin_${roomId}`, adminToken);

    await setDoc(doc(db, "rooms", roomId), {
        adminToken,
        currentTicket: null,
        status: 'waiting',
        createdAt: Date.now(),
        votes: {}
    });

    return roomId;
};

export const joinPokerTable = async (roomId: string, name: string) => {
    localStorage.setItem('poker-name', name);
    await updateDoc(doc(db, "rooms", roomId), {
        [`votes.${name}`]: { vote: null }
    });
};

export const submitVote = async (roomId: string, name: string, value: number | string) => {
    await updateDoc(doc(db, "rooms", roomId), {
        [`votes.${name}.vote`]: value
    });
};

export const startNewPoll = async (roomId: string, ticketName: string, currentVotes: any) => {
    const resetVotes = Object.keys(currentVotes || {}).reduce((acc: any, key) => {
        acc[key] = { vote: null };
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