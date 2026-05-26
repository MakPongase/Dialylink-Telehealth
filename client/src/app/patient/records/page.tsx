'use client';

import React, { useState, useEffect } from 'react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/api';
import { 
  FileText, Download, UploadCloud, Microscope, 
  Trash2, X, File, AlertCircle, Calendar,
  MessageSquare, ChevronDown, ChevronUp, CheckCircle, Image as ImageIcon
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

type TabType = 'prescriptions' | 'labs' | 'documents';

export default function PatientRecordsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('prescriptions');
  const [loading, setLoading] = useState(true);

  // Data states
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Modals & Upload states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'lab' | 'document'>('lab');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form fields
  const [labTestType, setLabTestType] = useState('');
  const [labResultDate, setLabResultDate] = useState('');
  const [docName, setDocName] = useState('');

  // Delete modal
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Expanded discontinued rx
  const [showPastRx, setShowPastRx] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);
  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: TabType) => {
    setLoading(true);
    try {
      if (tab === 'prescriptions') {
        const res = await api.get('/api/patient/prescriptions');
        if (res.data.success) setPrescriptions(res.data.data);
      } else if (tab === 'labs') {
        const res = await api.get('/api/patient/labs');
        if (res.data.success) setLabs(res.data.data);
      } else if (tab === 'documents') {
        const res = await api.get('/api/patient/documents');
        if (res.data.success) setDocuments(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        showToast('Invalid file type. Only PDF, JPG, and PNG are allowed.', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size exceeds 10MB limit.', 'error');
        return;
      }
      setUploadFile(file);
      if (uploadType === 'document' && !docName) {
        setDocName(file.name.split('.')[0]);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadProgress(10); // Fake progress start

    try {
      const bucket = 'patients';
      const folder = uploadType === 'lab' ? 'lab-results' : 'documents';
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, uploadFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error('Supabase upload failed: ' + uploadError.message);

      setUploadProgress(60);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      setUploadProgress(80);

      if (uploadType === 'lab') {
        await api.post('/api/patient/labs', {
          file_url: publicUrl,
          file_name: uploadFile.name,
          test_type: labTestType,
          result_date: labResultDate
        });
      } else {
        await api.post('/api/patient/documents', {
          file_url: publicUrl,
          file_name: docName || uploadFile.name
        });
      }

      setUploadProgress(100);
      setUploadModalOpen(false);
      showToast('File uploaded successfully!', 'success');
      resetUploadForm();
      fetchData(activeTab); // refresh

    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Failed to upload. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setLabTestType('');
    setLabResultDate('');
    setDocName('');
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    try {
      await api.delete(`/api/patient/documents/${deleteDocId}`);
      setDeleteDocId(null);
      showToast('Document deleted successfully.', 'success');
      fetchData('documents');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete document.', 'error');
    }
  };

  const [downloadingRxId, setDownloadingRxId] = useState<string | null>(null);
  
  const handleDownloadRx = async (groupId: string) => {
    setDownloadingRxId(groupId);
    try {
      const res = await api.get(`/api/patient/prescriptions/${groupId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${groupId.substring(0,8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Prescription downloaded.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not generate PDF. Try again.', 'error');
    } finally {
      setDownloadingRxId(null);
    }
  };

  const handlePreview = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      window.open(url, '_blank');
    } else {
      setPreviewUrl(url);
    }
  };

  const renderTabs = () => (
    <div className="flex space-x-6 border-b border-gray-200 mb-6">
      {[
        { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
        { id: 'labs', label: 'Lab Results', icon: Microscope },
        { id: 'documents', label: 'Documents', icon: File }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`pb-4 flex items-center gap-2 text-sm font-bold transition-colors relative ${
            activeTab === tab.id ? 'text-teal-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`} />
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-teal-600 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="records" />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center px-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Health Records</h1>
            {(activeTab === 'labs' || activeTab === 'documents') && (
              <button 
                onClick={() => {
                  setUploadType(activeTab === 'labs' ? 'lab' : 'document');
                  setUploadModalOpen(true);
                }}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
              >
                <UploadCloud className="h-4 w-4" /> Upload {activeTab === 'labs' ? 'Result' : 'Document'}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto w-full">
            {renderTabs()}

            {loading ? (
              <div className="text-center py-20 text-gray-500 font-medium">Loading {activeTab}...</div>
            ) : (
              <div className="space-y-6">
                
                {/* PRESCRIPTIONS TAB */}
                {activeTab === 'prescriptions' && (
                  <>
                    {prescriptions.length === 0 ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">No prescriptions yet.</h3>
                        <p className="text-gray-500 mb-6 text-sm max-w-sm">Your doctor will add your medications here after your consultation.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {prescriptions.filter(g => g.is_active).map(group => (
                            <div key={group.id} className="bg-white border border-teal-200 shadow-sm rounded-xl overflow-hidden">
                              <div className="bg-teal-50 px-6 py-4 flex justify-between items-center border-b border-teal-100">
                                <div>
                                  <h3 className="font-bold text-teal-900">Active Prescription</h3>
                                  <p className="text-xs text-teal-700 font-medium mt-0.5">
                                    Issued {new Date(group.issued_at).toLocaleDateString()} by Dr. {group.doctor_name}
                                  </p>
                                </div>
                                <button 
                                  onClick={() => handleDownloadRx(group.id)}
                                  disabled={downloadingRxId === group.id}
                                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-white border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {downloadingRxId === group.id ? 'Generating PDF...' : 'Download Prescription'}
                                </button>
                              </div>
                              <div className="p-6">
                                <ul className="space-y-4">
                                  {group.medications.filter((m:any) => m.is_active).map((med: any) => (
                                    <li key={med.id} className="flex gap-4">
                                      <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm shrink-0">
                                        Rx
                                      </div>
                                      <div>
                                        <p className="font-bold text-gray-900">{med.medication_name} {med.dosage}</p>
                                        <p className="text-sm text-gray-600 mt-0.5">{med.frequency} for {med.duration}</p>
                                        {med.instructions && (
                                          <p className="text-xs text-gray-500 italic mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                                            "{med.instructions}"
                                          </p>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                {group.notes && (
                                  <div className="mt-6 pt-4 border-t border-gray-100">
                                    <p className="text-sm font-bold text-gray-700 mb-1">Doctor's Notes:</p>
                                    <p className="text-sm text-gray-600">{group.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {prescriptions.filter(g => !g.is_active).length > 0 && (
                          <div className="mt-8">
                            <button 
                              onClick={() => setShowPastRx(!showPastRx)}
                              className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 w-full mb-4"
                            >
                              {showPastRx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              Past Prescriptions
                            </button>
                            
                            {showPastRx && (
                              <div className="space-y-4">
                                {prescriptions.filter(g => !g.is_active).map(group => (
                                  <div key={group.id} className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden opacity-80">
                                    <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200">
                                      <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">Discontinued</span>
                                        <p className="text-xs text-gray-500 font-medium">
                                          Issued {new Date(group.issued_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <button 
                                        onClick={() => handleDownloadRx(group.id)}
                                        disabled={downloadingRxId === group.id}
                                        className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                                      >
                                        Download PDF
                                      </button>
                                    </div>
                                    <div className="p-4 px-6">
                                      <div className="text-sm text-gray-500 line-through">
                                        {group.medications.map((m:any) => m.medication_name).join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* LAB RESULTS TAB */}
                {activeTab === 'labs' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {labs.length === 0 ? (
                      <div className="col-span-2 py-16 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                          <Microscope className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">No lab results uploaded yet.</h3>
                        <p className="text-gray-500 mb-6 text-sm">Upload your blood tests or scans for your doctor to review.</p>
                        <button 
                          onClick={() => { setUploadType('lab'); setUploadModalOpen(true); }}
                          className="bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                        >
                          Upload Lab Result
                        </button>
                      </div>
                    ) : (
                      labs.map(lab => (
                        <div key={lab.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:border-teal-300 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-gray-900">{lab.test_type}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" /> {new Date(lab.result_date).toLocaleDateString()}
                              </p>
                            </div>
                            <button 
                              onClick={() => handlePreview(lab.file_url)}
                              className="text-teal-600 bg-teal-50 hover:bg-teal-100 p-2 rounded-lg transition-colors"
                              title="View Document"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {lab.doctor_notes ? (
                            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-lg mt-4">
                              <p className="text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Doctor's Feedback
                              </p>
                              <p className="text-sm text-emerald-800 italic">"{lab.doctor_notes}"</p>
                            </div>
                          ) : (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs text-gray-400 italic flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Awaiting doctor review
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {documents.length === 0 ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                          <File className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">No documents uploaded.</h3>
                        <p className="text-gray-500 mb-6 text-sm">Keep referral letters or clinical summaries here.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                            <th className="px-6 py-4">Document Name</th>
                            <th className="px-6 py-4">Uploaded On</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {documents.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                <FileText className="h-4 w-4 text-teal-600" />
                                {doc.file_name.length > 40 ? doc.file_name.substring(0, 40) + '...' : doc.file_name}
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {new Date(doc.uploaded_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => handlePreview(doc.file_url)}
                                    className="text-gray-400 hover:text-teal-600 transition-colors p-1"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => setDeleteDocId(doc.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}



              </div>
            )}
          </div>
        </main>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => !isUploading && setUploadModalOpen(false)}
          title={`Upload ${uploadType === 'lab' ? 'Lab Result' : 'Document'}`}
          message="Select a PDF or image file (max 10MB)."
          hideCancel
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Select File</label>
              <input 
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                required
                disabled={isUploading}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            {uploadType === 'lab' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Test Type / Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Complete Blood Count"
                    value={labTestType}
                    onChange={e => setLabTestType(e.target.value)}
                    required
                    disabled={isUploading}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date of Result</label>
                  <input 
                    type="date" 
                    value={labResultDate}
                    onChange={e => setLabResultDate(e.target.value)}
                    required
                    disabled={isUploading}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </>
            )}

            {uploadType === 'document' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Document Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Cardiologist Clearance"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  required
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            )}

            {isUploading && (
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold text-teal-700 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setUploadModalOpen(false)}
                disabled={isUploading}
                className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isUploading || !uploadFile}
                className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                Upload File
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDocId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteDocId(null)}
          title="Delete Document"
          message="Are you sure you want to permanently delete this document?"
          onConfirm={handleDeleteDocument}
        />
      )}

      {/* Image Preview Lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
          <div className="relative max-w-5xl max-h-full flex flex-col">
            <button 
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors bg-black/50 p-2 rounded-full"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="object-contain max-h-[85vh] rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border z-50 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
