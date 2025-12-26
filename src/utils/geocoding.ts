import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

interface GeocodingResult {
  success: boolean;
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  error?: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  if (!address.trim()) {
    return { success: false, error: 'Address is required' };
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.center;

      return {
        success: true,
        location: { latitude, longitude },
        formattedAddress: feature.place_name,
      };
    }

    return { success: false, error: 'Address not found' };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { success: false, error: 'Failed to geocode address' };
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<{ address: string | null; error?: string }> => {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return { address: data.features[0].place_name };
    }

    return { address: null, error: 'Location not found' };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { address: null, error: 'Failed to reverse geocode' };
  }
};
