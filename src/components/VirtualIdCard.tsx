import { QRCodeSVG } from 'qrcode.react';
import { Student } from '../types/student';

interface VirtualIdCardProps {
  student: Student;
}

export default function VirtualIdCard({ student }: VirtualIdCardProps) {
  const fullName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
  
  const formattedExpiry = new Date(student.expiry_date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    // ✅ Parent: no padding, overflow-hidden clips the header to rounded corners
    <div className="w-80 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
      
      {/* Header: fills entire width edge-to-edge */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center px-4 py-3">
        <h2 className="font-bold tracking-wider text-lg">UNIVERSITY OF JOS</h2>
        <p className="text-xs text-blue-100">Virtual Student ID</p>
      </div>

      {/* Body: has its own padding */}
      <div className="flex flex-col items-center px-5 py-5">
        
        {/* Student Photo */}
        <div className="w-24 h-24 rounded-full border-4 border-blue-100 overflow-hidden bg-gray-200 mb-3 flex items-center justify-center">
          {student.photo_url ? (
            <img src={student.photo_url} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-3xl">👤</span>
          )}
        </div>

        {/* Student Details - all centered */}
        <h3 className="text-lg font-bold text-gray-800 text-center leading-tight">{fullName}</h3>
        <p className="text-sm text-gray-500 text-center mt-0.5">{student.department}</p>
        <p className="text-xs font-semibold text-blue-600 text-center mt-1">{student.level}</p>
        
        {/* ID Number & Status - properly centered */}
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <div className="bg-gray-50 px-4 py-1 rounded-full text-xs font-mono text-gray-700 border border-gray-200 text-center">
            ID: {student.matric_no}
          </div>
          <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full tracking-wide ${
            student.status === 'active' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {student.status}
          </span>
        </div>

        {/* Blood Group */}
        {student.blood_group && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Blood Group: <span className="font-semibold text-gray-700">{student.blood_group}</span>
          </p>
        )}

        {/* QR Code */}
        <div className="mt-4 bg-white p-2 rounded-lg border border-gray-200 flex flex-col items-center">
          <QRCodeSVG 
            value={`${window.location.origin}/verify/${student.matric_no}`} 
            size={80} 
          />
          <p className="mt-1 text-[10px] text-gray-400">Scan to verify identity</p>
        </div>

        {/* Expiry Date */}
        <p className="mt-3 text-[10px] text-gray-400 font-medium text-center">
          Valid until: {formattedExpiry}
        </p>
      </div>
    </div>
  );
}