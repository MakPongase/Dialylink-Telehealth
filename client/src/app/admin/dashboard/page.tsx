'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '../../../lib/api';
import { 
  LayoutDashboard, UserCheck, Users, LogOut, 
  Activity, Calendar, CheckCircle, XCircle, 
  Ban, Check, AlertCircle, FileText, ChevronRight
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState(
    pathname === '/admin/verify-doctors' ? 'approvals' :
    pathname === '/admin/users' ? 'directory' : 'dashboard'
  );
  const [userDirTab, setUserDirTab] = useState('doctors');
  
  // Data State
  const [stats, setStats] = useState({ totalPatients: 0, totalDoctors: 0, pendingApprovals: 0, consultationsToday: 0 });
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [allDoctors, setAllDoctors] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [doctorToReject, setDoctorToReject] = useState<any>(null);

  // Generic Confirm/Alert State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info' | 'success';
    confirmText: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
    confirmText: 'Confirm'
  });

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    fetchStats();
    fetchPendingDoctors(); // Always fetch pending doctors for the dashboard recent activity widget
    if (activeTab === 'directory') {
      if (userDirTab === 'doctors') fetchAllDoctors();
      if (userDirTab === 'patients') fetchAllPatients();
    }
  }, [activeTab, userDirTab]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      if (res.data.success) setStats(res.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchPendingDoctors = async () => {
    try {
      const res = await api.get('/api/admin/doctors/pending');
      if (res.data.success) setPendingDoctors(res.data.data);
    } catch (error) {
      console.error('Failed to fetch pending doctors', error);
    }
  };

  const fetchAllDoctors = async () => {
    try {
      const res = await api.get('/api/admin/doctors');
      if (res.data.success) setAllDoctors(res.data.data);
    } catch (error) {
      console.error('Failed to fetch all doctors', error);
    }
  };

  const fetchAllPatients = async () => {
    try {
      const res = await api.get('/api/admin/patients');
      if (res.data.success) setAllPatients(res.data.data);
    } catch (error) {
      console.error('Failed to fetch all patients', error);
    }
  };

  const handleApprove = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Approve Doctor',
      message: 'Are you sure you want to approve this doctor? They will be granted full access to the platform.',
      type: 'success',
      confirmText: 'Approve',
      onConfirm: async () => {
        try {
          await api.post(`/api/admin/doctors/${id}/approve`);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          fetchPendingDoctors();
          fetchStats();
        } catch (error) {
          console.error('Failed to approve doctor', error);
        }
      }
    });
  };

  const openRejectModal = (doctor: any) => {
    setDoctorToReject(doctor);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      setAlertState({
        isOpen: true,
        title: 'Missing Information',
        message: 'Please provide a reason for rejection.',
        type: 'warning'
      });
      return;
    }
    try {
      await api.post(`/api/admin/doctors/${doctorToReject.id}/reject`, { reason: rejectReason });
      setRejectModalOpen(false);
      fetchPendingDoctors();
      fetchStats();
    } catch (error) {
      console.error('Failed to reject doctor', error);
    }
  };

  const handleSuspendToggle = (userId: string, currentlySuspended: boolean) => {
    const action = currentlySuspended ? 'unsuspend' : 'suspend';
    setConfirmState({
      isOpen: true,
      title: `${currentlySuspended ? 'Unsuspend' : 'Suspend'} User`,
      message: `Are you sure you want to ${action} this user?`,
      type: currentlySuspended ? 'info' : 'danger',
      confirmText: currentlySuspended ? 'Unsuspend' : 'Suspend',
      onConfirm: async () => {
        try {
          await api.post(`/api/admin/users/${userId}/${action}`);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          if (activeTab === 'directory') {
            if (userDirTab === 'doctors') fetchAllDoctors();
            if (userDirTab === 'patients') fetchAllPatients();
          }
        } catch (error) {
          console.error(`Failed to ${action} user`, error);
        }
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const NavItem = ({ id, icon: Icon, label, path }: { id: string, icon: any, label: string, path: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        router.push(path);
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id 
          ? 'bg-blue-50/50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`h-[18px] w-[18px] ${activeTab === id ? 'text-blue-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  // Pagination Derived State
  const activeList = userDirTab === 'doctors' ? allDoctors : allPatients;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const paginatedList = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-gray-900 selection:bg-blue-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            DialyLink
            <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase ml-2 align-middle">
              Admin
            </span>
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-1">
            <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Overview</h4>
            <NavItem id="dashboard" path="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          </div>

          <div className="space-y-1">
            <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Operation</h4>
            <NavItem id="approvals" path="/admin/verify-doctors" icon={UserCheck} label="Doctor Approvals" />
            <NavItem id="directory" path="/admin/users" icon={Users} label="User Directory" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
          >
            <LogOut className="h-[18px] w-[18px] text-gray-400 group-hover:text-red-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-gray-500 font-medium">
            {activeTab === 'dashboard' && 'Overview / Dashboard'}
            {activeTab === 'approvals' && 'Operation / Doctor Approvals'}
            {activeTab === 'directory' && 'Operation / User Directory'}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              AD
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">At-a-glance overview of the system</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Today's Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 border border-gray-100 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalPatients}</div>
                      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Total Patients</div>
                    </div>
                  </div>

                  <div className="p-5 border border-gray-100 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.totalDoctors}</div>
                      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Total Doctors</div>
                    </div>
                  </div>

                  <div className="p-5 border border-gray-100 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</div>
                      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Pending Approvals</div>
                    </div>
                  </div>

                  <div className="p-5 border border-gray-100 rounded-xl flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.consultationsToday}</div>
                      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Consultations Today</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-[300px]">
                   <h3 className="text-sm font-semibold text-gray-900 mb-4 flex justify-between items-center border-b border-gray-100 pb-4">
                     Platform Health
                     <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Operational</span>
                   </h3>
                   <div className="flex-1 flex flex-col items-center justify-center text-center">
                     <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                       <Activity className="h-6 w-6 text-emerald-500" />
                     </div>
                     <p className="text-gray-900 font-semibold text-sm">All Systems Online</p>
                     <p className="text-gray-500 text-xs mt-1 max-w-[200px]">API services, database connections, and the AI Engine are running optimally.</p>
                   </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-[300px]">
                   <h3 className="text-sm font-semibold text-gray-900 mb-4 flex justify-between items-center border-b border-gray-100 pb-4">
                     Recent System Activity
                     <span className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">View All &rarr;</span>
                   </h3>
                   <div className="flex-1 flex flex-col gap-2 overflow-y-auto pt-2">
                     {pendingDoctors.slice(0, 4).map(doc => (
                       <div key={doc.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer">
                         <div>
                           <div className="font-semibold text-gray-900 text-sm">{doc.full_name}</div>
                           <div className="text-[11px] text-gray-500 mt-0.5">Applied as {doc.specialization}</div>
                         </div>
                         <div className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">Pending</div>
                       </div>
                     ))}
                     {pendingDoctors.length === 0 && (
                       <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">No recent activity</div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOCTOR APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Doctor Approvals</h1>
                <p className="text-sm text-gray-500 mt-1">Review and manage pending physician registrations</p>
              </div>

              {pendingDoctors.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">You're all caught up!</h3>
                  <p className="text-sm text-gray-500 mt-1">There are no pending doctor registrations waiting for your approval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pendingDoctors.map(doctor => (
                    <div key={doctor.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4 mb-5">
                        {doctor.profile_photo_url ? (
                          <img src={doctor.profile_photo_url} alt={doctor.full_name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                            <UserCheck className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{doctor.full_name}</h4>
                          <p className="text-xs text-blue-600 font-medium">{doctor.specialization}</p>
                          <div className="text-[11px] text-gray-500 mt-3 space-y-1.5 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p><span className="font-semibold text-gray-700">Email:</span> {doctor.email}</p>
                            <p><span className="font-semibold text-gray-700">Hospital:</span> {doctor.hospital_affiliation || 'N/A'}</p>
                            <p><span className="font-semibold text-gray-700">Experience:</span> {doctor.years_experience} years</p>
                            <p><span className="font-semibold text-gray-700">PRC License:</span> {doctor.license_number}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {doctor.prc_doc_url ? (
                          <a 
                            href={doctor.prc_doc_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:text-blue-700 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                            View PRC ID Document
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </a>
                        ) : (
                          <div className="p-2.5 bg-red-50 border border-red-100 text-red-600 text-[11px] rounded-lg font-medium flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" /> No PRC Document Provided
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApprove(doctor.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button 
                            onClick={() => openRejectModal(doctor)}
                            className="flex-1 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 text-red-600 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: USER DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Directory</h1>
                  <p className="text-sm text-gray-500 mt-1">Manage and monitor all platform accounts</p>
                </div>

                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                  <button 
                    onClick={() => { setUserDirTab('doctors'); setCurrentPage(1); }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${userDirTab === 'doctors' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Doctors
                  </button>
                  <button 
                    onClick={() => { setUserDirTab('patients'); setCurrentPage(1); }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${userDirTab === 'patients' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Patients
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">{userDirTab === 'doctors' ? 'Status' : 'Connected Doctor'}</th>
                        <th className="px-6 py-4">Joined Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedList.map(user => (
                        <tr key={user.user_id} className={`hover:bg-gray-50/50 transition-colors ${user.is_suspended ? 'opacity-60' : ''}`}>
                          <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                            {user.is_suspended && <Ban className="h-3.5 w-3.5 text-red-500" />}
                            {user.full_name}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">{user.email}</td>
                          <td className="px-6 py-4">
                            {userDirTab === 'doctors' ? (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                user.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                'bg-orange-50 text-orange-600 border border-orange-100'
                              }`}>
                                {user.status}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs font-medium">
                                {user.doctor_name || 'None'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleSuspendToggle(user.user_id, user.is_suspended)}
                              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                                user.is_suspended 
                                  ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50' 
                                  : 'bg-white border-red-100 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activeList.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm font-medium">
                    No records found.
                  </div>
                ) : (
                  totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                      <span className="text-xs text-gray-500 font-medium">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, activeList.length)} of {activeList.length} entries
                      </span>
                      <div className="flex gap-2">
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          Previous
                        </button>
                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Reject Doctor Custom Modal */}
      <Modal 
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Application"
        type="danger"
        confirmText="Confirm Rejection"
        onConfirm={submitReject}
        message={
          <div className="space-y-4">
            <p>
              You are rejecting the registration for <strong className="text-gray-900">{doctorToReject?.full_name}</strong>. 
              Please provide a reason so they can correct the issue and re-apply.
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 min-h-[100px] resize-none"
              placeholder="E.g., PRC ID document is blurred or expired..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        }
      />

      {/* Generic Confirm Modal */}
      <Modal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
      />

      {/* Generic Alert Modal */}
      <Modal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        hideCancel
        confirmText="OK"
        onConfirm={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
