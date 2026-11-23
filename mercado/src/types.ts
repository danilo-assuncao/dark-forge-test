export type AisleCategory = 'PRODUCE' | 'DAIRY' | 'BAKERY' | 'MEAT' | 'FROZEN' | 'PANTRY';

export type SubstitutionRule = 'ANY' | 'SAME_BRAND' | 'NONE';

export interface GroceryItem {
  id: string;
  name: string;
  price: number;
  aisle: AisleCategory;
  inStock: boolean;
}

export interface CartEntry {
  itemId: string;
  quantity: number;
  substitution: SubstitutionRule;
}
