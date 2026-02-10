import React, { useState, useEffect, useRef } from 'react';

const SUGGESTIONS = [
    // Joints
    { label: 'nose', type: 'joint' },
    { label: 'left_eye', type: 'joint' },
    { label: 'right_eye', type: 'joint' },
    { label: 'left_ear', type: 'joint' },
    { label: 'right_ear', type: 'joint' },
    { label: 'left_shoulder', type: 'joint' },
    { label: 'right_shoulder', type: 'joint' },
    { label: 'left_elbow', type: 'joint' },
    { label: 'right_elbow', type: 'joint' },
    { label: 'left_wrist', type: 'joint' },
    { label: 'right_wrist', type: 'joint' },
    { label: 'left_hip', type: 'joint' },
    { label: 'right_hip', type: 'joint' },
    { label: 'left_knee', type: 'joint' },
    { label: 'right_knee', type: 'joint' },
    { label: 'left_ankle', type: 'joint' },
    { label: 'right_ankle', type: 'joint' },

    // Properties
    { label: '.x', type: 'prop' },
    { label: '.y', type: 'prop' },
    { label: '.confidence', type: 'prop' },

    // Functions
    { label: 'dist(', type: 'func' },
    { label: 'angle(', type: 'func' },
    { label: 'abs(', type: 'func' },
    { label: 'min(', type: 'func' },
    { label: 'max(', type: 'func' },

    // Logic
    { label: 'AND', type: 'logic' },
    { label: 'OR', type: 'logic' },
    { label: 'NOT', type: 'logic' }
];

const ScriptAutoComplete = ({ value, onChange, placeholder, style }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const textareaRef = useRef(null);

    const handleKeyDown = (e) => {
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertSuggestion(suggestions[selectedIndex].label);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChange(val);
        setCursorPosition(pos);

        // Logic to find current word
        const textBeforeCursor = val.slice(0, pos);
        const words = textBeforeCursor.split(/[\s,()]+/);
        const currentWord = words[words.length - 1];

        if (currentWord.length > 0) {
            const matches = SUGGESTIONS.filter(s =>
                s.label.toLowerCase().startsWith(currentWord.toLowerCase()) &&
                s.label !== currentWord
            );
            setSuggestions(matches);
            setShowSuggestions(matches.length > 0);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const insertSuggestion = (suggestion) => {
        const val = value;
        const pos = textareaRef.current.selectionStart;
        const textBeforeCursor = val.slice(0, pos);
        const textAfterCursor = val.slice(pos);

        const words = textBeforeCursor.split(/[\s,()]+/);
        const currentWord = words[words.length - 1];

        const newTextBefore = textBeforeCursor.slice(0, -currentWord.length) + suggestion;
        const newValue = newTextBefore + textAfterCursor;

        onChange(newValue);
        setShowSuggestions(false);

        // Restore focus and move cursor
        setTimeout(() => {
            const newPos = newTextBefore.length;
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newPos, newPos);
        }, 0);
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                style={{
                    ...style,
                    fontFamily: 'monospace',
                }}
            />

            {showSuggestions && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    backgroundColor: '#1f2937',
                    border: '1px solid #4b5563',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    zIndex: 50,
                    minWidth: '200px',
                    marginBottom: '4px'
                }}>
                    {suggestions.map((s, idx) => (
                        <div
                            key={s.label}
                            onClick={() => insertSuggestion(s.label)}
                            style={{
                                padding: '6px 12px',
                                cursor: 'pointer',
                                backgroundColor: idx === selectedIndex ? '#3b82f6' : 'transparent',
                                color: idx === selectedIndex ? 'white' : '#d1d5db',
                                fontSize: '0.85rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span>{s.label}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>{s.type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScriptAutoComplete;
