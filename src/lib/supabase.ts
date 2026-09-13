import { createClient } from '@supabase/supabase-js';

/* const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Upload student photo to Supabase storage
/* export const uploadStudentPhoto = async (file: File, studentId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('student-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return null;
    }

    const { data: publicUrl } = supabase.storage
      .from('student-photos')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
}; */

export const uploadStudentPhoto = async (
  file: File,
  studentId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}.${fileExt}`;
    const filePath = `students/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('student-photos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
};


// Generate unique student ID
export const generateStudentId = (department: string, year: string): string => {
  const deptCode = department.toUpperCase().slice(0, 3);
  const yearCode = year.slice(2);
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${deptCode}/${yearCode}/${randomNum}`;
};

// Check if matric number already exists
export const checkMatricExists = async (matricNo: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('students')
    .select('matric_no')
    .eq('matric_no', matricNo)
    .single();

  return !!data && !error;
};