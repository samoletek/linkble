import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox';

export interface GeocodingResult {
  success: boolean;
  location?: { latitude: number; longitude: number };
  formattedAddress?: string;
  error?: string;
}

export interface AddressSuggestion {
  id: string;
  name: string;
  address: string;
  fullAddress: string;
  location: { latitude: number; longitude: number };
}

const DEFAULT_COUNTRY = 'fi';
const DEFAULT_LANGUAGE = 'fi,en';
const DEFAULT_TYPES = 'address,place,locality,neighborhood,postcode';

const getFeaturesFromUrl = async (url: string): Promise<any[]> => {
  const response = await fetch(url);
  const data = await response.json();
  return Array.isArray(data?.features) ? data.features : [];
};

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  if (!address.trim()) {
    return { success: false, error: 'Address is required' };
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const baseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=${DEFAULT_TYPES}&language=${DEFAULT_LANGUAGE}&limit=1&autocomplete=true&fuzzy_match=true`;
    let features = await getFeaturesFromUrl(`${baseUrl}&country=${DEFAULT_COUNTRY}`);
    if (features.length === 0) {
      // Finland-first, then global fallback for edge cases.
      features = await getFeaturesFromUrl(baseUrl);
    }

    if (features.length > 0) {
      const feature = features[0];
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

export const searchAddressSuggestions = async (
  query: string,
  limit: number = 5
): Promise<{ success: boolean; suggestions?: AddressSuggestion[]; error?: string }> => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return { success: true, suggestions: [] };
  }

  try {
    const safeLimit = Math.max(1, Math.min(limit, 10));
    const encodedQuery = encodeURIComponent(trimmedQuery);
    const baseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=${DEFAULT_TYPES}&language=${DEFAULT_LANGUAGE}&limit=${safeLimit}&autocomplete=true&fuzzy_match=true`;
    let features = await getFeaturesFromUrl(`${baseUrl}&country=${DEFAULT_COUNTRY}`);
    if (features.length === 0) {
      features = await getFeaturesFromUrl(baseUrl);
    }

    const suggestions: AddressSuggestion[] = features
      .filter((feature: any) => Array.isArray(feature?.center) && feature.center.length >= 2)
      .map((feature: any) => {
        const [longitude, latitude] = feature.center;
        const fullAddress = feature.place_name || feature.text || '';
        const title = feature.text || fullAddress;
        const shortAddress = fullAddress.startsWith(`${title}, `)
          ? fullAddress.slice(title.length + 2)
          : fullAddress;

        return {
          id: String(feature.id || fullAddress),
          name: title,
          address: shortAddress || fullAddress,
          fullAddress,
          location: { latitude, longitude },
        };
      });

    return { success: true, suggestions };
  } catch (error) {
    console.error('Address suggestions error:', error);
    return { success: false, error: 'Failed to load address suggestions' };
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<{ address: string | null; error?: string }> => {
  try {
    const baseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&language=${DEFAULT_LANGUAGE}&limit=1`;
    let features = await getFeaturesFromUrl(`${baseUrl}&country=${DEFAULT_COUNTRY}`);
    if (features.length === 0) {
      features = await getFeaturesFromUrl(baseUrl);
    }

    if (features.length > 0) {
      return { address: features[0].place_name };
    }

    return { address: null, error: 'Location not found' };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return { address: null, error: 'Failed to reverse geocode' };
  }
};
