export interface Student {
  id: string;
  student_id: string;
  matric_no: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  department: string;
  level: string;
  photo_url?: string;
  date_of_birth: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  blood_group?: string;
  date_registered: string;
  expiry_date: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface StudentFormData {
  matric_no: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  department: string;
  level: string;
  photo?: File;
  date_of_birth: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  blood_group?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export const DEPARTMENTS = [
  { id: '1', name: 'Computer Science', code: 'CSC' },
  { id: '2', name: 'Electrical Engineering', code: 'EEE' },
  { id: '3', name: 'Mechanical Engineering', code: 'MEE' },
  { id: '4', name: 'Civil Engineering', code: 'CVE' },
  { id: '5', name: 'Business Administration', code: 'BUA' },
  { id: '6', name: 'Economics', code: 'ECO' },
  { id: '7', name: 'Mathematics', code: 'MTH' },
  { id: '8', name: 'Physics', code: 'PHY' },
  { id: '9', name: 'Chemistry', code: 'CHM' },
  { id: '10', name: 'Biology', code: 'BIO' },
];

export const LEVELS = [
  '100 Level',
  '200 Level', 
  '300 Level',
  '400 Level',
  '500 Level',
  'Postgraduate'
];

export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];