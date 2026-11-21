export interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
}

export interface Diet {
  id: string;
  name: string;
  description: string;
  goal: string;
  recommendedFoods: string[];
}
