import { popularPlaces } from '@/data/places';
import type { PlaceSuggestion } from '@/types';

type AmapPoi = {
  id?: string;
  name?: string;
  address?: string;
  cityname?: string;
  adname?: string;
};

type PhotonFeature = {
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    countrycode?: string;
  };
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[·,，]/g, '');
}

function unique(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

export function searchLocalPlaces(query: string, knownPlaces: string[] = []) {
  const fromRides: PlaceSuggestion[] = knownPlaces.map((name, index) => ({
    id: `known-${index}-${name}`,
    name,
    address: '已保存地点',
    source: 'recent',
  }));
  const all = [...popularPlaces, ...fromRides];
  const key = normalize(query);
  const seen = new Set<string>();

  return all
    .filter((place) => !key || normalize(`${place.name}${place.address}`).includes(key))
    .filter((place) => {
      const dedupeKey = `${place.name}-${place.address}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .slice(0, 8);
}

export async function searchOnlinePlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];

  const amapKey = process.env.EXPO_PUBLIC_AMAP_WEB_SERVICE_KEY?.trim();
  if (amapKey) {
    const url =
      'https://restapi.amap.com/v3/place/text?' +
      new URLSearchParams({
        key: amapKey,
        keywords: cleaned,
        offset: '8',
        page: '1',
        extensions: 'base',
      }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) return [];
    const body = (await response.json()) as { status?: string; pois?: AmapPoi[] };
    if (body.status !== '1') return [];
    return (body.pois ?? [])
      .filter((poi) => Boolean(poi.name))
      .map((poi, index) => ({
        id: poi.id ?? `amap-${index}`,
        name: poi.name ?? '',
        address: unique([poi.cityname, poi.adname, poi.address]).join(' · ') || '高德地图地点',
        source: 'amap' as const,
      }));
  }

  const photonUrl =
    'https://photon.komoot.io/api/?' +
    new URLSearchParams({
      q: cleaned,
      limit: '8',
    }).toString();
  const response = await fetch(photonUrl, { signal });
  if (!response.ok) return [];
  const body = (await response.json()) as { features?: PhotonFeature[] };

  return (body.features ?? [])
    .filter((feature) => feature.properties?.countrycode === 'CN' && feature.properties.name)
    .map((feature, index) => {
      const props = feature.properties ?? {};
      return {
        id: `osm-${props.osm_type ?? 'place'}-${props.osm_id ?? index}`,
        name: props.name ?? '',
        address:
          unique([props.state, props.city, props.district, props.street]).join(' · ') ||
          '地图地点',
        source: 'osm' as const,
      };
    });
}
