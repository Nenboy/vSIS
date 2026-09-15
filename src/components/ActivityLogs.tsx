import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  History, User, RefreshCw, AlertCircle,
  UserPlus, UserCheck, UserX, LogIn, LogOut, Settings, Eye,
  QrCode, Search, Filter, XCircle, MapPin
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
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

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

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;

    if (dateFilter !== 'all') {
      const logDate = new Date(log.created_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateFilter === 'today') {
        if (logDate < today) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (logDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (logDate < monthAgo) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = [
        log.user_email,
        log.entity_id,
        log.details?.student_name,
        log.details?.matric_no,
        log.details?.name,
        log.details?.post,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

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
      case 'QR_VERIFICATION':
        return { icon: QrCode, color: 'bg-emerald-100 text-emerald-700', label: 'QR Verified' };
      case 'QR_VERIFICATION_FAILED':
        return { icon: XCircle, color: 'bg-rose-100 text-rose-700', label: 'QR Failed' };
      default:
        return { icon: Eye, color: 'bg-gray-100 text-gray-700', label: action.replace(/_/g, ' ') };
    }
  };

  const renderLocationLink = (location: string | undefined, accuracy: number | null | undefined) => {
    if (!location || location === 'unavailable') {
      return <span className="text-gray-400 text-xs">Location unavailable</span>;
    }
    const [lat, lng] = location.split(',').map(s => s.trim());
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium"
        title={`Accuracy: ±${accuracy ?? '?'}m`}
      >
        <MapPin className="w-3 h-3" />
        {location}
        {accuracy ? ` (±${accuracy}m)` : ''}
      </a>
    );
  };

  const formatDetails = (log: ActivityLog) => {
    const details = log.details;
    if (!details) return '-';

    switch (log.action) {
      case 'CREATE_STUDENT':
        return `Created: ${details.name || 'Student'} (${details.matric_no || 'N/A'})`;
      case 'UPDATE_STUDENT':
        return 'Student details updated';
      case 'DELETE_STUDENT':
        return `Deleted: ${details.name || 'Student'}`;
      case 'LOGIN':
        return `Signed in as ${details.email || log.user_email}`;
      case 'LOGOUT':
        return 'Signed out';
      case 'UPDATE_SETTINGS':
        return 'System settings modified';
      case 'QR_VERIFICATION':
      case 'QR_VERIFICATION_FAILED':
        return null;
      default:
        return JSON.stringify(details).slice(0, 60);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const qrVerifiedCount = logs.filter(l => l.action === 'QR_VERIFICATION').length;
  const qrFailedCount = logs.filter(l => l.action === 'QR_VERIFICATION_FAILED').length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
          <p className="text-sm text-gray-500">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-600">
          <p className="text-sm text-gray-500">Successful Scans</p>
          <p className="text-2xl font-bold text-emerald-700">{qrVerifiedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-600">
          <p className="text-sm text-gray-500">Failed Scans</p>
          <p className="text-2xl font-bold text-rose-700">{qrFailedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-600">
          <p className="text-sm text-gray-500">Showing</p>
          <p className="text-2xl font-bold text-purple-700">{filteredLogs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, matric, post..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Actions</option>
                <option value="QR_VERIFICATION">QR Verified</option>
                <option value="QR_VERIFICATION_FAILED">QR Failed</option>
                <option value="CREATE_STUDENT">Created Student</option>
                <option value="UPDATE_STUDENT">Updated Student</option>
                <option value="DELETE_STUDENT">Deleted Student</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="UPDATE_SETTINGS">Settings Changed</option>
              </select>
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          {(filterAction !== 'all' || searchQuery || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setFilterAction('all');
                setSearchQuery('');
                setDateFilter('all');
              }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {logs.length === 0
                  ? 'Actions will appear here as the system is used.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location (Click for Map)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  const { icon: Icon, color, label } = getActionConfig(log.action);
                  const detailsText = formatDetails(log);
                  const isQR = log.action === 'QR_VERIFICATION' || log.action === 'QR_VERIFICATION_FAILED';

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
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                        {detailsText ? (
                          <div className="truncate" title={JSON.stringify(log.details, null, 2)}>
                            {detailsText}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {log.details?.student_name && (
                              <p className="font-medium text-gray-900">
                                {log.details.student_name}
                              </p>
                            )}
                            {log.details?.matric_no && (
                              <p className="text-xs font-mono text-gray-500">
                                {log.details.matric_no}
                              </p>
                            )}
                            {log.details?.reason && (
                              <p className="text-xs text-rose-600">
                                {log.details.reason}
                              </p>
                            )}
                            {log.details?.bulk && (
                              <span className="inline-block text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                bulk
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isQR && log.details?.post && log.details.post !== 'Unspecified' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            {log.details.post}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isQR ? (
                          renderLocationLink(log.details?.location, log.details?.accuracy_m)
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
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