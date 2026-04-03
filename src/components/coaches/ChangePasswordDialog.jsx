import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ChangePasswordDialog({ coach, onClose, onSubmit }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsDontMatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(newPassword);
      setSuccess(true);
      toast.success('✅ Password changed successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Change Coach Password</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500">Set a new password for <strong>{coach.full_name}</strong></p>

        {/* Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-900">
            <strong>Note:</strong> Password will be changed without requiring the old password. Make sure to inform the coach about the new password.
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
            <p className="text-green-700 font-semibold">✅ Password changed successfully!</p>
          </div>
        ) : (
          <>
            {/* New Password */}
            <div className="space-y-1">
              <Label>New Password *</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label>Confirm New Password *</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsDontMatch && (
                <p className="text-xs text-red-600">❌ Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600">✅ Passwords match</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !newPassword || !confirmPassword || passwordsDontMatch}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold h-11"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}