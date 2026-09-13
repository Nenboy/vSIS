import { useState, useEffect } from 'react';
import { CreditCard, Download, CheckSquare, Square, User } from 'lucide-react';
import { Student, DEPARTMENTS, LEVELS } from '../types/student';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { useSettings } from '../hooks/useSettings';

export default function BatchCardGenerator() {
  const { settings, loading: settingsLoading } = useSettings();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filters, setFilters] = useState({
    department: '',
    level: '',
    status: 'active',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('last_name', { ascending: true });
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (filters.department && student.department !== filters.department) return false;
    if (filters.level && student.level !== filters.level) return false;
    if (filters.status && student.status !== filters.status) return false;
    return true;
  });

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) newSelected.delete(studentId);
    else newSelected.add(studentId);
    setSelectedStudents(newSelected);
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  // ✅ FIX: High-res QR (800px wide, error correction H)
  const generateQRCode = async (data: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        width: 800,
        margin: 1,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  };

  const renderStudentCards = async (student: Student): Promise<{ frontCanvas: HTMLCanvasElement; backCanvas: HTMLCanvasElement } | null> => {
    if (!settings) return null;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';
    container.style.backgroundColor = '#fff';
    container.style.padding = '20px';
    document.body.appendChild(container);

    const fullName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
    const session = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const issueDate = formatDate(student.date_registered);
    const expiryDate = formatDate(student.expiry_date);

    // ✅ Build the full verification URL
    const payload = { id: student.student_id, matric: student.matric_no };
    const encoded = encodeURIComponent(JSON.stringify(payload));

    // ⚠️ CHANGE THIS to your actual LAN IP (from `npm run dev -- --host`)
    const LAN_IP = '10.97.162.192';

    const baseUrl = window.location.hostname === 'localhost'
      ? `http://${LAN_IP}:${window.location.port}`
      : window.location.origin;

    const qrData = `${baseUrl}/verify?data=${encoded}`;

    const qrCodeUrl = settings.card.includeQRCode ? await generateQRCode(qrData) : '';

    // Front card
    const frontCard = document.createElement('div');
    frontCard.style.width = '340px';
    frontCard.style.height = '215px';
    frontCard.style.backgroundColor = 'white';
    frontCard.style.borderRadius = '12px';
    frontCard.style.overflow = 'hidden';
    frontCard.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    frontCard.style.border = '1px solid #e5e7eb';
    frontCard.style.fontFamily = 'Arial, sans-serif';
    frontCard.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column;">
        <div style="background:linear-gradient(135deg, #1e3a8a, #312e81); color:white; padding:8px 16px;">
          <div style="font-size:10px; font-weight:500;">${settings.institution.name}</div>
          <div style="font-size:7px; opacity:0.8;">${settings.institution.address}</div>
        </div>
        <div style="display:flex; flex:1; padding:12px; gap:12px;">
          <div style="flex-shrink:0; width:64px; height:80px; background:#f3f4f6; border-radius:8px; border:1px solid #e5e7eb; overflow:hidden;">
            ${student.photo_url 
              ? `<img src="${student.photo_url}" crossorigin="anonymous" style="width:100%; height:100%; object-fit:cover;" />` 
              : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>`
            }
          </div>
          <div style="flex:1;">
            <div style="font-size:14px; font-weight:bold; color:#1f2937; margin-bottom:4px;">${fullName.toUpperCase()}</div>
            <div style="font-size:8px; line-height:1.3; color:#374151;">
              <div><strong>ID:</strong> ${student.student_id}</div>
              <div><strong>PROGRAM:</strong> ${student.department}</div>
              <div><strong>LEVEL:</strong> ${student.level}</div>
              <div><strong>SESSION:</strong> ${session}</div>
            </div>
          </div>
          ${settings.card.includeQRCode ? `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:72px;">
            <div style="width:64px; height:64px; background:white; border-radius:4px; display:flex; align-items:center; justify-content:center; border:1px solid #e5e7eb;">
              ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:100%; height:100%; object-fit:contain;" />` : '<span style="font-size:6px;">QR</span>'}
            </div>
            <div style="font-size:6px; font-weight:600; color:#4b5563; margin-top:4px; text-align:center;">SCAN TO VERIFY</div>
          </div>
          ` : ''}
        </div>
        <div style="border-top:1px solid #e5e7eb; padding:6px 12px; display:flex; justify-content:space-between;">
          <span style="font-size:6px; color:#6b7280;">Member since ${issueDate}</span>
          <span style="font-size:6px; font-family:monospace; color:#9ca3af;">${student.student_id?.slice(-6)}</span>
        </div>
      </div>
    `;

    // Back card
    const backCard = document.createElement('div');
    backCard.style.width = '340px';
    backCard.style.height = '215px';
    backCard.style.backgroundColor = 'white';
    backCard.style.borderRadius = '12px';
    backCard.style.overflow = 'hidden';
    backCard.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
    backCard.style.border = '1px solid #e5e7eb';
    backCard.style.fontFamily = 'Arial, sans-serif';
    backCard.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; padding:12px;">
        <div style="margin-bottom:8px;">
          <div style="font-size:9px; font-weight:bold; color:#1f2937; text-transform:uppercase;">Emergency Contact</div>
          <div style="font-size:8px; color:#374151; margin-top:2px;">
            <div>${student.emergency_contact || 'Not provided'}</div>
            <div>${student.emergency_phone || 'N/A'}</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:7px; color:#4b5563; margin-bottom:8px;">
          <div>
            <strong>${settings.institution.phone}</strong><br/>
            <span style="font-size:6px;">${settings.institution.website}</span>
          </div>
          <div style="text-align:right;">
            <strong>Issued</strong><br/>${issueDate}<br/>
            <strong>Expires</strong><br/>${expiryDate}
          </div>
        </div>
        <div style="border-top:1px dashed #d1d5db; padding-top:4px; margin-bottom:8px;">
          <div style="font-size:7px; color:#6b7280;">AUTHORIZED SIGNATURE</div>
          <div style="height:16px; border-bottom:1px solid #9ca3af; width:120px;"></div>
        </div>
        <div style="font-size:6px; color:#6b7280; text-align:center; margin-top:auto;">
          <div>This card is non-transferable and must be carried at all times while on campus.</div>
          <div>This card remains the property of the institution and must be presented upon request.</div>
        </div>
        <div style="margin-top:8px; text-align:center; font-size:8px; font-family:monospace; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:4px;">
          ${student.student_id} • ${session}
        </div>
      </div>
    `;

    container.appendChild(frontCard);
    container.appendChild(backCard);

    await waitForImages(frontCard);
    await waitForImages(backCard);
    await new Promise(resolve => setTimeout(resolve, 100));

    // ✅ FIX: scale 4 instead of 2 for sharper QR
    const frontCanvas = await html2canvas(frontCard, { scale: 4, backgroundColor: '#fff', useCORS: true, allowTaint: false });
    const backCanvas = await html2canvas(backCard, { scale: 4, backgroundColor: '#fff', useCORS: true, allowTaint: false });

    document.body.removeChild(container);
    return { frontCanvas, backCanvas };
  };

  const generateBatchPDF = async () => {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }
    if (!settings) {
      alert('Settings are still loading. Please wait.');
      return;
    }

    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] });
      const studentsToGenerate = filteredStudents.filter(s => selectedStudents.has(s.id));

      setProgress({ current: 0, total: studentsToGenerate.length });

      for (let i = 0; i < studentsToGenerate.length; i++) {
        const student = studentsToGenerate[i];
        setProgress({ current: i + 1, total: studentsToGenerate.length });

        const cards = await renderStudentCards(student);
        if (!cards) continue;

        const { frontCanvas, backCanvas } = cards;
        const frontImg = frontCanvas.toDataURL('image/png');
        const backImg = backCanvas.toDataURL('image/png');

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(frontImg, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');
        pdf.addPage();
        pdf.addImage(backImg, 'PNG', 0, 0, 85.6, 53.98, undefined, 'FAST');
      }

      pdf.save(`student_id_cards_batch_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading students and settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
              <CreditCard className="h-8 w-8" />
              <span>Batch Card Generation</span>
            </h2>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={generateBatchPDF}
                disabled={selectedStudents.size === 0 || generating}
                className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>
                  {generating
                    ? `Generating ${progress.current}/${progress.total}...`
                    : `Generate ${selectedStudents.size} Card${selectedStudents.size !== 1 ? 's' : ''}`
                  }
                </span>
              </button>
              {generating && progress.total > 0 && (
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Levels</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={toggleAll}
              className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>
                {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0 ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            <p className="text-sm text-gray-500">
              {selectedStudents.size} of {filteredStudents.length} students selected
            </p>
          </div>
        </div>

        <div className="p-6">
          {filteredStudents.length > 0 ? (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center space-x-4 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedStudents.has(student.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => toggleStudent(student.id)}
                >
                  <div className="flex-shrink-0">
                    {selectedStudents.has(student.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="w-10 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <span className="text-gray-600 text-xs">{student.first_name[0]}{student.last_name[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
                      <p className="text-sm text-gray-500">{student.student_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{student.matric_no}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{student.department}</p>
                      <p className="text-sm text-gray-500">{student.level}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : student.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">Adjust your filters to see students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}