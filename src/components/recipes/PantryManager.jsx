import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, ShoppingCart, Loader2 } from "lucide-react";
import { format, isBefore, parseISO } from "date-fns";
import IngredientInput from "./IngredientInput";

export default function PantryManager({ clientEmail, recipes = [] }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: pantryIngredients, isLoading } = useQuery({
    queryKey: ["pantry", clientEmail],
    queryFn: () =>
      base44.entities.PantryIngredient.filter({ client_email: clientEmail }),
    enabled: !!clientEmail,
    initialData: [],
  });

  const createIngredientMutation = useMutation({
    mutationFn: (ingredientData) =>
      base44.entities.PantryIngredient.create({
        client_email: clientEmail,
        ...ingredientData,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry", clientEmail] });
      setShowForm(false);
    },
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: (id) => base44.entities.PantryIngredient.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry", clientEmail] });
    },
  });

  const handleAddIngredient = (ingredientData) => {
    createIngredientMutation.mutate(ingredientData);
  };

  // Get expiring soon ingredients
  const expiringSoon = pantryIngredients.filter(ing => {
    if (!ing.expiry_date) return false;
    const expiryDate = parseISO(ing.expiry_date);
    const today = new Date();
    const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    return isBefore(expiryDate, in3Days) && !isBefore(expiryDate, today);
  });

  const expired = pantryIngredients.filter(ing => {
    if (!ing.expiry_date) return false;
    return isBefore(parseISO(ing.expiry_date), new Date());
  });

  // Group by category
  const groupedByCategory = React.useMemo(() => {
    const grouped = {};
    pantryIngredients.forEach(ing => {
      const cat = ing.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ing);
    });
    return grouped;
  }, [pantryIngredients]);

  const categoryEmojis = {
    vegetables: "🥬",
    fruits: "🍎",
    dairy: "🧀",
    protein: "🍗",
    grains: "🌾",
    spices: "🌶️",
    oils: "🫒",
    condiments: "🍯",
    other: "📦",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-500" />
            My Pantry
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {pantryIngredients.length} ingredient{pantryIngredients.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          Add Ingredients
        </Button>
      </div>

      {/* Alerts for expiring items */}
      {expired.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>{expired.length} expired ingredient{expired.length > 1 ? 's' : ''}!</strong> Remove them from your pantry.
          </AlertDescription>
        </Alert>
      )}

      {expiringSoon.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <AlertDescription className="text-yellow-900">
            <strong>{expiringSoon.length} ingredient{expiringSoon.length > 1 ? 's' : ''} expiring soon!</strong> Use them in your next recipes.
          </AlertDescription>
        </Alert>
      )}

      {/* Input Form */}
      {showForm && (
        <IngredientInput recipes={recipes} onAdd={handleAddIngredient} />
      )}

      {/* Empty State */}
      {pantryIngredients.length === 0 ? (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your pantry is empty
            </h3>
            <p className="text-gray-600 mb-6">
              Start adding ingredients to discover what recipes you can make!
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              Add First Ingredient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{categoryEmojis[category]}</span>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(ingredient => (
                  <Card key={ingredient.id} className="border-none shadow-md hover:shadow-lg transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 capitalize">
                          {ingredient.ingredient_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                          {ingredient.expiry_date && (
                            <Badge
                              variant="outline"
                              className={
                                expired.find(e => e.id === ingredient.id)
                                  ? "bg-red-100 border-red-300 text-red-800"
                                  : expiringSoon.find(e => e.id === ingredient.id)
                                  ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                                  : "bg-gray-100 border-gray-300"
                              }
                            >
                              Expires {format(parseISO(ingredient.expiry_date), 'MMM d')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteIngredientMutation.mutate(ingredient.id)
                        }
                        className="text-red-600 hover:bg-red-50 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}