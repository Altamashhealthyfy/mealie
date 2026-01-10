import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Video,
  ChefHat,
  Dumbbell,
  BookOpen,
  Search,
  Heart,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const categoryIcons = {
  article: FileText,
  video: Video,
  recipe: ChefHat,
  workout: Dumbbell,
  guide: BookOpen,
  infographic: ImageIcon,
  other: FileText,
};

export default function ClientResourceLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("browse");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ["myClientProfile", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({
        email: user.email,
      });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["publishedResources"],
    queryFn: async () => {
      const res = await base44.entities.Resource.filter({
        is_published: true,
      });
      return res;
    },
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["myFavorites", clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      const favs = await base44.entities.FavoriteResource.filter({
        client_id: clientProfile.id,
      });
      return favs;
    },
    enabled: !!clientProfile?.id,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (resource) => {
      return base44.entities.FavoriteResource.create({
        client_id: clientProfile.id,
        resource_id: resource.id,
        resource_title: resource.title,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myFavorites", clientProfile?.id],
      });
      toast.success("Added to favorites!");
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId) => {
      return base44.entities.FavoriteResource.delete(favoriteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["myFavorites", clientProfile?.id],
      });
      toast.success("Removed from favorites");
    },
  });

  const isFavorited = (resourceId) => {
    return favorites.some((fav) => fav.resource_id === resourceId);
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteResources = resources.filter((resource) =>
    favorites.some((fav) => fav.resource_id === resource.id)
  );

  const ResourceCard = ({ resource, showFavoriteButton = true }) => {
    const Icon = categoryIcons[resource.category];
    const isFav = isFavorited(resource.id);

    return (
      <Card className="flex flex-col overflow-hidden hover:shadow-lg transition h-full">
        {resource.thumbnail_url && (
          <img
            src={resource.thumbnail_url}
            alt={resource.title}
            className="w-full h-40 object-cover"
          />
        )}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <Icon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
            {resource.difficulty_level && (
              <Badge
                variant="outline"
                className="text-xs capitalize"
              >
                {resource.difficulty_level}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base line-clamp-2">
            {resource.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          {resource.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
              {resource.description}
            </p>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Eye className="w-4 h-4" />
              {resource.view_count || 0} views
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Heart className="w-4 h-4" />
              {resource.favorite_count || 0} favorited
            </div>
            {resource.duration_minutes && (
              <div className="text-xs text-gray-500">
                ⏱️ {resource.duration_minutes} min
              </div>
            )}
          </div>
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-3">
              {resource.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <div className="border-t p-3 space-y-2">
          <a
            href={resource.content_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" size="sm" className="w-full">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Resource
            </Button>
          </a>
          {showFavoriteButton && (
            <Button
              variant={isFav ? "default" : "outline"}
              size="sm"
              className={`w-full ${
                isFav
                  ? "bg-red-500 hover:bg-red-600 border-red-500"
                  : "border-red-300 text-red-600"
              }`}
              onClick={() => {
                if (isFav) {
                  const favorite = favorites.find(
                    (f) => f.resource_id === resource.id
                  );
                  if (favorite) {
                    removeFavoriteMutation.mutate(favorite.id);
                  }
                } else {
                  addFavoriteMutation.mutate(resource);
                }
              }}
              disabled={
                addFavoriteMutation.isPending ||
                removeFavoriteMutation.isPending
              }
            >
              {addFavoriteMutation.isPending ||
              removeFavoriteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Heart
                  className={`w-4 h-4 mr-2 ${isFav ? "fill-current" : ""}`}
                />
              )}
              {isFav ? "Favorited" : "Favorite"}
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resource Library
          </h1>
          <p className="text-gray-600">
            Explore articles, videos, recipes, and more curated for your health journey
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white border-b w-full rounded-none">
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            <TabsTrigger value="favorites">
              My Favorites {favorites.length > 0 && `(${favorites.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            {/* Search and Filter */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { value: "all", label: "All Resources" },
                  { value: "article", label: "📄 Articles" },
                  { value: "video", label: "🎥 Videos" },
                  { value: "recipe", label: "🍳 Recipes" },
                  { value: "workout", label: "💪 Workouts" },
                  { value: "guide", label: "📖 Guides" },
                ].map((cat) => (
                  <Button
                    key={cat.value}
                    variant={
                      selectedCategory === cat.value ? "default" : "outline"
                    }
                    onClick={() => setSelectedCategory(cat.value)}
                    className="whitespace-nowrap"
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.length === 0 ? (
                <Card className="col-span-full p-12 text-center border-dashed">
                  <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    No resources found
                  </p>
                  <p className="text-gray-600">
                    Try adjusting your search or filters
                  </p>
                </Card>
              ) : (
                filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    showFavoriteButton={true}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {favoriteResources.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  No favorites yet
                </p>
                <p className="text-gray-600 mb-6">
                  Start favoriting resources to save them for later
                </p>
                <Button
                  onClick={() => setActiveTab("browse")}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Browse Resources
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    showFavoriteButton={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}