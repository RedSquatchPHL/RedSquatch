export type HeatLevel = 'mild' | 'medium' | 'hot';
export type StorageCondition = 'fresh' | 'dried' | 'jarred' | 'frozen';
export type CocinaView = 'dashboard' | 'pantry' | 'salsas' | 'recipe' | 'shopping';

export interface PantryItem {
  id: number;
  name: string;
  category: string | null;
  quantity: string | null;
  unit: string | null;
  storage_condition: StorageCondition;
  barcode: string | null;
  created_at: string;
  updated_at: string;
}

export interface BarcodeLookupResult {
  barcode: string;
  name: string;
  category: string | null;
  image_url: string | null;
  source: string;
  cached: boolean;
}

export interface Salsa {
  id: number;
  title: string;
  description: string | null;
  heat_level: HeatLevel;
  prep_minutes: number | null;
  rating: number | null;
  tags: string[];
  image_url: string | null;
  ingredient_count: number;
  pantry_match_pct: number;
  missing_count: number;
  created_at: string;
  updated_at: string;
}

export interface SalsaIngredient {
  id: number;
  salsa_id: number;
  name: string;
  quantity: string | null;
  sort_order: number;
  in_pantry: boolean;
}

export interface SalsaStep {
  id: number;
  salsa_id: number;
  step_number: number;
  instruction: string;
  minutes: number | null;
}

export interface SalsaDetail extends Salsa {
  ingredients: SalsaIngredient[];
  steps: SalsaStep[];
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string | null;
  checked: boolean;
  source: string | null;
  created_at: string;
}
