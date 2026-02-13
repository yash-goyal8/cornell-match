import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Layers, ScrollText, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminStudents } from './AdminStudents';
import { AdminTeams } from './AdminTeams';
import { AdminMatches } from './AdminMatches';
import { AdminAuditLog } from './AdminAuditLog';
import { AdminExport } from './AdminExport';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg text-foreground">Studio Director</h1>
                <p className="text-xs text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="students" className="gap-1 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1 text-xs sm:text-sm">
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1 text-xs sm:text-sm">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Matches</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1 text-xs sm:text-sm">
              <ScrollText className="w-4 h-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1 text-xs sm:text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students"><AdminStudents /></TabsContent>
          <TabsContent value="teams"><AdminTeams /></TabsContent>
          <TabsContent value="matches"><AdminMatches /></TabsContent>
          <TabsContent value="audit"><AdminAuditLog /></TabsContent>
          <TabsContent value="export"><AdminExport /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
