import React, { useState } from 'react';
import { customerService, type Customer } from '@/lib/customerService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, X, AlertCircle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerSaved: (customer: Customer) => void;
  initialCustomer?: Customer | null;
}

export function CustomerModal({
  isOpen,
  onClose,
  onCustomerSaved,
  initialCustomer = null
}: CustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    full_name: initialCustomer?.full_name || '',
    phone_number: initialCustomer?.phone_number || '',
    email: initialCustomer?.email || '',
    company_name: initialCustomer?.company_name || '',
    tin_number: initialCustomer?.tin_number || ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof Customer, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSave = async () => {
    // Validate
    const validation = customerService.validateCustomer(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    try {
      let customerId: string | null = null;

      if (initialCustomer?.id) {
        // Update existing
        const success = await customerService.updateCustomer(initialCustomer.id, formData);
        if (success) {
          customerId = initialCustomer.id;
          toast.success('Customer updated successfully');
        } else {
          toast.error('Failed to update customer');
          setLoading(false);
          return;
        }
      } else {
        // Create new
        customerId = await customerService.createCustomer(formData as Omit<Customer, 'id' | 'created_at' | 'updated_at'>);
        if (customerId) {
          toast.success('Customer created successfully');
        } else {
          toast.error('Failed to create customer');
          setLoading(false);
          return;
        }
      }

      // Get full customer details and callback
      if (customerId) {
        const customer = await customerService.getCustomerDetails(customerId);
        if (customer) {
          onCustomerSaved(customer);
          handleClose();
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('An error occurred while saving customer');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      phone_number: '',
      email: '',
      company_name: '',
      tin_number: ''
    });
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>{initialCustomer ? 'Edit Customer' : 'Create New Customer'}</CardTitle>
            <CardDescription>Enter customer details including business information</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                {errors.map((error, idx) => (
                  <div key={idx} className="flex gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Full Name - REQUIRED */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Full Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="John Doe"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                disabled={loading}
                className="border-2"
              />
              <p className="text-xs text-muted-foreground">Customer's full name (required)</p>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+250 788 888 888"
                value={formData.phone_number || ''}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                disabled={loading}
                type="tel"
              />
              <p className="text-xs text-muted-foreground">Customer's contact phone number</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                placeholder="john@example.com"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                type="email"
              />
              <p className="text-xs text-muted-foreground">Customer's email address</p>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label>Company / Workplace Name</Label>
              <Input
                placeholder="Acme Corporation"
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">Customer's organization or company</p>
            </div>

            {/* TIN Number */}
            <div className="space-y-2">
              <Label>TIN Number</Label>
              <Input
                placeholder="XXXXXXXXXXXXXX"
                value={formData.tin_number || ''}
                onChange={(e) => handleInputChange('tin_number', e.target.value)}
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Tax Identification Number</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : 'Save Customer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
