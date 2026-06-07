import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Proforma } from '@/lib/types';

const convertProformaSchema = z.object({
  purchaseCode: z.string().max(128).optional(),
});

type ConvertProformaFormValues = z.infer<typeof convertProformaSchema>;

interface ConvertProformaModalProps {
  open: boolean;
  proforma?: Proforma | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (purchaseCode?: string) => Promise<void>;
}

export function ConvertProformaModal({ open, proforma, isLoading, onOpenChange, onConvert }: ConvertProformaModalProps) {
  const form = useForm<ConvertProformaFormValues>({
    resolver: zodResolver(convertProformaSchema),
    defaultValues: {
      purchaseCode: '',
    },
  });

  const handleSubmit = async (values: ConvertProformaFormValues) => {
    await onConvert(values.purchaseCode?.trim() || undefined);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      onOpenChange(value);
      if (!value) form.reset();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Proforma to Invoice</DialogTitle>
          <DialogDescription>
              Enter Purchase Order if available. Leave blank if no purchase order exists.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
              <Label htmlFor="purchaseCode">Purchase Order</Label>
            <Input
              id="purchaseCode"
              placeholder="Enter purchase order"
              {...form.register('purchaseCode')}
            />
            <p className="text-xs text-muted-foreground">
                Enter Purchase Order if available. Leave blank if no purchase order exists.
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              Convert Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
