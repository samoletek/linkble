import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@linkble/notification_settings';

export interface NotificationSettings {
    enabled: boolean;
    events: {
        joinRequests: boolean;
        requestResponses: boolean;
        cancelled: boolean;
        kicked: boolean;
        startingSoon: boolean;
    };
    messages: {
        eventChat: boolean;
        directMessages: boolean;
    };
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    events: {
        joinRequests: true,
        requestResponses: true,
        cancelled: true,
        kicked: true,
        startingSoon: true,
    },
    messages: {
        eventChat: true,
        directMessages: true,
    },
};

export const useNotificationSettings = () => {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    // Load settings from AsyncStorage
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setSettings(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
        try {
            const updated = { ...settings, ...newSettings };
            setSettings(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    };

    const updateEventSetting = async (key: keyof NotificationSettings['events'], value: boolean) => {
        const updated = {
            ...settings,
            events: { ...settings.events, [key]: value },
        };
        await updateSettings(updated);
    };

    const updateMessageSetting = async (key: keyof NotificationSettings['messages'], value: boolean) => {
        const updated = {
            ...settings,
            messages: { ...settings.messages, [key]: value },
        };
        await updateSettings(updated);
    };

    const resetSettings = async () => {
        try {
            setSettings(DEFAULT_SETTINGS);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
        } catch (error) {
            console.error('Failed to reset notification settings:', error);
        }
    };

    return {
        settings,
        loading,
        updateSettings,
        updateEventSetting,
        updateMessageSetting,
        resetSettings,
    };
};
