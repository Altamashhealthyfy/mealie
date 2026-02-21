import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Barcode, Plus, X } from "lucide-react";

export default function IngredientInput({ recipes = [], onAdd }) {
  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [expiryDate, setExpiryDate] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState(false);

  // Extract all unique ingredients from recipes
  const availableIngredients = useMemo(() => {
    const ingredients = new Set();
    recipes.forEach(recipe => {
      recipe.ingredients?.forEach(ing => {
        ingredients.add(ing.item.toLowerCase());
      });
    });
    return Array.from(ingredients).sort();
  }, [recipes]);

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!ingredientName.trim()) return [];
    const query = ingredientName.toLowerCase();
    return availableIngredients.filter(ing => ing.includes(query)).slice(0, 5);
  }, [ingredientName, availableIngredients]);

  const handleAddIngredient = () => {
    if (!ingredientName.trim() || !quantity) return;

    onAdd({
      ingredient_name: ingredientName.trim(),
      quantity: parseFloat(quantity),
      unit,
      expiry_date: expiryDate || null,
    });

    // Reset form
    setIngredientName("");
    setQuantity("");
    setUnit("pieces");
    setExpiryDate("");
    setShowSuggestions(false);
  };

  const handleBarcodeInput = (e) => {
    if (e.key === "Enter") {
      // In a real app, you'd lookup the barcode in a database
      // For now, just treat it as ingredient name
      setIngredientName(e.target.value);
      setBarcodeMode(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Add Ingredients to Pantry</h3>

        {/* Input Mode Selector */}
        <div className="flex gap-2">
          <Button
            onClick={() => setBarcodeMode(!barcodeMode)}
            variant={barcodeMode ? "default" : "outline"}
            className={barcodeMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <Barcode className="w-4 h-4 mr-2" />
            {barcodeMode ? "Barcode Mode" : "Manual Entry"}
          </Button>
        </div>

        {barcodeMode ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Scan Barcode
            </label>
            <Input
              autoFocus
              onKeyDown={handleBarcodeInput}
              placeholder="Scan barcode here..."
              className="text-center"
            />
            <p className="text-xs text-gray-600">
              📱 Barcode scanners work like keyboards - just scan and it will enter the ingredient
            </p>
          </div>
        ) : (
          <>
            {/* Ingredient Name with Suggestions */}
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-gray-700">
                Ingredient Name *
              </label>
              <Input
                placeholder="e.g., paneer, tomato, onion..."
                value={ingredientName}
                onChange={(e) => {
                  setIngredientName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="focus:ring-2 focus:ring-orange-500"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-orange-200 rounded-lg shadow-lg z-50">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setIngredientName(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm text-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Quantity *
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Unit
                </label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">Grams (g)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="liters">Liters (L)</SelectItem>
                    <SelectItem value="cups">Cups</SelectItem>
                    <SelectItem value="tbsp">Tablespoons (tbsp)</SelectItem>
                    <SelectItem value="tsp">Teaspoons (tsp)</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Expiry Date (Optional)
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Add Button */}
        <Button
          onClick={handleAddIngredient}
          disabled={!ingredientName.trim() || !quantity}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-11"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Pantry
        </Button>
      </div>
    </Card>
  );
}