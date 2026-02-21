import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FoodPreferenceForm({ onSubmit, isLoading = false }) {
  const [recommendedFoods, setRecommendedFoods] = useState([]);
  const [likedFoods, setLikedFoods] = useState([]);
  const [dislikedFoods, setDislikedFoods] = useState([]);
  const [currentRecommended, setCurrentRecommended] = useState("");
  const [currentLiked, setCurrentLiked] = useState("");
  const [currentDisliked, setCurrentDisliked] = useState("");

  const addFood = (food, list, setList) => {
    if (food.trim() && !list.includes(food.trim())) {
      setList([...list, food.trim()]);
      return true;
    }
    return false;
  };

  const removeFood = (food, list, setList) => {
    setList(list.filter(f => f !== food));
  };

  const handleAddRecommended = () => {
    if (addFood(currentRecommended, recommendedFoods, setRecommendedFoods)) {
      setCurrentRecommended("");
    }
  };

  const handleAddLiked = () => {
    if (addFood(currentLiked, likedFoods, setLikedFoods)) {
      setCurrentLiked("");
    }
  };

  const handleAddDisliked = () => {
    if (addFood(currentDisliked, dislikedFoods, setDislikedFoods)) {
      setCurrentDisliked("");
    }
  };

  const handleSubmit = () => {
    onSubmit({
      recommendedFoods,
      likedFoods,
      dislikedFoods
    });
  };

  const handleKeyPress = (e, addFunc) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFunc();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-purple-900 mb-2">Food Preferences</h2>
        <p className="text-sm md:text-base text-purple-700">
          Before we generate your disease-specific meal plan, let's understand your food preferences. This helps us create a personalized plan you'll actually enjoy!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recommended Foods */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
            <CardTitle className="text-lg flex items-center gap-2">
              ✅ Recommended Foods
            </CardTitle>
            <CardDescription className="text-green-50 text-sm mt-1">
              Foods that are good for your health condition
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Spinach, Beans, Fish"
                value={currentRecommended}
                onChange={(e) => setCurrentRecommended(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddRecommended)}
                className="text-sm"
              />
              <Button
                onClick={handleAddRecommended}
                size="sm"
                className="bg-green-600 hover:bg-green-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {recommendedFoods.map((food) => (
                <Badge
                  key={food}
                  className="bg-green-100 text-green-800 flex items-center gap-1.5 px-2 py-1"
                >
                  {food}
                  <button
                    onClick={() => removeFood(food, recommendedFoods, setRecommendedFoods)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {recommendedFoods.length === 0 && (
              <p className="text-xs text-gray-500 italic">Add foods you should eat more of</p>
            )}
          </CardContent>
        </Card>

        {/* Liked Foods */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4">
            <CardTitle className="text-lg flex items-center gap-2">
              ❤️ Foods I Like
            </CardTitle>
            <CardDescription className="text-blue-50 text-sm mt-1">
              Your favorite foods to include
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Chicken, Paneer, Rice"
                value={currentLiked}
                onChange={(e) => setCurrentLiked(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddLiked)}
                className="text-sm"
              />
              <Button
                onClick={handleAddLiked}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {likedFoods.map((food) => (
                <Badge
                  key={food}
                  className="bg-blue-100 text-blue-800 flex items-center gap-1.5 px-2 py-1"
                >
                  {food}
                  <button
                    onClick={() => removeFood(food, likedFoods, setLikedFoods)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {likedFoods.length === 0 && (
              <p className="text-xs text-gray-500 italic">Add your favorite foods</p>
            )}
          </CardContent>
        </Card>

        {/* Disliked Foods */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4">
            <CardTitle className="text-lg flex items-center gap-2">
              ❌ Foods I Dislike
            </CardTitle>
            <CardDescription className="text-red-50 text-sm mt-1">
              Foods to avoid in your meal plan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Mushroom, Broccoli, Egg"
                value={currentDisliked}
                onChange={(e) => setCurrentDisliked(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddDisliked)}
                className="text-sm"
              />
              <Button
                onClick={handleAddDisliked}
                size="sm"
                className="bg-red-600 hover:bg-red-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {dislikedFoods.map((food) => (
                <Badge
                  key={food}
                  className="bg-red-100 text-red-800 flex items-center gap-1.5 px-2 py-1"
                >
                  {food}
                  <button
                    onClick={() => removeFood(food, dislikedFoods, setDislikedFoods)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {dislikedFoods.length === 0 && (
              <p className="text-xs text-gray-500 italic">Add foods to avoid</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-blue-50 border-blue-300">
        <AlertDescription className="text-sm">
          💡 <strong>Tip:</strong> The more details you provide, the better your personalized meal plan will be. Include specific foods, cuisines, and ingredients you prefer.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-12 font-semibold text-base"
        >
          {isLoading ? 'Processing...' : 'Continue to AI Generation →'}
        </Button>
      </div>
    </div>
  );
}