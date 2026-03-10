/**
 * auditLog.js
 * =====================================================
 * Centralized utility for recording industrial governance events.
 * Captures user actions, quality failures, and system state changes.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

/**
 * Log a critical event to the database.
 * @param {Object} event - The event data to log.
 * @param {string} event.type - Event category (LOGIN, CYCLE_START, QUALITY_FAIL, APP_UPDATE, etc.)
 * @param {string} [event.user] - User ID or operator name.
 * @param {string} [event.workstation] - Station ID.
 * @param {string} [event.workOrder] - Batch / Job ID.
 * @param {Object} [event.details] - Metadata specific to the event.
 */
export async function logEvent({ type, user, workstation, workOrder, details }) {
    const supabase = getSupabaseClient();
    const eventData = {
        event_type: type,
        operator_id: user || 'anonymous',
        station_id: workstation || 'N/A',
        work_order: workOrder || 'N/A',
        payload: details || {},
        created_at: new Date().toISOString()
    };

    console.log(`[AuditLog] ${type}:`, eventData);

    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert(eventData);

        if (error) {
            console.warn('[AuditLog] Failed to persist to database:', error.message);
            // Fallback: Store in localStorage if DB fails
            const history = JSON.parse(localStorage.getItem('mavi_audit_fallback') || '[]');
            history.push(eventData);
            localStorage.setItem('mavi_audit_fallback', JSON.stringify(history.slice(-100)));
        }
    } catch (err) {
        console.error('[AuditLog] Critical error:', err);
    }
}

/**
 * Common event type constants
 */
export const AUDIT_EVENTS = {
    APP_START: 'APP_START',
    CYCLE_START: 'CYCLE_START',
    CYCLE_COMPLETE: 'CYCLE_COMPLETE',
    QUALITY_PASS: 'QUALITY_PASS',
    QUALITY_FAIL: 'QUALITY_FAIL',
    SIGNATURE_LOGIN: 'SIGNATURE_LOGIN',
    CONFIG_CHANGE: 'CONFIG_CHANGE',
    WORK_ORDER_BIND: 'WORK_ORDER_BIND'
};
