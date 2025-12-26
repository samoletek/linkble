import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CrosshairSimple } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { getNearbyEvents } from '../../services/events';
import { useLocationStore } from '../../stores/locationStore';
import { useEventsStore } from '../../stores/eventsStore';
import { EventWithHost } from '../../types/database';
import EventDetailModal from '../../components/events/EventDetailModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const DEFAULT_CENTER: [number, number] = [-73.9857, 40.7484]; // New York [lng, lat]
const RADIUS_OPTIONS = [10, 20, 30, 50, 50000];

// Convert events to GeoJSON FeatureCollection
const eventsToGeoJSON = (events: EventWithHost[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: events.map((event) => ({
    type: 'Feature',
    id: event.id,
    geometry: {
      type: 'Point',
      coordinates: [event.location_lng, event.location_lat],
    },
    properties: {
      id: event.id,
      title: event.title,
      category: event.category?.display_name || 'Event',
      categoryColor: event.category?.color || '#007AFF',
    },
  })),
});

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const cameraRef = useRef<Mapbox.Camera>(null);

  // Location store
  const effectiveLocation = useLocationStore((state) => state.effectiveLocation);
  const gpsPermissionGranted = useLocationStore((state) => state.gpsPermissionGranted);
  const manualAddress = useLocationStore((state) => state.manualAddress);

  // Events store - use the same radius as FeedScreen
  const searchRadius = useEventsStore((state) => state.searchRadius);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventWithHost[]>([]);
  const [radiusKm, setRadiusKm] = useState(searchRadius);
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Derive map center from effective location
  const mapCenter: [number, number] = effectiveLocation
    ? [effectiveLocation.longitude, effectiveLocation.latitude]
    : DEFAULT_CENTER;

  // Initialize on mount
  useEffect(() => {
    // Location is already initialized by FeedScreen or will be available from store
    setLoading(false);
  }, []);

  // Sync radius with events store
  useEffect(() => {
    setRadiusKm(searchRadius);
  }, [searchRadius]);

  // Load events when location or radius changes
  const loadEvents = useCallback(async () => {
    if (!effectiveLocation) return;
    const nearbyEvents = await getNearbyEvents(
      effectiveLocation.latitude,
      effectiveLocation.longitude,
      radiusKm
    );
    setEvents(nearbyEvents);
  }, [effectiveLocation, radiusKm]);

  useEffect(() => {
    if (!loading && effectiveLocation) {
      loadEvents();
    }
  }, [loading, loadEvents, effectiveLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    // Adjust zoom based on radius
    const zoomLevels: Record<number, number> = {
      10: 12,
      20: 11,
      30: 10.5,
      50: 10,
      50000: 1, // World view
    };
    cameraRef.current?.setCamera({
      centerCoordinate: mapCenter,
      zoomLevel: zoomLevels[newRadius] || 12,
      animationDuration: 500,
    });
  };

  const handleMarkerPress = (event: EventWithHost) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedEvent(null);
  };

  const handleCenterOnLocation = () => {
    if (!effectiveLocation) return;

    const zoomLevels: Record<number, number> = {
      10: 12,
      20: 11,
      30: 10.5,
      50: 10,
      50000: 1,
    };

    cameraRef.current?.setCamera({
      centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
      zoomLevel: zoomLevels[radiusKm] || 12,
      animationDuration: 500,
    });
  };

  const handleOpenChat = (eventId: string) => {
    navigation.navigate('ChatNavigator', {
      screen: 'EventChat',
      params: { eventId },
    });
  };

  const geojson = eventsToGeoJSON(events);

  // Cluster layer style
  const clusterLayerStyle: Mapbox.CircleLayerStyle = {
    circleColor: colors.accent.primary,
    circleRadius: [
      'step',
      ['get', 'point_count'],
      20, // default size
      10, 28, // 10+ points
      25, 36, // 25+ points
    ],
    circleOpacity: 0.9,
  };

  // Cluster count text style
  const clusterCountStyle: Mapbox.SymbolLayerStyle = {
    textField: ['get', 'point_count_abbreviated'],
    textSize: 14,
    textColor: '#FFFFFF',
    textAllowOverlap: true,
  };

  // Individual marker style
  const markerStyle: Mapbox.CircleLayerStyle = {
    circleColor: ['get', 'categoryColor'],
    circleRadius: 12,
    circleStrokeColor: '#FFFFFF',
    circleStrokeWidth: 2,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Map</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {events.length} {events.length === 1 ? 'event' : 'events'} nearby
        </Text>
      </View>

      {/* Radius selector */}
      <View style={[styles.radiusContainer, { backgroundColor: colors.background.secondary }]}>
        {RADIUS_OPTIONS.map((radius) => (
          <TouchableOpacity
            key={radius}
            style={[
              styles.radiusButton,
              {
                backgroundColor:
                  radiusKm === radius ? colors.accent.primary : colors.background.tertiary,
              },
            ]}
            onPress={() => handleRadiusChange(radius)}
          >
            <Text
              style={[
                styles.radiusButtonText,
                {
                  color: radiusKm === radius ? '#FFFFFF' : colors.text.secondary,
                },
              ]}
            >
              {radius >= 50000 ? '>50km' : `${radius}km`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : (
          <Mapbox.MapView
            style={styles.map}
            styleURL={Mapbox.StyleURL.Street}
            onPress={() => {
              // Deselect when tapping map
              if (selectedEvent && !modalVisible) {
                setSelectedEvent(null);
              }
            }}
          >
            <Mapbox.Camera
              ref={cameraRef}
              zoomLevel={12}
              centerCoordinate={mapCenter}
            />

            {/* User location - show GPS puck when available */}
            {gpsPermissionGranted && !manualAddress && (
              <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />
            )}

            {/* Manual address marker */}
            {manualAddress && effectiveLocation && (
              <Mapbox.ShapeSource
                id="manual-location"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [effectiveLocation.longitude, effectiveLocation.latitude],
                  },
                  properties: {},
                }}
              >
                <Mapbox.CircleLayer
                  id="manual-location-marker"
                  style={{
                    circleRadius: 8,
                    circleColor: colors.accent.primary,
                    circleStrokeColor: '#FFFFFF',
                    circleStrokeWidth: 3,
                  }}
                />
              </Mapbox.ShapeSource>
            )}

            {/* Events layer with clustering */}
            <Mapbox.ShapeSource
              id="events"
              shape={geojson}
              cluster
              clusterRadius={50}
              clusterMaxZoomLevel={14}
              onPress={(e) => {
                const feature = e.features?.[0];
                if (!feature) return;

                // Check if it's a cluster
                if (feature.properties?.cluster) {
                  // Zoom into cluster
                  const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
                  cameraRef.current?.setCamera({
                    centerCoordinate: coordinates,
                    zoomLevel: (cameraRef.current as any)?._zoomLevel + 2 || 14,
                    animationDuration: 300,
                  });
                } else {
                  // Individual marker - show event detail
                  const eventId = feature.properties?.id;
                  const event = events.find((e) => e.id === eventId);
                  if (event) {
                    handleMarkerPress(event);
                  }
                }
              }}
            >
              {/* Cluster circles */}
              <Mapbox.CircleLayer
                id="clusters"
                filter={['has', 'point_count']}
                style={clusterLayerStyle}
              />

              {/* Cluster count */}
              <Mapbox.SymbolLayer
                id="cluster-count"
                filter={['has', 'point_count']}
                style={clusterCountStyle}
              />

              {/* Individual markers */}
              <Mapbox.CircleLayer
                id="unclustered-points"
                filter={['!', ['has', 'point_count']]}
                style={markerStyle}
              />
            </Mapbox.ShapeSource>

            {/* Radius circle visualization - hide for worldwide */}
            {radiusKm < 50000 && (
              <Mapbox.ShapeSource
                id="radius-circle"
                shape={{
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: mapCenter,
                  },
                  properties: {},
                }}
              >
                <Mapbox.CircleLayer
                  id="radius-fill"
                  style={{
                    circleRadius: radiusKm * 50, // Approximate visual size
                    circleColor: colors.accent.primary,
                    circleOpacity: 0.1,
                    circleStrokeColor: colors.accent.primary,
                    circleStrokeWidth: 1,
                    circleStrokeOpacity: 0.3,
                  }}
                />
              </Mapbox.ShapeSource>
            )}
          </Mapbox.MapView>
        )}

        {/* Center on location button */}
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleCenterOnLocation}
        >
          <CrosshairSimple size={22} color={colors.accent.primary} weight="bold" />
        </TouchableOpacity>

        {/* Refresh button */}
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent.primary} />
          ) : (
            <Text style={[styles.refreshText, { color: colors.accent.primary }]}>
              Refresh
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={handleCloseModal}
        onOpenChat={handleOpenChat}
        onJoinSuccess={loadEvents}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: Spacing.borderRadius.md,
    gap: 8,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.borderRadius.sm,
  },
  radiusButtonText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Spacing.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
