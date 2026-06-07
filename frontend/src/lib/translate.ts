// src/lib/translate.ts
//
// Helper for translating DYNAMIC content from the backend API.
//
// Static UI text uses react-i18next's `t()` function.
// But API responses (species names, disease names, botanical data)
// come in English from the backend. This module provides lookup
// functions that translate those dynamic values using the i18n
// translation dictionaries.
//
// USAGE:
//   import { translateSpecies, translateDisease, translateBotanical } from '@/lib/translate';
//   const localName = translateSpecies("Monstera Deliciosa", t);
//   // Vietnamese: "Trầu bà lá xẻ"
//   // English:    "Monstera Deliciosa" (passthrough)

import type { TFunction } from 'i18next';

/**
 * Translate a species name from the AI model.
 * Falls back to the original English name if no translation exists.
 */
export function translateSpecies(speciesName: string, t: TFunction): string {
  const key = `species.${speciesName}`;
  const translated = t(key, { defaultValue: '' });
  return translated || speciesName;
}

/**
 * Translate a disease name from the AI model.
 * Falls back to the original English name if no translation exists.
 */
export function translateDisease(diseaseName: string, t: TFunction): string {
  const key = `diseases.${diseaseName}`;
  const translated = t(key, { defaultValue: '' });
  return translated || diseaseName;
}

/**
 * Translate botanical/care data from the Perenual API.
 * Handles sunlight requirements, care levels, watering guides.
 * Falls back to the original English value.
 */
export function translateBotanical(value: string, t: TFunction): string {
  const key = `botanical.${value}`;
  const translated = t(key, { defaultValue: '' });
  return translated || value;
}
