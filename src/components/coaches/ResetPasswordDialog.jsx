import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { KeyRound, Copy, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordDialog({ coach, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('resetCoachPassword', {
        targetUserEmail: coach.email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setGeneratedPassword(response.data.newPassword);
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Password copied!');
  };

  const handleClose = () => {
    setGeneratedPassword(null);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <KeyRound className="w-5 h-5 text-indigo-600" />
            </div>
            Reset Coach Password
          </DialogTitle>
          <DialogDescription>
            Reset password for <strong>{coach?.full_name}</strong> ({coach?.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!generatedPassword ? (
            <>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">This will generate a new random password.</p>
                  <p className="text-amber-700">Share it with the coach so they can log in and update it themselves.</p>
                </div>
              </div>
              <Button
                onClick={handleReset}
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" />
                    Generate New Password
                  </span>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-800 mb-3">Password reset successfully!</p>
                <div className="bg-white border-2 border-green-300 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-bold tracking-widest text-gray-900">
                    {generatedPassword}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="flex-shrink-0 border-green-300 hover:bg-green-50"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-green-700 mt-2">Share this password with the coach securely.</p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full h-10 bg-gray-800 text-white"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}