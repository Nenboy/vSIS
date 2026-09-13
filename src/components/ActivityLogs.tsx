import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  History, User, RefreshCw, AlertCircle, 
  UserPlus, UserCheck, UserX, LogIn, LogOut, Settings, Eye
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'CREATE_STUDENT':
        return { icon: UserPlus, color: 'bg-green-100 text-green-700', label: 'Created Student' };
      case 'UPDATE_STUDENT':
        return { icon: UserCheck, color: 'bg-blue-100 text-blue-700', label: 'Updated Student' };
      case 'DELETE_STUDENT':
        return { icon: UserX, color: 'bg-red-100 text-red-700', label: 'Deleted Student' };
      case 'LOGIN':
        return { icon: LogIn, color: 'bg-purple-100 text-purple-700', label: 'Login' };
      case 'LOGOUT':
        return { icon: LogOut, color: 'bg-gray-100 text-gray-700', label: 'Logout' };
      case 'UPDATE_SETTINGS':
        return { icon: Settings, color: 'bg-yellow-100 text-yellow-700', label: 'Settings Changed' };
      default:
        return { icon: Eye, color: 'bg-gray-100 text-gray-700', label: action.replace(/_/g, ' ') };
    }
  };

  const formatDetails = (log: ActivityLog) => {
    const details = log.details;
    if (!details) return '-';

    switch (log.action) {
      case 'CREATE_STUDENT':
        return `Created: ${details.name || 'Student'} (${details.matric_no || 'N/A'})`;
      case 'UPDATE_STUDENT':
        if (details.after && details.before) {
          const changed = Object.keys(details.after).filter(k => 
            details.before[k] !== details.after[k] && k !== 'id'
          );
          if (changed.length > 0) {
            return `Updated: ${changed.join(', ')}`;
          }
        }
        return 'Student details updated';
      case 'DELETE_STUDENT':
        return `Deleted: ${details.name || 'Student'} (${details.matric_no || 'N/A'})`;
      case 'LOGIN':
        return `Signed in as ${details.email || log.user_email}`;
      case 'LOGOUT':
        return `Signed out`;
      case 'UPDATE_SETTINGS':
        return 'System settings modified';
      default:
        return JSON.stringify(details).slice(0, 60);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchLogs}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <History className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
            </div>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center space-x-2 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">Track all user actions in the system</p>
        </div>

        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity logs found</h3>
              <p className="mt-1 text-sm text-gray-500">Actions will appear here once you start using the system.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => {
                  const { icon: Icon, color, label } = getActionConfig(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{log.user_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                          <Icon className="h-3 w-3 mr-1" />
                          <span>{label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="text-xs text-gray-400 ml-1">({log.entity_id.slice(0, 8)}…)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                        <div className="truncate" title={JSON.stringify(log.details, null, 2)}>
                          {formatDetails(log)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}