import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MatchRow {
  id: string;
  user_id: string;
  target_user_id: string;
  match_type: string;
  status: string;
  team_id: string | null;
  created_at: string;
  user_name?: string;
  target_name?: string;
}

export const AdminMatches = () => {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !matchesData) {
        setLoading(false);
        return;
      }

      // Get all unique user IDs to resolve names
      const userIds = new Set<string>();
      matchesData.forEach(m => {
        userIds.add(m.user_id);
        userIds.add(m.target_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', Array.from(userIds));

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.name; });

      setMatches(matchesData.map(m => ({
        ...m,
        user_name: nameMap[m.user_id] || 'Unknown',
        target_name: nameMap[m.target_user_id] || 'Unknown',
      })));
      setLoading(false);
    };
    fetchMatches();
  }, []);

  const statusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const filtered = matches.filter(m =>
    (m.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.target_name || '').toLowerCase().includes(search.toLowerCase()) ||
    m.match_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Matches ({matches.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search matches..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.user_name}</TableCell>
                    <TableCell className="font-medium">{m.target_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.match_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(m.status)}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No matches found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
