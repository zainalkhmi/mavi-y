const STORAGE_KEY = 'manual_data_capture_integrations_v1';

const DEFAULT_SETTINGS = {
    googleSheets: {
        enabled: false,
        endpoint: '',
        method: 'POST',
        apiKey: '',
        sheetId: '',
        sheetName: '',
        timeoutMs: 12000,
        headersJson: ''
    },
    externalApi: {
        enabled: false,
        endpoint: '',
        method: 'POST',
        apiKey: '',
        timeoutMs: 12000,
        headersJson: ''
    },
    sqlApi: {
        enabled: false,
        endpoint: '',
        method: 'POST',
        apiKey: '',
        timeoutMs: 12000,
        headersJson: ''
    }
};

const safeParseJson = (value, fallback = {}) => {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
};

const normalizeMethod = (method = 'POST') => {
    const next = String(method || 'POST').trim().toUpperCase();
    return ['POST', 'PUT', 'PATCH'].includes(next) ? next : 'POST';
};

const sanitizeSettings = (raw = {}) => {
    const next = { ...DEFAULT_SETTINGS };

    ['googleSheets', 'externalApi', 'sqlApi'].forEach((key) => {
        const source = raw?.[key] || {};
        const fallback = DEFAULT_SETTINGS[key];
        next[key] = {
            ...fallback,
            ...source,
            enabled: Boolean(source?.enabled),
            endpoint: String(source?.endpoint || '').trim(),
            method: normalizeMethod(source?.method || fallback.method),
            apiKey: String(source?.apiKey || '').trim(),
            timeoutMs: Number(source?.timeoutMs) > 0 ? Number(source.timeoutMs) : fallback.timeoutMs,
            headersJson: String(source?.headersJson || '').trim()
        };

        if (key === 'googleSheets') {
            next[key].sheetId = String(source?.sheetId || '').trim();
            next[key].sheetName = String(source?.sheetName || '').trim();
        }
    });

    return next;
};

export const getManualDataCaptureIntegrationSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return sanitizeSettings(safeParseJson(raw, {}));
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

export const saveManualDataCaptureIntegrationSettings = (nextSettings = {}) => {
    const sanitized = sanitizeSettings(nextSettings);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch (error) {
        console.warn('Failed to save manual data capture integration settings:', error);
    }
    return sanitized;
};

const buildHeaders = (config = {}) => {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const customHeaders = safeParseJson(config.headersJson || '{}', {});
    Object.keys(customHeaders).forEach((key) => {
        if (!key) return;
        headers[key] = String(customHeaders[key]);
    });

    return headers;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 12000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 12000));

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
};

const sendDestinationPayload = async (destinationKey, payload, config = {}) => {
    if (!config.enabled) return { status: 'skipped', reason: 'disabled' };
    if (!config.endpoint) return { status: 'failed', reason: 'missing_endpoint' };

    const body = {
        destination: destinationKey,
        payload,
        configMeta: destinationKey === 'googleSheets'
            ? { sheetId: config.sheetId || '', sheetName: config.sheetName || '' }
            : undefined
    };

    try {
        const response = await fetchWithTimeout(
            config.endpoint,
            {
                method: normalizeMethod(config.method),
                headers: buildHeaders(config),
                body: JSON.stringify(body)
            },
            config.timeoutMs
        );

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            return {
                status: 'failed',
                reason: `http_${response.status}`,
                detail: text?.slice(0, 500) || response.statusText || 'Request failed'
            };
        }

        return { status: 'success' };
    } catch (error) {
        return {
            status: 'failed',
            reason: error?.name === 'AbortError' ? 'timeout' : 'network_error',
            detail: error?.message || 'Unknown error'
        };
    }
};

export const buildManualDataCapturePayload = ({
    manual = null,
    manualVersion = '-',
    step = null,
    stepIndex = 0,
    answers = {},
    operatorName = 'Anonymous',
    role = 'Operator',
    source = 'manual-public-viewer'
} = {}) => {
    const safeAnswers = answers && typeof answers === 'object' ? answers : {};
    const answersFlat = Object.entries(safeAnswers).map(([key, value]) => ({
        key,
        value: Array.isArray(value) ? value.join(', ') : (value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''))
    }));

    return {
        id: Math.random().toString(36).slice(2, 10),
        manualId: manual?.cloudId || manual?.id || null,
        manualTitle: manual?.title || 'Manual',
        manualVersion,
        stepId: step?.id || null,
        stepIndex,
        stepTitle: step?.title || `Step ${stepIndex + 1}`,
        operatorName: String(operatorName || '').trim() || 'Anonymous',
        role: String(role || 'Operator').trim() || 'Operator',
        answers: safeAnswers,
        answersFlat,
        capturedAt: new Date().toISOString(),
        source
    };
};

export const syncManualDataCaptureDestinations = async (payload, overrideSettings = null) => {
    const settings = sanitizeSettings(overrideSettings || getManualDataCaptureIntegrationSettings());

    const [googleSheets, externalApi, sqlApi] = await Promise.all([
        sendDestinationPayload('googleSheets', payload, settings.googleSheets),
        sendDestinationPayload('externalApi', payload, settings.externalApi),
        sendDestinationPayload('sqlApi', payload, settings.sqlApi)
    ]);

    const statuses = [googleSheets, externalApi, sqlApi];
    const attempted = statuses.filter((item) => item.status !== 'skipped').length;
    const success = statuses.filter((item) => item.status === 'success').length;

    return {
        googleSheets,
        externalApi,
        sqlApi,
        summary: `${success}/${attempted} destinations synced`
    };
};

export const testManualDataCaptureIntegrationDestination = async (destinationKey, overrideSettings = null) => {
    const settings = sanitizeSettings(overrideSettings || getManualDataCaptureIntegrationSettings());
    const config = settings?.[destinationKey];
    if (!config) {
        return { status: 'failed', reason: 'invalid_destination' };
    }

    return sendDestinationPayload(destinationKey, {
        type: 'healthcheck',
        sentAt: new Date().toISOString()
    }, { ...config, enabled: true });
};
