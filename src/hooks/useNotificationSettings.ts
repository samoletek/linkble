import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../stores/authStore';

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
    const { user } = useAuthStore();

    // Load settings from Supabase and AsyncStorage
    useEffect(() => {
        loadSettings();
    }, [user]);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // 1. Try to load from Supabase first (source of truth)
            if (user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('notification_settings')
                    .eq('id', user.id)
                    .single();

                if (!error && data?.notification_settings) {
                    const remoteSettings = data.notification_settings as unknown as NotificationSettings;
                    setSettings(remoteSettings);
                    // Update local cache
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remoteSettings));
                    setLoading(false);
                    return;
                }
            }

            // 2. Fallback to AsyncStorage if offline or no remote settings
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

            // Save locally
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            // Sync to Supabase
            if (user?.id) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ notification_settings: updated as any })
                    .eq('id', user.id);

                if (error) {
                    console.error('Failed to sync settings to Supabase:', error);
                }
            }
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

            if (user?.id) {
                await supabase
                    .from('profiles')
                    .update({ notification_settings: DEFAULT_SETTINGS as any })
                    .eq('id', user.id);
            }
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
