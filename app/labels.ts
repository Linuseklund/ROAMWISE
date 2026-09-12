import { categoryDefinitions } from './catalog';

export const categoryLabel = (key: string) =>
  categoryDefinitions.find((category) => category.key === key)?.label || key;

export const categoryGlyphs: Record<string, string> = {
  Restauranger: '♨',
  Klädbutiker: '▱',
  Sneakers: '◒',
  Museum: '△',
  Utställningar: '▣',
  Sevärdheter: '◎',
  Konserter: '♫',
  Nattklubbar: '✦',
  Butiker: '▱',
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=220&q=80`;

/** Decorative thumbnails per category. */
export const categoryImages: Record<string, string> = {
  Restauranger: unsplash('photo-1517248135467-4c7edcad34c5'),
  Klädbutiker: unsplash('photo-1441986300917-64674bd600d8'),
  Sneakers: unsplash('photo-1542291026-7eec264c27ff'),
  Museum: unsplash('photo-1564399579883-451a5d44ec08'),
  Utställningar: unsplash('photo-1577083552431-6e5fd01aa342'),
  Sevärdheter: unsplash('photo-1533929736458-ca588d08c8be'),
  Konserter: unsplash('photo-1501386761578-eac5c94b800a'),
  Nattklubbar: unsplash('photo-1566737236500-c8ac43014a8e'),
  Butiker: unsplash('photo-1441986300917-64674bd600d8'),
};

const cuisineNames: Record<string, string> = {
  catalan: 'Katalanskt',
  spanish: 'Spanskt',
  italian: 'Italienskt',
  japanese: 'Japanskt',
  chinese: 'Kinesiskt',
  indian: 'Indiskt',
  mexican: 'Mexikanskt',
  mediterranean: 'Medelhav',
  pizza: 'Pizza',
  burger: 'Hamburgare',
  kebab: 'Kebab',
  tapas: 'Tapas',
  seafood: 'Fisk & skaldjur',
  vegetarian: 'Vegetariskt',
  vegan: 'Veganskt',
};

/** Swedish label for an OpenStreetMap cuisine tag such as `italian;pizza`. */
export const cuisineLabel = (value?: string) => {
  if (!value) return 'Lokalt & blandat';
  const first = value.split(';')[0].replaceAll('_', ' ').trim().toLowerCase();
  return cuisineNames[first] || first.charAt(0).toUpperCase() + first.slice(1);
};

/** Normalises free-text price hints to €, €€ or €€€. */
export const priceLabel = (value?: string) => {
  if (!value) return undefined;
  const euros = value.match(/€/g)?.length;
  if (euros) return '€'.repeat(Math.min(3, euros));
  const numeric = Number(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric >= 40 ? '€€€' : numeric >= 20 ? '€€' : '€';
};
