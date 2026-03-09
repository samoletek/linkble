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
    renderHeader?: (animateClose: () => void) => React.ReactNode;
}

export default function BaseModal({
    visible,
    onClose,
    children,
    height = SCREEN_HEIGHT * 0.85,
    showHandle = true,
    containerStyle,
    renderHeader,
}: BaseModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const translateY = useRef(new Animated.Value(height)).current;

    const animateClose = useCallback(() => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: false,
        }).start(() => {
            onClose();
        });
    }, [translateY, onClose]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderGrant: () => {
                translateY.setOffset((translateY as any)._value);
                translateY.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy >= 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                translateY.flattenOffset();

                const currentY = (translateY as any)._value;
                const velocity = gestureState.vy;

                const shouldClose = velocity > 1.5 || currentY > height * 0.4;

                if (shouldClose) {
                    Animated.timing(translateY, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: false,
                    }).start(() => {
                        onClose();
                        });
                } else {
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

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: false,
                tension: 100,
                friction: 12,
            }).start();
        } else {
            translateY.setValue(height);
        }
    }, [visible, translateY, height]);

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

            <Animated.View
                style={[
                    styles.container,
                    {
                        backgroundColor: colors.background.primary,
                        height: height + 50,
                        bottom: -50,
                        transform: [{ translateY }],
                    },
                    containerStyle,
                ]}
            >
                {showHandle && (
                    <View
                        {...panResponder.panHandlers}
                        style={styles.handleContainer}
                    >
                        <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
                    </View>
                )}

                {renderHeader && renderHeader(animateClose)}

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
        overflow: 'hidden',
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
