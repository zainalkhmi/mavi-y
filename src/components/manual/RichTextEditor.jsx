import React, { useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const RichTextEditor = ({ value, onChange, placeholder }) => {
    const { t } = useLanguage();
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    return (
        <div style={{ backgroundColor: '#252526', border: '1px solid #333', borderRadius: '4px', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                gap: '5px',
                padding: '8px',
                borderBottom: '1px solid #333',
                backgroundColor: '#1e1e1e',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Font Family */}
                <select
                    onChange={(e) => execCommand('fontName', e.target.value)}
                    style={selectStyle}
                    title={t('manual.font')}
                >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                </select>

                {/* Font Size */}
                <select
                    onChange={(e) => execCommand('fontSize', e.target.value)}
                    style={selectStyle}
                    title={t('manual.fontSize')}
                >
                    <option value="1">8pt</option>
                    <option value="2">10pt</option>
                    <option value="3" selected>12pt</option>
                    <option value="4">14pt</option>
                    <option value="5">18pt</option>
                    <option value="6">24pt</option>
                    <option value="7">36pt</option>
                </select>

                <div style={dividerStyle}></div>

                {/* Bold, Italic, Underline */}
                <button onClick={() => execCommand('bold')} style={buttonStyle} title={`${t('manual.bold')} (Ctrl+B)`}>
                    <strong>B</strong>
                </button>
                <button onClick={() => execCommand('italic')} style={buttonStyle} title={`${t('manual.italic')} (Ctrl+I)`}>
                    <em>I</em>
                </button>
                <button onClick={() => execCommand('underline')} style={buttonStyle} title={`${t('manual.underline')} (Ctrl+U)`}>
                    <u>U</u>
                </button>

                <div style={dividerStyle}></div>

                {/* Alignment */}
                <button onClick={() => execCommand('justifyLeft')} style={buttonStyle} title={t('common.alignLeft')}>
                    ≡
                </button>
                <button onClick={() => execCommand('justifyCenter')} style={buttonStyle} title={t('manual.alignCenter')}>
                    ≣
                </button>
                <button onClick={() => execCommand('justifyRight')} style={buttonStyle} title={t('manual.alignRight')}>
                    ≡
                </button>

                <div style={dividerStyle}></div>

                {/* Lists */}
                <button onClick={() => execCommand('insertUnorderedList')} style={buttonStyle} title={t('manual.bulletList')}>
                    • {t('manual.list')}
                </button>
                <button onClick={() => execCommand('insertOrderedList')} style={buttonStyle} title={t('manual.numberedList')}>
                    1. {t('manual.list')}
                </button>

                <div style={dividerStyle}></div>

                {/* Insert Image */}
                <label style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} title={t('manual.insertImage')}>
                    🖼️
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    execCommand('insertImage', event.target.result);
                                };
                                reader.readAsDataURL(file);
                            }
                            // Reset input (optional, to allow same file selection again)
                            e.target.value = '';
                        }}
                    />
                </label>

                <div style={dividerStyle}></div>

                {/* Text Color */}
                <input
                    type="color"
                    onChange={(e) => execCommand('foreColor', e.target.value)}
                    style={{ width: '30px', height: '24px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
                    title={t('manual.textColor')}
                />
            </div>

            {/* Editor Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                style={{
                    minHeight: '100px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '10px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.6'
                }}
                data-placeholder={placeholder}
            />
        </div>
    );
};

const buttonStyle = {
    padding: '4px 8px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    minWidth: '28px'
};

const selectStyle = {
    padding: '4px 6px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
};

const dividerStyle = {
    width: '1px',
    height: '20px',
    backgroundColor: '#444'
};

export default RichTextEditor;
