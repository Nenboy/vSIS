import { logActivity } from '../lib/activityLogger';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import jsQR from 'jsqr';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Loader2, Upload, Search, ScanLine,
  CheckCircle2, XCircle, AlertTriangle, FileImage, FileText, User, Layers, ArrowLeft, MapPin, ArrowRight
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface StudentInfo {
  full_name: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  student_id: string;
  matric_no: string;
  department: string;
  level: string;
  photo_url: string | null;
  status: string;
  expiry_date: string;
}

interface BulkResult {
  identifier: string;
  status: 'valid' | 'expired' | 'invalid';
  student?: StudentInfo;
  reason?: string;
}

interface VerificationPost {
  id: string;
  name: string;
  code: string | null;
}

export default function QRVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'result' | 'bulk' | 'pending-post'>('idle');
  const [manualInput, setManualInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [statusText, setStatusText] = useState('Verifying ID...');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const dragCounter = useRef(0);

  // Verification Posts
  const [posts, setPosts] = useState<VerificationPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');

  // Pending QR waiting for post selection
  const [pendingQrContent, setPendingQrContent] = useState<string | null>(null);

  // ✅ FIX 1: Load posts on mount + validate cached post
  useEffect(() => {
    const loadPosts = async () => {
      const { data } = await supabase
        .from('verification_posts')
        .select('id, name, code')
        .eq('active', true)
        .order('name', { ascending: true });

      const loadedPosts = data || [];
      setPosts(loadedPosts);

      // ✅ Auto-clear cached post if it's no longer active/exists
      const saved = localStorage.getItem('selected_verification_post');
      if (saved) {
        const stillValid = loadedPosts.some(p => p.id === saved);
        if (stillValid) {
          setSelectedPostId(saved);
        } else {
          console.warn('⚠️ Cached verification post is no longer active — cleared');
          localStorage.removeItem('selected_verification_post');
        }
      }
    };
    loadPosts();
  }, []);

  // ✅ FIX 2: Handle incoming QR — wait for posts to load, and validate cached post
  useEffect(() => {
    const qrData = searchParams.get('data');
    if (!qrData) return;
    if (posts.length === 0) return; // wait for posts to load first

    const savedPost = localStorage.getItem('selected_verification_post');
    const isValidSaved = savedPost && posts.some(p => p.id === savedPost);

    if (isValidSaved) {
      setSelectedPostId(savedPost);
      decodeAndVerify(qrData);
    } else {
      setPendingQrContent(qrData);
      setMode('pending-post');
    }
  }, [searchParams, posts]);

  const handlePostChange = (postId: string) => {
    setSelectedPostId(postId);
    if (postId) {
      localStorage.setItem('selected_verification_post', postId);
    } else {
      localStorage.removeItem('selected_verification_post');
    }
  };

  const getSelectedPostName = (): string => {
    const post = posts.find(p => p.id === selectedPostId);
    return post?.name || 'Unspecified';
  };

  const handlePendingPostContinue = async () => {
    if (!selectedPostId) return;
    localStorage.setItem('selected_verification_post', selectedPostId);
    const qr = pendingQrContent;
    setPendingQrContent(null);
    setMode('result');
    if (qr) {
      setLoading(true);
      try {
        await verifySingle(qr);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
        setLoading(false);
      }
    }
  };

  // ---------- Single verification ----------
  const decodeAndVerify = async (qrContent: string) => {
    setLoading(true);
    setError(null);
    setMode('result');

    try {
      const identifier = extractIdentifier(qrContent);
      if (!identifier) throw new Error('Could not extract a valid student ID from the QR code.');
      await verifySingle(qrContent);
    } catch (err: any) {
      setError(err.message || 'Invalid QR code format');
      setLoading(false);
    }
  };

  const extractIdentifier = (qrContent: string): string | null => {
    try {
      const url = new URL(qrContent);
      const dataParam = url.searchParams.get('data');
      if (dataParam) {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        return parsed.id || null;
      }
      const parts = url.pathname.split('/verify/');
      if (parts.length === 2) return decodeURIComponent(parts[1]);
    } catch {
      try {
        const parsed = JSON.parse(qrContent);
        return parsed.id || null;
      } catch {
        return qrContent.trim();
      }
    }
    return null;
  };

  const fetchStudent = async (identifier: string): Promise<StudentInfo | null> => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`student_id.eq.${identifier},matric_no.eq.${identifier}`)
      .maybeSingle();

    if (error || !data) return null;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(data.expiry_date); expiry.setHours(0, 0, 0, 0);
    const isPastExpiry = expiry < today;
    const isManuallyDisabled = data.status !== 'active';

    let finalStatus = 'active';
    if (isPastExpiry) finalStatus = 'expired';
    else if (isManuallyDisabled) finalStatus = data.status;

    return {
      full_name: `${data.first_name} ${data.middle_name ? data.middle_name + ' ' : ''}${data.last_name}`,
      first_name: data.first_name,
      middle_name: data.middle_name,
      last_name: data.last_name,
      student_id: data.student_id,
      matric_no: data.matric_no,
      department: data.department,
      level: data.level,
      photo_url: data.photo_url,
      status: finalStatus,
      expiry_date: new Date(data.expiry_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
    };
  };

  const verifySingle = async (qrContent: string) => {
    const identifier = extractIdentifier(qrContent);
    const post = getSelectedPostName();

    if (!identifier) {
      setError('Could not extract a valid student ID from the QR code.');
      setLoading(false);
      await logActivity('QR_VERIFICATION_FAILED', 'student', 'unknown', {
        result: 'failed',
        reason: 'Invalid QR format',
        post,
        email: 'public-verifier',
      });
      return;
    }

    const result = await fetchStudent(identifier);
    if (!result) {
      setError('No student found with this identifier in the university database.');
      setStudent(null);
      await logActivity('QR_VERIFICATION_FAILED', 'student', identifier, {
        result: 'failed',
        reason: 'Student not in database',
        post,
        email: 'public-verifier',
      });
    } else {
      setStudent(result);
      if (result.status === 'active') {
        await logActivity('QR_VERIFICATION', 'student', result.student_id, {
          result: 'verified',
          student_name: result.full_name,
          matric_no: result.matric_no,
          department: result.department,
          post,
          email: 'public-verifier',
        });
      } else {
        await logActivity('QR_VERIFICATION_FAILED', 'student', result.student_id, {
          result: 'failed',
          reason: `Student status: ${result.status}`,
          student_name: result.full_name,
          matric_no: result.matric_no,
          post,
          email: 'public-verifier',
        });
      }
    }
    setLoading(false);
  };

  const tryDecodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    });
    return qrCode?.data || null;
  };

  const imageFileToCanvas = (file: File): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 2000;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas failed'));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas);
        };
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setMode('result');
    setError(null);
    setStudent(null);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setStatusText('Reading PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const maxPages = Math.min(pdf.numPages, 5);
        let foundQr: string | null = null;

        for (let p = 1; p <= maxPages; p++) {
          setStatusText(`Scanning page ${p} of ${pdf.numPages}...`);
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 6 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const qrContent = tryDecodeFromCanvas(canvas);
          if (qrContent) { foundQr = qrContent; break; }
        }

        if (!foundQr) throw new Error('No QR code detected in the PDF. Try a higher-quality PDF or upload a screenshot.');
        await verifySingle(foundQr);
        return;
      }

      if (file.type.startsWith('image/')) {
        setStatusText('Reading image...');
        const canvas = await imageFileToCanvas(file);
        const qrContent = tryDecodeFromCanvas(canvas);
        if (!qrContent) throw new Error('No QR code detected in the image.');
        await verifySingle(qrContent);
        return;
      }

      throw new Error('Unsupported file type.');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processBulkFiles = async (files: File[]) => {
    setMode('bulk');
    setLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: 0 });

    const post = getSelectedPostName();
    const results: BulkResult[] = [];

    type Job = { label: string; getCanvas: () => Promise<HTMLCanvasElement> };
    const jobs: Job[] = [];

    for (const file of files) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          for (let p = 1; p <= numPages; p++) {
            jobs.push({
              label: `${file.name} - page ${p}`,
              getCanvas: async () => {
                const page = await pdf.getPage(p);
                const viewport = page.getViewport({ scale: 6 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas failed');
                await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                return canvas;
              },
            });
          }
        } catch (e) {
          results.push({ identifier: file.name, status: 'invalid', reason: 'Failed to read PDF' });
          await logActivity('QR_VERIFICATION_FAILED', 'student', file.name, {
            result: 'failed', reason: 'Failed to read PDF',
            post,
            email: 'public-verifier', bulk: true,
          });
        }
      } else if (file.type.startsWith('image/')) {
        jobs.push({ label: file.name, getCanvas: () => imageFileToCanvas(file) });
      }
    }

    setBulkProgress({ current: 0, total: jobs.length });

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      setBulkProgress({ current: i + 1, total: jobs.length });
      setStatusText(`Scanning ${i + 1} of ${jobs.length}...`);

      try {
        const canvas = await job.getCanvas();
        const qrContent = tryDecodeFromCanvas(canvas);

        if (!qrContent) {
          results.push({ identifier: job.label, status: 'invalid', reason: 'No QR code found' });
          setBulkResults([...results]);
          await logActivity('QR_VERIFICATION_FAILED', 'student', job.label, {
            result: 'failed', reason: 'No QR code found',
            post,
            email: 'public-verifier', bulk: true,
          });
          continue;
        }

        const identifier = extractIdentifier(qrContent);
        if (!identifier) {
          results.push({ identifier: job.label, status: 'invalid', reason: 'Invalid QR format' });
          setBulkResults([...results]);
          await logActivity('QR_VERIFICATION_FAILED', 'student', job.label, {
            result: 'failed', reason: 'Invalid QR format',
            post,
            email: 'public-verifier', bulk: true,
          });
          continue;
        }

        const student = await fetchStudent(identifier);
        if (!student) {
          results.push({ identifier: job.label, status: 'invalid', reason: 'Not in database' });
          await logActivity('QR_VERIFICATION_FAILED', 'student', identifier, {
            result: 'failed', reason: 'Student not in database',
            post,
            email: 'public-verifier', bulk: true,
          });
        } else if (student.status !== 'active') {
          results.push({ identifier: job.label, status: 'expired', student });
          await logActivity('QR_VERIFICATION_FAILED', 'student', student.student_id, {
            result: 'failed', reason: `Student status: ${student.status}`,
            student_name: student.full_name, matric_no: student.matric_no,
            post,
            email: 'public-verifier', bulk: true,
          });
        } else {
          results.push({ identifier: job.label, status: 'valid', student });
          await logActivity('QR_VERIFICATION', 'student', student.student_id, {
            result: 'verified', student_name: student.full_name,
            matric_no: student.matric_no, department: student.department,
            post,
            email: 'public-verifier', bulk: true,
          });
        }
      } catch (err: any) {
        results.push({ identifier: job.label, status: 'invalid', reason: err.message });
        await logActivity('QR_VERIFICATION_FAILED', 'student', job.label, {
          result: 'failed', reason: err.message || 'Processing error',
          post,
          email: 'public-verifier', bulk: true,
        });
      }

      setBulkResults([...results]);
    }

    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (files.length === 1) processFile(files[0]);
    else processBulkFiles(files);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items?.length) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    if (files.length === 1) processFile(files[0]);
    else processBulkFiles(files);
  };

  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) decodeAndVerify(manualInput.trim());
  };

  const reset = () => {
    setMode('idle');
    setStudent(null);
    setError(null);
    setManualInput('');
    setIsDragging(false);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: 0 });
    setStatusText('Verifying ID...');
    setPendingQrContent(null);
    dragCounter.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = '';
    navigate('/verify', { replace: true });
  };

  // ================= PENDING POST =================
  if (mode === 'pending-post') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-6 py-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold">Select Your Post</h1>
              <p className="text-sm text-blue-100 mt-1">
                Declare your location before verifying the student
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  You're about to verify a student's ID. Before proceeding, tell the system where you are. This will be recorded in the audit trail and remembered for the rest of your shift.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Verification Post
                </label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select a post —</option>
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.name}{post.code ? ` (${post.code})` : ''}
                    </option>
                  ))}
                </select>
                {posts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    No posts available. Contact the Admin to set up verification posts.
                  </p>
                )}
              </div>

              <button
                onClick={handlePendingPostContinue}
                disabled={!selectedPostId}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Continue to Verify</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-center text-gray-400">
                You can change your post later by visiting the verification page directly.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Powered by University of Jos • Virtual ID Verification System
          </p>
        </div>
      </div>
    );
  }

  // ================= IDLE =================
  if (mode === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg mb-4">
              <ScanLine className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ID Card Verification</h1>
            <p className="mt-2 text-gray-600">
              Upload one or more cards, or enter a matric number.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <label className="text-sm font-semibold text-gray-800">
                    Verification Post
                  </label>
                  <span className="text-xs text-gray-500">(Select before scanning)</span>
                </div>
                <select
                  value={selectedPostId}
                  onChange={(e) => handlePostChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select a post —</option>
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.name}{post.code ? ` (${post.code})` : ''}
                    </option>
                  ))}
                </select>
                {selectedPostId ? (
                  <p className="text-xs text-blue-700 mt-2">
                    ✅ Verifications will be logged as: <strong>{getSelectedPostName()}</strong>
                  </p>
                ) : posts.length > 0 ? (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ No post selected — verifications will be logged as "Unspecified"
                  </p>
                ) : null}
              </div>

              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                  isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/30'
                }`}
              >
                {isDragging ? (
                  <>
                    <Layers className="w-14 h-14 text-blue-600 mx-auto mb-3 animate-bounce" />
                    <h3 className="font-semibold text-blue-700 mb-1 text-lg">Drop your cards here</h3>
                    <p className="text-sm text-blue-500">Multiple files or one batch PDF</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-800 mb-1">Drag &amp; Drop or Click to Upload</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Single card, multiple images, or a batch PDF
                    </p>
                    <span className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors pointer-events-none">
                      Choose Files
                    </span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="card-upload"
                />
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <FileImage className="w-3.5 h-3.5" />
                  <span>PNG, JPG, WebP</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF (single or batch)</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-400">or verify manually</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Enter matric number or student ID"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition-colors"
                >
                  Verify Student
                </button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Powered by University of Jos • Virtual ID Verification System
          </p>
        </div>
      </div>
    );
  }

  // ================= BULK =================
  if (mode === 'bulk') {
    const validCount = bulkResults.filter(r => r.status === 'valid').length;
    const expiredCount = bulkResults.filter(r => r.status === 'expired').length;
    const invalidCount = bulkResults.filter(r => r.status === 'invalid').length;

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={reset}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Verification
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white px-6 py-5">
              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6" />
                <div>
                  <h1 className="text-xl font-bold">Batch Verification</h1>
                  <p className="text-sm opacity-80">
                    {loading
                      ? `Processing ${bulkProgress.current} of ${bulkProgress.total}...`
                      : `${bulkResults.length} cards processed`}
                  </p>
                </div>
              </div>
            </div>

            {loading && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: bulkProgress.total > 0
                          ? `${(bulkProgress.current / bulkProgress.total) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {bulkProgress.current}/{bulkProgress.total}
                  </span>
                </div>
              </div>
            )}

            {!loading && bulkResults.length > 0 && (
              <div className="grid grid-cols-3 gap-3 px-6 py-5 border-b border-gray-100">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{validCount}</p>
                  <p className="text-xs font-medium text-green-600 mt-1">VALID</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{expiredCount}</p>
                  <p className="text-xs font-medium text-yellow-600 mt-1">EXPIRED</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                  <p className="text-xs font-medium text-red-600 mt-1">INVALID</p>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {bulkResults.map((result, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {result.status === 'valid' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                    {result.status === 'expired' && <AlertTriangle className="w-6 h-6 text-yellow-500" />}
                    {result.status === 'invalid' && <XCircle className="w-6 h-6 text-red-500" />}
                  </div>
                  {result.student?.photo_url ? (
                    <img src={result.student.photo_url} alt=""
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {result.student ? (
                      <>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {result.student.full_name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono truncate">
                          {result.student.matric_no} • {result.student.department}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900 truncate">{result.identifier}</p>
                        <p className="text-xs text-red-500">{result.reason}</p>
                      </>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    result.status === 'valid' ? 'bg-green-100 text-green-700' :
                    result.status === 'expired' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {result.status}
                  </span>
                </div>
              ))}
              {bulkResults.length === 0 && !loading && (
                <div className="px-6 py-16 text-center text-gray-500">No results yet</div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Powered by University of Jos • Batch Verification
          </p>
        </div>
      </div>
    );
  }

  // ================= LOADING =================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">{statusText}</p>
        </div>
      </div>
    );
  }

  // ================= ERROR =================
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">INVALID ID</h2>
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={reset}
            className="mt-8 bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!student) return null;

  const isExpired = student.status !== 'active';
  const session = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

  // ================= SINGLE RESULT =================
  return (
    <div className={`min-h-screen py-8 px-4 ${isExpired ? 'bg-yellow-50' : 'bg-green-50'}`}>
      <div className="max-w-sm mx-auto">
        <div className="text-center mb-6">
          {isExpired ? (
            <>
              <AlertTriangle className="h-14 w-14 text-yellow-500 mx-auto" />
              <h1 className="mt-2 text-2xl font-bold text-yellow-700">
                {student.status === 'expired' ? 'EXPIRED' : 'SUSPENDED'}
              </h1>
              <p className="text-yellow-600 text-xs mt-1">
                {student.status === 'expired'
                  ? 'This ID card has passed its validity period.'
                  : 'This ID is no longer valid.'}
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <h1 className="mt-2 text-2xl font-bold text-green-700">VALID ID</h1>
              <p className="text-green-600 text-xs mt-1">
                Student is verified and currently enrolled
              </p>
            </>
          )}
        </div>

        <div className="w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center px-4 py-3">
            <h2 className="font-bold tracking-wider text-lg">UNIVERSITY OF JOS</h2>
            <p className="text-xs text-blue-100">Virtual Student ID</p>
          </div>
          <div className="p-4">
            <div className="flex gap-3">
              <div className="w-20 h-24 rounded-lg border-2 border-blue-100 overflow-hidden bg-gray-100 flex-shrink-0">
                {student.photo_url ? (
                  <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-800 leading-tight">
                  {student.full_name.toUpperCase()}
                </h3>
                <div className="text-[10px] space-y-0.5 text-gray-700 mt-1">
                  <p><span className="font-semibold">ID:</span> {student.student_id}</p>
                  <p><span className="font-semibold">PROGRAM:</span> {student.department}</p>
                  <p><span className="font-semibold">LEVEL:</span> {student.level}</p>
                  <p><span className="font-semibold">SESSION:</span> {session}</p>
                </div>
                <div className="mt-2">
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {student.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <div className="bg-gray-50 px-4 py-1 rounded-full text-[10px] font-mono text-gray-700 border border-gray-200">
                Matric: {student.matric_no}
              </div>
            </div>
            <div className={`mt-4 flex items-center justify-center gap-2 rounded-lg py-2 border-2 ${
              isExpired ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'
            }`}>
              {isExpired ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-bold text-yellow-700 tracking-wide">
                    {student.status === 'expired' ? 'EXPIRED' : 'NOT VALID'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-bold text-green-700 tracking-wide">VERIFIED ✓</span>
                </>
              )}
            </div>

            {/* Show post on result */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-600">
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>Verified at: <strong>{getSelectedPostName()}</strong></span>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-400">
              <span>Valid until: {student.expiry_date}</span>
              <span className="font-mono">{student.student_id?.slice(-6)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-xs text-gray-500">
          Verified on {new Date().toLocaleString()}
        </div>

        <div className="text-center mt-6">
          <button onClick={reset} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Verify another ID
          </button>
        </div>
      </div>
    </div>
  );
}