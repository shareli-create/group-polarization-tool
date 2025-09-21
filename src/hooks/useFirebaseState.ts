import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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

export const useFirebaseState = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'sessions', 'current');
    
    const unsubscribe = onSnapshot(docRef, 
      (doc) => {
        if (doc.exists()) {
          setState(doc.data() as AppState);
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

  const updateState = async (newState: AppState) => {
    try {
      const docRef = doc(db, 'sessions', 'current');
      await setDoc(docRef, newState);
    } catch (error) {
      console.error("Error updating state:", error);
    }
  };

  return { state, updateState, loading };
};