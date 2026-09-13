import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSettings } from '../hooks/useSettings';
import { Upload, Save, AlertCircle, UserPlus } from 'lucide-react';
import { DEPARTMENTS, LEVELS, BLOOD_GROUPS } from '../types/student';
import { supabase, uploadStudentPhoto, generateStudentId, checkMatricExists } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';

const schema = z.object({
  matric_no: z.string().min(1, 'Matric number is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_name: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  level: z.string().min(1, 'Level is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Invalid email').min(1, 'Email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  emergency_contact: z.string().min(1, 'Emergency contact is required'),
  emergency_phone: z.string().min(1, 'Emergency phone is required'),
  blood_group: z.string().optional(),
});

type StudentFormData = z.infer<typeof schema>;

interface StudentRegistrationProps {
  onSuccess: () => void;
}

export default function StudentRegistration({ onSuccess }: StudentRegistrationProps) {
  const { settings, loading: settingsLoading } = useSettings();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<StudentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      matric_no: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      department: '',
      level: '',
      date_of_birth: '',
      email: '',
      phone: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
      blood_group: '',
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit: SubmitHandler<StudentFormData> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const matricExists = await checkMatricExists(data.matric_no);
      if (matricExists) {
        setError('A student with this matric number already exists');
        setLoading(false);
        return;
      }

      const currentYear = new Date().getFullYear().toString();
      const studentId = generateStudentId(data.department, currentYear);

      // Use settings validity years (default to 4 if not loaded)
      const validityYears = settings?.card?.validityYears ?? 4;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + validityYears);

      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadStudentPhoto(photoFile, studentId);
      }

      const studentRecord = {
        student_id: studentId,
        matric_no: data.matric_no,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        department: data.department,
        level: data.level,
        photo_url: photoUrl,
        date_of_birth: data.date_of_birth,
        email: data.email,
        phone: data.phone,
        address: data.address,
        emergency_contact: data.emergency_contact,
        emergency_phone: data.emergency_phone,
        blood_group: data.blood_group || null,
        date_registered: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
        status: 'active' as const,
      };

      const { error: insertError } = await supabase
        .from('students')
        .insert(studentRecord);

      if (insertError) throw insertError;

      // ✅ Log the creation
      await logActivity('CREATE_STUDENT', 'student', studentId, {
        name: `${data.first_name} ${data.last_name}`,
        matric_no: data.matric_no,
        department: data.department,
        level: data.level
      });

      reset();
      setPhotoPreview(null);
      setPhotoFile(null);
      onSuccess();
    } catch (err: any) {
      // ✅ REVEAL THE REAL ERROR
      console.error('🔴 REGISTRATION ERROR:', err);
      setError(err.message || 'Failed to register student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while settings are being fetched
  if (settingsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading student register...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <UserPlus className="h-8 w-8 text-blue-700" />
          <h2 className="text-3xl font-bold text-gray-900">Register New Student</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Photo Upload Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Photo</h3>
            <div className="flex items-center space-x-6">
              <div className="w-32 h-40 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden shadow-sm">
                {photoPreview ? (
                  <img src={photoPreview} alt="Student photo preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Photo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
                />
                <p className="mt-2 text-xs text-gray-500">Recommended: 3:4 aspect ratio, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Matric Number *</label>
              <input {...register('matric_no')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g., 20/1234" />
              {errors.matric_no && <p className="mt-1 text-sm text-red-600">{errors.matric_no.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
              <input {...register('first_name')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="John" />
              {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
              <input {...register('last_name')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Doe" />
              {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
              <input {...register('middle_name')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Michael" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
              <select {...register('department')} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select Department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
              {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Level *</label>
              <select {...register('level')} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select Level</option>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              {errors.level && <p className="mt-1 text-sm text-red-600">{errors.level.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
              <input {...register('date_of_birth')} type="date" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {errors.date_of_birth && <p className="mt-1 text-sm text-red-600">{errors.date_of_birth.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input {...register('email')} type="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="john.doe@university.edu" />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input {...register('phone')} type="tel" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+1 (555) 123-4567" />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <select {...register('blood_group')} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <input {...register('address')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="123 Main St, City, State, ZIP" />
              {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact *</label>
              <input {...register('emergency_contact')} type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Jane Doe" />
              {errors.emergency_contact && <p className="mt-1 text-sm text-red-600">{errors.emergency_contact.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Phone *</label>
              <input {...register('emergency_phone')} type="tel" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+1 (555) 987-6543" />
              {errors.emergency_phone && <p className="mt-1 text-sm text-red-600">{errors.emergency_phone.message}</p>}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                reset();
                setPhotoPreview(null);
                setPhotoFile(null);
                setError(null);
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center space-x-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Registering...' : 'Register Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}