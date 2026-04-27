import React, { useState, useEffect } from 'react';
import { customerService, type Customer } from '@/lib/customerService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Check, AlertCircle } from 'lucide-react';

interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
}

export function CustomerSelector({
  onSelectCustomer,
  onCreateNew,
  placeholder = 'Search by name, phone, or company...',
  className = ''
}: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchTerm.trim()) {
        setLoading(true);
        const results = await customerService.searchCustomers(searchTerm);
        setSearchResults(results);
        setShowResults(true);
        setLoading(false);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.full_name);
    setShowResults(false);
    onSelectCustomer(customer);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Customer Information
        </Label>

        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              className="pr-10"
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-b-0 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{customer.full_name}</div>
                      {customer.company_name && (
                        <div className="text-xs text-muted-foreground">{customer.company_name}</div>
                      )}
                      {customer.phone_number && (
                        <div className="text-xs text-muted-foreground">{customer.phone_number}</div>
                      )}
                    </div>
                    <Check className="h-4 w-4 text-green-600 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchResults.length === 0 && searchTerm.trim() && !loading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-input rounded-md shadow-lg z-50 p-4">
              <div className="text-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mx-auto mb-2 opacity-50" />
                No customers found
              </div>
              {onCreateNew && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={onCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected Customer Details */}
      {selectedCustomer && (
        <Card className="mt-4 bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-5 w-5 text-green-600" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Full Name</div>
                <div className="text-sm font-medium mt-1">{selectedCustomer.full_name}</div>
              </div>

              {/* Phone Number */}
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</div>
                <div className="text-sm font-medium mt-1">
                  {selectedCustomer.phone_number || <span className="text-muted-foreground">Not provided</span>}
                </div>
              </div>

              {/* Email */}
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Email</div>
                <div className="text-sm font-medium mt-1 break-all">
                  {selectedCustomer.email || <span className="text-muted-foreground">Not provided</span>}
                </div>
              </div>

              {/* Company Name */}
              <div className="bg-white p-3 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Company Name</div>
                <div className="text-sm font-medium mt-1">
                  {selectedCustomer.company_name || <span className="text-muted-foreground">Not provided</span>}
                </div>
              </div>

              {/* TIN Number */}
              <div className="md:col-span-2 bg-white p-3 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-muted-foreground uppercase">TIN Number</div>
                <div className="text-sm font-medium mt-1 font-mono">
                  {selectedCustomer.tin_number || <span className="text-muted-foreground">Not provided</span>}
                </div>
              </div>
            </div>

            {/* Clear Selection Button */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-4"
              onClick={handleClearSelection}
            >
              Change Customer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
