import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ייבא את הטיפוסים מ-App במקום להגדיר מחדש
interface AppState {
  phase: string;  // שינוי זה חשוב - תשאיר string במקום Phase
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

export const useFirebaseState = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'sessions', 'current');
    
    const unsubscribe = onSnapshot(docRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setState(data as AppState);
        } else {
          setDoc(docRef, INITIAL_STATE);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateState = async (newState: any) => {  // שינוי ל-any
    try {
      const docRef = doc(db, 'sessions', 'current');
      await setDoc(docRef, JSON.parse(JSON.stringify(newState)));
    } catch (error) {
      console.error("Error updating state:", error);
    }
  };

  return { state, updateState, loading };
};