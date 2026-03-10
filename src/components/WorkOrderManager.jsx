import React, { useState } from 'react';
import { Clipboard, Search, CheckCircle, AlertCircle, Barcode } from 'lucide-react';

/**
 * WorkOrderManager
 * =====================================================
 * Handles selection or scanning of Job IDs/Work Orders.
 * Essential for traceability in industrial environments.
 * =====================================================
 */
const WorkOrderManager = ({ onSelect, currentWorkOrder }) => {
    const [inputValue, setInputValue] = useState(currentWorkOrder || '');
    const [isConfirmed, setIsConfirmed] = useState(!!currentWorkOrder);

    const handleConfirm = () => {
        if (inputValue.trim()) {
            setIsConfirmed(true);
            onSelect(inputValue.trim());
        }
    };

    const handleReset = () => {
        setIsConfirmed(false);
        setInputValue('');
        onSelect('');
    };

    return (
        <div style={{
            padding: '16px',
            backgroundColor: '#111',
            borderRadius: '12px',
            border: `1px solid ${isConfirmed ? '#4CAF50' : '#333'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            width: '100%',
            transition: 'all 0.3s ease'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: isConfirmed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0, 120, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {isConfirmed ? <CheckCircle size={20} color="#4CAF50" /> : <Clipboard size={20} color="#0078d4" />}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Tracking Identity
                </div>
                {isConfirmed ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>{inputValue}</span>
                        <span style={{ color: '#4CAF50', fontSize: '0.8rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>ACTIVE</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} color="#666" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                                placeholder="SCAN OR TYPE WORK ORDER (JOB ID)"
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 10px 35px',
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    textTransform: 'uppercase'
                                }}
                            />
                        </div>
                        <button
                            onClick={handleConfirm}
                            disabled={!inputValue.trim()}
                            style={{
                                padding: '0 20px',
                                backgroundColor: '#0078d4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: !inputValue.trim() ? 0.5 : 1
                            }}
                        >
                            CONFIRM
                        </button>
                    </div>
                )}
            </div>

            {isConfirmed && (
                <button
                    onClick={handleReset}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        color: '#666',
                        border: '1px solid #333',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                    }}
                >
                    CHANGE
                </button>
            )}

            {!isConfirmed && (
                <div style={{ color: '#444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Barcode size={14} />
                    SCANNER READY
                </div>
            )}
        </div>
    );
};

export default WorkOrderManager;
