export const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

export interface LocationItem {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string;
  citymunCode?: string;
}

export async function getProvinces(): Promise<LocationItem[]> {
  try {
    const res = await fetch(`${PSGC_BASE_URL}/provinces`);
    if (!res.ok) throw new Error('Failed to fetch provinces');
    const data = await res.json();
    return data.sort((a: LocationItem, b: LocationItem) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
}

export async function getCities(provinceCode: string): Promise<LocationItem[]> {
  if (!provinceCode) return [];
  try {
    // PSGC API supports /provinces/:code/cities-municipalities
    const res = await fetch(`${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities`);
    if (!res.ok) throw new Error('Failed to fetch cities');
    const data = await res.json();
    return data.sort((a: LocationItem, b: LocationItem) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}

export async function getBarangays(cityCode: string): Promise<LocationItem[]> {
  if (!cityCode) return [];
  try {
    // PSGC API supports /cities-municipalities/:code/barangays
    const res = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${cityCode}/barangays`);
    if (!res.ok) throw new Error('Failed to fetch barangays');
    const data = await res.json();
    return data.sort((a: LocationItem, b: LocationItem) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching barangays:', error);
    return [];
  }
}
