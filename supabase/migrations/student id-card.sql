/*
  # Student ID Management System Database Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key) - Internal unique identifier
      - `student_id` (text, unique) - Generated student ID (e.g., CSC/24/0001)
      - `matric_no` (text, unique) - Student matriculation number
      - `first_name` (text) - Student's first name
      - `last_name` (text) - Student's last name
      - `middle_name` (text, optional) - Student's middle name
      - `department` (text) - Academic department
      - `level` (text) - Current academic level
      - `photo_url` (text, optional) - URL to student photo in storage
      - `date_of_birth` (date) - Student's date of birth
      - `email` (text, unique) - Student's email address
      - `phone` (text) - Phone number
      - `address` (text) - Residential address
      - `emergency_contact` (text) - Emergency contact name
      - `emergency_phone` (text) - Emergency contact phone
      - `blood_group` (text, optional) - Blood group information
      - `date_registered` (timestamptz) - Registration timestamp
      - `expiry_date` (date) - ID card expiry date
      - `status` (text) - Card status (active, inactive, expired)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `students` table
    - Add policies for authenticated users to manage student data
    - Create indexes for efficient querying

  3. Storage
    - Create storage bucket for student photos
    - Enable public access for photo viewing
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  matric_no text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  department text NOT NULL,
  level text NOT NULL,
  photo_url text,
  date_of_birth date NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  emergency_contact text NOT NULL,
  emergency_phone text NOT NULL,
  blood_group text,
  date_registered timestamptz DEFAULT now(),
  expiry_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_students_matric_no ON students(matric_no);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_date_registered ON students(date_registered);


/* -------------------
   Settings Table
-------------------- */
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution jsonb NOT NULL,
  card jsonb NOT NULL,
  system jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);



-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete students"
  ON students
  FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for student photos
CREATE POLICY "Allow authenticated users to upload photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "Allow public access to student photos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'student-photos');

CREATE POLICY "Allow authenticated users to update photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "Allow authenticated users to delete photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-photos');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();