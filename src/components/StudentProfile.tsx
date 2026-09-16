import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import {
  User, Lock, Shield, Save, AlertCircle, CheckCircle2,
  Mail, Phone, MapPin, GraduationCap, Calendar, CreditCard, KeyRound
} from 'lucide-react';
import { Student } from '../types/student';

export default function StudentProfile() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user?.email) return;
      setLoading(true);
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .single();
      if (data) setStudent(data);
      setLoading(false);
    };
    fetchStudentData();
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await logActivity('UPDATE_SETTINGS', 'profile', user?.id || 'self', {
        action: 'password_changed',
        email: user?.email,
      });

      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-700" />
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900">My Profile</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              View your information and manage your account
            </p>
          </div>
        </div>
      </div>

      {!student ? (
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No student record found</p>
          <p className="text-sm text-gray-500 mt-1">
            Your email is not linked to a student record. Please contact the Admin office.
          </p>
        </div>
      ) : (
        <>
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-800 to-indigo-900">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {/* Photo + Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-gray-100">
                <div className="w-24 h-28 rounded-xl border-2 border-blue-100 overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={`${student.first_name} ${student.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 font-mono mt-0.5">{student.matric_no}</p>
                  <p className="text-sm text-gray-600 mt-1">{student.department}</p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">{student.level}</p>
                  <div className="mt-2">
                    <span className={`inline-block text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                      student.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : student.status === 'inactive'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfileField icon={Mail} label="Email" value={student.email} />
                <ProfileField icon={Phone} label="Phone" value={student.phone || 'Not provided'} />
                <ProfileField icon={GraduationCap} label="Student ID" value={student.student_id} mono />
                <ProfileField icon={Calendar} label="Date of Birth" value={formatDate(student.date_of_birth)} />
                <ProfileField icon={MapPin} label="Address" value={student.address || 'Not provided'} />
                <ProfileField icon={Calendar} label="Date Registered" value={formatDate(student.date_registered)} />
                <ProfileField icon={Shield} label="Card Expires" value={formatDate(student.expiry_date)} />
                <ProfileField icon={User} label="Blood Group" value={student.blood_group || 'Not provided'} />
              </div>

              {/* Emergency contact */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProfileField icon={User} label="Contact Name" value={student.emergency_contact || 'Not provided'} />
                  <ProfileField icon={Phone} label="Contact Phone" value={student.emergency_phone || 'Not provided'} />
                </div>
              </div>

              {/* Info note */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  To update your personal information, please visit the Admin office. Only administrators can modify student records.
                </p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-4 w-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-800">Change Password</h4>
              </div>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      minLength={6}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick access to ID card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8" />
                <div>
                  <h3 className="font-semibold">Need your ID card?</h3>
                  <p className="text-xs text-blue-100 mt-0.5">View or download your virtual ID from the sidebar</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Reusable field component
function ProfileField({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm text-gray-900 mt-0.5 break-words ${mono ? 'font-mono' : 'font-medium'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}