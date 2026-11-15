import React, { useState, useEffect } from 'react';
import { 
  BarChart3, DollarSign, Clock, Users, CheckCircle2, 
  AlertCircle, Trash2, Calendar, Check, ArrowUpRight 
} from 'lucide-react';
import { MonthStats, BillReceipt } from '../types';
import { api } from '../api/client';

interface StatsDashboardProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  stats: MonthStats | null;
  onRefreshStats: () => void;
  onGoToReceipt: (studentId: number) => void;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  selectedMonth,
  setSelectedMonth,
  stats,
  onRefreshStats,
  onGoToReceipt,
}) => {
  const [bills, setBills] = useState<BillReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await api.getBills();
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [selectedMonth]);

  const handleTogglePaid = async (bill: BillReceipt) => {
    const newStatus = bill.status === 'paid' ? 'pending' : 'paid';
    try {
      await api.updateBill(bill.id, { status: newStatus });
      await loadBills();
      onRefreshStats();
    } catch (err: any) {
      alert(`更新状态失败: ${err.message}`);
    }
  };

  const handleDeleteBill = async (id: number) => {
    if (!window.confirm('确定要删除这条账单记录吗？')) return;
    try {
      await api.deleteBill(id);
      await loadBills();
      onRefreshStats();
    } catch (err: any) {
      alert(`删除账单失败: ${err.message}`);
    }
  };

  const currentMonthBills = bills.filter((b) => b.month_period === selectedMonth);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 md:pb-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">财务总览与收据记录</h2>
            <p className="text-xs text-slate-500">
              统计 {selectedMonth} 的授课进度、应收费用与已开出的对账收据历史
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">统计月份:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none"
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completed Hours */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">本月已授课时</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {(stats?.completed_hours || 0).toFixed(1)}
              <span className="text-xs font-normal text-slate-500 ml-1">小时</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              已打卡课时
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Estimated Month Income */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">本月预估收入</span>
            <span className="text-2xl font-black text-indigo-700 mt-1 block">
              RM {(stats?.estimated_income || 0).toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5">
              基于已完成课时核算
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Paid Amount */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">已收款总额</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              RM {(stats?.paid_amount || 0).toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              家长已转账
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Pending Amount */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">待收款总额</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              RM {(stats?.pending_amount || 0).toFixed(2)}
            </span>
            <span className="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              待家长转账
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Historical Bills / Receipts Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              对账单开单历史 ({bills.length} 份)
            </h3>
            <p className="text-xs text-slate-500">已保存至数据库的对账单记录，可快捷切换收款状态</p>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300 stroke-1" />
            <p className="text-sm">暂无已保存的对账单记录</p>
            <p className="text-xs text-slate-400 mt-1">
              进入“对账收据”页面，为学生勾选课时后点击“保存记录”即可存入此处
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold">
                  <th className="py-3 px-4">单号</th>
                  <th className="py-3 px-4">学生姓名</th>
                  <th className="py-3 px-4">对账周期</th>
                  <th className="py-3 px-4">包含课时</th>
                  <th className="py-3 px-4">应付总额</th>
                  <th className="py-3 px-4">收款状态</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => {
                  const isPaid = bill.status === 'paid';
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800 text-xs">
                        {bill.bill_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {bill.student_name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {bill.month_period}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {bill.session_ids?.length || 0} 节课
                      </td>
                      <td className="py-3 px-4 font-black text-indigo-900">
                        RM {bill.total_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTogglePaid(bill)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="点击可切换付款状态"
                        >
                          {isPaid ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              已收款 ({bill.paid_at || '已结清'})
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              待付款 (点此标为已收)
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onGoToReceipt(bill.student_id)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-medium flex items-center gap-1"
                            title="在对账页面重新制作"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            重看
                          </button>
                          <button
                            onClick={() => handleDeleteBill(bill.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="删除账单"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
