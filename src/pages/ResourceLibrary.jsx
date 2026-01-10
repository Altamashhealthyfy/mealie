import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Video,
  ChefHat,
  Dumbbell,
  BookOpen,
  Plus,
  Search,
  Trash2,
  Eye,
  Heart,
  Upload,
  X,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
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

export default function ResourceLibrary() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewResource, setShowNewResource] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "article",
    subcategory: "",
    content_url: "",
    thumbnail_url: "",
    difficulty_level: "beginner",
    duration_minutes: "",
    tags: "",
    is_published: false,
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["resources", user?.email],
    queryFn: async () => {
      const res = await base44.entities.Resource.filter({
        coach_email: user?.email,
      });
      return res;
    },
    enabled: !!user?.email,
  });

  const createResourceMutation = useMutation({
    mutationFn: async (data) => {
      const resourceData = {
        ...data,
        coach_email: user.email,
        tags: data.tags
          ? data.tags.split(",").map((tag) => tag.trim())
          : [],
        duration_minutes: data.duration_minutes
          ? parseInt(data.duration_minutes)
          : null,
      };

      if (uploadedFile) {
        setUploading(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({
            file: uploadedFile,
          });
          resourceData.content_url = file_url;
          resourceData.file_type = uploadedFile.type;
        } catch (error) {
          setUploading(false);
          throw new Error("File upload failed");
        }
        setUploading(false);
      }

      return base44.entities.Resource.create(resourceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resources", user?.email],
      });
      setFormData({
        title: "",
        description: "",
        category: "article",
        subcategory: "",
        content_url: "",
        thumbnail_url: "",
        difficulty_level: "beginner",
        duration_minutes: "",
        tags: "",
        is_published: false,
      });
      setUploadedFile(null);
      setShowNewResource(false);
      toast.success("Resource created successfully!");
    },
    onError: (error) => {
      console.error("Failed to create resource:", error);
      toast.error("Failed to create resource");
    },
  });

  const publishResourceMutation = useMutation({
    mutationFn: (resourceId) =>
      base44.entities.Resource.update(resourceId, {
        is_published: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resources", user?.email],
      });
      toast.success("Resource published!");
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId) => base44.entities.Resource.delete(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resources", user?.email],
      });
      toast.success("Resource deleted!");
    },
  });

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

  const handleCreateResource = () => {
    if (!formData.title.trim() || !formData.content_url.trim()) {
      toast.error("Please fill in title and resource URL");
      return;
    }
    createResourceMutation.mutate(formData);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setFormData({
        ...formData,
        content_url: `File: ${file.name}`,
      });
    }
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
            Create and manage resources for your clients
          </p>
        </div>

        {/* Controls */}
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
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="recipe">Recipes</SelectItem>
                <SelectItem value="workout">Workouts</SelectItem>
                <SelectItem value="guide">Guides</SelectItem>
                <SelectItem value="infographic">Infographics</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showNewResource} onOpenChange={setShowNewResource}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Resource</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Title *
                    </label>
                    <Input
                      placeholder="Resource title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <Textarea
                      placeholder="Describe this resource..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category *
                      </label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="recipe">Recipe</SelectItem>
                          <SelectItem value="workout">Workout</SelectItem>
                          <SelectItem value="guide">Guide</SelectItem>
                          <SelectItem value="infographic">
                            Infographic
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Difficulty Level
                      </label>
                      <Select
                        value={formData.difficulty_level}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            difficulty_level: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate
                          </SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Subcategory
                    </label>
                    <Input
                      placeholder="e.g., Cardio, Weight Loss, Breakfast"
                      value={formData.subcategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subcategory: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Upload File or Add URL
                    </label>
                    {uploadedFile ? (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-300 flex items-center justify-between">
                        <span className="text-sm text-green-800">
                          {uploadedFile.name}
                        </span>
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                          accept="*/*"
                        />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">OR</p>
                    <Input
                      placeholder="Paste URL (YouTube link, external article, etc.)"
                      value={formData.content_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          content_url: e.target.value,
                        })
                      }
                      disabled={!!uploadedFile}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Thumbnail URL (Optional)
                    </label>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={formData.thumbnail_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          thumbnail_url: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Duration (minutes)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 30 for 30 minutes"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags (comma-separated)
                    </label>
                    <Input
                      placeholder="e.g., protein, easy, quick"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="publish"
                      checked={formData.is_published}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_published: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <label htmlFor="publish" className="text-sm font-medium">
                      Publish immediately (visible to clients)
                    </label>
                  </div>

                  <Button
                    onClick={handleCreateResource}
                    disabled={
                      createResourceMutation.isPending ||
                      uploading ||
                      !formData.title.trim()
                    }
                    className="w-full"
                  >
                    {createResourceMutation.isPending || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Resource
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Resources</p>
              <p className="text-3xl font-bold text-gray-900">
                {resources.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Published</p>
              <p className="text-3xl font-bold text-green-600">
                {resources.filter((r) => r.is_published).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Views</p>
              <p className="text-3xl font-bold text-blue-600">
                {resources.reduce((sum, r) => sum + (r.view_count || 0), 0)}
              </p>
            </CardContent>
          </Card>
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
                {resources.length === 0
                  ? "Create your first resource to get started"
                  : "Try adjusting your search or filters"}
              </p>
            </Card>
          ) : (
            filteredResources.map((resource) => {
              const Icon = categoryIcons[resource.category];
              return (
                <Card
                  key={resource.id}
                  className="flex flex-col overflow-hidden hover:shadow-lg transition"
                >
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
                      {!resource.is_published && (
                        <Badge variant="outline" className="text-xs">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {resource.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pb-3">
                    {resource.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
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
                        {resource.favorite_count || 0} favorites
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
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </a>
                    <div className="flex gap-2">
                      {!resource.is_published && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600 border-green-300"
                          onClick={() =>
                            publishResourceMutation.mutate(resource.id)
                          }
                          disabled={publishResourceMutation.isPending}
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-300"
                        onClick={() => {
                          if (confirm("Delete this resource?")) {
                            deleteResourceMutation.mutate(resource.id);
                          }
                        }}
                        disabled={deleteResourceMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}