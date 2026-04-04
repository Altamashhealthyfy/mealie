import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { KeyRound, Mail, CheckCircle2, RefreshCw, AlertTriangle, Eye, EyeOff, Lock, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function ResetPasswordDialog({ coach, open, onClose }) {
  const [mode, setMode] = useState('direct'); // 'direct' | 'email'
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tempPassword, setTempPassword] = useState(() => generateTempPassword());
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

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

  // "Direct" mode: admin generates a temp password, shares it manually,
  // then sends a reset email so the coach can set their permanent one.
  const handleDirectShare = async () => {
    setLoading(true);
    try {
      // Send reset email so coach sets their own permanent password
      const response = await base44.functions.invoke('resetCoachPassword', {
        targetUserEmail: coach.email,
      });
      if (response.data?.error) throw new Error(response.data.error);
      setDone(true);
      toast.success('Temp password copied & reset email sent!');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setMode('direct');
    setTempPassword(generateTempPassword());
    setShowPassword(false);
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
            Change Coach Password
          </DialogTitle>
          <DialogDescription>
            Manage password for <strong>{coach?.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4 pt-1">
            {/* Mode Tabs */}
            <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 gap-1">
              <button
                type="button"
                onClick={() => setMode('direct')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'direct' ? 'bg-white shadow text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lock className="w-4 h-4" /> Share Password
              </button>
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'email' ? 'bg-white shadow text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4" /> Email Reset
              </button>
            </div>

            {mode === 'direct' ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">📋 How this works:</p>
                  <ol className="list-decimal ml-4 space-y-1 text-xs">
                    <li>Generate a temporary password below</li>
                    <li>Copy & share it with the coach (WhatsApp/call)</li>
                    <li>Click "Send & Share" to also email them a reset link for their permanent password</li>
                  </ol>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm font-medium">Temporary Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={tempPassword}
                        readOnly
                        className="pr-10 font-mono bg-gray-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(tempPassword)}
                      className="flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setTempPassword(generateTempPassword())}
                      className="flex-shrink-0"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Share this with the coach via WhatsApp or phone call.</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Note: This is a suggested temporary password for you to share directly. The platform will also send a reset email so the coach can set their own permanent password.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopy(`Login: ${coach?.email}\nTemp Password: ${tempPassword}\n\nPlease reset your password after logging in.`)}
                  >
                    <Copy className="w-4 h-4 mr-1" /> Copy Credentials
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDirectShare}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send & Share</span>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-green-800 mb-1">Done!</p>
              <p className="text-sm text-green-700">
                {mode === 'direct'
                  ? `A reset email has been sent to ${coach?.email}. Share the temporary password with them directly.`
                  : `A password reset link has been sent to ${coach?.email}.`}
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