import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CalendarView } from './components/CalendarView';
import { ReceiptMaker } from './components/ReceiptMaker';
import { StudentManager } from './components/StudentManager';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsView } from './components/SettingsView';
import { AnnualReportView } from './components/AnnualReportView';
import { LoginModal } from './components/LoginModal';
import { Student, TutorProfile, MonthStats, Teacher } from './types';
import { api, removeStoredTeacherId } from './api/client';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('calendar');
  
  // Format current year & month (e.g. "2026-11")
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [profile, setProfile] = useState<TutorProfile>({
    id: 1,
    name: '补习老师',
    phone: '',
    email: '',
    bank_name: 'Maybank',
    bank_account: '',
    bank_holder: '',
    duitnow_id: '',
    qr_image: '',
    welcome_note: '感谢家长的支持与信任！请确认以下对账明细：',
  });
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Deep linking helper
  const [receiptStudentId, setReceiptStudentId] = useState<number | undefined>(undefined);
  const [annualStudentId, setAnnualStudentId] = useState<number | undefined>(undefined);
  const [calendarStudentFilter, setCalendarStudentFilter] = useState<number | 'all'>('all');

  // Initialize teacher on app start
  useEffect(() => {
    const initTeacher = async () => {
      try {
        const teacher = await api.getCurrentTeacher();
        if (teacher) {
          setCurrentTeacher(teacher);
        } else {
          setIsLoginModalOpen(true);
        }
      } catch (err) {
        console.warn('Teacher not logged in or invalid, opening login modal', err);
        setIsLoginModalOpen(true);
      }
    };
    initTeacher();
  }, []);

  const loadAllData = async () => {
    if (!currentTeacher) return;
    try {
      setLoading(true);
      const [studentsData, profileData, statsData] = await Promise.all([
        api.getStudents(),
        api.getProfile(),
        api.getStats(selectedMonth),
      ]);
      setStudents(studentsData);
      setProfile(profileData);
      setStats(statsData);
    } catch (err) {
      console.error('Error initializing app data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTeacher) {
      loadAllData();
    }
  }, [currentTeacher?.id, selectedMonth]);

  const refreshStats = async () => {
    if (!currentTeacher) return;
    try {
      const statsData = await api.getStats(selectedMonth);
      setStats(statsData);
    } catch (err) {
      console.error('Error refreshing stats', err);
    }
  };

  const refreshStudents = async () => {
    if (!currentTeacher) return;
    try {
      const data = await api.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error refreshing students', err);
    }
  };

  const refreshProfile = async () => {
    if (!currentTeacher) return;
    try {
      const data = await api.getProfile();
      setProfile(data);
      if (currentTeacher && data.name !== currentTeacher.name) {
        setCurrentTeacher({ ...currentTeacher, name: data.name });
      }
    } catch (err) {
      console.error('Error refreshing profile', err);
    }
  };

  const handleLoginSuccess = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
    setIsLoginModalOpen(false);
    setCalendarStudentFilter('all');
    setReceiptStudentId(undefined);
  };

  const handleLogout = () => {
    removeStoredTeacherId();
    setCurrentTeacher(null);
    setStudents([]);
    setStats(null);
    setIsLoginModalOpen(true);
  };

  // Navigations from student manager
  const handleGoToReceipt = (studentId: number) => {
    setReceiptStudentId(studentId);
    setCurrentTab('receipt');
  };

  const handleGoToCalendar = (studentId?: number) => {
    setCalendarStudentFilter(studentId ?? 'all');
    setCurrentTab('calendar');
    refreshStats();
  };

  const handleGoToAnnualReport = (studentId: number) => {
    setAnnualStudentId(studentId);
    setCurrentTab('annual');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        currentTeacher={currentTeacher}
        onSwitchTeacher={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {!currentTeacher ? (
          <div className="flex flex-col items-center justify-center py-28 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
              <span className="text-2xl">🔐</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">请先登录老师工作账号</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              为了保障学生与账单数据的独立与私密，请登录或注册您的老师称呼进入工作台。
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="mt-5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all"
            >
              立即登录 / 注册
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">正在读取数据...</p>
          </div>
        ) : (
          <>
            {currentTab === 'calendar' && (
              <CalendarView
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                students={students}
                initialStudentFilter={calendarStudentFilter}
                onRefreshStats={refreshStats}
              />
            )}

            {currentTab === 'receipt' && (
              <ReceiptMaker
                students={students}
                tutorProfile={profile}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                onRefreshStats={refreshStats}
              />
            )}

            {currentTab === 'students' && (
              <StudentManager
                students={students}
                selectedMonth={selectedMonth}
                onRefreshStudents={refreshStudents}
                onGoToReceipt={handleGoToReceipt}
                onGoToCalendar={handleGoToCalendar}
                onGoToAnnualReport={handleGoToAnnualReport}
              />
            )}

            {currentTab === 'annual' && (
              <AnnualReportView
                students={students}
                tutorProfile={profile}
                initialStudentId={annualStudentId}
              />
            )}

            {currentTab === 'stats' && (
              <StatsDashboard
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                stats={stats}
                onRefreshStats={refreshStats}
                onGoToReceipt={handleGoToReceipt}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                profile={profile}
                onRefreshProfile={refreshProfile}
              />
            )}
          </>
        )}
      </main>

      {/* Login & Switch Teacher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        canClose={!!currentTeacher}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;
