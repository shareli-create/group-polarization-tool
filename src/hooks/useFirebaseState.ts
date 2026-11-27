import { useState, useEffect } from 'react';
import { doc, onSnapshot, runTransaction, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

interface AppState {
  phase: string;
  chessResponses: any[];
  medicalResponses: any[];
  groups: any[];
}

const INITIAL_STATE: AppState = {
  phase: 'INDIVIDUAL_INPUT',
  chessResponses: [],
  medicalResponses: [],
  groups: []
};

// The whole class shares one record. A write must never replace it with an out-of-date copy:
// two students submitting at the same moment would erase each other.
const SESSION_ID = 'current';

// For testing only (npm run dev): ?session=NAME uses a separate record, so tests never touch the class data.
const sessionId = (): string =>
  ((import.meta as any).env?.DEV && new URLSearchParams(window.location.search).get('session')) || SESSION_ID;

const SAVE_ERROR = 'השמירה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.';

const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const useFirebaseState = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'sessions', sessionId());

    const unsubscribe = onSnapshot(docRef,
      (snap) => {
        if (snap.exists()) {
          setState({ ...INITIAL_STATE, ...(snap.data() as AppState) });
        } else {
          // Create the record only if it is still missing (never overwrite one that appeared meanwhile).
          runTransaction(db, async (tx) => {
            if (!(await tx.get(docRef)).exists()) tx.set(docRef, INITIAL_STATE);
          }).catch(error => console.error('Error creating session:', error));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Professor actions and group decisions: read the latest record and change it inside a
  // transaction, so anything written in between (for example a late student) is kept.
  const updateState = async (updater: (current: any) => any): Promise<boolean> => {
    try {
      const docRef = doc(db, 'sessions', sessionId());
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        const current = snap.exists() ? { ...INITIAL_STATE, ...(snap.data() as AppState) } : INITIAL_STATE;
        tx.set(docRef, clean(updater(current)));
      });
      return true;
    } catch (error) {
      console.error('Error updating state:', error);
      alert(SAVE_ERROR);
      return false;
    }
  };

  // A student's answers are added to the lists on the server (arrayUnion), never by rewriting
  // the lists, so students who submit at the same moment cannot overwrite each other.
  const addResponses = async (chess: any, medical: any): Promise<boolean> => {
    try {
      const docRef = doc(db, 'sessions', sessionId());
      await setDoc(docRef, {
        chessResponses: arrayUnion(clean(chess)),
        medicalResponses: arrayUnion(clean(medical))
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving answers:', error);
      alert(SAVE_ERROR);
      return false;
    }
  };

  return { state, updateState, addResponses, loading };
};
