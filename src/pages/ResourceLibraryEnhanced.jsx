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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingUp,
  Users,
  Star,
  Send,
  Grid,
  List,
  Download,
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

export default function ResourceLibraryEnhanced() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showNewResource, setShowNewResource] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [viewingResource, setViewingResource] = useState(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon_emoji: "📚",
    color: "#f97316",
  });

  const [assignForm, setAssignForm] = useState({
    client_ids: [],
    notes: "",
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "article",
    custom_category_id: "",
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

  const { data: customCategories = [] } = useQuery({
    queryKey: ["customCategories", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.CustomResourceCategory.filter({
        coach_email: user.email,
      });
    },
    enabled: !!user?.email,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["resources", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Resource.filter({
        coach_email: user.email,
      });
    },
    enabled: !!user?.email,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clientsForAssignment", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allClients = await base44.entities.Client.list("-created_date", 500);
      return allClients;
    },
    enabled: !!user?.email,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["resourceAssignments", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.ResourceAssignment.filter({
        assigned_by: user.email,
      });
    },
    enabled: !!user?.email,
  });

  // Create custom category
  const createCategoryMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.CustomResourceCategory.create({
        ...data,
        coach_email: user.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["customCategories", user?.email],
      });
      setCategoryForm({ name: "", icon_emoji: "📚", color: "#f97316" });
      setShowNewCategory(false);
      toast.success("Category created!");
    },
  });

  // Create resource
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
      resetForm();
      setShowNewResource(false);
      toast.success("Resource created!");
    },
  });

  // Assign resource to clients
  const assignResourceMutation = useMutation({
    mutationFn: async (data) => {
      const promises = data.client_ids.map((clientId) =>
        base44.entities.ResourceAssignment.create({
          client_id: clientId,
          resource_id: selectedResource.id,
          resource_title: selectedResource.title,
          assigned_by: user.email,
          notes: data.notes,
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["resourceAssignments", user?.email],
      });
      // Update assignment count
      base44.entities.Resource.update(selectedResource.id, {
        assignment_count: (selectedResource.assignment_count || 0) + assignForm.client_ids.length,
      });
      setAssignForm({ client_ids: [], notes: "" });
      setShowAssignDialog(false);
      setSelectedResource(null);
      toast.success(`Resource assigned to ${data.client_ids.length} client(s)!`);
    },
  });

  // Publish/delete resource
  const publishResourceMutation = useMutation({
    mutationFn: (resourceId) =>
      base44.entities.Resource.update(resourceId, { is_published: true }),
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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "article",
      custom_category_id: "",
      subcategory: "",
      content_url: "",
      thumbnail_url: "",
      difficulty_level: "beginner",
      duration_minutes: "",
      tags: "",
      is_published: false,
    });
    setUploadedFile(null);
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

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ? true : 
      selectedCategory === "custom" ? resource.custom_category_id : 
      resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Analytics data
  const totalViews = resources.reduce((sum, r) => sum + (r.view_count || 0), 0);
  const totalCompletions = resources.reduce(
    (sum, r) => sum + (r.completion_count || 0),
    0
  );
  const avgRating = resources.length > 0
    ? (resources.reduce((sum, r) => sum + (r.average_rating || 0), 0) /
        resources.length).toFixed(1)
    : 0;
  const totalAssignments = resources.reduce(
    (sum, r) => sum + (r.assignment_count || 0),
    0
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-orange-50 via-amber-50 to-green-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Resource Library Manager
          </h1>
          <p className="text-gray-600">
            Create, manage, and assign resources to clients with analytics
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList className="bg-white border-b w-full rounded-none">
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="categories">Custom Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="resources" className="space-y-6">
            {/* Controls */}
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
                  {customCategories.length > 0 && (
                    <>
                      <SelectItem value="custom">Custom Categories</SelectItem>
                      {customCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon_emoji} {cat.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
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
                          Custom Category (Optional)
                        </label>
                        <Select
                          value={formData.custom_category_id}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              custom_category_id: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>None</SelectItem>
                            {customCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon_emoji} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Duration (minutes)
                        </label>
                        <Input
                          type="number"
                          placeholder="e.g., 30"
                          value={formData.duration_minutes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              duration_minutes: e.target.value,
                            })
                          }
                        />
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
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                        />
                      )}
                      <p className="text-xs text-gray-500">OR</p>
                      <Input
                        placeholder="Paste URL"
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
                        Publish immediately
                      </label>
                    </div>

                    <Button
                      onClick={() => {
                        if (!formData.title.trim() || !formData.content_url.trim()) {
                          toast.error("Please fill in title and resource URL");
                          return;
                        }
                        createResourceMutation.mutate(formData);
                      }}
                      disabled={
                        createResourceMutation.isPending || uploading
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

            {/* Resources Grid/List */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredResources.length === 0 ? (
                <Card className="col-span-full p-12 text-center border-dashed">
                  <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl font-semibold text-gray-900 mb-2">
                    No resources found
                  </p>
                </Card>
              ) : (
                filteredResources.map((resource) => {
                  const Icon = categoryIcons[resource.category];
                  return viewMode === "grid" ? (
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
                        <div className="space-y-2 text-xs text-gray-500">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {resource.view_count || 0} views
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {resource.assignment_count || 0} assigned
                          </div>
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4" />
                            {resource.completion_count || 0} completed
                          </div>
                          {resource.average_rating && (
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              {resource.average_rating.toFixed(1)}⭐
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <div className="border-t p-3 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setViewingResource(resource)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Resource
                        </Button>
                        <Dialog
                          open={
                            showAssignDialog && selectedResource?.id === resource.id
                          }
                          onOpenChange={(open) => {
                            if (!open) {
                              setSelectedResource(null);
                              setAssignForm({ client_ids: [], notes: "" });
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setSelectedResource(resource);
                                setShowAssignDialog(true);
                              }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Assign "{resource.title}" to Clients
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Select Clients *
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                                  {clients.map((client) => (
                                    <label
                                      key={client.id}
                                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={assignForm.client_ids.includes(
                                          client.id
                                        )}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setAssignForm({
                                              ...assignForm,
                                              client_ids: [
                                                ...assignForm.client_ids,
                                                client.id,
                                              ],
                                            });
                                          } else {
                                            setAssignForm({
                                              ...assignForm,
                                              client_ids:
                                                assignForm.client_ids.filter(
                                                  (id) => id !== client.id
                                                ),
                                            });
                                          }
                                        }}
                                      />
                                      <div>
                                        <p className="text-sm font-medium">
                                          {client.full_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {client.email}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Notes (Optional)
                                </label>
                                <Textarea
                                  placeholder="Why are you assigning this resource?"
                                  value={assignForm.notes}
                                  onChange={(e) =>
                                    setAssignForm({
                                      ...assignForm,
                                      notes: e.target.value,
                                    })
                                  }
                                  rows={3}
                                />
                              </div>

                              <Button
                                onClick={() =>
                                  assignResourceMutation.mutate(assignForm)
                                }
                                disabled={
                                  assignResourceMutation.isPending ||
                                  assignForm.client_ids.length === 0
                                }
                                className="w-full"
                              >
                                {assignResourceMutation.isPending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Assigning...
                                  </>
                                ) : (
                                  `Assign to ${assignForm.client_ids.length} Client(s)`
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

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
                  ) : (
                    <Card key={resource.id} className="hover:shadow-lg transition">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {resource.thumbnail_url ? (
                              <img
                                src={resource.thumbnail_url}
                                alt={resource.title}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Icon className="w-8 h-8 text-orange-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-base line-clamp-1">{resource.title}</h3>
                              {!resource.is_published && (
                                <Badge variant="outline" className="text-xs flex-shrink-0">Draft</Badge>
                              )}
                            </div>
                            {resource.description && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {resource.view_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" /> {resource.assignment_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {resource.completion_count || 0}
                              </span>
                              {resource.average_rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3" /> {resource.average_rating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingResource(resource)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedResource(resource);
                                setShowAssignDialog(true);
                              }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Assign
                            </Button>
                            <div className="flex gap-2">
                              {!resource.is_published && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-300"
                                  onClick={() => publishResourceMutation.mutate(resource.id)}
                                  disabled={publishResourceMutation.isPending}
                                >
                                  Publish
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300"
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Views</p>
                  <p className="text-3xl font-bold text-blue-600">{totalViews}</p>
                  <p className="text-xs text-gray-500 mt-2">Across all resources</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Completions</p>
                  <p className="text-3xl font-bold text-green-600">
                    {totalCompletions}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Recipes cooked, workouts done
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Total Assignments</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {totalAssignments}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Resources assigned</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 mb-2">Avg Rating</p>
                  <p className="text-3xl font-bold text-yellow-600">{avgRating}⭐</p>
                  <p className="text-xs text-gray-500 mt-2">From client feedback</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Resources */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Top Performing Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resources
                    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
                    .slice(0, 5)
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {resource.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {resource.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-sm font-medium">
                          <div className="text-center">
                            <p className="text-blue-600">
                              {resource.view_count || 0}
                            </p>
                            <p className="text-xs text-gray-500">views</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-600">
                              {resource.completion_count || 0}
                            </p>
                            <p className="text-xs text-gray-500">done</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={showNewCategory} onOpenChange={setShowNewCategory}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                    <Plus className="w-4 h-4 mr-2" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Custom Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Category Name *
                      </label>
                      <Input
                        placeholder="e.g., Morning Routines, Meal Prep"
                        value={categoryForm.name}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Emoji Icon
                      </label>
                      <Input
                        placeholder="Choose an emoji"
                        value={categoryForm.icon_emoji}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            icon_emoji: e.target.value,
                          })
                        }
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            color: e.target.value,
                          })
                        }
                        className="w-full h-10 rounded-lg border"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (!categoryForm.name.trim()) {
                          toast.error("Please enter a category name");
                          return;
                        }
                        createCategoryMutation.mutate(categoryForm);
                      }}
                      disabled={createCategoryMutation.isPending}
                      className="w-full"
                    >
                      {createCategoryMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Category"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customCategories.length === 0 ? (
                <Card className="col-span-full p-8 text-center border-dashed">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No custom categories yet</p>
                </Card>
              ) : (
                customCategories.map((category) => {
                  const resourceCount = resources.filter(
                    (r) => r.custom_category_id === category.id
                  ).length;
                  return (
                    <Card
                      key={category.id}
                      className="overflow-hidden"
                      style={{ borderLeftColor: category.color, borderLeftWidth: 4 }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">{category.icon_emoji}</span>
                          <h3 className="font-semibold text-lg text-gray-900">
                            {category.name}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          {resourceCount} resource{resourceCount !== 1 ? "s" : ""}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 border-red-300"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete "${category.name}"? Resources won't be deleted.`
                              )
                            ) {
                              base44.entities.CustomResourceCategory.delete(
                                category.id
                              ).then(() => {
                                queryClient.invalidateQueries({
                                  queryKey: ["customCategories", user?.email],
                                });
                                toast.success("Category deleted!");
                              });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* View Resource Dialog */}
        <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewingResource && categoryIcons[viewingResource.category] && 
                  React.createElement(categoryIcons[viewingResource.category], { className: "w-6 h-6 text-orange-500" })
                }
                {viewingResource?.title}
              </DialogTitle>
            </DialogHeader>
            
            {viewingResource && (
              <div className="space-y-4">
                {viewingResource.thumbnail_url && (
                  <img
                    src={viewingResource.thumbnail_url}
                    alt={viewingResource.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-orange-100 text-orange-700 capitalize">
                    {viewingResource.category}
                  </Badge>
                  {viewingResource.subcategory && (
                    <Badge variant="outline">{viewingResource.subcategory}</Badge>
                  )}
                  {viewingResource.difficulty_level && (
                    <Badge className="bg-blue-100 text-blue-700 capitalize">
                      {viewingResource.difficulty_level}
                    </Badge>
                  )}
                  {viewingResource.duration_minutes && (
                    <Badge className="bg-purple-100 text-purple-700">
                      {viewingResource.duration_minutes} min
                    </Badge>
                  )}
                </div>

                {viewingResource.description && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{viewingResource.description}</p>
                  </div>
                )}

                {viewingResource.tags?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingResource.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Eye className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-lg font-bold">{viewingResource.view_count || 0}</p>
                    <p className="text-xs text-gray-600">Views</p>
                  </div>
                  <div className="text-center">
                    <Users className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-lg font-bold">{viewingResource.assignment_count || 0}</p>
                    <p className="text-xs text-gray-600">Assigned</p>
                  </div>
                  <div className="text-center">
                    <Heart className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-lg font-bold">{viewingResource.completion_count || 0}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div className="text-center">
                    <Star className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                    <p className="text-lg font-bold">
                      {viewingResource.average_rating ? viewingResource.average_rating.toFixed(1) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600">Rating</p>
                  </div>
                </div>

                {/* Embedded preview for all file types */}
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  {viewingResource.file_type?.startsWith('image/') && (
                    <img src={viewingResource.content_url} alt={viewingResource.title} className="w-full max-h-[500px] object-contain" />
                  )}

                  {viewingResource.file_type?.startsWith('video/') && (
                    <video controls className="w-full max-h-[500px]" src={viewingResource.content_url}>
                      Your browser does not support the video tag.
                    </video>
                  )}

                  {viewingResource.file_type?.startsWith('audio/') && (
                    <div className="p-8 flex items-center justify-center">
                      <audio controls className="w-full">
                        <source src={viewingResource.content_url} type={viewingResource.file_type} />
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                  )}

                  {viewingResource.file_type?.includes('pdf') && (
                    <div className="w-full" style={{ height: '600px' }}>
                      <object
                        data={`${viewingResource.content_url}#toolbar=1&navpanes=0&scrollbar=1`}
                        type="application/pdf"
                        className="w-full h-full"
                      >
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingResource.content_url)}&embedded=true`}
                          className="w-full h-full"
                          title={viewingResource.title}
                        >
                          <p className="p-4 text-center">
                            PDF preview not available. 
                            <a href={viewingResource.content_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">
                              Click here to view
                            </a>
                          </p>
                        </iframe>
                      </object>
                    </div>
                  )}

                  {!viewingResource.file_type?.startsWith('image/') && 
                   !viewingResource.file_type?.startsWith('video/') && 
                   !viewingResource.file_type?.startsWith('audio/') && 
                   !viewingResource.file_type?.includes('pdf') && (
                    <div className="p-8 text-center">
                      <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(viewingResource.content_url, '_blank')}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch(viewingResource.content_url);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = viewingResource.title || 'resource';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Download failed:', error);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}