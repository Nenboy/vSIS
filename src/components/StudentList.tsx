import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Eye, GraduationCap } from 'lucide-react';
import { Student, DEPARTMENTS, LEVELS } from '../types/student';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';

interface StudentListProps {
  onViewCard: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  refreshKey?: number;
}

export default function StudentList({ onViewCard, onEditStudent, refreshKey }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [refreshKey]);

  const deleteStudent = async (id: string | number, student: Student) => {
    if (!window.confirm('Are you sure you want to delete this student record?')) {
      return;
    }
    try {
      const { error, data } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error("Error deleting student:", error);
        return;
      }
      console.log("Deleted rows:", data);

      await logActivity('DELETE_STUDENT', 'student', id.toString(), {
        name: `${student.first_name} ${student.last_name}`,
        matric_no: student.matric_no,
        student_id: student.student_id
      });

      fetchStudents();
    } catch (err) {
      console.error('Unexpected error deleting student:', err);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.matric_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = !departmentFilter || student.department === departmentFilter;
    const matchesLevel = !levelFilter || student.level === levelFilter;
    const matchesStatus = !statusFilter || student.status === statusFilter;

    return matchesSearch && matchesDepartment && matchesLevel && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : status === 'inactive'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Records</h2>
            <div className="text-sm text-gray-500">
              {filteredStudents.length} of {students.length} students
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">All Levels</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || departmentFilter || levelFilter || statusFilter
                ? 'Try adjusting your search criteria'
                : 'Get started by registering a new student'}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matric No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-gray-500 font-medium">
                                {student.first_name[0]}{student.last_name[0]}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.matric_no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.department}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.level}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewCard(student)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                            title="View ID Card"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onEditStudent(student)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors"
                            title="Edit Student"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id, student)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ MOBILE CARDS with staggered fade-in-up */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="p-4 animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-14 w-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={`${student.first_name} ${student.last_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 font-semibold text-sm">
                          {student.first_name[0]}{student.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {student.first_name} {student.last_name}
                        </h3>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${getStatusColor(student.status)}`}>
                          {student.status}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{student.matric_no}</p>
                      <p className="text-xs text-gray-500 mt-0.5">ID: {student.student_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      <span>{student.department}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <span>{student.level}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewCard(student)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Card
                    </button>
                    <button
                      onClick={() => onEditStudent(student)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteStudent(student.id, student)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}