import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import MapPinMarker from './MapPinMarker';
import { CATEGORIES } from '../../utils/constants';
import { useTheme } from '../../contexts/ThemeContext';

const PIN_SIZE = 48;

export interface PinImages {
  [categoryName: string]: { uri: string };
}

// Hidden component that renders pins and captures them
export function PinImageGenerator({
  onImagesGenerated,
}: {
  onImagesGenerated: (images: PinImages) => void;
}) {
  const viewShotRefs = useRef<{ [key: string]: ViewShot | null }>({});
  const [capturedCount, setCapturedCount] = useState(0);
  const imagesRef = useRef<PinImages>({});
  const isCapturingRef = useRef(false);

  const categories = CATEGORIES;

  const captureAllPins = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;

    // Wait for all ViewShots to be mounted
    await new Promise((resolve) => setTimeout(resolve, 100));

    for (const category of categories) {
      const ref = viewShotRefs.current[category.name];
      if (ref) {
        try {
          const uri = await ref.capture?.();
          if (uri) {
            imagesRef.current[category.name] = { uri };
          }
        } catch (error) {
          console.warn(`Failed to capture pin for ${category.name}:`, error);
        }
      }
    }

    setCapturedCount(Object.keys(imagesRef.current).length);
    onImagesGenerated(imagesRef.current);
  }, [categories, onImagesGenerated]);

  useEffect(() => {
    captureAllPins();
  }, [captureAllPins]);

  if (capturedCount >= categories.length) {
    return null;
  }

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      {categories.map((category) => (
        <ViewShot
          key={category.name}
          ref={(ref) => {
            viewShotRefs.current[category.name] = ref;
          }}
          options={{
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          }}
          style={styles.pinContainer}
        >
          <MapPinMarker
            color={category.color}
            categoryName={category.name}
            size={PIN_SIZE}
          />
        </ViewShot>
      ))}
    </View>
  );
}

// Hook to manage pin images
export function usePinImages() {
  const { activeTheme } = useTheme();
  const [pinImages, setPinImages] = useState<PinImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleImagesGenerated = useCallback((images: PinImages) => {
    setPinImages(images);
    setIsLoading(false);
  }, []);

  // Regenerate pins when theme changes
  useEffect(() => {
    setPinImages(null);
    setIsLoading(true);
  }, [activeTheme]);

  // Fallback timeout - if pins don't load in 3 seconds, show map without custom pins
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Pin images generation timed out, showing map without custom pins');
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return {
    pinImages,
    isLoading,
    PinGenerator: isLoading ? (
      <PinImageGenerator onImagesGenerated={handleImagesGenerated} />
    ) : null,
  };
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  pinContainer: {
    backgroundColor: 'transparent',
    padding: 4,
  },
});
