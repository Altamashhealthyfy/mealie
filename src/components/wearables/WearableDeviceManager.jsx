import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Watch, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const WEARABLE_CONFIGS = {
  google_fit: {
    name: 'Google Fit',
    icon: '📱',
    color: 'from-blue-500 to-green-500',
    description: 'Sync steps, heart rate, sleep, and calorie data from Google Fit',
    permissions: ['steps', 'heart_rate', 'sleep', 'calories']
  },
  fitbit: {
    name: 'Fitbit',
    icon: '⌚',
    color: 'from-purple-500 to-pink-500',
    description: 'Connect your Fitbit device for comprehensive health tracking',
    permissions: ['steps', 'heart_rate', 'sleep', 'calories', 'distance', 'elevation', 'activity']
  },
  apple_health: {
    name: 'Apple Health',
    icon: '🍎',
    color: 'from-gray-600 to-black',
    description: 'Sync data from Apple Health on your iPhone',
    permissions: ['steps', 'heart_rate', 'sleep', 'calories', 'activity']
  }
};

export default function WearableDeviceManager({ clientId, clientEmail, compact = false }) {
  const queryClient = useQueryClient();
  const [showConnectDialog, setShowConnectDialog] = React.useState(false);
  const [selectedDevice, setSelectedDevice] = React.useState(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['wearableDevices', clientId],
    queryFn: () => base44.entities.WearableDevice.filter({ client_id: clientId }),
    enabled: !!clientId,
    initialData: []
  });

  const disconnectMutation = useMutation({
    mutationFn: async (deviceId) => {
      return await base44.entities.WearableDevice.update(deviceId, {
        is_connected: false,
        sync_status: 'disconnected'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearableDevices', clientId] });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('syncWearableData', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearableDevices', clientId] });
      queryClient.invalidateQueries({ queryKey: ['wearableData', clientId] });
    }
  });

  const handleConnectDevice = (deviceType) => {
    setSelectedDevice(deviceType);
    setShowConnectDialog(true);
  };

  const handleDisconnect = async (deviceId) => {
    if (window.confirm('Are you sure you want to disconnect this device?')) {
      disconnectMutation.mutate(deviceId);
    }
  };

  if (compact && devices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connected Devices */}
      {devices.filter(d => d.is_connected).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.filter(d => d.is_connected).map((device) => {
            const config = WEARABLE_CONFIGS[device.device_type];
            return (
              <Card key={device.id} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <p className="text-xs text-gray-600">{device.device_name}</p>
                      </div>
                    </div>
                    <Badge className={`bg-gradient-to-r ${config.color} text-white`}>
                      {device.sync_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {device.last_sync && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      Last synced: {format(new Date(device.last_sync), 'MMM dd, HH:mm')}
                    </div>
                  )}

                  {device.sync_status === 'active' && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">Connected & syncing</span>
                    </div>
                  )}

                  {device.sync_status === 'failed' && device.sync_error && (
                    <Alert className="bg-red-50 border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {device.sync_error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {device.data_permissions && device.data_permissions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Data access:</p>
                      <div className="flex flex-wrap gap-1">
                        {device.data_permissions.map(perm => (
                          <Badge key={perm} variant="secondary" className="text-xs">
                            {perm.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                      className="flex-1"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(device.id)}
                      disabled={disconnectMutation.isPending}
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Device Button */}
      {(!compact || devices.length === 0) && (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6">
            <div className="text-center">
              <Watch className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-700 mb-4">
                Connect a wearable device to auto-sync your health data
              </p>
              <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Device
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Connect Wearable Device</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {Object.entries(WEARABLE_CONFIGS).map(([deviceType, config]) => (
                      <Card
                        key={deviceType}
                        className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-500"
                        onClick={() => {
                          setSelectedDevice(deviceType);
                          // Trigger OAuth flow
                          handleOAuthConnection(deviceType);
                          setShowConnectDialog(false);
                        }}
                      >
                        <CardContent className="p-6 text-center">
                          <p className="text-4xl mb-3">{config.icon}</p>
                          <h3 className="font-bold text-lg mb-2">{config.name}</h3>
                          <p className="text-xs text-gray-600">{config.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function handleOAuthConnection(deviceType) {
  if (deviceType === 'google_fit') {
    // Google Fit OAuth - already authorized
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/wearable-callback')}&response_type=code&scope=https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read https://www.googleapis.com/auth/fitness.activity.read`;
  } else if (deviceType === 'fitbit') {
    // Fitbit OAuth
    window.location.href = `https://www.fitbit.com/oauth2/authorize?client_id=${import.meta.env.VITE_FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/wearable-callback')}&response_type=code&scope=activity heartrate sleep`;
  } else if (deviceType === 'apple_health') {
    // Apple Health - requires native app
    alert('Apple Health integration requires the mobile app. Please use the mobile app to connect your Apple Health data.');
  }
}