import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RecipeFormDialog({ recipe, onClose }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState(recipe || {
    name: '',
    description: '',
    category: 'main_course',
    meal_type: 'lunch',
    food_preference: 'veg',
    regional_cuisine: 'north',
    ingredients: [{ item: '', quantity: '', unit: 'grams' }],
    instructions: [''],
    prep_time: 0,
    cook_time: 0,
    servings: 1,
    nutritional_info: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    },
    dietary_tags: [],
    allergens: [],
    tags: [],
    difficulty_level: 'medium',
    is_published: true,
    image_url: ''
  });

  const saveRecipeMutation = useMutation({
    mutationFn: async (data) => {
      if (recipe?.id) {
        return await base44.entities.Recipe.update(recipe.id, data);
      }
      return await base44.entities.Recipe.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      toast.success(recipe ? 'Recipe updated!' : 'Recipe created!');
      onClose();
    },
    onError: () => toast.error('Failed to save recipe')
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { item: '', quantity: '', unit: 'grams' }]
    });
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const addInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, '']
    });
  };

  const removeInstruction = (index) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index)
    });
  };

  const updateInstruction = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const toggleDietaryTag = (tag) => {
    const tags = formData.dietary_tags || [];
    if (tags.includes(tag)) {
      setFormData({ ...formData, dietary_tags: tags.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, dietary_tags: [...tags, tag] });
    }
  };

  const dietaryTagOptions = [
    { value: 'vegan', label: 'Vegan' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'gluten_free', label: 'Gluten Free' },
    { value: 'dairy_free', label: 'Dairy Free' },
    { value: 'nut_free', label: 'Nut Free' },
    { value: 'low_carb', label: 'Low Carb' },
    { value: 'high_protein', label: 'High Protein' },
    { value: 'keto', label: 'Keto' },
    { value: 'paleo', label: 'Paleo' },
    { value: 'diabetic_friendly', label: 'Diabetic Friendly' },
    { value: 'heart_healthy', label: 'Heart Healthy' },
    { value: 'low_sodium', label: 'Low Sodium' },
    { value: 'low_calorie', label: 'Low Calorie' },
    { value: 'high_fiber', label: 'High Fiber' }
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Recipe Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter recipe name"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the recipe"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_course">Main Course</SelectItem>
                    <SelectItem value="side_dish">Side Dish</SelectItem>
                    <SelectItem value="appetizer">Appetizer</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="soup">Soup</SelectItem>
                    <SelectItem value="salad">Salad</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Meal Type *</Label>
                <Select value={formData.meal_type} onValueChange={(v) => setFormData({ ...formData, meal_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                    <SelectItem value="post_dinner">Post Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Food Preference *</Label>
                <Select value={formData.food_preference} onValueChange={(v) => setFormData({ ...formData, food_preference: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                    <SelectItem value="jain">Jain</SelectItem>
                    <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Regional Cuisine</Label>
                <Select value={formData.regional_cuisine} onValueChange={(v) => setFormData({ ...formData, regional_cuisine: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North Indian</SelectItem>
                    <SelectItem value="south">South Indian</SelectItem>
                    <SelectItem value="west">West Indian</SelectItem>
                    <SelectItem value="east">East Indian</SelectItem>
                    <SelectItem value="fusion">Fusion</SelectItem>
                    <SelectItem value="continental">Continental</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Difficulty Level</Label>
                <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Recipe Image</Label>
                <div className="mt-1 space-y-2">
                  {formData.image_url && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                      <img src={formData.image_url} alt="Recipe" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow"
                      >✕</button>
                    </div>
                  )}
                  <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-orange-500" />}
                    <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : formData.image_url ? 'Change Image' : 'Upload Image'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Item"
                  value={ingredient.item}
                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-24"
                />
                <Select value={ingredient.unit} onValueChange={(v) => updateIngredient(index, 'unit', v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">grams</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="liters">liters</SelectItem>
                    <SelectItem value="cups">cups</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                    <SelectItem value="tsp">tsp</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                    <SelectItem value="to_taste">to taste</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => removeIngredient(index)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
            <Button onClick={addIngredient} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cooking Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-sm font-medium text-gray-600 mt-2">{index + 1}.</span>
                <Textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  rows={2}
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={() => removeInstruction(index)}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))}
            <Button onClick={addInstruction} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </CardContent>
        </Card>

        {/* Time & Servings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time & Servings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Prep Time (min)</Label>
                <Input
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Cook Time (min)</Label>
                <Input
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Servings</Label>
                <Input
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nutritional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nutritional Information (per serving)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Calories</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.calories}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, calories: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.protein}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, protein: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.carbs}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, carbs: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Fats (g)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.fats}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, fats: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Fiber (g)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.fiber}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, fiber: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Sugar (g)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.sugar}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, sugar: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>Sodium (mg)</Label>
                <Input
                  type="number"
                  value={formData.nutritional_info.sodium}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutritional_info: { ...formData.nutritional_info, sodium: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dietary Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dietary Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dietaryTagOptions.map(tag => (
                <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.dietary_tags?.includes(tag.value)}
                    onCheckedChange={() => toggleDietaryTag(tag.value)}
                  />
                  <span className="text-sm">{tag.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveRecipeMutation.mutate(formData)}
            disabled={!formData.name || saveRecipeMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-500"
          >
            {saveRecipeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>{recipe ? 'Update' : 'Create'} Recipe</>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}