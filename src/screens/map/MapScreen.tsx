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
import { CATEGORY_COLORS } from '../../utils/constants';
import { getAllEvents } from '../../services/events';
import { supabase } from '../../config/supabase';
import { useLocationStore } from '../../stores/locationStore';
import { EventWithHost } from '../../types/database';
import EventDetailModal from '../../components/events/EventDetailModal';
import CreateEventModal from '../../components/events/CreateEventModal';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usePinImages } from '../../components/map/usePinImages';

const DEFAULT_CENTER: [number, number] = [-73.9857, 40.7484]; // New York [lng, lat]

// Clustering configuration
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 14;

// Default category for events without category
const DEFAULT_CATEGORY = 'sports_hobbies';

// Convert events to GeoJSON FeatureCollection with category info
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
      categoryName: event.category?.name || DEFAULT_CATEGORY,
      color: event.category?.color || CATEGORY_COLORS[event.category?.name || ''] || '#007AFF',
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

  // Pin images for custom markers
  const { pinImages, isLoading: pinsLoading, PinGenerator } = usePinImages();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventWithHost[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventWithHost | null>(null);

  // Derive map center from effective location
  const mapCenter: [number, number] = effectiveLocation
    ? [effectiveLocation.longitude, effectiveLocation.latitude]
    : DEFAULT_CENTER;

  // Load all events worldwide
  // Note: getAllEvents already filters based on participation status
  // - Future events shown to everyone
  // - Ongoing events shown only to participants
  const loadEvents = useCallback(async () => {
    const allEvents = await getAllEvents();
    setEvents(allEvents);
  }, []);

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
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEvents]);

  // Auto-refresh events every minute to update visibility based on start/end times
  useEffect(() => {
    const interval = setInterval(() => {
      loadEvents();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadEvents]);

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

  const handleEditEvent = (event: EventWithHost) => {
    setEventToEdit(event);
    setEditModalVisible(true);
  };

  const geojson = useMemo(() => eventsToGeoJSON(events), [events]);

  // Cluster outer circle style
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

  // Cluster inner circle style
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

  // Unclustered point style - custom pin icons
  const unclusteredPointStyle = {
    iconImage: ['get', 'categoryName'],
    iconSize: 0.2,
    iconAnchor: 'bottom',
    iconAllowOverlap: true,
  } as Mapbox.SymbolLayerStyle;

  // Handle tap on cluster or point
  const handleShapePress = useCallback(async (e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;

    const props = feature.properties || {};

    // If it's a cluster, zoom in
    if (props.point_count) {
      try {
        const clusterId = props.cluster_id;
        const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom(clusterId);
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: Math.min(expansionZoom ?? 14, 18),
          animationDuration: 300,
        });
      } catch {
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        cameraRef.current?.setCamera({
          centerCoordinate: coordinates,
          zoomLevel: 14,
          animationDuration: 300,
        });
      }
    } else {
      // It's a single point - find the event and show modal
      const eventId = props.id;
      const event = events.find((ev) => ev.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setModalVisible(true);
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
        {loading || pinsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent.primary} />
          </View>
        ) : (
          <Mapbox.MapView
            style={styles.map}
            styleURL={activeTheme === 'dark' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
            onPress={() => {
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

            {/* Load custom pin images */}
            {pinImages && <Mapbox.Images images={pinImages} />}

            {/* Clustering layer */}
            <Mapbox.ShapeSource
              id="events-clusters"
              ref={shapeSourceRef}
              shape={geojson}
              cluster
              clusterRadius={CLUSTER_RADIUS}
              clusterMaxZoomLevel={CLUSTER_MAX_ZOOM}
              onPress={handleShapePress}
            >
              {/* Cluster circles */}
              <Mapbox.CircleLayer
                id="clusters"
                filter={['has', 'point_count']}
                style={clusterOuterStyle}
              />
              <Mapbox.CircleLayer
                id="clusters-inner"
                filter={['has', 'point_count']}
                style={clusterInnerStyle}
              />
              <Mapbox.SymbolLayer
                id="cluster-count"
                filter={['has', 'point_count']}
                style={clusterCountStyle}
              />
              {/* Unclustered points - custom pin icons */}
              <Mapbox.SymbolLayer
                id="unclustered-points"
                filter={['!', ['has', 'point_count']]}
                style={unclusteredPointStyle}
              />
            </Mapbox.ShapeSource>

            {/* User location marker - rendered below clusters */}
            {effectiveLocation && (
              <Mapbox.ShapeSource
                id="user-location"
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
                  id="user-location-pulse"
                  belowLayerID="clusters"
                  style={{
                    circleRadius: 24,
                    circleColor: colors.accent.primary,
                    circleOpacity: 0.15,
                  }}
                />
                <Mapbox.CircleLayer
                  id="user-location-dot"
                  belowLayerID="clusters"
                  style={{
                    circleRadius: 8,
                    circleColor: colors.accent.primary,
                    circleStrokeColor: '#FFFFFF',
                    circleStrokeWidth: 3,
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
        onEdit={handleEditEvent}
        onViewProfile={(userId) => {
          navigation.navigate('Chat', {
            screen: 'UserProfile',
            params: { userId },
          });
        }}
      />

      <CreateEventModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        onEditSuccess={loadEvents}
      />

      {/* Hidden component for generating pin images */}
      {PinGenerator}
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
