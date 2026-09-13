import { useState, useEffect } from 'react';
import {
  Users, CreditCard, UserX, Calendar, UserPlus,
  AlertTriangle, Activity, ScanLine, Layers, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Student } from '../types/student';

interface DashboardStats {
  totalStudents: number;
  activeCards: number;
  inactiveCards: number;
  thisMonth: number;
  expiringSoon: number;
}

interface ActivityLog {
  id: string;
  user_email: string;
  action: string;
  details: any;
  created_at: string;
}

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

export default function Dashboard({ onTabChange }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeCards: 0,
    inactiveCards: 0,
    thisMonth: 0,
    expiringSoon: 0,
  });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Total students
      const { count: totalCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Active cards
      const { count: activeCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Inactive/Expired
      const { count: inactiveCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .in('status', ['inactive', 'expired']);

      // This month registrations
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      const { count: monthCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .gte('date_registered', firstDayOfMonth.toISOString());

      // Expiring in next 30 days
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      const { count: expiringSoonCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('expiry_date', today.toISOString())
        .lte('expiry_date', in30Days.toISOString());

      setStats({
        totalStudents: totalCount || 0,
        activeCards: activeCount || 0,
        inactiveCards: inactiveCount || 0,
        thisMonth: monthCount || 0,
        expiringSoon: expiringSoonCount || 0,
      });

      // Recent students
      const { data: recent } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentStudents(recent || []);

      // Recent activity
      const { data: activity } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE_STUDENT': return 'registered a new student';
      case 'UPDATE_STUDENT': return 'updated a student record';
      case 'DELETE_STUDENT': return 'deleted a student';
      case 'LOGIN': return 'signed in';
      case 'LOGOUT': return 'signed out';
      case 'UPDATE_SETTINGS': return 'changed settings';
      default: return action.toLowerCase().replace(/_/g, ' ');
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      accent: 'text-blue-600',
    },
    {
      title: 'Active Cards',
      value: stats.activeCards,
      icon: CreditCard,
      color: 'bg-green-50 text-green-600',
      accent: 'text-green-600',
    },
    {
      title: 'Inactive / Expired',
      value: stats.inactiveCards,
      icon: UserX,
      color: 'bg-red-50 text-red-600',
      accent: 'text-red-600',
    },
    {
      title: 'This Month',
      value: stats.thisMonth,
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600',
      accent: 'text-indigo-600',
    },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 h-32"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 h-96"></div>
            <div className="bg-white rounded-lg shadow p-6 h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, Admin</h1>
            <p className="text-blue-100 text-sm mt-1">
              Here's what's happening with your virtual ID system today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onTabChange && (
              <>
                <button
                  onClick={() => onTabChange('register')}
                  className="bg-white text-blue-800 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Register Student
                </button>
                <button
                  onClick={() => onTabChange('cards')}
                  className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors flex items-center gap-2 border border-blue-500"
                >
                  <Layers className="h-4 w-4" />
                  Batch Cards
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <TrendingUp className="h-4 w-4 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Expiring Soon Alert */}
      {stats.expiringSoon > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {stats.expiringSoon} card{stats.expiringSoon > 1 ? 's' : ''} expiring in the next 30 days
            </p>
            <p className="text-xs text-yellow-600">
              Consider sending renewal notices to these students.
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout: Recent Students + Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Students - 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-600" />
              Recently Registered Students
            </h2>
            {onTabChange && (
              <button
                onClick={() => onTabChange('search')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {student.photo_url ? (
                            <img src={student.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-blue-600 font-semibold text-sm">
                              {student.first_name?.[0]}{student.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div className="ml-3 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{student.matric_no}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {student.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(student.date_registered)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : student.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No students registered yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Feed - 1 col */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Recent Activity
            </h2>
            {onTabChange && (
              <button
                onClick={() => onTabChange('activity')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all →
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {recentActivity.map((log) => (
              <div key={log.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{log.user_email?.split('@')[0] || 'system'}</span>
                      {' '}
                      <span className="text-gray-600">{getActionLabel(log.action)}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}