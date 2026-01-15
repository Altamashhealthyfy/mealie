import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Tag, Copy, TrendingUp, Clock, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function CouponManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    applicable_to: [],
    min_purchase_amount: 0,
    max_discount_amount: 0,
    usage_limit: 0,
    per_user_limit: 1,
    valid_from: "",
    valid_until: "",
    is_active: true
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const allCoupons = await base44.entities.Coupon.list('-created_date');
      return allCoupons;
    },
    initialData: [],
  });

  const createCouponMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons']);
      setShowDialog(false);
      resetForm();
      alert('✅ Coupon created successfully!');
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons']);
      setShowDialog(false);
      resetForm();
      alert('✅ Coupon updated successfully!');
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons']);
      alert('✅ Coupon deleted successfully!');
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 10,
      applicable_to: [],
      min_purchase_amount: 0,
      max_discount_amount: 0,
      usage_limit: 0,
      per_user_limit: 1,
      valid_from: "",
      valid_until: "",
      is_active: true
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      applicable_to: coupon.applicable_to || [],
      min_purchase_amount: coupon.min_purchase_amount || 0,
      max_discount_amount: coupon.max_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      per_user_limit: coupon.per_user_limit || 1,
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : "",
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : "",
      is_active: coupon.is_active
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.discount_value || formData.applicable_to.length === 0) {
      alert('Please fill in coupon code, discount value, and select where it applies');
      return;
    }

    const data = {
      ...formData,
      code: formData.code.toUpperCase(),
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      usage_count: editingCoupon?.usage_count || 0,
      used_by: editingCoupon?.used_by || []
    };

    if (editingCoupon) {
      updateCouponMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createCouponMutation.mutate(data);
    }
  };

  const handleDelete = (couponId) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      deleteCouponMutation.mutate(couponId);
    }
  };

  const copyCouponCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Copied: ${code}`);
  };

  const toggleApplicability = (value) => {
    const current = [...formData.applicable_to];
    if (current.includes(value)) {
      setFormData({ ...formData, applicable_to: current.filter(v => v !== value) });
    } else {
      setFormData({ ...formData, applicable_to: [...current, value] });
    }
  };

  if (user?.user_type !== 'super_admin') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            Only Super Admins can manage coupons.
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Coupon Management</h1>
            <p className="text-gray-600">Create and manage discount coupons</p>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-5 h-5 mr-2" />
            Create Coupon
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coupons.map((coupon) => {
            const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
            const isLimitReached = coupon.usage_limit && coupon.usage_count >= coupon.usage_limit;
            
            return (
              <Card key={coupon.id} className="border-none shadow-xl">
                <CardHeader className={`${isExpired || isLimitReached ? 'bg-gray-400' : coupon.is_active ? 'bg-gradient-to-r from-green-500 to-teal-600' : 'bg-gray-500'} text-white`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-mono">{coupon.code}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={coupon.is_active && !isExpired && !isLimitReached ? 'bg-white text-green-600' : 'bg-white text-gray-600'}>
                        {isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : coupon.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-600">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {coupon.discount_type === 'percentage' ? 'Percentage Discount' : 'Fixed Discount'}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm">{coupon.description || 'No description'}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Tag className="w-4 h-4" />
                      <span>Applies to: {coupon.applicable_to.map(a => a.replace('_', ' ')).join(', ')}</span>
                    </div>
                    
                    {coupon.min_purchase_amount > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Min purchase: ₹{coupon.min_purchase_amount}</span>
                      </div>
                    )}
                    
                    {coupon.max_discount_amount > 0 && coupon.discount_type === 'percentage' && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>Max discount: ₹{coupon.max_discount_amount}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>
                        Usage: {coupon.usage_count || 0}
                        {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' (unlimited)'}
                      </span>
                    </div>

                    {coupon.per_user_limit && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>Per user limit: {coupon.per_user_limit}</span>
                      </div>
                    )}
                    
                    {coupon.valid_from && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Valid from: {format(new Date(coupon.valid_from), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    
                    {coupon.valid_until && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Valid until: {format(new Date(coupon.valid_until), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => copyCouponCode(coupon.code)} 
                      variant="outline" 
                      className="flex-1"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button onClick={() => handleEdit(coupon)} variant="outline" className="flex-1" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={() => handleDelete(coupon.id)} variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? 'Edit' : 'Create'} Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Coupon Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What's this coupon for?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type *</Label>
                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
                    placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Applicable To * (Select at least one)</Label>
                <div className="space-y-2">
                  {[
                    { value: 'ai_credits', label: 'AI Credits Purchase' },
                    { value: 'coach_plans', label: 'Health Coach Plans' },
                    { value: 'client_plans', label: 'Client Plans' }
                  ].map(option => (
                    <div key={option.value} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.applicable_to.includes(option.value)}
                        onChange={() => toggleApplicability(option.value)}
                        className="w-4 h-4"
                      />
                      <Label>{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Purchase Amount (₹)</Label>
                  <Input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = no minimum"
                  />
                </div>
                {formData.discount_type === 'percentage' && (
                  <div className="space-y-2">
                    <Label>Max Discount Amount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.max_discount_amount}
                      onChange={(e) => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0 = no maximum"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Usage Limit</Label>
                  <Input
                    type="number"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                    placeholder="0 = unlimited"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per User Limit</Label>
                  <Input
                    type="number"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button onClick={() => setShowDialog(false)} variant="outline">Cancel</Button>
                <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  {editingCoupon ? 'Update' : 'Create'} Coupon
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}