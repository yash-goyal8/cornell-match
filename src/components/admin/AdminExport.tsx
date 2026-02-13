import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ExportType = 'students' | 'teams' | 'matches' | 'all';

export const AdminExport = () => {
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const downloadFile = (data: unknown, filename: string, format: 'json' | 'csv') => {
    let content: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      // Convert to CSV
      const rows = data as Record<string, unknown>[];
      if (rows.length === 0) {
        toast.info('No data to export');
        return;
      }
      const headers = Object.keys(rows[0]);
      const csvRows = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const val = row[h];
            const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        ),
      ];
      content = csvRows.join('\n');
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: ExportType, format: 'json' | 'csv') => {
    setExporting(type);
    try {
      if (type === 'students' || type === 'all') {
        const { data } = await supabase.from('profiles').select('*').order('created_at');
        if (data) downloadFile(data, 'students', format);
      }
      if (type === 'teams' || type === 'all') {
        const { data } = await supabase.from('teams').select('*').order('created_at');
        if (data) downloadFile(data, 'teams', format);
      }
      if (type === 'matches' || type === 'all') {
        const { data } = await supabase.from('matches').select('*').order('created_at');
        if (data) downloadFile(data, 'matches', format);
      }
      toast.success('Export complete');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  const ExportCard = ({ type, title, description }: { type: ExportType; title: string; description: string }) => (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport(type, 'csv')}
          disabled={exporting !== null}
        >
          {exporting === type ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileText className="w-4 h-4 mr-1" />}
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleExport(type, 'json')}
          disabled={exporting !== null}
        >
          {exporting === type ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileJson className="w-4 h-4 mr-1" />}
          JSON
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Export
        </CardTitle>
        <CardDescription>Download platform data in CSV or JSON format</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ExportCard type="students" title="Students" description="All student profiles, programs, skills" />
        <ExportCard type="teams" title="Teams" description="All teams, studios, member requirements" />
        <ExportCard type="matches" title="Matches" description="All match records and statuses" />
        <ExportCard type="all" title="Everything" description="Export all data at once" />
      </CardContent>
    </Card>
  );
};
