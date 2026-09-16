import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentRegistration from './components/StudentRegistration';
import StudentList from './components/StudentList';
import StudentSearch from './components/StudentSearch';
import BatchCardGenerator from './components/BatchCardGenerator';
import Settings from './components/Settings';
import IDCardGenerator from './components/IDCardGenerator';
import EditStudentModal from './components/EditStudentModal';
import ActivityLogs from './components/ActivityLogs';
import VirtualIdCard from './components/VirtualIdCard';
import StudentProfile from './components/StudentProfile';
import { Student } from './types/student';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import { downloadIdCardAsPdf } from './lib/downloadCard';

function App() {
  const { session, loading, role, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [refreshList, setRefreshList] = useState(0);

  const [myStudentData, setMyStudentData] = useState<Student | null>(null);
  const [loadingMyCard, setLoadingMyCard] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (role === 'student' && activeTab === 'dashboard') {
      setActiveTab('my-card');
    }
    if (role === 'admin' && activeTab === 'my-card') {
      setActiveTab('dashboard');
    }
    if (role === 'admin' && activeTab === 'profile') {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  useEffect(() => {
    if (!session) return;
    const checkSupabaseConnection = async () => {
      try {
        const { error } = await supabase.from('students').select('count').limit(1);
        if (error && error.code === 'PGRST301') {
          console.log('Students table does not exist yet - needs database setup');
        }
      } catch (error) {
        console.log('Supabase connection check:', error);
      }
    };
    checkSupabaseConnection();
  }, [session]);

  useEffect(() => {
    const fetchMyCard = async () => {
      if (activeTab === 'my-card' && user?.email) {
        setLoadingMyCard(true);
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('email', user.email)
          .single();

        if (data) setMyStudentData(data);
        setLoadingMyCard(false);
      }
    };
    fetchMyCard();
  }, [activeTab, user]);

  const handleRegistrationSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    setActiveTab('dashboard');
    setRefreshList(prev => prev + 1);
  };

  const handleViewCard = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
  };

  const handleStudentSaved = () => {
    setRefreshList(prev => prev + 1);
  };

  const handleDownloadCard = async () => {
    if (!myStudentData) return;
    setDownloading(true);
    try {
      await downloadIdCardAsPdf('printable-id-card', `${myStudentData.matric_no}_ID_Card`);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    const adminOnlyTabs = ['dashboard', 'register', 'search', 'students', 'cards', 'activity', 'settings'];
    const studentOnlyTabs = ['profile'];

    let effectiveTab = activeTab;

    if (role === 'student' && adminOnlyTabs.includes(activeTab)) {
      effectiveTab = 'my-card';
    }
    if (role === 'admin' && studentOnlyTabs.includes(activeTab)) {
      effectiveTab = 'dashboard';
    }

    switch (effectiveTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} />;

      case 'register':
        return <StudentRegistration onSuccess={handleRegistrationSuccess} />;

      case 'search':
        return (
          <StudentList
            onViewCard={handleViewCard}
            onEditStudent={handleEditStudent}
            refreshKey={refreshList}
          />
        );

      case 'students':
        return <StudentSearch />;

      case 'cards':
        return <BatchCardGenerator />;

      case 'activity':
        return <ActivityLogs />;

      case 'my-card':
        if (loadingMyCard) {
          return <div className="p-8 text-center text-gray-500">Loading your ID card...</div>;
        }
        return myStudentData ? (
          <div className="flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-50 min-h-screen">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">My Virtual ID Card</h2>
            <div id="printable-id-card" className="p-4">
              <VirtualIdCard student={myStudentData} />
            </div>
            <button
              onClick={handleDownloadCard}
              disabled={downloading}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-lg font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? 'Generating PDF...' : 'Download ID Card (PDF)'}
            </button>
          </div>
        ) : (
          <div className="p-6 sm:p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm max-w-md mx-auto mt-10">
            <p className="text-lg font-medium mb-2">ID Card Not Found</p>
            <p className="text-sm">Your ID card has not been generated by the Admin yet, or your email is not linked to a student record.</p>
          </div>
        );

      case 'profile':
        return <StudentProfile />;

      case 'settings':
        return <Settings />;

      default:
        return (
          <div className="p-8 text-center text-gray-500">Page not found.</div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="md:ml-16 pt-14 md:pt-0">
        {showSuccess && (
          <div className="fixed top-16 md:top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
            <p className="font-medium">Student registered successfully!</p>
          </div>
        )}

        {/* ✅ fade-in on tab change (key forces remount) */}
        <main className="py-4 sm:py-8 animate-fade-in" key={activeTab}>
          {renderContent()}
        </main>
      </div>

      {selectedStudent && (
        <IDCardGenerator
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={handleStudentSaved}
        />
      )}
    </div>
  );
}

export default App;