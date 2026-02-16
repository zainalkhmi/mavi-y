const JITSI_SETTINGS_KEY = 'jitsi_settings';

export const DEFAULT_JITSI_SETTINGS = {
    domain: 'meet.jit.si',
    defaultRoomPrefix: 'mavi-room',
    defaultDisplayName: 'Guest',
    enableWelcomePage: false,
    startWithAudioMuted: false,
    startWithVideoMuted: false,
    toolbarButtons: [
        'microphone',
        'camera',
        'desktop',
        'chat',
        'participants-pane',
        'tileview',
        'fullscreen',
        'hangup'
    ]
};

export const getJitsiSettings = () => {
    try {
        const raw = localStorage.getItem(JITSI_SETTINGS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return { ...DEFAULT_JITSI_SETTINGS, ...parsed };
    } catch (error) {
        console.warn('Failed to parse Jitsi settings, using defaults:', error);
        return { ...DEFAULT_JITSI_SETTINGS };
    }
};

export const saveJitsiSettings = (settings) => {
    const nextSettings = {
        ...DEFAULT_JITSI_SETTINGS,
        ...(settings || {})
    };
    localStorage.setItem(JITSI_SETTINGS_KEY, JSON.stringify(nextSettings));
    return nextSettings;
};
