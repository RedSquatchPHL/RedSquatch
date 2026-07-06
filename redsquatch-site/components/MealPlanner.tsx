import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check, TrendingUp } from 'lucide-react';

interface MealPlan {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  customName?: string;
  notes?: string;
  createdAt: string;
}

interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  actualCost?: number;
  category: 'produce' | 'protein' | 'dairy' | 'pantry' | 'frozen' | 'other';
  mealIds: string[];
  purchased: boolean;
  purchaseDate?: string;
  createdAt: string;
}

interface GroceryBudget {
  id: string;
  period: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  limit: number;
  category?: string;
}

const MEAL_TYPES = {
  breakfast: '🍳',
  lunch: '🥙',
  dinner: '🍽️',
  snack: '🍿',
};

const CATEGORIES = {
  produce: 'Produce',
  protein: 'Protein',
  dairy: 'Dairy',
  pantry: 'Pantry',
  frozen: 'Frozen',
  other: 'Other',
};

const generateId = () => crypto.randomUUID();

const getMealsStorage = (): MealPlan[] => {
  try {
    const data = localStorage.getItem('meal-plan');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getGroceryStorage = (): GroceryItem[] => {
  try {
    const data = localStorage.getItem('grocery-items');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getBudgetStorage = (): GroceryBudget[] => {
  try {
    const data = localStorage.getItem('grocery-budgets');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveMeals = (meals: MealPlan[]) => {
  localStorage.setItem('meal-plan', JSON.stringify(meals));
};

const saveGrocery = (items: GroceryItem[]) => {
  localStorage.setItem('grocery-items', JSON.stringify(items));
};

const saveBudget = (budgets: GroceryBudget[]) => {
  localStorage.setItem('grocery-budgets', JSON.stringify(budgets));
};

const getWeekMeals = (meals: MealPlan[]): Record<string, MealPlan[]> => {
  const grouped: Record<string, MealPlan[]> = {};
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    grouped[dateStr] = meals.filter((m) => m.date === dateStr);
  }

  return grouped;
};

export default function MealPlanner() {
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [budgets, setBudgets] = useState<GroceryBudget[]>([]);
  const [activeTab, setActiveTab] = useState<'week' | 'groceries'>('week');
  const [showMealForm, setShowMealForm] = useState(false);
  const [showGroceryForm, setShowGroceryForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [mealForm, setMealForm] = useState({
    mealType: 'lunch' as MealPlan['mealType'],
    customName: '',
    notes: '',
  });

  const [groceryForm, setGroceryForm] = useState({
    name: '',
    quantity: 1,
    unit: 'ea',
    estimatedCost: 0,
    category: 'other' as GroceryItem['category'],
  });

  useEffect(() => {
    setMeals(getMealsStorage());
    setGroceries(getGroceryStorage());
    setBudgets(getBudgetStorage());
  }, []);

  const handleAddMeal = () => {
    if (!mealForm.customName) return;

    const newMeal: MealPlan = {
      id: generateId(),
      date: selectedDate,
      mealType: mealForm.mealType,
      customName: mealForm.customName,
      notes: mealForm.notes,
      createdAt: new Date().toISOString(),
    };

    const updated = [...meals, newMeal];
    setMeals(updated);
    saveMeals(updated);
    setMealForm({ mealType: 'lunch', customName: '', notes: '' });
    setShowMealForm(false);
  };

  const handleAddGrocery = () => {
    if (!groceryForm.name || groceryForm.quantity <= 0) return;

    const newItem: GroceryItem = {
      id: generateId(),
      name: groceryForm.name,
      quantity: groceryForm.quantity,
      unit: groceryForm.unit,
      estimatedCost: groceryForm.estimatedCost,
      category: groceryForm.category,
      mealIds: [],
      purchased: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [...groceries, newItem];
    setGroceries(updated);
    saveGrocery(updated);
    setGroceryForm({
      name: '',
      quantity: 1,
      unit: 'ea',
      estimatedCost: 0,
      category: 'other',
    });
    setShowGroceryForm(false);
  };

  const handleTogglePurchased = (id: string) => {
    const updated = groceries.map((g) =>
      g.id === id
        ? {
            ...g,
            purchased: !g.purchased,
            purchaseDate: !g.purchased ? new Date().toISOString().split('T')[0] : undefined,
          }
        : g
    );
    setGroceries(updated);
    saveGrocery(updated);
  };

  const handleDeleteMeal = (id: string) => {
    const updated = meals.filter((m) => m.id !== id);
    setMeals(updated);
    saveMeals(updated);
  };

  const handleDeleteGrocery = (id: string) => {
    const updated = groceries.filter((g) => g.id !== id);
    setGroceries(updated);
    saveGrocery(updated);
  };

  const weekMeals = getWeekMeals(meals);
  const unpurchasedGroceries = groceries.filter((g) => !g.purchased);
  const totalEstimated = unpurchasedGroceries.reduce((sum, g) => sum + g.estimatedCost, 0);
  const totalActual = groceries.reduce((sum, g) => sum + (g.actualCost || 0), 0);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-gradient-to-br from-slate-950 to-slate-900 text-slate-50 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-playfair">Meals & Groceries</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('week')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'week'
                ? 'bg-amber-700'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('groceries')}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === 'groceries'
                ? 'bg-amber-700'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Shopping List
          </button>
        </div>
      </div>

      {/* Week View */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowMealForm(true)}
            className="w-full bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Meal
          </button>

          {showMealForm && (
            <div className="p-4 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
              <h3 className="text-lg font-playfair mb-4">New Meal</h3>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 mb-4"
              />

              <select
                value={mealForm.mealType}
                onChange={(e) =>
                  setMealForm({ ...mealForm, mealType: e.target.value as MealPlan['mealType'] })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 mb-4"
              >
                {Object.entries(MEAL_TYPES).map(([key, emoji]) => (
                  <option key={key} value={key}>
                    {emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Meal name"
                value={mealForm.customName}
                onChange={(e) => setMealForm({ ...mealForm, customName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500 mb-4"
              />

              <textarea
                placeholder="Notes (optional)"
                value={mealForm.notes}
                onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500 mb-4"
                rows={2}
              />

              <div className="flex gap-2">
                <button
                  onClick={handleAddMeal}
                  className="flex-1 bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowMealForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Week Days */}
          <div className="space-y-3">
            {Object.entries(weekMeals).map(([date, dayMeals]) => {
              const dateObj = new Date(date + 'T00:00:00');
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
              const dayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div
                  key={date}
                  className="p-4 rounded-lg border border-amber-700 border-opacity-20 bg-slate-800 bg-opacity-30"
                >
                  <h3 className="font-playfair text-lg mb-3">
                    {dayName} • {dayDate}
                  </h3>

                  {dayMeals.length === 0 ? (
                    <p className="text-slate-400 text-sm">No meals planned</p>
                  ) : (
                    <div className="space-y-2">
                      {dayMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between p-2 bg-slate-900 bg-opacity-30 rounded"
                        >
                          <div>
                            <span className="mr-2">
                              {MEAL_TYPES[meal.mealType]}
                            </span>
                            <span>{meal.customName}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Groceries View */}
      {activeTab === 'groceries' && (
        <div className="space-y-4">
          {/* Budget Indicator */}
          <div className="p-4 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} className="text-amber-400" />
              <span className="text-sm text-slate-400">Shopping Cart</span>
            </div>
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-2xl font-bold text-amber-400">
                  ${totalEstimated.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 ml-2">estimated</span>
              </div>
              {totalActual > 0 && (
                <div>
                  <span className="text-lg text-green-400">${totalActual.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 ml-2">actual</span>
                </div>
              )}
            </div>
            <div className="w-full bg-slate-900 rounded h-2 mt-3">
              <div
                className="bg-gradient-to-r from-amber-700 to-amber-500 h-2 rounded transition-all"
                style={{ width: `${Math.min(100, (totalEstimated / 200) * 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setShowGroceryForm(true)}
            className="w-full bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Item
          </button>

          {showGroceryForm && (
            <div className="p-4 bg-slate-800 bg-opacity-50 rounded-lg border border-amber-700 border-opacity-30">
              <h3 className="text-lg font-playfair mb-4">New Grocery Item</h3>

              <input
                type="text"
                placeholder="Item name"
                value={groceryForm.name}
                onChange={(e) => setGroceryForm({ ...groceryForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500 mb-4"
              />

              <div className="grid grid-cols-3 gap-2 mb-4">
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={groceryForm.quantity}
                  onChange={(e) =>
                    setGroceryForm({ ...groceryForm, quantity: parseFloat(e.target.value) })
                  }
                  className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50"
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={groceryForm.unit}
                  onChange={(e) => setGroceryForm({ ...groceryForm, unit: e.target.value })}
                  className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  step="0.01"
                  value={groceryForm.estimatedCost}
                  onChange={(e) =>
                    setGroceryForm({ ...groceryForm, estimatedCost: parseFloat(e.target.value) })
                  }
                  className="px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 placeholder-slate-500"
                />
              </div>

              <select
                value={groceryForm.category}
                onChange={(e) =>
                  setGroceryForm({
                    ...groceryForm,
                    category: e.target.value as GroceryItem['category'],
                  })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-amber-700 border-opacity-20 rounded text-slate-50 mb-4"
              >
                {Object.entries(CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleAddGrocery}
                  className="flex-1 bg-amber-700 hover:bg-amber-600 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowGroceryForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Grocery List by Category */}
          {unpurchasedGroceries.length === 0 ? (
            <p className="text-slate-400 text-center py-8">All set! Nothing to shop for.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
                const catItems = unpurchasedGroceries.filter((g) => g.category === catKey);
                if (catItems.length === 0) return null;

                return (
                  <div key={catKey} className="p-3 rounded-lg border border-amber-700 border-opacity-20 bg-slate-800 bg-opacity-30">
                    <h4 className="text-sm font-semibold text-amber-400 mb-2">{catLabel}</h4>
                    <div className="space-y-1">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 bg-slate-900 bg-opacity-30 rounded text-sm"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => handleTogglePurchased(item.id)}
                              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                item.purchased
                                  ? 'bg-green-700 border-green-600'
                                  : 'border-slate-500 hover:border-amber-500'
                              }`}
                            >
                              {item.purchased && <Check size={14} />}
                            </button>
                            <div className="flex-1">
                              <span>{item.name}</span>
                              <span className="text-xs text-slate-500 ml-1">
                                ({item.quantity} {item.unit})
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-semibold">
                              ${item.estimatedCost.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleDeleteGrocery(item.id)}
                              className="text-red-400 hover:text-red-300 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
