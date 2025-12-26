import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  Crown, 
  Search, 
  Edit, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Building2
} from "lucide-react";

export default function PlatformBrandingTracker() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [editBranding, setEditBranding] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfiles = [] } = useQuery({
    queryKey: ['allCoachProfiles'],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.list('-updated_date');
      return profiles;
    },
    enabled: !!user && user.user_type === 'super_admin',
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allCoachUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ 
        user_type: 'student_coach' 
      });
      return users;
    },
    enabled: !!user && user.user_type === 'super_admin',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.CoachProfile.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachProfiles']);
      setSelectedCoach(null);
      setEditBranding(null);
      alert('✅ Branding updated successfully!');
    },
  });

  const filteredProfiles = coachProfiles.filter(profile => {
    const coachUser = allUsers.find(u => u.email === profile.created_by);
    const searchLower = searchQuery.toLowerCase();
    return (
      profile.business_name?.toLowerCase().includes(searchLower) ||
      profile.custom_branding_name?.toLowerCase().includes(searchLower) ||
      coachUser?.full_name?.toLowerCase().includes(searchLower) ||
      coachUser?.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleEditBranding = (profile) => {
    setEditBranding({
      id: profile.id,
      custom_branding_name: profile.custom_branding_name || profile.business_name || '',
      tagline: profile.tagline || '',
      logo_url: profile.logo_url || ''
    });
  };

  const handleSaveBranding = () => {
    if (!editBranding) return;
    updateProfileMutation.mutate({
      id: editBranding.id,
      data: {
        custom_branding_name: editBranding.custom_branding_name,
        tagline: editBranding.tagline,
        logo_url: editBranding.logo_url
      }
    });
  };

  if (!user || user.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md border-red-500">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <AlertDescription>
            Only Platform Owners can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-600 text-white">Platform Owner</Badge>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Platform Branding Tracker</h1>
            <p className="text-gray-600">Manage and monitor health coach branding across the platform</p>
          </div>
        </div>

        {/* Search */}
        <Card className="border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by coach name, email, or business name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Total Coaches
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-4xl font-bold">{coachProfiles.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                With Custom Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-4xl font-bold">
                {coachProfiles.filter(p => p.custom_branding_name || p.logo_url).length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                With Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-4xl font-bold">
                {coachProfiles.filter(p => p.logo_url).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Coach Profiles List */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">Health Coach Branding</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No coach profiles found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProfiles.map(profile => {
                  const coachUser = allUsers.find(u => u.email === profile.created_by);
                  const displayName = profile.custom_branding_name || profile.business_name || 'No Name Set';
                  const hasBranding = profile.custom_branding_name || profile.logo_url;

                  return (
                    <div key={profile.id} className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-orange-300 transition-all">
                      <div className="flex items-start gap-4">
                        {/* Logo */}
                        <div className="flex-shrink-0">
                          {profile.logo_url ? (
                            <img 
                              src={profile.logo_url} 
                              alt={displayName}
                              className="w-16 h-16 rounded-lg object-cover border-2 border-gray-300"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h3>
                              {profile.tagline && (
                                <p className="text-sm text-gray-600 mb-2">{profile.tagline}</p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {coachUser?.full_name || 'Unknown Coach'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {coachUser?.email || profile.created_by}
                                </Badge>
                                {hasBranding ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-300">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Custom Branding
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Default Branding
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleEditBranding(profile)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Branding
                            </Button>
                          </div>

                          {/* Branding Info */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-white rounded-lg border">
                            <div>
                              <Label className="text-xs text-gray-500">Business Name</Label>
                              <p className="text-sm font-medium">{profile.business_name || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Custom Branding Name</Label>
                              <p className="text-sm font-medium">{profile.custom_branding_name || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Tagline</Label>
                              <p className="text-sm font-medium">{profile.tagline || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Logo</Label>
                              <p className="text-sm font-medium">{profile.logo_url ? '✅ Uploaded' : 'Not uploaded'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Branding Dialog */}
        <Dialog open={!!editBranding} onOpenChange={() => setEditBranding(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Platform Branding</DialogTitle>
            </DialogHeader>
            {editBranding && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-500">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <AlertDescription>
                    This branding will be displayed when clients access the platform
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Custom Branding Name *</Label>
                  <Input
                    value={editBranding.custom_branding_name}
                    onChange={(e) => setEditBranding({
                      ...editBranding,
                      custom_branding_name: e.target.value
                    })}
                    placeholder="Your Brand Name"
                  />
                  <p className="text-xs text-gray-500">
                    This name will appear throughout the platform instead of "Mealie"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={editBranding.tagline}
                    onChange={(e) => setEditBranding({
                      ...editBranding,
                      tagline: e.target.value
                    })}
                    placeholder="Your Tagline"
                  />
                  <p className="text-xs text-gray-500">
                    A brief description shown below your brand name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={editBranding.logo_url}
                    onChange={(e) => setEditBranding({
                      ...editBranding,
                      logo_url: e.target.value
                    })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500">
                    Direct URL to your logo image (recommended: 200x200px PNG)
                  </p>
                  {editBranding.logo_url && (
                    <div className="mt-2">
                      <img 
                        src={editBranding.logo_url} 
                        alt="Logo preview"
                        className="w-24 h-24 rounded-lg border-2 object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setEditBranding(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveBranding}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Branding'}
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