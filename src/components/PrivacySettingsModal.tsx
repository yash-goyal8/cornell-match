import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Trash2, 
  Shield, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  requestDataExport, 
  requestAccountDeletion, 
  getUserSessions,
  revokeSession
} from '@/lib/security';
import { formatDistanceToNow } from 'date-fns';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Session {
  id: string;
  device_info: unknown;
  ip_address: unknown;
  last_active_at: string;
  created_at: string;
}

export const PrivacySettingsModal = ({ isOpen, onClose }: PrivacySettingsModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'sessions'>('data');

  const handleExportData = async () => {
    setLoading('export');
    try {
      const result = await requestDataExport();
      if (result.success && result.data) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Your data has been exported successfully!');
      } else {
        toast.error(result.error || 'Failed to export data');
      }
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading('delete');
    try {
      const result = await requestAccountDeletion();
      if (result.success) {
        toast.success('Account deletion request submitted. You will receive a confirmation email.');
        setShowDeleteConfirm(false);
        onClose();
      } else {
        toast.error(result.error || 'Failed to submit deletion request');
      }
    } catch (error) {
      toast.error('Failed to submit deletion request');
    } finally {
      setLoading(null);
    }
  };

  const loadSessions = async () => {
    setLoading('sessions');
    try {
      const result = await getUserSessions();
      if (result.success && result.sessions) {
        setSessions(result.sessions);
      }
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(null);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(`revoke-${sessionId}`);
    try {
      const result = await revokeSession(sessionId);
      if (result.success) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        toast.success('Session revoked');
      } else {
        toast.error(result.error || 'Failed to revoke session');
      }
    } catch (error) {
      toast.error('Failed to revoke session');
    } finally {
      setLoading(null);
    }
  };

  const getDeviceIcon = (deviceInfo: unknown) => {
    const info = deviceInfo as Record<string, unknown> | null;
    if (info?.isMobile) return Smartphone;
    return Monitor;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Privacy & Security
            </DialogTitle>
            <DialogDescription>
              Manage your data privacy and security settings
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'data' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Data Privacy
            </button>
            <button
              onClick={() => {
                setActiveTab('sessions');
                loadSessions();
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sessions' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Sessions
            </button>
          </div>

          <div className="space-y-4 py-4">
            {activeTab === 'data' && (
              <>
                {/* Data Export */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Download className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Export Your Data</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download a copy of all your data including your profile, teams, matches, and messages.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={handleExportData}
                        disabled={loading === 'export'}
                      >
                        {loading === 'export' ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Export Data
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Account Deletion */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-destructive/10">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-destructive">Delete Account</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Security Info */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium">Your data is protected</p>
                      <ul className="text-muted-foreground mt-1 space-y-1">
                        <li>• Encrypted in transit and at rest</li>
                        <li>• Row-level security on all data</li>
                        <li>• Audit logging for sensitive operations</li>
                        <li>• GDPR-compliant data handling</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-3">
                {loading === 'sessions' ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active sessions found
                  </div>
                ) : (
                  sessions.map((session, index) => {
                    const DeviceIcon = getDeviceIcon(session.device_info);
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-lg border bg-card flex items-center gap-3"
                      >
                        <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {String(session.ip_address || 'Unknown location')}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Active {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={loading === `revoke-${session.id}`}
                        >
                          {loading === `revoke-${session.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Revoke'
                          )}
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Account Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your data including your profile, 
              teams, matches, and messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAccount}
              disabled={loading === 'delete'}
            >
              {loading === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Yes, Delete My Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PrivacySettingsModal;
