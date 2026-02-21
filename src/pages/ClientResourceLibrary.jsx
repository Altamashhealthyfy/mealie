import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, BookOpen, Search, Filter, ExternalLink } from 'lucide-react';
import ResourceRatingDialog from '@/components/resources/ResourceRatingDialog';
import { toast } from 'sonner';

const CATEGORIES = [
  'All Categories',
  'nutrition', 'fitness', 'mental_health', 'disease_management',
  'meal_planning', 'cooking', 'lifestyle', 'supplements', 'sleep', 'stress_management'
];

export default function ClientResourceLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: resources = [], isLoading, refetch } = useQuery({
    queryKey: ['clientResources', user?.email],
    queryFn: async () => {
      if (!clientProfile?.assigned_coach) return [];
      const coachRes = await base44.entities.Resource.filter(
        { coach_email: clientProfile.assigned_coach, is_public: true },
        '-created_date',
        100
      );
      return coachRes;
    },
    enabled: !!clientProfile?.assigned_coach,
  });

  const { data: aiResources = [] } = useQuery({
    queryKey: ['clientAIResources', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.AIGeneratedResource.filter(
        { client_id: clientProfile.id },
        '-created_date',
        50
      );
    },
    enabled: !!clientProfile?.id,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ['resourceRatings', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.ResourceRating.filter(
        { client_id: clientProfile.id }
      );
    },
    enabled: !!clientProfile?.id,
  });

  const allResources = [
    ...resources.map(r => ({ ...r, isAI: false })),
    ...aiResources.map(r => ({ ...r, isAI: true, type: r.resource_type }))
  ];

  const filteredResources = allResources.filter(resource => {
    const matchesSearch = resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All Categories' ||
      resource.category === selectedCategory ||
      resource.client_goals?.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  const getRating = (resourceId) => {
    return ratings.find(r => r.resource_id === resourceId);
  };

  const handleOpenRatingDialog = (resource) => {
    setSelectedResource(resource);
    setRatingDialogOpen(true);
  };

  const renderRating = (resourceId) => {
    const rating = getRating(resourceId);
    if (!rating) return null;

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">({rating.rating})</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 Resource Library</h1>
          <p className="text-gray-600 mt-1">Explore personalized resources and educational materials tailored to your goals</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{allResources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Personalized for You</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{aiResources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Your Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{ratings.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources..."
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Personalized AI Resources */}
        {aiResources.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">✨ Personalized for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResources.map(resource => (
                <Card key={resource.id} className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                        AI Generated
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {resource.difficulty_level}
                      </Badge>
                    </div>
                    <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="line-clamp-2">
                      {resource.summary}
                    </CardDescription>

                    {/* Goals */}
                    {resource.client_goals?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">🎯 Targets:</div>
                        <div className="flex gap-1 flex-wrap">
                          {resource.client_goals.slice(0, 2).map(goal => (
                            <Badge key={goal} variant="secondary" className="text-xs">
                              {goal.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gaps */}
                    {resource.identified_gaps?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-700 mb-1">🔍 Addresses:</div>
                        <div className="flex gap-1 flex-wrap">
                          {resource.identified_gaps.slice(0, 2).map(gap => (
                            <Badge key={gap} variant="secondary" className="text-xs bg-red-100 text-red-800">
                              {gap.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rating */}
                    <div>
                      {renderRating(resource.id)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = '#';
                          link.textContent = 'View';
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600"
                        onClick={() => handleOpenRatingDialog(resource)}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Rate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Resources */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">📖 All Resources</h2>
          {filteredResources.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No resources found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map(resource => (
                <Card key={resource.id} className={`hover:shadow-lg transition-shadow ${
                  resource.isAI ? 'border-purple-100' : ''
                }`}>
                  {resource.thumbnail_url && (
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex gap-1">
                        {resource.isAI && (
                          <Badge className="bg-purple-600 text-white text-xs">AI</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="line-clamp-2">
                      {resource.description || resource.summary}
                    </CardDescription>

                    {/* Rating */}
                    <div>
                      {renderRating(resource.id)}
                    </div>

                    {/* Tags */}
                    <div className="flex gap-1 flex-wrap">
                      {resource.tags?.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Action */}
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600"
                      onClick={() => handleOpenRatingDialog(resource)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {getRating(resource.id) ? 'Update Rating' : 'Rate Resource'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating Dialog */}
      {selectedResource && (
        <ResourceRatingDialog
          resource={selectedResource}
          client={clientProfile}
          isOpen={ratingDialogOpen}
          onClose={() => {
            setRatingDialogOpen(false);
            setSelectedResource(null);
          }}
          onRatingSubmitted={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}