import React, { useRef } from 'react';
import { VSMSymbols } from './vsm-constants';
import { useLanguage } from '../../i18n/LanguageContext';
import {
    Factory, User, Zap, TrendingUp, Building2, Package,
    ShoppingCart, Repeat, Shield, Truck, Box, CheckCircle,
    ArrowRight, BarChart3, Mail, Triangle, Eye, FileText,
    Clock, StickyNote, Upload, Minus, MoreHorizontal, Layers, Trash2, X, Archive, Plane, Video
} from 'lucide-react';

const Sidebar = ({ customLibrary, onAddCustom, onRemoveCustom, activeEdgeType, onEdgeTypeSelect, setIsDragging, setDragData, onDragEnd }) => {
    const { t } = useLanguage();
    const fileInputRef = useRef(null);

    const handleDragStart = (event, nodeType, symbolType, extraData = {}) => {
        if (setIsDragging) setIsDragging(true);
        if (setDragData) setDragData({ nodeType, symbolType, ...extraData }); // Store data in React state

        // Keep standard dataTransfer as backup
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/vsmsymbol', symbolType);
        event.dataTransfer.setData('text/plain', JSON.stringify({ nodeType, symbolType }));
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (event) => {
        if (setIsDragging) setIsDragging(false);
        if (onDragEnd) onDragEnd(event); // Pass event to parent for processing
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onAddCustom({
                    id: Date.now().toString(),
                    url: event.target.result,
                    name: file.name
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const blockBtnStyle = {
        padding: '8px 12px',
        backgroundColor: 'rgba(45, 45, 48, 0.95)',
        color: '#e0e0e0',
        border: '1px solid rgba(80, 80, 85, 0.6)',
        borderRadius: '6px',
        cursor: 'grab',
        textAlign: 'left',
        fontSize: '0.75rem',
        fontWeight: '500',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px',
        minHeight: '40px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        width: '100%'
    };

    const sectionTitleStyle = {
        fontSize: '0.7rem',
        color: '#9ca3af',
        marginBottom: '10px',
        textTransform: 'uppercase',
        marginTop: '20px',
        fontWeight: '700',
        letterSpacing: '0.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    return (
        <div id="vsm-toolbox" style={{
            width: '200px',
            borderLeft: '1px solid rgba(60, 60, 67, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #1a1a1d 0%, #252526 100%)',
            height: '100%',
            boxShadow: '-2px 0 12px rgba(0, 0, 0, 0.3)',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 12px',
                borderBottom: '1px solid rgba(80, 80, 85, 0.4)',
                background: 'linear-gradient(135deg, #2d2d30 0%, #1e1e1e 100%)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
                <div
                    title={t('vsm.toolbox.title')}
                    style={{
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        color: '#ffffff',
                        letterSpacing: '0.3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                    <Layers size={18} strokeWidth={2.5} style={{ color: '#60a5fa' }} />
                    <span>{t('vsm.toolbox.title')}</span>
                </div>
                {/* Description hidden in compact mode */}
            </div>

            <div style={{ padding: '12px', flex: 1 }}>

                {/* FLOW CONNECTIONS (LINES) */}
                <div
                    title={t('vsm.toolbox.flowTitle')}
                    style={{ ...sectionTitleStyle, marginTop: 0 }}
                >
                    <Minus size={14} />
                    <span>{t('vsm.toolbox.flowTitle')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                    <div
                        title={t('vsm.toolbox.material')}
                        draggable={true}
                        onDragStart={(event) => {
                            handleDragStart(event, 'edgeMode', null, { edgeType: 'material' });
                        }}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            e.currentTarget.style.borderColor = '#3b82f6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = activeEdgeType === 'material' ? '0 0 0 2px #3b82f6' : '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.borderColor = activeEdgeType === 'material' ? '#3b82f6' : 'rgba(80, 80, 85, 0.6)';
                        }}
                        style={{
                            ...blockBtnStyle,
                            cursor: 'grab',
                            backgroundColor: activeEdgeType === 'material' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(45, 45, 48, 0.95)',
                            border: activeEdgeType === 'material' ? '1px solid #3b82f6' : '1px solid rgba(80, 80, 85, 0.6)',
                            boxShadow: activeEdgeType === 'material' ? '0 0 0 2px #3b82f6' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                            color: activeEdgeType === 'material' ? '#60a5fa' : '#e0e0e0'
                        }}
                    >
                        <Minus size={14} strokeWidth={3} />
                        <span>{t('vsm.toolbox.material')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.manualInfo')}
                        draggable={true}
                        onDragStart={(event) => {
                            handleDragStart(event, 'edgeMode', null, { edgeType: 'information' });
                        }}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                            e.currentTarget.style.borderColor = '#8b5cf6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = activeEdgeType === 'information' ? '0 0 0 2px #8b5cf6' : '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.borderColor = activeEdgeType === 'information' ? '#8b5cf6' : 'rgba(80, 80, 85, 0.6)';
                        }}
                        style={{
                            ...blockBtnStyle,
                            cursor: 'grab',
                            backgroundColor: activeEdgeType === 'information' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(45, 45, 48, 0.95)',
                            border: activeEdgeType === 'information' ? '1px solid #8b5cf6' : '1px solid rgba(80, 80, 85, 0.6)',
                            boxShadow: activeEdgeType === 'information' ? '0 0 0 2px #8b5cf6' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                            color: activeEdgeType === 'information' ? '#a78bfa' : '#e0e0e0'
                        }}
                    >
                        <MoreHorizontal size={14} strokeWidth={2.5} />
                        <span>{t('vsm.toolbox.manualInfo')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.electronicInfo')}
                        draggable={true}
                        onDragStart={(event) => {
                            handleDragStart(event, 'edgeMode', null, { edgeType: 'electronic' });
                        }}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.4)';
                            e.currentTarget.style.borderColor = '#eab308';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = activeEdgeType === 'electronic' ? '0 0 0 2px #eab308' : '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.borderColor = activeEdgeType === 'electronic' ? '#eab308' : 'rgba(80, 80, 85, 0.6)';
                        }}
                        style={{
                            ...blockBtnStyle,
                            cursor: 'grab',
                            backgroundColor: activeEdgeType === 'electronic' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(45, 45, 48, 0.95)',
                            border: activeEdgeType === 'electronic' ? '1px solid #eab308' : '1px solid rgba(80, 80, 85, 0.6)',
                            boxShadow: activeEdgeType === 'electronic' ? '0 0 0 2px #eab308' : '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        <Zap size={14} strokeWidth={2.5} style={{ color: '#eab308' }} />
                        <span>{t('vsm.toolbox.electronicInfo')}</span>
                    </div>
                </div>

                {/* PROCESS SECTION */}
                <div
                    title={t('vsm.toolbox.processData')}
                    style={sectionTitleStyle}
                >
                    <Factory size={14} />
                    <span>{t('vsm.toolbox.processData')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div
                        title={t('vsm.toolbox.processBox')}
                        onDragStart={(event) => handleDragStart(event, 'process', VSMSymbols.PROCESS)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                        style={blockBtnStyle}
                    >
                        <Package size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.processBox')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.project', 'Project Node')}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.PROJECT)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(138, 43, 226, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(138, 43, 226, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                        style={blockBtnStyle}
                    >
                        <Video size={14} strokeWidth={2} style={{ color: '#8a2be2' }} />
                        <span>{t('vsm.toolbox.project', 'Project Node')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.operator')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.OPERATOR)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <User size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.operator')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.kaizenBurst')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.KAIZEN_BURST)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Zap size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.kaizenBurst')}</span>
                    </div>
                </div>

                {/* MATERIAL FLOW */}
                <div
                    title={t('vsm.toolbox.materialFlow')}
                    style={sectionTitleStyle}
                >
                    <TrendingUp size={14} />
                    <span>{t('vsm.toolbox.materialFlow')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div
                        title={t('vsm.toolbox.customer')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.CUSTOMER)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Building2 size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.customer')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.supplier')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.SUPPLIER)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Factory size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.supplier')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.inventory')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'inventory', VSMSymbols.INVENTORY)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Triangle size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.inventory')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.supermarket')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.SUPERMARKET)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <ShoppingCart size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.supermarket')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.fifo')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.FIFO)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Repeat size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.fifo')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.safetyStock')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.SAFETY_STOCK)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Shield size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.safetyStock')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.truck')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.TRUCK)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Truck size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.truck')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.forklift')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.FORKLIFT)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Truck size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.forklift')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.trolley')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.TROLLEY)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <ShoppingCart size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.trolley')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.sea')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.SEA)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Archive size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.sea')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.air')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.AIR)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Plane size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.air')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.rawMaterial')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.RAW_MATERIAL)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Box size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.rawMaterial')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.finishedGoods')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.FINISHED_GOODS)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <CheckCircle size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.finishedGoods')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.push')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.PUSH_ARROW)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <ArrowRight size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.push')}</span>
                    </div>
                </div>

                {/* INFORMATION FLOW */}
                <div
                    title={t('vsm.toolbox.informationFlow')}
                    style={sectionTitleStyle}
                >
                    <BarChart3 size={14} />
                    <span>{t('vsm.toolbox.informationFlow')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div
                        title={t('vsm.toolbox.productionControl')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'productionControl', VSMSymbols.PRODUCTION_CONTROL)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Building2 size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.productionControl')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.heijunka')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.HEIJUNKA_BOX)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <BarChart3 size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.heijunka')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.kanbanPost')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.KANBAN_POST)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Mail size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.kanbanPost')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.productionKanban')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.KANBAN_PRODUCTION)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Package size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.productionKanban')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.withdrawalKanban')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.KANBAN_WITHDRAWAL)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Package size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.withdrawalKanban')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.signalKanban')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.SIGNAL_KANBAN)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Triangle size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.signalKanban')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.goSee')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.EYE_OBSERVATION)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Eye size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.goSee')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.electronicInfo')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.ELECTRONIC_INFO)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(234, 179, 8, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Zap size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.electronicInfo')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.manualInfo')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.MANUAL_INFO)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <FileText size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.manualInfo')}</span>
                    </div>
                    <div
                        title={t('vsm.toolbox.buffer')}
                        style={blockBtnStyle}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.BUFFER)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Shield size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.buffer')}</span>
                    </div>
                </div>

                {/* TIMELINE & ANALYSIS */}
                <div
                    title={t('vsm.toolbox.timelineMetrics')}
                    style={sectionTitleStyle}
                >
                    <Clock size={14} />
                    <span>{t('vsm.toolbox.timelineMetrics')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div
                        title={t('vsm.toolbox.timeline')}
                        style={{ ...blockBtnStyle, gridColumn: 'span 1' }}
                        onDragStart={(event) => handleDragStart(event, 'generic', VSMSymbols.TIMELINE)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                            e.currentTarget.style.backgroundColor = 'rgba(45, 45, 48, 0.95)';
                        }}
                    >
                        <Clock size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.timeline')}</span>
                    </div>
                </div>

                {/* GENERAL & NOTES */}
                <div
                    title={t('vsm.toolbox.generalNotes')}
                    style={sectionTitleStyle}
                >
                    <StickyNote size={14} />
                    <span>{t('vsm.toolbox.generalNotes')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    <div
                        title={t('vsm.toolbox.stickyNote')}
                        style={{
                            ...blockBtnStyle,
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            color: '#78350f',
                            border: '1px solid #fbbf24',
                            fontWeight: '600'
                        }}
                        onDragStart={(event) => handleDragStart(event, 'text_note', VSMSymbols.TEXT_NOTE)}
                        onDragEnd={handleDragEnd}
                        draggable={true}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                        }}
                    >
                        <StickyNote size={14} strokeWidth={2} />
                        <span>{t('vsm.toolbox.stickyNote')}</span>
                    </div>
                </div>

                {/* CUSTOM SECTION */}
                <div
                    title={t('vsm.toolbox.customIcons')}
                    style={sectionTitleStyle}
                >
                    <Upload size={14} />
                    <span>{t('vsm.toolbox.customIcons')}</span>
                </div>
                <button
                    title={t('vsm.toolbox.uploadIcon')}
                    onClick={() => fileInputRef.current.click()}
                    style={{
                        ...blockBtnStyle,
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderColor: '#3b82f6',
                        width: '100%',
                        gap: '8px',
                        fontWeight: '600',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    }}
                >
                    <Upload size={14} strokeWidth={2} />
                    <span>{t('vsm.toolbox.uploadIcon')}</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept="image/*" />

                {customLibrary && customLibrary.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '12px' }}>
                        {customLibrary.map(icon => (
                            <div
                                key={icon.id}
                                onDragStart={(event) => {
                                    event.dataTransfer.setData('application/reactflow', 'generic');
                                    event.dataTransfer.setData('application/vsmsymbol', VSMSymbols.CUSTOM);
                                    event.dataTransfer.setData('application/customdata', JSON.stringify({ imageUrl: icon.url, description: icon.name }));
                                    event.dataTransfer.effectAllowed = 'move';
                                }}
                                draggable={true}
                                style={{
                                    ...blockBtnStyle,
                                    height: 'auto',
                                    minHeight: '50px',
                                    paddingLeft: '8px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                    e.currentTarget.style.borderColor = '#3b82f6';
                                    const deleteBtn = e.currentTarget.querySelector('.delete-icon-btn');
                                    if (deleteBtn) deleteBtn.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                                    e.currentTarget.style.borderColor = 'rgba(80, 80, 85, 0.6)';
                                    const deleteBtn = e.currentTarget.querySelector('.delete-icon-btn');
                                    if (deleteBtn) deleteBtn.style.opacity = '0';
                                }}
                            >
                                <button
                                    className="delete-icon-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(t('vsm.confirmDeleteIcon') || 'Delete this icon?')) {
                                            onRemoveCustom(icon.id);
                                        }
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: 'rgba(239, 68, 68, 0.9)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '2px',
                                        cursor: 'pointer',
                                        color: 'white',
                                        opacity: '0',
                                        transition: 'opacity 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10
                                    }}
                                    title="Delete Icon"
                                >
                                    <X size={10} />
                                </button>
                                <img src={icon.url} alt={icon.name} title={icon.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                <span style={{
                                    fontSize: '0.7rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '120px'
                                }}>{icon.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
