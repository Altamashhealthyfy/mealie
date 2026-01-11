import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChefHat, Plus, Search, Filter, Clock, Users, Flame, Grid, List, Eye, Edit, Trash2, Star } from 'lucide-react';
import RecipeFormDialog from '@/components/recipes/RecipeFormDialog';
import RecipeDetailView from '@/components/recipes/RecipeDetailView';
import { toast } from 'sonner';

export default function RecipeManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  
  const [filters, setFilters] = useState({
    meal_type: 'all',
    food_preference: 'all',
    category: 'all',
    dietary_tags: [],
    difficulty: 'all'
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list('-created_date', 500),
    initialData: [],
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (id) => base44.entities.Recipe.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['recipes']);
      toast.success('Recipe deleted successfully!');
    },
    onError: () => toast.error('Failed to delete recipe')
  });

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMealType = filters.meal_type === 'all' || recipe.meal_type === filters.meal_type;
    const matchesFoodPref = filters.food_preference === 'all' || recipe.food_preference === filters.food_preference;
    const matchesCategory = filters.category === 'all' || recipe.category === filters.category;
    const matchesDifficulty = filters.difficulty === 'all' || recipe.difficulty_level === filters.difficulty;
    const matchesDietaryTags = filters.dietary_tags.length === 0 || 
                               filters.dietary_tags.every(tag => recipe.dietary_tags?.includes(tag));
    
    return matchesSearch && matchesMealType && matchesFoodPref && matchesCategory && matchesDifficulty && matchesDietaryTags;
  });

  const handleEdit = (recipe) => {
    setEditingRecipe(recipe);
    setShowCreateDialog(true);
  };

  const handleView = (recipe) => {
    setSelectedRecipe(recipe);
    setShowDetailView(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      deleteRecipeMutation.mutate(id);
    }
  };

  const dietaryTagOptions = [
    'vegan', 'vegetarian', 'gluten_free', 'dairy_free', 'nut_free',
    'low_carb', 'high_protein', 'keto', 'paleo', 'diabetic_friendly',
    'heart_healthy', 'low_sodium', 'low_calorie', 'high_fiber'
  ];

  const formatDietaryTag = (tag) => {
    return tag.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const RecipeCard = ({ recipe }) => (
    <Card className="overflow-hidden hover:shadow-lg transition group">
      {recipe.image_url ? (
        <div className="h-48 overflow-hidden">
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
          <ChefHat className="w-16 h-16 text-orange-500" />
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-1">{recipe.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="outline" className="text-xs">{recipe.meal_type}</Badge>
          <Badge variant="secondary" className="text-xs">{recipe.food_preference}</Badge>
          {recipe.difficulty_level && (
            <Badge className="text-xs bg-purple-100 text-purple-700">{recipe.difficulty_level}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {(recipe.prep_time || recipe.cook_time) && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings}</span>
            </div>
          )}
          {recipe.nutritional_info?.calories && (
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              <span>{recipe.nutritional_info.calories} cal</span>
            </div>
          )}
        </div>

        {recipe.dietary_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.dietary_tags.slice(0, 3).map(tag => (
              <Badge key={tag} className="text-xs bg-green-100 text-green-700">
                {formatDietaryTag(tag)}
              </Badge>
            ))}
            {recipe.dietary_tags.length > 3 && (
              <Badge className="text-xs bg-gray-100 text-gray-700">
                +{recipe.dietary_tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => handleView(recipe)} size="sm" variant="outline" className="flex-1">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button onClick={() => handleEdit(recipe)} size="sm" variant="outline">
            <Edit className="w-4 h-4" />
          </Button>
          <Button onClick={() => handleDelete(recipe.id)} size="sm" variant="outline" className="text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const RecipeListItem = ({ recipe }) => (
    <Card className="hover:shadow-md transition">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.name} className="w-24 h-24 object-cover rounded" />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-orange-500" />
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-lg">{recipe.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-1">{recipe.description}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleView(recipe)} size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button onClick={() => handleEdit(recipe)} size="sm" variant="outline">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button onClick={() => handleDelete(recipe.id)} size="sm" variant="outline" className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className="text-xs">{recipe.meal_type}</Badge>
              <Badge variant="secondary" className="text-xs">{recipe.food_preference}</Badge>
              {recipe.category && <Badge className="text-xs">{recipe.category}</Badge>}
              {recipe.difficulty_level && (
                <Badge className="text-xs bg-purple-100 text-purple-700">{recipe.difficulty_level}</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {(recipe.prep_time || recipe.cook_time) && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              {recipe.nutritional_info?.calories && (
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  <span>{recipe.nutritional_info.calories} calories</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <ChefHat className="w-10 h-10 text-orange-500" />
              Recipe Management
            </h1>
            <p className="text-gray-600 mt-1">Create and manage your recipe library</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) setEditingRecipe(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <Plus className="w-5 h-5 mr-2" />
                New Recipe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <RecipeFormDialog recipe={editingRecipe} onClose={() => {
                setShowCreateDialog(false);
                setEditingRecipe(null);
              }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{recipes.length}</p>
                <p className="text-sm text-gray-600">Total Recipes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {recipes.filter(r => r.food_preference === 'veg').length}
                </p>
                <p className="text-sm text-gray-600">Vegetarian</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {recipes.filter(r => r.dietary_tags?.includes('high_protein')).length}
                </p>
                <p className="text-sm text-gray-600">High Protein</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {recipes.filter(r => r.dietary_tags?.includes('low_carb')).length}
                </p>
                <p className="text-sm text-gray-600">Low Carb</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.meal_type} onValueChange={(v) => setFilters({...filters, meal_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Meal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meals</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.food_preference} onValueChange={(v) => setFilters({...filters, food_preference: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Veg</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.difficulty} onValueChange={(v) => setFilters({...filters, difficulty: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipes Display */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading recipes...</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">No recipes found</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Recipe
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {filteredRecipes.map(recipe => (
              viewMode === 'grid' ? 
                <RecipeCard key={recipe.id} recipe={recipe} /> :
                <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {/* Recipe Detail View Dialog */}
        <Dialog open={showDetailView} onOpenChange={setShowDetailView}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedRecipe && <RecipeDetailView recipe={selectedRecipe} onClose={() => setShowDetailView(false)} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}