export type BillingType = 'per_hour' | 'per_session' | 'monthly';
export type SessionStatus = 'scheduled' | 'completed' | 'leave' | 'makeup' | 'cancelled';
export type BillStatus = 'pending' | 'paid';

export interface WeeklyScheduleSlot {
  day_of_week: number; // 0: 周日, 1: 周一 ... 6: 周六
  start_time: string;  // e.g. '10:00'
  end_time: string;    // e.g. '11:30'
  duration_hours: number; // e.g. 1.5
  subject: string;     // e.g. '数学'
  rate?: number;       // e.g. 60 (optional per-subject rate in RM)
}

export interface TutorProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  duitnow_id: string;
  qr_image: string;
  welcome_note: string;
}

export interface Student {
  id: number;
  name: string;
  grade: string;
  subjects: string;
  parent_name: string;
  parent_phone: string;
  billing_type: BillingType;
  default_rate: number;
  weekly_schedules?: WeeklyScheduleSlot[];
  notes: string;
  active: number;
  created_at?: string;
}

export interface ClassSchedule {
  id: number;
  title: string;
  subject: string;
  student_ids: number[];
  day_of_week: number; // 0: Sunday, 1: Monday, ... 6: Saturday
  start_time: string;
  end_time: string;
  duration_hours: number;
  is_recurring: number;
  color: string;
  created_at?: string;
}

export interface LessonSession {
  id: number;
  class_id?: number | null;
  student_id: number;
  student_name?: string;
  student_grade?: string;
  class_title?: string;
  class_color?: string;
  subject: string;
  date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  duration_hours: number;
  rate: number;
  fee: number;
  status: SessionStatus;
  bill_id?: number | null;
  notes: string;
  created_at?: string;
}

export interface BillAdjustment {
  id: string;
  description: string;
  amount: number; // can be positive (e.g. material fee) or negative (e.g. discount)
}

export interface BillReceipt {
  id: number;
  bill_number: string;
  student_id: number;
  student_name: string;
  month_period: string; // YYYY-MM
  session_ids: number[];
  subtotal: number;
  adjustments: BillAdjustment[];
  total_amount: number;
  status: BillStatus;
  paid_at?: string | null;
  notes: string;
  created_at?: string;
}

export interface MonthStats {
  month: string;
  active_students: number;
  completed_hours: number;
  estimated_income: number;
  paid_amount: number;
  pending_amount: number;
}

export interface Teacher {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  bank_name?: string;
  bank_account?: string;
  bank_holder?: string;
  duitnow_id?: string;
  qr_image?: string;
  welcome_note?: string;
  created_at?: string;
}

export type AnnualReportTone = 'warm' | 'professional' | 'concise';

export interface AnnualReportRatings {
  focus: number;
  homework: number;
  progress: number;
  exam: number;
}

export interface AnnualReportStats {
  totalSessions: number;
  completedSessions: number;
  completedHours: number;
  leaveCount: number;
  makeupCount: number;
  attendanceRate: number;
  subjects: string[];
}

export interface AnnualReport {
  id: number;
  teacher_id?: number;
  student_id: number;
  student_name: string;
  year: string;
  selected_tags: Record<string, string[]>;
  custom_notes?: Record<string, string>;
  ratings: AnnualReportRatings;
  highlights: string;
  comment: string;
  next_year_goal: string;
  tone: AnnualReportTone;
  show_attendance: boolean;
  stats_snapshot?: AnnualReportStats;
  updated_at?: string;
  created_at?: string;
}
