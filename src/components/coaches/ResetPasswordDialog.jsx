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
import { KeyRound, Mail, CheckCircle2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordDialog({ coach, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleEmailReset = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('resetCoachPassword', {
        targetUserEmail: coach.email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setDone(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(false);
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
            Send a password reset link to <strong>{coach?.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4 pt-1">
            {/* Info box */}
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 space-y-1">
                <p className="font-semibold">How this works:</p>
                <ol className="list-decimal ml-4 space-y-1 text-xs">
                  <li>Click the button below to send a reset link</li>
                  <li>The coach receives an email with a secure link</li>
                  <li>They click the link and set their own new password</li>
                </ol>
              </div>
            </div>

            {/* Target email */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Reset link will be sent to:</p>
                <p className="text-sm font-medium text-gray-800 break-all">{coach?.email}</p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Make sure the coach has access to this inbox. The reset link expires after a short time.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleEmailReset}
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</span>
              ) : (
                <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send Password Reset Email</span>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-green-800 mb-1">Reset Email Sent!</p>
              <p className="text-sm text-green-700">
                A password reset link has been sent to <strong>{coach?.email}</strong>.
                The coach should check their inbox and click the link to set a new password.
              </p>
            </div>
            <Button type="button" onClick={handleClose} className="w-full h-10 bg-gray-800 text-white">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}