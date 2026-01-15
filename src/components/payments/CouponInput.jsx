import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Tag, Loader2 } from "lucide-react";

export default function CouponInput({ applicableTo, originalAmount, onCouponApplied, userEmail }) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateAndApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const coupons = await base44.entities.Coupon.filter({ 
        code: couponCode.trim().toUpperCase() 
      });

      if (coupons.length === 0) {
        setError("Invalid coupon code");
        setLoading(false);
        return;
      }

      const coupon = coupons[0];

      // Validation checks
      if (!coupon.is_active) {
        setError("This coupon is no longer active");
        setLoading(false);
        return;
      }

      if (!coupon.applicable_to.includes(applicableTo)) {
        setError("This coupon is not applicable here");
        setLoading(false);
        return;
      }

      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        setError("Coupon is not yet valid");
        setLoading(false);
        return;
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        setError("Coupon has expired");
        setLoading(false);
        return;
      }

      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        setError("Coupon usage limit reached");
        setLoading(false);
        return;
      }

      if (coupon.min_purchase_amount && originalAmount < coupon.min_purchase_amount) {
        setError(`Minimum purchase amount is ₹${coupon.min_purchase_amount}`);
        setLoading(false);
        return;
      }

      // Check per-user limit
      if (coupon.per_user_limit && userEmail) {
        const userUsage = (coupon.used_by || []).filter(u => u.user_email === userEmail).length;
        if (userUsage >= coupon.per_user_limit) {
          setError("You've reached the usage limit for this coupon");
          setLoading(false);
          return;
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === "percentage") {
        discountAmount = (originalAmount * coupon.discount_value) / 100;
        if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
          discountAmount = coupon.max_discount_amount;
        }
      } else {
        discountAmount = coupon.discount_value;
      }

      discountAmount = Math.min(discountAmount, originalAmount);

      setAppliedCoupon({
        ...coupon,
        discountAmount,
        finalAmount: originalAmount - discountAmount
      });

      onCouponApplied({
        coupon,
        discountAmount,
        finalAmount: originalAmount - discountAmount
      });

      setLoading(false);
    } catch (error) {
      console.error("Coupon validation error:", error);
      setError("Failed to validate coupon");
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setError("");
    onCouponApplied(null);
  };

  if (appliedCoupon) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-green-600 text-white">{appliedCoupon.code}</Badge>
                <span className="text-sm font-semibold text-green-800">
                  Coupon Applied!
                </span>
              </div>
              <p className="text-sm text-green-700 mb-2">
                {appliedCoupon.description || "Discount applied successfully"}
              </p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  Original Amount: <span className="line-through">₹{originalAmount}</span>
                </p>
                <p className="text-green-700 font-semibold">
                  Discount: -₹{appliedCoupon.discountAmount.toFixed(2)}
                </p>
                <p className="text-lg font-bold text-green-800">
                  Final Amount: ₹{appliedCoupon.finalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeCoupon}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Have a coupon code?</h3>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase());
            setError("");
          }}
          className="flex-1"
          disabled={loading}
        />
        <Button
          onClick={validateAndApplyCoupon}
          disabled={loading || !couponCode.trim()}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Applying...
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}