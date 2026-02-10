import React, { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { useLanguage } from '../../../i18n/LanguageContext';

const TextNode = ({ data, selected }) => {
    const { t } = useLanguage();
    const [text, setText] = useState(data.text || t('vsm.nodes.noteDefault'));

    useEffect(() => {
        setText(data.text || t('vsm.nodes.noteDefault'));
    }, [data.text]);

    const onChange = (evt) => {
        setText(evt.target.value);
        data.text = evt.target.value; // Mutable update rely on parents saving state eventually or on blur
    };

    return (
        <div style={{ position: 'relative', minWidth: '100px', minHeight: '50px', height: '100%' }}>
            <NodeResizer minWidth={100} minHeight={50} isVisible={selected} lineStyle={{ border: '1px solid #0078d4' }} handleStyle={{ width: 8, height: 8 }} />

            {/* Handles for connecting if needed */}
            <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
            <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />

            <div style={{
                backgroundColor: data.color || '#ffff88',
                color: '#000',
                padding: '10px',
                borderRadius: '2px',
                boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                height: '100%',
                display: 'flex',
                fontSize: data.fontSize || '14px',
                fontFamily: 'sans-serif',
                border: selected ? '1px solid #0078d4' : 'none'
            }}>
                <textarea
                    value={text}
                    onChange={onChange}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        resize: 'none',
                        outline: 'none',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        color: '#000000', // Force black color
                        pointerEvents: 'all'
                    }}
                    placeholder={t('vsm.nodes.notePlaceholder')}
                    className="nodrag" // Important for ReactFlow to allow text selection
                />
            </div>
        </div>
    );
};

export default memo(TextNode);
