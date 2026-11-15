import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import {
  TutorProfile,
  Student,
  ClassSchedule,
  LessonSession,
  BillReceipt,
  MonthStats,
  Teacher
} from '../types';

const TEACHER_STORAGE_KEY = 'tutor_current_teacher_id';

export const getStoredTeacherId = (): number | null => {
  const val = localStorage.getItem(TEACHER_STORAGE_KEY);
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
};

export const setStoredTeacherId = (id: number): void => {
  localStorage.setItem(TEACHER_STORAGE_KEY, String(id));
};

export const removeStoredTeacherId = (): void => {
  localStorage.removeItem(TEACHER_STORAGE_KEY);
};

// Auto-seed default teacher (Yang) and sample students if totally empty
let hasInitialized = false;
async function ensureInitialized() {
  if (hasInitialized) return;
  hasInitialized = true;
  try {
    const teachersCol = collection(firestore, 'teachers');
    const teacherSnap = await getDocs(teachersCol);
    if (teacherSnap.empty) {
      const defaultTeacher: Teacher = {
        id: 1,
        name: '杨老师 (Teacher Yeo)',
        phone: '012-7481092',
        email: 'yeokang12@gmail.com',
        bank_name: 'Maybank',
        bank_account: '1140 1234 5678',
        bank_holder: 'YEO KANG',
        duitnow_id: '0127481092',
        qr_image: '',
        welcome_note: '感谢家长的支持与配合！若有任何疑问欢迎随时联络。',
        created_at: new Date().toISOString()
      };
      await setDoc(doc(firestore, 'teachers', '1'), {
        ...defaultTeacher,
        password: '123'
      });

      // Sample students
      const studentsCol = collection(firestore, 'students');
      await addDoc(studentsCol, {
        id: 1,
        teacher_id: 1,
        name: '张小明 (Lucas)',
        grade: '初中一 / Form 1',
        subjects: '数学、科学',
        parent_name: '张妈妈',
        parent_phone: '016-888 1234',
        billing_type: 'per_hour',
        default_rate: 60,
        weekly_schedules: [
          { day_of_week: 2, start_time: '19:00', end_time: '20:30', duration_hours: 1.5, subject: '数学', rate: 60 },
          { day_of_week: 6, start_time: '10:00', end_time: '11:30', duration_hours: 1.5, subject: '科学', rate: 60 }
        ],
        notes: '每周二、六固定上课',
        active: 1,
        created_at: new Date().toISOString()
      });

      await addDoc(studentsCol, {
        id: 2,
        teacher_id: 1,
        name: '李佳怡 (Chloe)',
        grade: '小学五年级 / Std 5',
        subjects: '华文、数学',
        parent_name: '李先生',
        parent_phone: '019-777 5678',
        billing_type: 'per_hour',
        default_rate: 50,
        weekly_schedules: [
          { day_of_week: 0, start_time: '14:00', end_time: '15:30', duration_hours: 1.5, subject: '华文', rate: 50 }
        ],
        notes: '周日下午上课',
        active: 1,
        created_at: new Date().toISOString()
      });

      await addDoc(studentsCol, {
        id: 3,
        teacher_id: 1,
        name: '黄子轩 (Ethan)',
        grade: '高一 / Form 4',
        subjects: '高级数学 Add Math',
        parent_name: '黄太太',
        parent_phone: '012-999 8765',
        billing_type: 'monthly',
        default_rate: 240,
        weekly_schedules: [
          { day_of_week: 5, start_time: '19:30', end_time: '21:30', duration_hours: 2.0, subject: '高级数学', rate: 70 }
        ],
        notes: '每月包月结算',
        active: 1,
        created_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('Error during auto-initialization:', err);
  }
}

// Generate numerical timestamp ID
const nextId = () => Date.now() + Math.floor(Math.random() * 1000);

export const api = {
  // Auth & Teachers
  async getTeachers(): Promise<Teacher[]> {
    await ensureInitialized();
    const snap = await getDocs(collection(firestore, 'teachers'));
    const list: Teacher[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: Number(data.id || docSnap.id),
        name: data.name,
        phone: data.phone,
        email: data.email,
        bank_name: data.bank_name,
        bank_account: data.bank_account,
        bank_holder: data.bank_holder,
        duitnow_id: data.duitnow_id,
        qr_image: data.qr_image,
        welcome_note: data.welcome_note,
        created_at: data.created_at
      });
    });
    return list.sort((a, b) => a.id - b.id);
  },

  async login(name: string, password: string): Promise<Teacher> {
    await ensureInitialized();
    const trimmed = name.trim();
    const q = query(collection(firestore, 'teachers'), where('name', '==', trimmed));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error(`未找到老师【${trimmed}】，请确认或点“注册新老师账号”`);
    }
    const docData = snap.docs[0].data();
    if (docData.password !== password) {
      throw new Error('密码错误，请重新输入');
    }
    const teacher: Teacher = {
      id: Number(docData.id || snap.docs[0].id),
      name: docData.name,
      phone: docData.phone,
      email: docData.email,
      bank_name: docData.bank_name,
      bank_account: docData.bank_account,
      bank_holder: docData.bank_holder,
      duitnow_id: docData.duitnow_id,
      qr_image: docData.qr_image,
      welcome_note: docData.welcome_note,
      created_at: docData.created_at
    };
    setStoredTeacherId(teacher.id);
    return teacher;
  },

  async register(name: string, password: string, phone?: string): Promise<Teacher> {
    await ensureInitialized();
    const trimmed = name.trim();
    const q = query(collection(firestore, 'teachers'), where('name', '==', trimmed));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`老师姓名【${trimmed}】已存在，请直接登录或换一个称呼`);
    }

    const allTeachers = await this.getTeachers();
    const newId = allTeachers.length > 0 ? Math.max(...allTeachers.map(t => t.id)) + 1 : 1;

    const newTeacherData: any = {
      id: newId,
      name: trimmed,
      password: password,
      phone: phone || '',
      email: '',
      bank_name: 'Maybank',
      bank_account: '',
      bank_holder: '',
      duitnow_id: '',
      qr_image: '',
      welcome_note: '感谢家长的支持与配合！请确认以下对账明细：',
      created_at: new Date().toISOString()
    };

    await setDoc(doc(firestore, 'teachers', String(newId)), newTeacherData);
    setStoredTeacherId(newId);

    const { password: _, ...safeTeacher } = newTeacherData;
    return safeTeacher as Teacher;
  },

  async getCurrentTeacher(): Promise<Teacher> {
    await ensureInitialized();
    const tid = getStoredTeacherId();
    const docRef = doc(firestore, 'teachers', String(tid));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Teacher not found');
    }
    const data = snap.data();
    return {
      id: Number(data.id || tid),
      name: data.name,
      phone: data.phone,
      email: data.email,
      bank_name: data.bank_name,
      bank_account: data.bank_account,
      bank_holder: data.bank_holder,
      duitnow_id: data.duitnow_id,
      qr_image: data.qr_image,
      welcome_note: data.welcome_note,
      created_at: data.created_at
    };
  },

  // Tutor Profile
  async getProfile(): Promise<TutorProfile> {
    const teacher = await this.getCurrentTeacher();
    return {
      id: teacher.id,
      name: teacher.name,
      phone: teacher.phone || '',
      email: teacher.email || '',
      bank_name: teacher.bank_name || 'Maybank',
      bank_account: teacher.bank_account || '',
      bank_holder: teacher.bank_holder || '',
      duitnow_id: teacher.duitnow_id || '',
      qr_image: teacher.qr_image || '',
      welcome_note: teacher.welcome_note || '感谢家长的支持与信任！'
    };
  },

  async updateProfile(profile: Partial<TutorProfile>): Promise<TutorProfile> {
    const tid = getStoredTeacherId();
    const docRef = doc(firestore, 'teachers', String(tid));
    await updateDoc(docRef, profile);
    return this.getProfile();
  },

  // Students
  async getStudents(): Promise<Student[]> {
    await ensureInitialized();
    const tid = getStoredTeacherId();
    const q = query(collection(firestore, 'students'), where('teacher_id', '==', tid));
    const snap = await getDocs(q);
    const students: Student[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      students.push({
        id: Number(data.id || docSnap.id),
        name: data.name,
        grade: data.grade || '',
        subjects: data.subjects || '',
        parent_name: data.parent_name || '',
        parent_phone: data.parent_phone || '',
        billing_type: data.billing_type || 'per_hour',
        default_rate: Number(data.default_rate) || 50,
        weekly_schedules: data.weekly_schedules || [],
        notes: data.notes || '',
        active: data.active !== undefined ? Number(data.active) : 1,
        created_at: data.created_at
      });
    });
    return students.sort((a, b) => b.active - a.active || b.id - a.id);
  },

  async createStudent(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    const tid = getStoredTeacherId();
    const id = nextId();
    const newStudent: Student = {
      ...student,
      id,
      active: student.active !== undefined ? student.active : 1,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(firestore, 'students', String(id)), {
      ...newStudent,
      teacher_id: tid
    });
    return newStudent;
  },

  async updateStudent(id: number, student: Partial<Student>): Promise<Student> {
    const docRef = doc(firestore, 'students', String(id));
    await updateDoc(docRef, student);
    const snap = await getDoc(docRef);
    return snap.data() as Student;
  },

  async deleteStudent(id: number): Promise<void> {
    await deleteDoc(doc(firestore, 'students', String(id)));
  },

  // Classes
  async getClasses(): Promise<ClassSchedule[]> {
    await ensureInitialized();
    const tid = getStoredTeacherId();
    const q = query(collection(firestore, 'classes'), where('teacher_id', '==', tid));
    const snap = await getDocs(q);
    const list: ClassSchedule[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: Number(data.id || docSnap.id),
        title: data.title,
        subject: data.subject || '',
        student_ids: data.student_ids || [],
        day_of_week: Number(data.day_of_week) ?? 1,
        start_time: data.start_time,
        end_time: data.end_time,
        duration_hours: Number(data.duration_hours) || 1.5,
        is_recurring: Number(data.is_recurring) ?? 1,
        color: data.color || '#4f46e5',
        created_at: data.created_at
      });
    });
    return list.sort((a, b) => b.id - a.id);
  },

  async createClass(cls: Omit<ClassSchedule, 'id' | 'created_at'>): Promise<ClassSchedule> {
    const tid = getStoredTeacherId();
    const id = nextId();
    const newClass: ClassSchedule = {
      ...cls,
      id,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(firestore, 'classes', String(id)), {
      ...newClass,
      teacher_id: tid
    });
    return newClass;
  },

  async updateClass(id: number, cls: Partial<ClassSchedule>): Promise<ClassSchedule> {
    const docRef = doc(firestore, 'classes', String(id));
    await updateDoc(docRef, cls);
    const snap = await getDoc(docRef);
    return snap.data() as ClassSchedule;
  },

  async deleteClass(id: number): Promise<void> {
    await deleteDoc(doc(firestore, 'classes', String(id)));
  },

  // Sessions
  async getSessions(params?: { month?: string; student_id?: number; start_date?: string; end_date?: string }): Promise<LessonSession[]> {
    await ensureInitialized();
    const tid = getStoredTeacherId();
    const q = query(collection(firestore, 'sessions'), where('teacher_id', '==', tid));
    const snap = await getDocs(q);
    const students = await this.getStudents();
    const studentMap = new Map(students.map(s => [s.id, s]));

    let sessions: LessonSession[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      const st = studentMap.get(Number(data.student_id));
      sessions.push({
        id: Number(data.id || docSnap.id),
        class_id: data.class_id || null,
        student_id: Number(data.student_id),
        student_name: st?.name || data.student_name || '学生',
        student_grade: st?.grade || data.student_grade || '',
        class_title: data.class_title || '',
        class_color: data.class_color || '#4f46e5',
        subject: data.subject || '',
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        duration_hours: Number(data.duration_hours) || 1.5,
        rate: Number(data.rate) || 50,
        fee: Number(data.fee) || 75,
        status: data.status || 'scheduled',
        bill_id: data.bill_id || null,
        notes: data.notes || '',
        created_at: data.created_at
      });
    });

    if (params?.month) {
      sessions = sessions.filter(s => s.date.startsWith(params.month!));
    }
    if (params?.student_id) {
      sessions = sessions.filter(s => s.student_id === params.student_id);
    }
    if (params?.start_date && params?.end_date) {
      sessions = sessions.filter(s => s.date >= params.start_date! && s.date <= params.end_date!);
    }

    return sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  },

  async createSession(session: Partial<LessonSession> | Partial<LessonSession>[]): Promise<LessonSession | LessonSession[]> {
    const tid = getStoredTeacherId();
    const students = await this.getStudents();
    const studentMap = new Map(students.map(s => [s.id, s]));

    const list = Array.isArray(session) ? session : [session];
    const created: LessonSession[] = [];

    for (const item of list) {
      const id = nextId();
      const sId = Number(item.student_id);
      const student = studentMap.get(sId);

      let finalRate = item.rate;
      let finalFee = item.fee;
      if (finalRate === undefined || finalRate === null) {
        finalRate = student ? student.default_rate : 50;
        finalFee = student && student.billing_type === 'per_session'
          ? finalRate
          : finalRate * (Number(item.duration_hours) || 1.5);
      }

      const newSession: LessonSession = {
        id,
        class_id: item.class_id || null,
        student_id: sId,
        student_name: student?.name || '',
        student_grade: student?.grade || '',
        class_title: item.class_title || '',
        class_color: item.class_color || '#4f46e5',
        subject: item.subject || '',
        date: item.date || new Date().toISOString().split('T')[0],
        start_time: item.start_time || '10:00',
        end_time: item.end_time || '11:30',
        duration_hours: Number(item.duration_hours) || 1.5,
        rate: Number(finalRate) || 50,
        fee: Number(finalFee) || 75,
        status: item.status || 'scheduled',
        bill_id: item.bill_id || null,
        notes: item.notes || '',
        created_at: new Date().toISOString()
      };

      await setDoc(doc(firestore, 'sessions', String(id)), {
        ...newSession,
        teacher_id: tid
      });
      created.push(newSession);
    }

    return Array.isArray(session) ? created : created[0];
  },

  async updateSession(id: number, updates: Partial<LessonSession>): Promise<LessonSession> {
    const docRef = doc(firestore, 'sessions', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Session not found');

    const current = snap.data() as LessonSession;
    const newDuration = updates.duration_hours !== undefined ? updates.duration_hours : current.duration_hours;
    const newRate = updates.rate !== undefined ? updates.rate : current.rate;
    const newFee = updates.fee !== undefined ? updates.fee : (newRate * newDuration);

    const merged = {
      ...current,
      ...updates,
      duration_hours: newDuration,
      rate: newRate,
      fee: newFee
    };

    await updateDoc(docRef, merged);
    return merged;
  },

  async deleteSession(id: number): Promise<void> {
    await deleteDoc(doc(firestore, 'sessions', String(id)));
  },

  async generateRecurringSessions(year: number, month: number, studentId?: number): Promise<{ success: boolean; generatedCount: number }> {
    const tid = getStoredTeacherId();
    const daysInMonth = new Date(year, month, 0).getDate();
    const allStudents = await this.getStudents();
    const targetStudents = studentId
      ? allStudents.filter(s => s.id === studentId)
      : allStudents.filter(s => s.active === 1);

    const existingSessions = await this.getSessions({ month: `${year}-${String(month).padStart(2, '0')}` });
    const existingKeySet = new Set(
      existingSessions.map(s => `${s.student_id}_${s.date}_${s.start_time}`)
    );

    let generatedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      for (const student of targetStudents) {
        const slots = student.weekly_schedules || [];
        for (const slot of slots) {
          if (Number(slot.day_of_week) === dayOfWeek) {
            const startTime = slot.start_time || '10:00';
            const endTime = slot.end_time || '11:30';
            const durationHours = Number(slot.duration_hours) || 1.5;
            const subject = slot.subject || (student.subjects ? student.subjects.split('、')[0] : '补习');

            const key = `${student.id}_${dateStr}_${startTime}`;
            if (!existingKeySet.has(key)) {
              const rate = (slot.rate !== undefined && slot.rate !== null && Number(slot.rate) > 0)
                ? Number(slot.rate)
                : student.default_rate;
              const fee = student.billing_type === 'per_session' ? rate : rate * durationHours;

              const id = nextId();
              await setDoc(doc(firestore, 'sessions', String(id)), {
                id,
                teacher_id: tid,
                class_id: null,
                student_id: student.id,
                student_name: student.name,
                student_grade: student.grade,
                subject,
                date: dateStr,
                start_time: startTime,
                end_time: endTime,
                duration_hours: durationHours,
                rate,
                fee,
                status: 'scheduled',
                bill_id: null,
                notes: '',
                created_at: new Date().toISOString()
              });

              existingKeySet.add(key);
              generatedCount++;
            }
          }
        }
      }
    }

    return { success: true, generatedCount };
  },

  // Bills
  async getBills(params?: { student_id?: number; status?: string }): Promise<BillReceipt[]> {
    await ensureInitialized();
    const tid = getStoredTeacherId();
    const q = query(collection(firestore, 'bills'), where('teacher_id', '==', tid));
    const snap = await getDocs(q);
    let bills: BillReceipt[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      bills.push({
        id: Number(data.id || docSnap.id),
        bill_number: data.bill_number,
        student_id: Number(data.student_id),
        student_name: data.student_name,
        month_period: data.month_period,
        session_ids: data.session_ids || [],
        subtotal: Number(data.subtotal) || 0,
        adjustments: data.adjustments || [],
        total_amount: Number(data.total_amount) || 0,
        status: data.status || 'pending',
        paid_at: data.paid_at || null,
        notes: data.notes || '',
        created_at: data.created_at
      });
    });

    if (params?.student_id) {
      bills = bills.filter(b => b.student_id === params.student_id);
    }
    if (params?.status) {
      bills = bills.filter(b => b.status === params.status);
    }

    return bills.sort((a, b) => b.id - a.id);
  },

  async createBill(bill: Partial<BillReceipt>): Promise<BillReceipt> {
    const tid = getStoredTeacherId();
    const id = nextId();
    const studentId = Number(bill.student_id);
    const students = await this.getStudents();
    const student = students.find(s => s.id === studentId);

    const timestamp = Date.now().toString().slice(-4);
    const billNumber = `INV-${(bill.month_period || '').replace('-', '')}-${String(studentId).padStart(2, '0')}${timestamp}`;

    const newBill: BillReceipt = {
      id,
      bill_number: billNumber,
      student_id: studentId,
      student_name: student ? student.name : '学生',
      month_period: bill.month_period || '',
      session_ids: bill.session_ids || [],
      subtotal: Number(bill.subtotal) || 0,
      adjustments: bill.adjustments || [],
      total_amount: Number(bill.total_amount) || 0,
      status: 'pending',
      paid_at: null,
      notes: bill.notes || '',
      created_at: new Date().toISOString()
    };

    await setDoc(doc(firestore, 'bills', String(id)), {
      ...newBill,
      teacher_id: tid
    });

    // Mark sessions
    if (bill.session_ids && bill.session_ids.length > 0) {
      for (const sId of bill.session_ids) {
        await updateDoc(doc(firestore, 'sessions', String(sId)), {
          bill_id: id
        });
      }
    }

    return newBill;
  },

  async updateBill(id: number, updates: Partial<BillReceipt>): Promise<BillReceipt> {
    const docRef = doc(firestore, 'bills', String(id));
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Bill not found');

    const current = snap.data() as BillReceipt;
    let finalPaidAt = current.paid_at;
    if (updates.status === 'paid' && !current.paid_at) {
      finalPaidAt = updates.paid_at || new Date().toISOString().split('T')[0];
    } else if (updates.status === 'pending') {
      finalPaidAt = null;
    }

    const merged = {
      ...current,
      ...updates,
      paid_at: finalPaidAt
    };

    await updateDoc(docRef, merged);
    return merged;
  },

  async deleteBill(id: number): Promise<void> {
    // Unlink sessions
    const billSnap = await getDoc(doc(firestore, 'bills', String(id)));
    if (billSnap.exists()) {
      const data = billSnap.data() as BillReceipt;
      if (data.session_ids) {
        for (const sId of data.session_ids) {
          try {
            await updateDoc(doc(firestore, 'sessions', String(sId)), { bill_id: null });
          } catch (e) {}
        }
      }
    }
    await deleteDoc(doc(firestore, 'bills', String(id)));
  },

  // Stats
  async getStats(month?: string): Promise<MonthStats> {
    const tid = getStoredTeacherId();
    const currentMonth = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const students = await this.getStudents();
    const activeStudents = students.filter(s => s.active === 1).length;

    const sessions = await this.getSessions({ month: currentMonth });
    const completedSessions = sessions.filter(s => s.status === 'completed');
    const completedHours = completedSessions.reduce((acc, s) => acc + s.duration_hours, 0);
    const estimatedIncome = completedSessions.reduce((acc, s) => acc + s.fee, 0);

    const bills = await this.getBills();
    const monthBills = bills.filter(b => b.month_period === currentMonth);
    const paidAmount = monthBills.filter(b => b.status === 'paid').reduce((acc, b) => acc + b.total_amount, 0);
    const pendingAmount = monthBills.filter(b => b.status === 'pending').reduce((acc, b) => acc + b.total_amount, 0);

    return {
      month: currentMonth,
      active_students: activeStudents,
      completed_hours: completedHours,
      estimated_income: estimatedIncome,
      paid_amount: paidAmount,
      pending_amount: pendingAmount
    };
  }
};
