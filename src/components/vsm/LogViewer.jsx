import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronRight, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const LogViewer = ({ logs }) => {
    const { t } = useLanguage();
    const [filterLevel, setFilterLevel] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIndices, setExpandedIndices] = useState(new Set());

    const filteredLogs = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        return logs.filter(log => {
            // Filter by level
            if (filterLevel !== 'all' && log.level !== filterLevel) return false;

            // Filter by search query
            if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            return true;
        });
    }, [logs, filterLevel, searchQuery]);

    const toggleExpand = (index) => {
        const newExpanded = new Set(expandedIndices);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedIndices(newExpanded);
    };

    const handleExportLogs = () => {
        const logText = logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
        }).join('\n');

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getLogIcon = (level) => {
        switch (level) {
            case 'success':
                return <CheckCircle size={16} color="#4caf50" />;
            case 'error':
                return <AlertCircle size={16} color="#c50f1f" />;
            case 'warn':
                return <AlertTriangle size={16} color="#ff9800" />;
            default:
                return <Info size={16} color="#2196f3" />;
        }
    };

    const getLogColor = (level) => {
        switch (level) {
            case 'success':
                return '#4caf50';
            case 'error':
                return '#c50f1f';
            case 'warn':
                return '#ff9800';
            default:
                return '#2196f3';
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 1000) return t('vsm.logs.justNow');
        if (diff < 60000) return t('vsm.logs.secondsAgo').replace('{{count}}', Math.floor(diff / 1000));
        if (diff < 3600000) return t('vsm.logs.minutesAgo').replace('{{count}}', Math.floor(diff / 60000));

        return date.toLocaleTimeString();
    };

    if (!logs || logs.length === 0) {
        return (
            <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#888',
                fontSize: '0.9rem'
            }}>
                {t('vsm.logs.noLogs')}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
                    <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <input
                        type="text"
                        placeholder={t('vsm.logs.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 8px 8px 35px',
                            backgroundColor: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                {/* Filter */}
                <div style={{ position: 'relative' }}>
                    <Filter size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        style={{
                            padding: '8px 35px 8px 35px',
                            backgroundColor: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">{t('vsm.logs.all')}</option>
                        <option value="info">{t('vsm.logs.info')}</option>
                        <option value="success">{t('vsm.logs.success')}</option>
                        <option value="warn">{t('vsm.logs.warn')}</option>
                        <option value="error">{t('vsm.logs.error')}</option>
                    </select>
                </div>

                {/* Export */}
                <button
                    onClick={handleExportLogs}
                    style={{
                        padding: '8px 15px',
                        backgroundColor: '#2196f3',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Download size={16} />
                    {t('vsm.logs.export')}
                </button>
            </div>

            {/* Log Count */}
            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                {t('vsm.logs.showingLogs').replace('{{count}}', filteredLogs.length).replace('{{total}}', logs.length)}
            </div>

            {/* Logs List */}
            <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #333',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)'
            }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                        {t('vsm.logs.noMatch')}
                    </div>
                ) : (
                    filteredLogs.map((log, index) => {
                        const isExpanded = expandedIndices.has(index);
                        const color = getLogColor(log.level);

                        return (
                            <div
                                key={index}
                                style={{
                                    borderBottom: index < filteredLogs.length - 1 ? '1px solid #333' : 'none',
                                    padding: '12px 15px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    background: isExpanded ? 'rgba(33, 150, 243, 0.05)' : 'transparent'
                                }}
                                onClick={() => toggleExpand(index)}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? 'rgba(33, 150, 243, 0.05)' : 'transparent'}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    {/* Expand Icon */}
                                    <div style={{ marginTop: '2px' }}>
                                        {isExpanded ?
                                            <ChevronDown size={16} color="#888" /> :
                                            <ChevronRight size={16} color="#888" />
                                        }
                                    </div>

                                    {/* Log Icon */}
                                    <div style={{ marginTop: '2px' }}>
                                        {getLogIcon(log.level)}
                                    </div>

                                    {/* Log Content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '0.9rem',
                                            color: '#fff',
                                            marginBottom: '4px'
                                        }}>
                                            {log.message}
                                        </div>

                                        {isExpanded && (
                                            <div style={{
                                                marginTop: '8px',
                                                padding: '10px',
                                                background: 'rgba(0, 0, 0, 0.3)',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                color: '#ccc',
                                                borderLeft: `3px solid ${color}`
                                            }}>
                                                <div><strong>{t('vsm.logs.level')}</strong> {log.level.toUpperCase()}</div>
                                                <div><strong>{t('vsm.logs.time')}</strong> {new Date(log.timestamp).toLocaleString()}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timestamp */}
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#888',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {formatTimestamp(log.timestamp)}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default LogViewer;
