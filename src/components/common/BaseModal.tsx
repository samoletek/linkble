import { useRef, useEffect, useCallback } from 'react';
import {
    View,
    TouchableWithoutFeedback,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    ViewStyle,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { scale } from '../../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BaseModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    height?: number;
    showHandle?: boolean;
    containerStyle?: ViewStyle;
}

/**
 * BaseModal - Rewritten with Pikup patterns for smooth animations
 * 
 * Key patterns from Pikup:
 * 1. Backdrop opacity via interpolate (not setValue)
 * 2. setOffset/flattenOffset for proper drag tracking
 * 3. useNativeDriver: false for interpolated opacity
 */
export default function BaseModal({
    visible,
    onClose,
    children,
    height = SCREEN_HEIGHT * 0.85,
    showHandle = true,
    containerStyle,
}: BaseModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    // Single animation value - backdrop interpolates from this
    const translateY = useRef(new Animated.Value(height)).current;

    // Animate close: slide down, then call onClose
    const animateClose = useCallback(() => {
        // Use timing for close - spring waits for oscillation to settle
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            onClose();
        });
    }, [translateY, onClose]);

    // Pan responder with Pikup patterns
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to vertical gestures
                return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderGrant: () => {
                // Store current position as offset, reset value to 0
                translateY.setOffset((translateY as any)._value);
                translateY.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow dragging down (positive dy)
                if (gestureState.dy >= 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // Flatten offset back into value
                translateY.flattenOffset();

                const currentY = (translateY as any)._value;
                const velocity = gestureState.vy;

                // Determine if should close based on position and velocity
                const shouldClose = velocity > 1.5 || currentY > height * 0.4;

                if (shouldClose) {
                    // Use timing for close - spring waits for oscillation to settle
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: false,
                    }).start(() => {
                        onClose();
                    });
                } else {
                    // Snap back to open position
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 12,
                    }).start();
                }
            },
        })
    ).current;

    // Handle visibility changes
    useEffect(() => {
        if (visible) {
            // Animate in
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: false,
                tension: 100,
                friction: 12,
            }).start();
        } else {
            // Reset to closed position
            translateY.setValue(height);
        }
    }, [visible, translateY, height]);

    // Backdrop opacity interpolated from translateY (Pikup pattern)
    const backdropOpacity = translateY.interpolate({
        inputRange: [0, height],
        outputRange: [0.5, 0],
        extrapolate: 'clamp',
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={animateClose}
        >
            {/* Backdrop - opacity derived from translateY via interpolate */}
            <TouchableWithoutFeedback onPress={animateClose}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                />
            </TouchableWithoutFeedback>

            {/* Modal Content */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background.primary,
                        height: height + 50,
                        bottom: -50,
                        paddingBottom: insets.bottom + 50,
                        transform: [{ translateY }],
                    },
                    containerStyle,
                ]}
            >
                {/* Drag Handle */}
                {showHandle && (
                    <View
                        {...panResponder.panHandlers}
                        style={styles.handleContainer}
                    >
                        <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
                    </View>
                )}

                {children}
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 998,
    },
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: scale(20),
        borderTopRightRadius: scale(20),
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    handleContainer: {
        paddingTop: scale(8),
        paddingBottom: scale(4),
        alignItems: 'center',
    },
    handle: {
        width: scale(40),
        height: scale(4),
        borderRadius: 2,
    },
});
