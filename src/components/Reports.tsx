import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Download, FileText, BarChart3 } from 'lucide-react';

interface ReportData {
  id: string;
  report_type: 'monthly' | 'custom' | 'yearly';
  start_date: string;
  end_date: string;
  total_invoiced: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  invoice_count: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  created_at: string;
}

export function Reports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<'this_month' | 'last_month' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentReport, setCurrentReport] = useState<ReportData | null>(null);

  useEffect(() => {
    fetchReports();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);

      if (data && data.length > 0) {
        setCurrentReport(data[0]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) {
      toast.error(t('common.error'));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch invoices for the period
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

      if (invoiceError) throw invoiceError;

      // Calculate statistics
      const stats = {
        total_invoiced: invoices?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        total_paid: invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        total_pending: invoices?.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        total_overdue: invoices?.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + Number(inv.amount), 0) || 0,
        invoice_count: invoices?.length || 0,
        paid_count: invoices?.filter(inv => inv.status === 'paid').length || 0,
        pending_count: invoices?.filter(inv => inv.status === 'sent').length || 0,
        overdue_count: invoices?.filter(inv => inv.status === 'overdue').length || 0,
      };

      // Save report
      const { error: reportError } = await supabase
        .from('reports')
        .insert([{
          user_id: user.id,
          report_type: periodType,
          start_date: startDate,
          end_date: endDate,
          ...stats
        }]);

      if (reportError) throw reportError;

      toast.success(t('reports.generate'));
      fetchReports();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!currentReport) return;
    
    try {
      // For now, just show a message - PDF generation would need a library like jsPDF
      toast.success(t('reports.export_pdf'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExportCSV = async () => {
    if (!currentReport) return;

    try {
      const csv = `Report Type,${currentReport.report_type}\nPeriod,"${currentReport.start_date} to ${currentReport.end_date}"\n\nMetrics,Amount/Count\nTotal Invoiced,${currentReport.total_invoiced}\nTotal Paid,${currentReport.total_paid}\nTotal Pending,${currentReport.total_pending}\nTotal Overdue,${currentReport.total_overdue}\nInvoice Count,${currentReport.invoice_count}\nPaid Count,${currentReport.paid_count}\nPending Count,${currentReport.pending_count}\nOverdue Count,${currentReport.overdue_count}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${currentReport.start_date}-${currentReport.end_date}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(t('reports.export_csv'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('reports.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('reports.period')}</p>
      </div>

      {/* Report Generator */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.generate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('reports.period')}</Label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as any)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="this_month">{t('reports.period.this_month')}</option>
                    <option value="last_month">{t('reports.period.last_month')}</option>
                    <option value="this_year">{t('reports.period.this_year')}</option>
                    <option value="custom">{t('reports.period.custom')}</option>
                  </select>
                </div>
                {periodType === 'custom' && (
                  <>
                    <div>
                      <Label>{t('reports.period')}</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('reports.period')}</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {t('reports.generate')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Current Report Display */}
      {currentReport && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.total_invoiced')}</p>
                  <p className="text-2xl font-bold mt-2">
                    {currentReport.total_invoiced.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.total_paid')}</p>
                  <p className="text-2xl font-bold text-green-500 mt-2">
                    {currentReport.total_paid.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.total_pending')}</p>
                  <p className="text-2xl font-bold text-blue-500 mt-2">
                    {currentReport.total_pending.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.total_overdue')}</p>
                  <p className="text-2xl font-bold text-red-500 mt-2">
                    {currentReport.total_overdue.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('reports.title')}</CardTitle>
              <CardDescription>
                {currentReport.start_date} to {currentReport.end_date}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 border rounded">
                    <BarChart3 className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Invoices</p>
                      <p className="text-2xl font-bold">{currentReport.invoice_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border rounded">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Paid</p>
                      <p className="text-2xl font-bold">{currentReport.paid_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border rounded">
                    <BarChart3 className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">{currentReport.pending_count}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 border rounded">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                      <p className="text-2xl font-bold">{currentReport.overdue_count}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {t('reports.export_pdf')}
                  </Button>
                  <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    {t('reports.export_csv')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Reports History */}
      {reports.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.title')} History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reports.slice(1).map((report) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setCurrentReport(report)}
                >
                  <div>
                    <p className="font-semibold">
                      {report.start_date} to {report.end_date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Invoiced: {report.total_invoiced.toLocaleString()} RWF
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
