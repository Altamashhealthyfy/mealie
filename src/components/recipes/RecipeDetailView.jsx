import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Flame, ChefHat } from 'lucide-react';

export default function RecipeDetailView({ recipe }) {
  const formatDietaryTag = (tag) => {
    return tag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {recipe.image_url && (
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-64 object-cover rounded-lg" />
        )}

        {recipe.description && (
          <p className="text-gray-600">{recipe.description}</p>
        )}

        {/* Quick Info */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Total Time</p>
              <p className="text-sm text-gray-600">{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Servings</p>
              <p className="text-sm text-gray-600">{recipe.servings || 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Calories</p>
              <p className="text-sm text-gray-600">{recipe.nutritional_info?.calories || 0} cal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Difficulty</p>
              <p className="text-sm text-gray-600 capitalize">{recipe.difficulty_level || 'Medium'}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{recipe.meal_type}</Badge>
          <Badge variant="secondary">{recipe.food_preference}</Badge>
          {recipe.category && <Badge>{recipe.category}</Badge>}
          {recipe.regional_cuisine && <Badge variant="outline">{recipe.regional_cuisine}</Badge>}
        </div>

        {recipe.dietary_tags?.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Dietary Tags:</p>
            <div className="flex flex-wrap gap-2">
              {recipe.dietary_tags.map(tag => (
                <Badge key={tag} className="bg-green-100 text-green-700">
                  {formatDietaryTag(tag)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="font-medium">{ing.quantity} {ing.unit}</span>
                  <span>{ing.item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {recipe.instructions?.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-gray-700">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Nutritional Information */}
        {recipe.nutritional_info && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nutritional Information (per serving)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Calories</p>
                  <p className="text-lg font-bold">{recipe.nutritional_info.calories || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Protein</p>
                  <p className="text-lg font-bold">{recipe.nutritional_info.protein || 0}g</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carbs</p>
                  <p className="text-lg font-bold">{recipe.nutritional_info.carbs || 0}g</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fats</p>
                  <p className="text-lg font-bold">{recipe.nutritional_info.fats || 0}g</p>
                </div>
                {recipe.nutritional_info.fiber > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Fiber</p>
                    <p className="text-lg font-bold">{recipe.nutritional_info.fiber}g</p>
                  </div>
                )}
                {recipe.nutritional_info.sugar > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Sugar</p>
                    <p className="text-lg font-bold">{recipe.nutritional_info.sugar}g</p>
                  </div>
                )}
                {recipe.nutritional_info.sodium > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Sodium</p>
                    <p className="text-lg font-bold">{recipe.nutritional_info.sodium}mg</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}