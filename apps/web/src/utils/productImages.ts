export const PRODUCT_IMAGES: Record<string, string> = {
  // Hot Brews
  "Espresso Single": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=80",
  "Espresso Double (Doppio)": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
  "Classic Cappuccino": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80",
  "Cafe Latte": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80",
  "Spanish Latte": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80",
  "Cafe Mocha Magic": "https://images.unsplash.com/photo-1607681034540-2c46cc71896d?w=500&auto=format&fit=crop&q=80",
  "Americano Black": "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=500&auto=format&fit=crop&q=80",

  // Cold Coffees & Frappes
  "Classic Cold Coffee": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80",
  "Iced Americano": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80",
  "Hazelnut Dream Frappe": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80",
  "Caramel Macchiato Iced": "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=500&auto=format&fit=crop&q=80",
  "Dark Mocha Frappe": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500&auto=format&fit=crop&q=80",

  // Teas
  "Kolkata Kulhad Masala Chai": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
  "Moroccan Mint Green Tea": "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=500&auto=format&fit=crop&q=80",
  "Darjeeling First Flush": "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=500&auto=format&fit=crop&q=80",
  "Iced Lemon Peach Tea": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80",

  // Bakery
  "Butter Flaky Croissant": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80",
  "Wild Blueberry Muffin": "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=80",
  "Warm Fudge Brownie": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80",
  "Banana Walnut Slice": "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500&auto=format&fit=crop&q=80",

  // Savory
  "Grilled Veg Cheese Sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80",
  "Paneer Tikka Panini": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80",
  "Chicken Club Sourdough": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80",
  "Garlic Butter Baguette": "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80",
};

export interface ImagePreset {
  label: string;
  category: string;
  url: string;
}

export const SUGGESTED_IMAGE_PRESETS: ImagePreset[] = [
  { label: 'Espresso', category: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&auto=format&fit=crop&q=80' },
  { label: 'Cappuccino Art', category: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80' },
  { label: 'Latte Mug', category: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=500&auto=format&fit=crop&q=80' },
  { label: 'Americano', category: 'Hot Coffee', url: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=500&auto=format&fit=crop&q=80' },
  { label: 'Iced Coffee', category: 'Cold Brew', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80' },
  { label: 'Caramel Frappe', category: 'Cold Brew', url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80' },
  { label: 'Kulhad Chai', category: 'Tea', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80' },
  { label: 'Green Tea', category: 'Tea', url: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=500&auto=format&fit=crop&q=80' },
  { label: 'Croissant', category: 'Bakery', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80' },
  { label: 'Blueberry Muffin', category: 'Bakery', url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=80' },
  { label: 'Choco Brownie', category: 'Bakery', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80' },
  { label: 'Grilled Sandwich', category: 'Savory', url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80' },
  { label: 'Panini Melt', category: 'Savory', url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80' },
  { label: 'Club Sandwich', category: 'Savory', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80' },
  { label: 'Garlic Baguette', category: 'Savory', url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500&auto=format&fit=crop&q=80' },
  { label: 'Cheesecake', category: 'Dessert', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop&q=80' },
];


export function getProductImage(productName?: string, explicitUrl?: string | null): string {
  if (explicitUrl && typeof explicitUrl === 'string' && explicitUrl.trim() !== '') {
    return explicitUrl.trim();
  }
  if (productName && PRODUCT_IMAGES[productName]) {
    return PRODUCT_IMAGES[productName];
  }
  // Generic cafe fallback
  return "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80";
}
