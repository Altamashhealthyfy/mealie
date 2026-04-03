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
import { KeyRound, Mail, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordDialog({ coach, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('resetCoachPassword', {
        targetUserEmail: coach.email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
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
            Send a password reset email to <strong>{coach?.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!sent ? (
            <>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">A password reset link will be emailed to:</p>
                  <p className="font-mono text-blue-700 break-all">{coach?.email}</p>
                  <p className="text-blue-600 mt-2 text-xs">The coach can use this link to set their own new password.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Make sure the coach has access to this email inbox to receive the reset link.</p>
              </div>
              <Button
                onClick={handleReset}
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Send Password Reset Email
                  </span>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-green-800 mb-1">Reset email sent!</p>
                <p className="text-sm text-green-700">
                  A password reset link has been sent to <strong>{coach?.email}</strong>.
                </p>
                <p className="text-xs text-green-600 mt-2">The coach should check their inbox and spam folder.</p>
              </div>
              <Button onClick={handleClose} className="w-full h-10 bg-gray-800 text-white">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}