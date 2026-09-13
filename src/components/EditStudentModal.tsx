import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Student, DEPARTMENTS, LEVELS, BLOOD_GROUPS } from '../types/student';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';

interface EditStudentModalProps {
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditStudentModal({ student, onClose, onSaved }: EditStudentModalProps) {
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [originalData, setOriginalData] = useState<Partial<Student> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFormData(student);
      setOriginalData(student);
    }
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('students')
        .update(formData)
        .eq('id', student.id);

      if (error) throw error;

      // Log the update activity
      await logActivity('UPDATE_STUDENT', 'student', student.id, {
        before: originalData,
        after: formData
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Edit Student</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Matric No</label>
              <input name="matric_no" value={formData.matric_no || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium">First Name</label>
              <input name="first_name" value={formData.first_name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Last Name</label>
              <input name="last_name" value={formData.last_name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Middle Name</label>
              <input name="middle_name" value={formData.middle_name || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Department</label>
              <select name="department" value={formData.department || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Level</label>
              <select name="level" value={formData.level || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Select</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input name="email" type="email" value={formData.email || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">Address</label>
              <input name="address" value={formData.address || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Emergency Contact</label>
              <input name="emergency_contact" value={formData.emergency_contact || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Emergency Phone</label>
              <input name="emergency_phone" value={formData.emergency_phone || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Blood Group</label>
              <select name="blood_group" value={formData.blood_group || ''} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="">Select</option>
                {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-700 text-white rounded-lg flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}