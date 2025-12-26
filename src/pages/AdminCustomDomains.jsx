import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  Shield,
  AlertTriangle
} from "lucide-react";

export default function AdminCustomDomains() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [verifyingDomain, setVerifyingDomain] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfiles } = useQuery({
    queryKey: ['allCoachProfiles'],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.list('-created_date');
      return profiles.filter(p => p.custom_domain); // Only profiles with custom domains
    },
    initialData: [],
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['allSubscriptions'],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ status: 'active' });
      return subs;
    },
    initialData: [],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ profileId, data }) => {
      return await base44.asServiceRole.entities.CoachProfile.update(profileId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allCoachProfiles']);
    },
  });

  const handleVerifyDomain = async (profile) => {
    if (!profile.custom_domain) return;

    setVerifyingDomain(profile.id);
    try {
      const response = await base44.functions.invoke('verifyCustomDomain', { 
        domain: profile.custom_domain 
      });
      
      if (response?.data?.success) {
        await updateProfileMutation.mutateAsync({
          profileId: profile.id,
          data: {
            custom_domain_status: 'active',
            domain_configured_date: new Date().toISOString().split('T')[0]
          }
        });
        alert(`✅ ${profile.custom_domain} verified successfully!`);
      } else {
        const message = response?.data?.message || "DNS records not found";
        alert(`❌ Verification failed: ${message}`);
      }
    } catch (error) {
      console.error("Verification error:", error);
      alert("❌ Verification failed. Check DNS settings.");
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemoveDomain = async (profile) => {
    if (!window.confirm(`Remove domain ${profile.custom_domain}? This cannot be undone.`)) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        profileId: profile.id,
        data: {
          custom_domain: null,
          custom_domain_status: 'not_configured',
          domain_verification_code: null,
          domain_configured_date: null
        }
      });
      alert('✅ Domain removed successfully');
    } catch (error) {
      console.error("Error removing domain:", error);
      alert("❌ Failed to remove domain");
    }
  };

  const getCoachSubscription = (coachEmail) => {
    return subscriptions.find(sub => sub.coach_email === coachEmail);
  };

  const filteredProfiles = coachProfiles.filter(profile => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.custom_domain?.toLowerCase().includes(query) ||
      profile.business_name?.toLowerCase().includes(query) ||
      profile.created_by?.toLowerCase().includes(query)
    );
  });

  const statusConfig = {
    not_configured: { icon: Globe, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Not Configured' },
    pending_verification: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Active' },
    failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' }
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="w-5 h-5" />
          <AlertDescription>
            Only Super Admins can manage custom domains.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Custom Domain Management</h1>
            <p className="text-gray-600">Manage all custom domains for health coaches</p>
          </div>
          <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
            {coachProfiles.length} Domains
          </Badge>
        </div>

        {/* Search */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by domain, coach name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Domains</p>
                  <p className="text-3xl font-bold text-gray-900">{coachProfiles.length}</p>
                </div>
                <Globe className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">
                    {coachProfiles.filter(p => p.custom_domain_status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {coachProfiles.filter(p => p.custom_domain_status === 'pending_verification').length}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-3xl font-bold text-red-600">
                    {coachProfiles.filter(p => p.custom_domain_status === 'failed').length}
                  </p>
                </div>
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domains List */}
        <div className="space-y-4">
          {filteredProfiles.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No custom domains found</h3>
                <p className="text-gray-600">No health coaches have configured custom domains yet</p>
              </CardContent>
            </Card>
          ) : (
            filteredProfiles.map(profile => {
              const status = profile.custom_domain_status || 'not_configured';
              const StatusIcon = statusConfig[status].icon;
              const subscription = getCoachSubscription(profile.created_by);

              return (
                <Card key={profile.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl mb-1">{profile.custom_domain}</CardTitle>
                        <p className="text-sm text-purple-100">{profile.business_name || 'No Business Name'}</p>
                      </div>
                      <Badge className={`${statusConfig[status].bg} ${statusConfig[status].color}`}>
                        <StatusIcon className="w-4 h-4 mr-1" />
                        {statusConfig[status].label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Coach Email</p>
                        <p className="font-semibold text-gray-900">{profile.created_by}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Plan</p>
                        <p className="font-semibold text-gray-900">
                          {subscription?.plan_name || 'No Active Plan'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Verification Code</p>
                        <p className="font-mono text-xs text-gray-700 break-all">
                          {profile.domain_verification_code || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Configured Date</p>
                        <p className="font-semibold text-gray-900">
                          {profile.domain_configured_date 
                            ? new Date(profile.domain_configured_date).toLocaleDateString()
                            : 'Not yet'}
                        </p>
                      </div>
                    </div>

                    {status === 'active' && (
                      <Alert className="bg-green-50 border-green-500">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          Domain is verified and active. Clients can access the platform via this custom domain.
                        </AlertDescription>
                      </Alert>
                    )}

                    {status === 'pending_verification' && (
                      <Alert className="bg-yellow-50 border-yellow-500">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-900 text-sm">
                          Waiting for DNS verification. Click verify to check status.
                        </AlertDescription>
                      </Alert>
                    )}

                    {status === 'failed' && (
                      <Alert className="bg-red-50 border-red-500">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-900 text-sm">
                          Domain verification failed. Check DNS configuration.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {status !== 'active' && (
                        <Button
                          onClick={() => handleVerifyDomain(profile)}
                          disabled={verifyingDomain === profile.id}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          {verifyingDomain === profile.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Domain
                            </>
                          )}
                        </Button>
                      )}
                      {status === 'active' && (
                        <Button
                          onClick={() => window.open(`https://${profile.custom_domain}`, '_blank')}
                          variant="outline"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open Site
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRemoveDomain(profile)}
                        variant="destructive"
                        disabled={updateProfileMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Domain
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}