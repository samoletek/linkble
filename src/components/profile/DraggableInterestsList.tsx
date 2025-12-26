import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Interest {
  id: number;
  name: string;
}

interface DraggableInterestsListProps {
  interests: Interest[];
  onReorder: (reorderedIds: number[]) => void;
}

interface ItemLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 10;

export default function DraggableInterestsList({
  interests,
  onReorder,
}: DraggableInterestsListProps) {
  const { colors } = useTheme();
  const [items, setItems] = useState(interests);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const itemLayouts = useRef<Map<number, ItemLayout>>(new Map());
  const containerRef = useRef<View>(null);
  const containerOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setItems(interests);
  }, [interests]);

  const measureContainer = () => {
    containerRef.current?.measureInWindow((x, y) => {
      containerOffset.current = { x, y };
    });
  };

  const findHoverIndex = useCallback((pageX: number, pageY: number): number | null => {
    const localX = pageX - containerOffset.current.x;
    const localY = pageY - containerOffset.current.y;

    for (let i = 0; i < items.length; i++) {
      const layout = itemLayouts.current.get(items[i].id);
      if (!layout) continue;

      if (
        localX >= layout.x - GAP / 2 &&
        localX <= layout.x + layout.width + GAP / 2 &&
        localY >= layout.y - GAP / 2 &&
        localY <= layout.y + layout.height + GAP / 2
      ) {
        return i;
      }
    }
    return null;
  }, [items]);

  const handleDragStart = useCallback((id: number) => {
    measureContainer();
    setDraggingId(id);
    const layout = itemLayouts.current.get(id);
    if (layout) {
      setDragPosition({
        x: layout.x,
        y: layout.y,
      });
    }
    const idx = items.findIndex(i => i.id === id);
    setHoverIndex(idx);
  }, [items]);

  const handleDragMove = useCallback((dx: number, dy: number, pageX: number, pageY: number) => {
    if (draggingId === null) return;

    const layout = itemLayouts.current.get(draggingId);
    if (layout) {
      setDragPosition({
        x: layout.x + dx,
        y: layout.y + dy,
      });
    }

    const newHoverIndex = findHoverIndex(pageX, pageY);
    if (newHoverIndex !== null && newHoverIndex !== hoverIndex) {
      LayoutAnimation.configureNext({
        duration: 150,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
      setHoverIndex(newHoverIndex);
    }
  }, [draggingId, findHoverIndex, hoverIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggingId === null || hoverIndex === null) {
      setDraggingId(null);
      setHoverIndex(null);
      return;
    }

    const fromIndex = items.findIndex(i => i.id === draggingId);
    if (fromIndex !== hoverIndex) {
      const newItems = [...items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(hoverIndex, 0, movedItem);

      setItems(newItems);
      onReorder(newItems.map(item => item.id));
    }

    setDraggingId(null);
    setHoverIndex(null);
  }, [draggingId, hoverIndex, items, onReorder]);

  // Calculate display order based on hover position
  const getDisplayItems = () => {
    if (draggingId === null || hoverIndex === null) {
      return items;
    }

    const fromIndex = items.findIndex(i => i.id === draggingId);
    if (fromIndex === hoverIndex) return items;

    const result = items.filter(i => i.id !== draggingId);
    const draggedItem = items.find(i => i.id === draggingId)!;
    result.splice(hoverIndex, 0, draggedItem);
    return result;
  };

  const displayItems = getDisplayItems();
  const draggingItem = items.find(i => i.id === draggingId);

  return (
    <View ref={containerRef} style={styles.container} onLayout={measureContainer}>
      {displayItems.map((interest) => {
        const isBeingDragged = interest.id === draggingId;

        return (
          <InterestItem
            key={interest.id}
            interest={interest}
            isPlaceholder={isBeingDragged}
            onDragStart={() => handleDragStart(interest.id)}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onLayout={(layout) => itemLayouts.current.set(interest.id, layout)}
            backgroundColor={colors.background.secondary}
            textColor={colors.text.primary}
          />
        );
      })}

      {/* Floating dragged item */}
      {draggingId !== null && draggingItem && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.interestTag,
            styles.floatingItem,
            {
              backgroundColor: colors.background.secondary,
              left: dragPosition.x,
              top: dragPosition.y,
            },
          ]}
        >
          <Text style={[styles.interestText, { color: colors.text.primary }]}>
            {draggingItem.name}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

interface InterestItemProps {
  interest: Interest;
  isPlaceholder: boolean;
  onDragStart: () => void;
  onDragMove: (dx: number, dy: number, pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  onLayout: (layout: ItemLayout) => void;
  backgroundColor: string;
  textColor: string;
}

function InterestItem({
  interest,
  isPlaceholder,
  onDragStart,
  onDragMove,
  onDragEnd,
  onLayout,
  backgroundColor,
  textColor,
}: InterestItemProps) {
  // Use refs to always have fresh callbacks
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2;
      },
      onPanResponderGrant: () => {
        onDragStartRef.current();
      },
      onPanResponderMove: (evt, gestureState) => {
        onDragMoveRef.current(gestureState.dx, gestureState.dy, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        onDragEndRef.current();
      },
      onPanResponderTerminate: () => {
        onDragEndRef.current();
      },
    })
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    onLayout({ x, y, width, height });
  };

  return (
    <View
      onLayout={handleLayout}
      {...panResponder.panHandlers}
      style={[
        styles.interestTag,
        { backgroundColor },
        isPlaceholder && styles.placeholder,
      ]}
    >
      <Text style={[
        styles.interestText,
        { color: textColor },
        isPlaceholder && styles.placeholderText,
      ]}>
        {interest.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    position: 'relative',
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  interestText: {
    ...Typography.body,
    fontSize: 14,
  },
  placeholder: {
    opacity: 0.3,
  },
  placeholderText: {
    opacity: 0,
  },
  floatingItem: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ scale: 1.05 }],
  },
});
