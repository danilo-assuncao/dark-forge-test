import { GroceryItem, AisleCategory } from '../types';

const groceries: GroceryItem[] = [
  { id: '1', name: 'Apples', price: 2.99, aisle: 'PRODUCE', inStock: true },
  { id: '2', name: 'Milk', price: 3.49, aisle: 'DAIRY', inStock: true },
  { id: '3', name: 'Bread', price: 2.49, aisle: 'BAKERY', inStock: true },
];

export function listGroceries(): GroceryItem[] {
  return groceries;
}

export function filterByAisle(aisle: AisleCategory): GroceryItem[] {
  return groceries.filter(item => item.aisle === aisle);
}

export function getGroceryById(id: string): GroceryItem | undefined {
  return groceries.find(item => item.id === id);
}
