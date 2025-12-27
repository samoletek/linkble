import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NavigationArrow } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox, { ShapeSource } from '@rnmapbox/maps';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants';
import { getAllEvents } from '../../services/events';
import { supabase } from '../../config/supabase';
import { useLocationStore } from '../../stores/locationStore';
import { EventWithHost } from '../../types/database';
import EventDetailModal from '../../components/events/EventDetailModal';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const DEFAULT_CENTER: [number, number] = [-73.9857, 40.7484]; // New York [lng, lat]

// Clustering configuration
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_MIN_POINTS = 2;

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
  const { colors, activeTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const shapeSourceRef = useRef<ShapeSource>(null);

  // Location store
  const effectiveLocation = useLocationStore((state) => state.effectiveLocation);
  const gpsPermissionGranted = useLocationStore((state) => state.gpsPermissionGranted);
  const manualAddress = useLocationStore((state) => state.manualAddress);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithHost[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Derive map center from effective location
  const mapCenter: [number, number] = effectiveLocation
    ? [effectiveLocation.longitude, effectiveLocation.latitude]
    : DEFAULT_CENTER;

  // Filter events to only show upcoming ones (not started yet)
  const filterUpcomingEvents = useCallback((eventsList: EventWithHost[]) => {
    const now = new Date();
    return eventsList.filter((event) => new Date(event.start_time) > now);
  }, []);

  // Load all events worldwide
  const loadEvents = useCallback(async () => {
    const allEvents = await getAllEvents();
    setEvents(filterUpcomingEvents(allEvents));
  }, [filterUpcomingEvents]);

  // Initialize and load events
  useEffect(() => {
    loadEvents();
    setLoading(false);
  }, [loadEvents]);

  // Reload events when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  // Real-time subscription for events
  useEffect(() => {
    const channel = supabase
      .channel('map-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          // Reload events on any change
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEvents]);

  // Auto-remove started events every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents((current) => filterUpcomingEvents(current));
    }, 60000);

    return () => clearInterval(interval);
  }, [filterUpcomingEvents]);

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

    cameraRef.current?.setCamera({
      centerCoordinate: [effectiveLocation.longitude, effectiveLocation.latitude],
      zoomLevel: 12,
      animationDuration: 500,
    });
  };

  const handleOpenChat = (eventId: string) => {
    navigation.navigate('ChatNavigator', {
      screen: 'EventChat',
      params: { eventId },
    });
  };

  const geojson = useMemo(() => eventsToGeoJSON(events), [events]);

  // Cluster outer circle style - scales with point count
  const clusterOuterStyle = {
    circleColor: colors.accent.primary,
    circleRadius: [
      'step',
      ['get', 'point_count'],
      22,
      10, 28,
      50, 36,
      100, 44,
    ],
    circleOpacity: 0.85,
  } as Mapbox.CircleLayerStyle;

  // Cluster inner circle style - white ring effect
  const clusterInnerStyle = {
    circleColor: '#FFFFFF',
    circleRadius: [
      'step',
      ['get', 'point_count'],
      16,
      10, 20,
      50, 26,
      100, 32,
    ],
    circleOpacity: 0.25,
  } as Mapbox.CircleLayerStyle;

  // Cluster count text style
  const clusterCountStyle = {
    textField: ['get', 'point_count_abbreviated'],
    textSize: [
      'step',
      ['get', 'point_count'],
      14,
      10, 16,
      50, 18,
      100, 20,
    ],
    textColor: '#FFFFFF',
    textAllowOverlap: true,
  } as Mapbox.SymbolLayerStyle;

  // Pin marker shadow style - scales with zoom
  const markerShadowStyle = {
    circleColor: '#000000',
    circleRadius: [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 10,
      14, 14,
      18, 18,
    ],
    circleOpacity: 0.12,
    circleTranslate: [0, 2],
    circleBlur: 0.6,
  } as Mapbox.CircleLayerStyle;

  // Pin marker main style - category colored, scales with zoom
  const markerStyle = {
    circleColor: ['get', 'categoryColor'],
    circleRadius: [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 8,
      14, 12,
      18, 16,
    ],
    circleStrokeColor: '#FFFFFF',
    circleStrokeWidth: [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 2,
      14, 3,
      18, 4,
    ],
  } as Mapbox.CircleLayerStyle;

  // Pin marker inner dot style - scales with zoom
  const markerInnerStyle = {
    circleColor: '#FFFFFF',
    circleRadius: [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 3,
      14, 4,
      18, 5,
    ],
  } as Mapbox.CircleLayerStyle;

  // Handle tap on cluster or pin
  const handleShapePress = useCallback(async (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const props = feature.properties || {};

    // Check if it's a cluster (has point_count)
    if (props.point_count) {
      try {
        // Get the optimal zoom level to expand this cluster
        const clusterId = props.cluster_id;
        const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom(clusterId);
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: Math.min(expansionZoom ?? 14, 18),
          animationDuration: 300,
        });
      } catch {
        // Fallback: zoom in by 2 levels
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: 14,
          animationDuration: 300,
        });
      }
    } else {
      // Individual marker - show event detail
      const eventId = props.id;
      const event = events.find((e) => e.id === eventId);
      if (event) {
        handleMarkerPress(event);
      }
    }
  }, [events]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Map</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {events.length} {events.length === 1 ? 'event' : 'events'} worldwide
        </Text>
      </View>

      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : (
          <Mapbox.MapView
            style={styles.map}
            styleURL={activeTheme === 'dark' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
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
              ref={shapeSourceRef}
              shape={geojson}
              cluster
              clusterRadius={CLUSTER_RADIUS}
              clusterMaxZoomLevel={CLUSTER_MAX_ZOOM}
              clusterMinPoints={CLUSTER_MIN_POINTS}
              onPress={handleShapePress}
            >
              {/* Cluster outer circle */}
              <Mapbox.CircleLayer
                id="clusters"
                filter={['has', 'point_count']}
                style={clusterOuterStyle}
              />

              {/* Cluster inner circle - white ring effect */}
              <Mapbox.CircleLayer
                id="clusters-inner"
                filter={['has', 'point_count']}
                style={clusterInnerStyle}
              />

              {/* Cluster count text */}
              <Mapbox.SymbolLayer
                id="cluster-count"
                filter={['has', 'point_count']}
                style={clusterCountStyle}
              />

              {/* Individual markers - shadow */}
              <Mapbox.CircleLayer
                id="unclustered-shadow"
                filter={['!', ['has', 'point_count']]}
                style={markerShadowStyle}
              />

              {/* Individual markers - main pin (category colored) */}
              <Mapbox.CircleLayer
                id="unclustered-points"
                filter={['!', ['has', 'point_count']]}
                style={markerStyle}
              />

              {/* Individual markers - inner dot */}
              <Mapbox.CircleLayer
                id="unclustered-inner"
                filter={['!', ['has', 'point_count']]}
                style={markerInnerStyle}
              />
            </Mapbox.ShapeSource>
          </Mapbox.MapView>
        )}

        {/* Center on location button */}
        <TouchableOpacity
          style={[styles.centerButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleCenterOnLocation}
        >
          <NavigationArrow size={22} color={colors.accent.primary} weight="bold" />
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
    bottom: 47,
    right: 20,
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
});
