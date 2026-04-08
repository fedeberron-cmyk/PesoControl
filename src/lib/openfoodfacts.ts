const BASE_URL = 'https://world.openfoodfacts.org';

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  product_name_es?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
  image_url?: string;
}

export async function searchFoods(query: string, page = 1): Promise<OpenFoodFactsProduct[]> {
  const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=20&lc=es`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return (data.products ?? []).filter(
    (p: OpenFoodFactsProduct) => p.product_name && p.nutriments?.['energy-kcal_100g']
  );
}

export async function getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const url = `${BASE_URL}/api/v2/product/${barcode}.json`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  return data.status === 1 ? data.product : null;
}
