import { useState, useCallback } from 'react';

const useHistory = (initialState) => {
    const [state, setState] = useState(initialState);
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    const set = useCallback((newState) => {
        setPast((prev) => [...prev, state]);
        setState(newState);
        setFuture([]);
    }, [state]);

    const undo = useCallback(() => {
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setFuture((prev) => [state, ...prev]);
        setState(previous);
        setPast(newPast);
    }, [past, state]);

    const redo = useCallback(() => {
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        setPast((prev) => [...prev, state]);
        setState(next);
        setFuture(newFuture);
    }, [future, state]);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    return [state, set, undo, redo, canUndo, canRedo];
};

export default useHistory;
