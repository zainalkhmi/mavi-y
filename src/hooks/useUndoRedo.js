import { useState, useCallback } from 'react';

export const useUndoRedo = (initialState = {}) => {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const set = useCallback((newState) => {
        setHistory((prev) => {
            const newHistory = prev.slice(0, currentIndex + 1);
            newHistory.push(newState);
            // Limit history to 50 steps to prevent memory issues
            if (newHistory.length > 50) {
                newHistory.shift();
                setCurrentIndex(prevIndex => prevIndex); // index shifts effectively by -1 but count stays same, so just length-1
                return newHistory;
            }
            return newHistory;
        });
        setCurrentIndex((prev) => {
            // If we were at limit, index stays same (last element), else increments
            return history.length >= 50 ? 49 : prev + 1;
        });
    }, [currentIndex, history.length]);

    const undo = useCallback(() => {
        setCurrentIndex((prev) => {
            if (prev > 0) return prev - 1;
            return prev;
        });
    }, []);

    const redo = useCallback(() => {
        setCurrentIndex((prev) => {
            if (prev < history.length - 1) return prev + 1;
            return prev;
        });
    }, [history.length]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;
    const currentState = history[currentIndex];

    return {
        state: currentState,
        set,
        undo,
        redo,
        canUndo,
        canRedo,
        history
    };
};
