import { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Student } from '../types/student';
import { Download, CreditCard, Loader2, User } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

interface IDCardGeneratorProps {
  student: Student;
  onClose: () => void;
}

export default function IDCardGenerator({ student, onClose }: IDCardGeneratorProps) {
  const { settings, loading: settingsLoading } = useSettings();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(true);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const photoRef = useRef<HTMLImageElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const fullName = `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`;
  const session = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const issueDate = formatDate(student.date_registered);
  const expiryDate = formatDate(student.expiry_date);

  // Shorter payload — only the student_id is needed for verification
  const qrData = useMemo(() => {
    const payload = { id: student.student_id };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    return `${window.location.origin}/verify?data=${encoded}`;
  }, [student]);

  useEffect(() => {
    let cancelled = false;
    if (!settings?.card.includeQRCode) { setQrLoading(false); return; }
    setQrLoading(true);
    // Error correction M (15%) — lower density, easier to decode from PDFs
    QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      width: 800,
      margin: 1,
    }).then(url => {
      if (!cancelled) { setQrCodeUrl(url); setQrLoading(false); }
    }).catch(err => {
      console.error(err);
      if (!cancelled) setQrLoading(false);
    });
    return () => { cancelled = true; };
  }, [qrData, settings?.card.includeQRCode]);

  useEffect(() => {
    if (!settings?.card.includeBarcode || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, student.matric_no, {
        format: 'CODE128',
        width: 1.4,
        height: 32,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#1f2937',
      });
    } catch (err) {
      console.error('Barcode error:', err);
    }
  }, [student.matric_no, settings?.card.includeBarcode]);

  const waitForImages = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    }));
  };

  const downloadPDF = async () => {
    const frontElement = document.getElementById('card-front');
    const backElement = document.getElementById('card-back');
    if (!frontElement || !backElement) return;

    try {
      await waitForImages(frontElement);
      await waitForImages(backElement);

      const frontCanvas = await html2canvas(frontElement, {
        scale: 4, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false
      });
      const backCanvas = await html2canvas(backElement, {
        scale: 4, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: false
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [85.6, 53.98] });
      pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 53.98, undefined, 'NONE');
      pdf.addPage();
      pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 85.6, 53.98, undefined, 'NONE');
      pdf.save(`${student.first_name}_${student.last_name}_ID_Card.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (settingsLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-2 text-center">Loading settings...</p>
        </div>
      </div>
    );
  }

  const inst = settings?.institution || {
    name: 'University of Jos', address: 'Bauchi Road, Jos, Plateau State, Nigeria',
    phone: '+234 (0) 803 000 0000', website: 'www.unijos.edu.ng', logo: '/unijos-logo.png',
  };

  const showQR = settings?.card.includeQRCode ?? true;
  const showBarcode = settings?.card.includeBarcode ?? false;
  const showSecurity = settings?.card.securityFeatures ?? true;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto animate-scale-in">
        <div className="p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Student ID Card</span>
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={downloadPDF}
                className="px-3 sm:px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center space-x-2 text-sm">
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </button>
              <button onClick={onClose}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-gray-50 flex flex-row flex-wrap items-start justify-center gap-6">
          {/* FRONT CARD */}
          <div id="card-front"
            className="w-[340px] h-[215px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex-shrink-0 font-sans relative">

            {showSecurity && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[64px] font-black text-blue-900 opacity-[0.04] -rotate-[20deg] tracking-widest select-none">
                    UNIJOS
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[36px] font-black text-blue-900 opacity-[0.03] rotate-[20deg] tracking-widest select-none">
                    OFFICIAL
                  </span>
                </div>
              </div>
            )}

            <div className="h-full flex flex-col relative z-10">
              <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-4 py-2 flex items-center gap-2">
                {inst.logo && (
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={inst.logo} alt="Logo" crossOrigin="anonymous"
                      className="w-full h-full object-contain p-0.5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-medium tracking-wide">{inst.name}</div>
                  <div className="text-[7px] opacity-80">{inst.address}</div>
                </div>
              </div>

              <div className="flex flex-1 p-3 gap-3">
                <div className="flex-shrink-0">
                  <div className="w-16 h-20 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                    {student.photo_url ? (
                      <img ref={photoRef} src={student.photo_url} alt={fullName}
                        crossOrigin="anonymous" className="w-full h-full object-cover"
                        onLoad={() => setPhotoLoaded(true)} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800 leading-tight mb-1">{fullName.toUpperCase()}</h3>
                  <div className="text-[8px] space-y-0.5 text-gray-700">
                    <p><span className="font-semibold">ID:</span> {student.student_id}</p>
                    <p><span className="font-semibold">PROGRAM:</span> {student.department}</p>
                    <p><span className="font-semibold">LEVEL:</span> {student.level}</p>
                    <p><span className="font-semibold">SESSION:</span> {session}</p>
                  </div>
                </div>
                {showQR && (
                  <div className="flex flex-col items-center justify-center w-20">
                    {/* Bigger QR container for better PDF decoding */}
                    <div className="w-16 h-16 bg-white rounded-md shadow-sm flex items-center justify-center border border-gray-200">
                      {qrLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
                      ) : qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="text-[6px] text-gray-400">QR</span>
                      )}
                    </div>
                    <p className="text-[6px] font-semibold text-gray-700 mt-1 text-center">SCAN TO VERIFY</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 px-3 py-1.5 flex justify-between items-center">
                <span className="text-[6px] text-gray-500">Member since {issueDate}</span>
                <span className="text-[6px] font-mono text-gray-400">{student.student_id?.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* BACK CARD */}
          <div id="card-back"
            className="w-[340px] h-[215px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 flex-shrink-0 font-sans">
            <div className="h-full flex flex-col p-3">
              <div className="mb-2">
                <h4 className="text-[9px] font-bold text-gray-800 uppercase tracking-wide">Emergency Contact</h4>
                <div className="text-[8px] text-gray-700 mt-0.5">
                  <p>{student.emergency_contact || 'Not provided'}</p>
                  <p>{student.emergency_phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[7px] text-gray-600 mb-2">
                <div>
                  <p className="font-semibold">{inst.phone}</p>
                  <p className="text-[6px]">{inst.website}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Issued</p>
                  <p>{issueDate}</p>
                  <p className="font-semibold mt-1">Expires</p>
                  <p>{expiryDate}</p>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-1 mb-1">
                <p className="text-[7px] text-gray-500">AUTHORIZED SIGNATURE</p>
                <div className="h-4 border-b border-gray-400 w-32 mt-0.5"></div>
              </div>

              {showBarcode && (
                <div className="flex items-center justify-center py-1 mb-1">
                  <svg ref={barcodeRef} className="h-8 max-w-[200px]" />
                </div>
              )}

              <div className="text-[6px] text-gray-500 leading-tight text-center mt-auto">
                <p>This card is non-transferable and must be carried at all times while on campus.</p>
                <p>This card remains the property of the institution and must be presented upon request.</p>
              </div>
              <div className="mt-1 text-center text-[8px] font-mono text-gray-400 border-t border-gray-100 pt-1">
                {student.student_id} • {session}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}