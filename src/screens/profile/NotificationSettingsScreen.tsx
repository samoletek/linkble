import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

export default function NotificationSettingsScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { settings, loading, updateSettings, updateEventSetting, updateMessageSetting } =
        useNotificationSettings();

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
                <ActivityIndicator size="large" color={colors.accent.primary} />
            </View>
        );
    }

    const renderSection = (title: string, items: { label: string; value: boolean; onToggle: () => void }[]) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
            {items.map((item, index) => (
                <View
                    key={index}
                    style={[
                        styles.settingRow,
                        { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.primary },
                        index === items.length - 1 && styles.lastRow,
                    ]}
                >
                    <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{item.label}</Text>
                    <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: colors.border.primary, true: colors.accent.primary }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Master Switch */}
                <View style={styles.section}>
                    <View
                        style={[
                            styles.settingRow,
                            styles.masterRow,
                            { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.primary },
                        ]}
                    >
                        <View>
                            <Text style={[styles.settingLabel, styles.masterLabel, { color: colors.text.primary }]}>
                                Enable Notifications
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.text.secondary }]}>
                                Turn off to disable all push notifications
                            </Text>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(value) => updateSettings({ enabled: value })}
                            trackColor={{ false: colors.border.primary, true: colors.accent.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Event Notifications */}
                {renderSection('Event Notifications', [
                    {
                        label: 'Join Requests',
                        value: settings.events.joinRequests,
                        onToggle: () => updateEventSetting('joinRequests', !settings.events.joinRequests),
                    },
                    {
                        label: 'Request Responses',
                        value: settings.events.requestResponses,
                        onToggle: () => updateEventSetting('requestResponses', !settings.events.requestResponses),
                    },
                    {
                        label: 'Event Cancelled',
                        value: settings.events.cancelled,
                        onToggle: () => updateEventSetting('cancelled', !settings.events.cancelled),
                    },
                    {
                        label: 'Kicked from Event',
                        value: settings.events.kicked,
                        onToggle: () => updateEventSetting('kicked', !settings.events.kicked),
                    },
                    {
                        label: 'Event Starting Soon',
                        value: settings.events.startingSoon,
                        onToggle: () => updateEventSetting('startingSoon', !settings.events.startingSoon),
                    },
                ])}

                {/* Message Notifications */}
                {renderSection('Message Notifications', [
                    {
                        label: 'Event Chat',
                        value: settings.messages.eventChat,
                        onToggle: () => updateMessageSetting('eventChat', !settings.messages.eventChat),
                    },
                    {
                        label: 'Direct Messages',
                        value: settings.messages.directMessages,
                        onToggle: () => updateMessageSetting('directMessages', !settings.messages.directMessages),
                    },
                ])}

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    lastRow: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    masterRow: {
        paddingVertical: 16,
        borderRadius: 12,
        borderBottomWidth: 0,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    masterLabel: {
        fontSize: 17,
        fontWeight: '600',
    },
    settingDescription: {
        fontSize: 13,
        marginTop: 2,
    },
    bottomPadding: {
        height: 40,
    },
});
