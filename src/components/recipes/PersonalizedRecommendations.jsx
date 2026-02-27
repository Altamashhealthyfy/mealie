import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ChefHat, Clock, Users, Flame, RefreshCw, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PersonalizedRecommendations({ onViewRecipe }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['personalizedRecipes', refreshKey],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPersonalizedRecipes', {
        limit: 6
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-500 mb-4" />
          <p className="text-gray-600">Analyzing your preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !recommendations?.success) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">
          Failed to load personalized recommendations. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!recommendations.recommendations || recommendations.recommendations.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Recommendations Available</h3>
          <p className="text-gray-600">Complete your profile to get personalized recipe suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Personalized For You</CardTitle>
                <CardDescription className="text-gray-700">
                  Based on your {recommendations.user_preferences?.food_preference} preference, {recommendations.user_preferences?.regional_preference} cuisine, and {recommendations.user_preferences?.goal?.replace(/_/g, ' ')} goals
                  {recommendations.user_preferences?.allergies?.length > 0 && (
                    <span className="ml-1 text-red-600">· Allergens excluded: {recommendations.user_preferences.allergies.join(', ')}</span>
                  )}
                  {recommendations.user_preferences?.health_conditions?.length > 0 && (
                    <span className="ml-1 text-blue-600">· Optimised for: {recommendations.user_preferences.health_conditions.join(', ').replace(/_/g, ' ')}</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {recommendations.reasoning && (
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>Why these recipes?</strong> {recommendations.reasoning}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.recommendations.map((recipe, index) => (
          <Card
            key={recipe.id}
            className="border-none shadow-lg bg-white hover:shadow-xl transition-all group relative overflow-hidden"
          >
            {/* Recommendation Rank Badge */}
            <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              #{index + 1} Match
            </div>

            {recipe.image_url ? (
              <div className="h-48 rounded-t-xl overflow-hidden relative">
                <img 
                  src={recipe.image_url} 
                  alt={recipe.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="h-48 bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 rounded-t-xl flex items-center justify-center">
                <ChefHat className="w-16 h-16 text-purple-300 opacity-20" />
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-lg line-clamp-2">{recipe.name}</CardTitle>
              {recipe.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-1">{recipe.description}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-orange-100 text-orange-700 capitalize">
                  {recipe.meal_type}
                </Badge>
                <Badge className="bg-green-100 text-green-700 capitalize">
                  {recipe.food_preference}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {recipe.regional_cuisine}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} servings</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  <span>{recipe.calories} kcal</span>
                </div>
              </div>

              <Button
                onClick={() => onViewRecipe(recipe)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}