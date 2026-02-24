import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, Watch, Loader2, Plus, Trash2, RefreshCw, Check, X, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEVICE_ICONS = {
  fitbit: '🏃',
  garmin: '⌚',
  apple_health: '🍎',
  google_fit: '📊',
  oura_ring: '💍',
  whoop: '📈'
};

export default function WearableDeviceManager({ clientId }) {
  const queryClient = useQueryClient();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Fetch connected devices
  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['wearableDevices', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      return await base44.entities.WearableDevice.filter({ client_id: clientId });
    },
    enabled: !!clientId
  });

  // Sync data mutation
  const syncMutation = useMutation({
    mutationFn: async (deviceId) => {
      return await base44.functions.invoke('syncWearableData', { deviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearableDevices', clientId] });
    }
  });

  // Delete device mutation
  const deleteMutation = useMutation({
    mutationFn: async (deviceId) => {
      return await base44.entities.WearableDevice.delete(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wearableDevices', clientId] });
    }
  });

  // Connect device
  const connectMutation = useMutation({
    mutationFn: async (deviceType) => {
      const response = await base44.functions.invoke('connectWearableDevice', {
        deviceType,
        clientId
      });
      return response.data.authUrl;
    },
    onSuccess: (authUrl) => {
      window.open(authUrl, 'wearable-connect', 'width=600,height=700');
      setShowConnectDialog(false);
      setSelectedDevice(null);
    }
  });

  const handleConnect = (deviceType) => {
    setSelectedDevice(deviceType);
    connectMutation.mutate(deviceType);
  };

  const handleSync = (deviceId) => {
    syncMutation.mutate(deviceId);
  };

  const handleDelete = (deviceId) => {
    if (window.confirm('Are you sure you want to disconnect this device?')) {
      deleteMutation.mutate(deviceId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Watch className="w-5 h-5 text-blue-600" />
            Connected Wearable Devices
          </h3>
          <p className="text-sm text-gray-600 mt-1">Sync health data from your devices automatically</p>
        </div>
        <Button
          onClick={() => setShowConnectDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Connect Device
        </Button>
      </div>

      {error && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to load devices: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : devices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Watch className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 mb-4">No devices connected yet</p>
            <Button
              onClick={() => setShowConnectDialog(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <Card key={device.id} className="border-none shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{DEVICE_ICONS[device.device_type]}</span>
                    <div>
                      <CardTitle className="text-base">{device.device_name}</CardTitle>
                      <p className="text-xs text-gray-600 mt-1 capitalize">
                        {device.device_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Badge className={device.is_connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {device.is_connected ? (
                      <><Check className="w-3 h-3 mr-1" />Connected</>
                    ) : (
                      <><X className="w-3 h-3 mr-1" />Disconnected</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Data Types */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Syncing</p>
                  <div className="flex flex-wrap gap-1.5">
                    {device.data_types?.map((type) => (
                      <Badge key={type} variant="outline" className="text-xs capitalize">
                        {type.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Last Sync */}
                {device.last_sync_date && (
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Last synced: {new Date(device.last_sync_date).toLocaleDateString()} {new Date(device.last_sync_date).toLocaleTimeString()}
                  </div>
                )}

                {/* Error Message */}
                {device.error_message && (
                  <Alert className="bg-yellow-50 border-yellow-200 py-2">
                    <AlertDescription className="text-yellow-800 text-xs">
                      {device.error_message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(device.id)}
                    disabled={syncMutation.isPending || !device.is_connected}
                    className="flex-1"
                  >
                    {syncMutation.isPending && syncMutation.variables === device.id ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Syncing
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(device.id)}
                    disabled={deleteMutation.isPending}
                    className="flex-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Device Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Connect a Wearable Device
            </DialogTitle>
            <DialogDescription>
              Select a device to automatically sync your health data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {[
              { id: 'fitbit', name: 'Fitbit', icon: '🏃', description: 'Steps, heart rate, sleep, calories' },
              { id: 'garmin', name: 'Garmin', icon: '⌚', description: 'Activities, heart rate, sleep' },
              { id: 'apple_health', name: 'Apple Health', icon: '🍎', description: 'Health data from your iPhone' },
              { id: 'google_fit', name: 'Google Fit', icon: '📊', description: 'Google Fit activities and metrics' }
            ].map((device) => (
              <Button
                key={device.id}
                variant="outline"
                className="w-full h-auto justify-start gap-3 p-4"
                onClick={() => handleConnect(device.id)}
                disabled={connectMutation.isPending && selectedDevice === device.id}
              >
                <span className="text-2xl">{device.icon}</span>
                <div className="text-left flex-1">
                  <p className="font-medium">{device.name}</p>
                  <p className="text-xs text-gray-600">{device.description}</p>
                </div>
                {connectMutation.isPending && selectedDevice === device.id && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}