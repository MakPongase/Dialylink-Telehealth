/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
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
    
    // Inject Metro Manila (NCR) as a pseudo-province for UX
    const ncr = {
      code: '130000000',
      name: 'Metro Manila',
      regionCode: '130000000',
    };
    
    const allProvinces = [...data, ncr];
    return allProvinces.sort((a: LocationItem, b: LocationItem) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return [];
  }
}

export async function getCities(provinceCode: string): Promise<LocationItem[]> {
  if (!provinceCode) return [];
  try {
    // If Metro Manila (130000000), fetch from regions endpoint
    const isNCR = provinceCode === '130000000';
    const endpoint = isNCR 
      ? `${PSGC_BASE_URL}/regions/${provinceCode}/cities-municipalities`
      : `${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities`;
      
    const res = await fetch(endpoint);
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
