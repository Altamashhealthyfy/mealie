import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Search, Filter, MoreVertical, Edit, Trash2, Eye, Download,
  FileText, Play, BookOpen, Loader2, Users, BarChart3
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import ResourceUploadForm from '@/components/resources/ResourceUploadForm';
import { toast } from 'sonner';

const typeIcons = {
  pdf: FileText,
  article: FileText,
  video: Play,
  guide: BookOpen,
  infographic: BookOpen,
  workbook: FileText,
  worksheet: FileText,
  other: FileText
};

const CATEGORIES = [
  'All Categories',
  'nutrition', 'fitness', 'mental_health', 'disease_management',
  'meal_planning', 'cooking', 'lifestyle', 'supplements', 'hydration', 'sleep', 'stress_management', 'behavior_change', 'other'
];

export default function ResourceLibrary() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedType, setSelectedType] = useState('All Types');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: resources = [], isLoading, refetch } = useQuery({
    queryKey: ['resources', user?.email],
    queryFn: async () => {
      const res = await base44.entities.Resource.filter({ coach_email: user?.email }, '-created_date', 100);
      return res;
    },
    enabled: !!user?.email,
  });

  const { data: assignmentStats } = useQuery({
    queryKey: ['resourceStats', user?.email],
    queryFn: async () => {
      const assignments = await base44.entities.ResourceAssignment.filter({ coach_email: user?.email }, null, 1000);
      const stats = {};
      assignments.forEach(a => {
        if (!stats[a.resource_id]) {
          stats[a.resource_id] = { assigned: 0, completed: 0 };
        }
        stats[a.resource_id].assigned++;
        if (a.status === 'completed') stats[a.resource_id].completed++;
      });
      return stats;
    },
    enabled: !!user?.email,
  });

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All Categories' || resource.category === selectedCategory;
    const matchesType = selectedType === 'All Types' || resource.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleDelete = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await base44.entities.Resource.delete(resourceId);
      toast.success('Resource deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const handleDownload = (fileUrl) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = true;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📚 Resource Library</h1>
            <p className="text-gray-600 mt-1">Manage and organize educational materials for your clients</p>
          </div>
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Resource
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{resources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {Object.values(assignmentStats || {}).reduce((sum, s) => sum + s.assigned, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {resources.length === 0 ? '0%' : Math.round(
                  Object.values(assignmentStats || {}).reduce((sum, s) => 
                    sum + (s.assigned > 0 ? (s.completed / s.assigned * 100) : 0), 0
                  ) / Object.keys(assignmentStats || {}).length
                )}%
              </p>
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
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Types">All Types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="guide">Guide</SelectItem>
              <SelectItem value="worksheet">Worksheet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resources Grid */}
        {filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No resources found</p>
            <p className="text-gray-400 text-sm">Create your first resource to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => {
              const Icon = typeIcons[resource.type] || FileText;
              const stats = assignmentStats?.[resource.id] || { assigned: 0, completed: 0 };
              
              return (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  {resource.thumbnail_url && (
                    <img
                      src={resource.thumbnail_url}
                      alt={resource.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <Badge variant="outline" className="text-xs">
                            {resource.type}
                          </Badge>
                        </div>
                        <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(resource.file_url)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(resource.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="line-clamp-2 mb-3">
                      {resource.description}
                    </CardDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{stats.assigned} assigned</span>
                      </div>
                      {stats.assigned > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <BarChart3 className="w-4 h-4" />
                          <span>{Math.round((stats.completed / stats.assigned) * 100)}% completed</span>
                        </div>
                      )}
                      <div className="flex gap-1 flex-wrap pt-2">
                        {resource.tags?.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <ResourceUploadForm
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => refetch()}
        user={user}
      />
    </div>
  );
}