import React from 'react';

const iconForSeverity = (severity) => {
    switch ((severity || '').toLowerCase()) {
        case 'andon': return '🚨';
        case 'critical': return '⚠️';
        case 'warning': return '⚡';
        default: return 'ℹ️';
    }
};

export default function AndonAlertLayer({ alerts = [], enabled = true }) {
    if (!enabled || !alerts.length) return null;

    return (
        <div className="vsm-andon-layer" aria-live="polite">
            {alerts.slice(0, 6).map((alert) => (
                <div
                    key={`${alert.alertId || alert.ruleCode || alert.rule_code}-${alert.nodeId || alert.entity_id || 'g'}`}
                    className={`vsm-andon-alert ${`sev-${(alert.severity || 'info').toLowerCase()}`} ${`status-${(alert.status || 'active').toLowerCase()}`}`}
                >
                    <div className="vsm-andon-icon">{iconForSeverity(alert.severity)}</div>
                    <div className="vsm-andon-content">
                        <div className="vsm-andon-head">
                            <span>{(alert.severity || 'info').toUpperCase()} • {alert.ruleCode || alert.rule_code || 'TPS_RULE'}</span>
                            {alert.count > 1 && <b>×{alert.count}</b>}
                        </div>
                        <div className="vsm-andon-msg">{alert.message}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
