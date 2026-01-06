import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Video, 
  Utensils, 
  Dumbbell, 
  FileText, 
  Lightbulb, 
  Search,
  Heart,
  TrendingUp,
  Clock,
  Eye,
  Star,
  Filter,
  X
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const CATEGORY_ICONS = {
  nutrition: Utensils,
  fitness: Dumbbell,
  mindfulness: Heart,
  recipes: Utensils,
  lifestyle: TrendingUp,
  disease_management: Heart,
  general: BookOpen
};

const TYPE_ICONS = {
  article: FileText,
  video: Video,
  recipe: Utensils,
  workout: Dumbbell,
  guide: BookOpen,
  tip: Lightbulb
};

export default function ResourceLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [viewingResource, setViewingResource] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) return clients[0];
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    },
    enabled: !!user && user.user_type === 'client',
  });

  const { data: resources } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const all = await base44.entities.Resource.filter({ published: true });
      return all.sort((a, b) => b.view_count - a.view_count);
    },
    initialData: [],
  });

  const incrementViewMutation = useMutation({
    mutationFn: async (resourceId) => {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        await base44.entities.Resource.update(resourceId, { 
          view_count: (resource.view_count || 0) + 1 
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
    },
  });

  const handleViewResource = (resource) => {
    setViewingResource(resource);
    incrementViewMutation.mutate(resource.id);
  };

  // Filter resources based on client profile
  const personalizedResources = useMemo(() => {
    if (!clientProfile) return resources;

    return resources.map(resource => {
      let relevanceScore = 0;

      // Match goal
      if (resource.target_goals?.includes(clientProfile.goal) || resource.target_goals?.includes('all')) {
        relevanceScore += 3;
      }

      // Match food preference
      if (resource.target_preferences?.includes(clientProfile.food_preference) || resource.target_preferences?.includes('all')) {
        relevanceScore += 2;
      }

      // Featured resources get a boost
      if (resource.featured) {
        relevanceScore += 1;
      }

      return { ...resource, relevanceScore };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [resources, clientProfile]);

  const filteredResources = useMemo(() => {
    return personalizedResources.filter(resource => {
      const matchesSearch = resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
      const matchesType = selectedType === "all" || resource.resource_type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [personalizedResources, searchQuery, selectedCategory, selectedType]);

  const featuredResources = personalizedResources.filter(r => r.featured).slice(0, 3);
  const recommendedForYou = personalizedResources.filter(r => r.relevanceScore >= 3).slice(0, 6);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Resource Library</h1>
            <p className="text-gray-600">Educational content tailored to your health journey</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="md:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {(selectedCategory !== "all" || selectedType !== "all") && (
                  <Badge className="ml-2 bg-orange-500">Active</Badge>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      className={`cursor-pointer ${selectedCategory === "all" ? "bg-orange-500" : "bg-gray-200 text-gray-700"}`}
                      onClick={() => setSelectedCategory("all")}
                    >
                      All
                    </Badge>
                    {["nutrition", "fitness", "mindfulness", "recipes", "lifestyle", "disease_management"].map(cat => (
                      <Badge 
                        key={cat}
                        className={`cursor-pointer capitalize ${selectedCategory === cat ? "bg-orange-500" : "bg-gray-200 text-gray-700"}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      className={`cursor-pointer ${selectedType === "all" ? "bg-orange-500" : "bg-gray-200 text-gray-700"}`}
                      onClick={() => setSelectedType("all")}
                    >
                      All
                    </Badge>
                    {["article", "video", "recipe", "workout", "guide", "tip"].map(type => (
                      <Badge 
                        key={type}
                        className={`cursor-pointer capitalize ${selectedType === type ? "bg-orange-500" : "bg-gray-200 text-gray-700"}`}
                        onClick={() => setSelectedType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Resources */}
        {featuredResources.length > 0 && !searchQuery && selectedCategory === "all" && selectedType === "all" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Featured Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredResources.map(resource => {
                const Icon = TYPE_ICONS[resource.resource_type] || BookOpen;
                return (
                  <Card 
                    key={resource.id} 
                    className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-orange-50 to-red-50"
                    onClick={() => handleViewResource(resource)}
                  >
                    {resource.thumbnail_url && (
                      <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-48 object-cover rounded-t-lg" />
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-orange-600" />
                          <Badge className="bg-orange-500">{resource.resource_type}</Badge>
                        </div>
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </div>
                      <CardTitle className="text-lg mt-2">{resource.title}</CardTitle>
                      <CardDescription>{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {resource.reading_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {resource.reading_time} min
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {resource.view_count || 0} views
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended For You */}
        {clientProfile && recommendedForYou.length > 0 && !searchQuery && selectedCategory === "all" && selectedType === "all" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Recommended For You
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedForYou.slice(0, 6).map(resource => {
                const Icon = TYPE_ICONS[resource.resource_type] || BookOpen;
                const CategoryIcon = CATEGORY_ICONS[resource.category] || BookOpen;
                return (
                  <Card 
                    key={resource.id} 
                    className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
                    onClick={() => handleViewResource(resource)}
                  >
                    {resource.thumbnail_url && (
                      <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-48 object-cover rounded-t-lg" />
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-5 h-5 text-blue-600" />
                        <Badge variant="outline" className="capitalize">{resource.resource_type}</Badge>
                        <Badge variant="outline" className="capitalize">
                          <CategoryIcon className="w-3 h-3 mr-1" />
                          {resource.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {resource.reading_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {resource.reading_time} min
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {resource.view_count || 0}
                        </div>
                        <Badge className="ml-auto bg-pink-500">Match: {resource.relevanceScore}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Resources */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid grid-cols-4 md:grid-cols-7 bg-white/80 backdrop-blur">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="fitness">Fitness</TabsTrigger>
            <TabsTrigger value="mindfulness">Mindfulness</TabsTrigger>
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="lifestyle">Lifestyle</TabsTrigger>
            <TabsTrigger value="disease_management">Health</TabsTrigger>
          </TabsList>

          {["all", "nutrition", "fitness", "mindfulness", "recipes", "lifestyle", "disease_management"].map(tabValue => (
            <TabsContent key={tabValue} value={tabValue}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources
                  .filter(r => tabValue === "all" || r.category === tabValue)
                  .map(resource => {
                    const Icon = TYPE_ICONS[resource.resource_type] || BookOpen;
                    const CategoryIcon = CATEGORY_ICONS[resource.category] || BookOpen;
                    return (
                      <Card 
                        key={resource.id} 
                        className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
                        onClick={() => handleViewResource(resource)}
                      >
                        {resource.thumbnail_url && (
                          <img src={resource.thumbnail_url} alt={resource.title} className="w-full h-48 object-cover rounded-t-lg" />
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-5 h-5 text-blue-600" />
                            <Badge variant="outline" className="capitalize">{resource.resource_type}</Badge>
                            <Badge variant="outline" className="capitalize">
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {resource.category}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{resource.title}</CardTitle>
                          <CardDescription className="line-clamp-2">{resource.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {resource.reading_time && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {resource.reading_time} min
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {resource.view_count || 0}
                            </div>
                          </div>
                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {resource.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {filteredResources.filter(r => tabValue === "all" || r.category === tabValue).length === 0 && (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Resources Found</h3>
                    <p className="text-gray-600">Try adjusting your filters or search query</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* View Resource Dialog */}
        <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-2xl">{viewingResource?.title}</DialogTitle>
                <Button variant="ghost" size="icon" onClick={() => setViewingResource(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>
            {viewingResource && (
              <div className="space-y-6 mt-4">
                {viewingResource.thumbnail_url && (
                  <img 
                    src={viewingResource.thumbnail_url} 
                    alt={viewingResource.title} 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="capitalize">{viewingResource.resource_type}</Badge>
                  <Badge variant="outline" className="capitalize">{viewingResource.category}</Badge>
                  {viewingResource.difficulty_level && (
                    <Badge variant="outline" className="capitalize">{viewingResource.difficulty_level}</Badge>
                  )}
                  {viewingResource.reading_time && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {viewingResource.reading_time} min read
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Eye className="w-4 h-4" />
                    {viewingResource.view_count || 0} views
                  </div>
                </div>

                {viewingResource.description && (
                  <p className="text-gray-700 text-lg">{viewingResource.description}</p>
                )}

                {viewingResource.video_url && (
                  <div className="aspect-video">
                    <iframe
                      src={viewingResource.video_url.replace('watch?v=', 'embed/')}
                      className="w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {viewingResource.content && (
                  <div className="prose prose-lg max-w-none">
                    <ReactMarkdown>{viewingResource.content}</ReactMarkdown>
                  </div>
                )}

                {viewingResource.external_link && (
                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={() => window.open(viewingResource.external_link, '_blank')}
                  >
                    View External Resource
                  </Button>
                )}

                {viewingResource.tags && viewingResource.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingResource.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}