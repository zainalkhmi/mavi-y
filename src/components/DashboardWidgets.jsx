import React from 'react';

function DashboardWidgets() {
    return (
        <div style={{ flex: 1, display: 'flex', gap: '10px', minHeight: '150px' }}>

            {/* Operational Status */}
            <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#aaa', marginTop: 0 }}>Status Operasional</h3>
                <div style={{ fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '10px', height: '10px', backgroundColor: '#005a9e' }}></span> Value-added
                        </span>
                        <span>48.38 %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '10px', height: '10px', backgroundColor: '#bfa900' }}></span> Non value-added
                        </span>
                        <span>28.70 %</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '10px', height: '10px', backgroundColor: '#c50f1f' }}></span> Waste
                        </span>
                        <span>22.92 %</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default DashboardWidgets;
