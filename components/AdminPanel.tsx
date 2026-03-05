import React, { useState, useEffect, useRef } from 'react'; // THÊM useRef
import { Settings, Lock, Save, Database, Trash2, Download, RefreshCw, X, Cloud, ArrowLeft, Search, UploadCloud, CloudLightning, Zap, Globe, HardDriveUpload, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  getCurrentSequenceCounter, setSequenceCounter, getRecords, deleteRecord, clearAllRecords,
  getGoogleScriptUrl, setGoogleScriptUrl, generateTestData,
  syncRecordToCloud, backupDataToCloud, saveRecord, fetchRecordsFromCloud
} from '../services/storageService';
import { calculateASScores, getHighestScores } from '../services/scoreService';
import { calculateClinicalIndices } from '../services/indicesService'; 
import { generateCustomCSV, ExportOptions } from '../services/csvService';
import { Button } from './Button';
import { SurveyRecord, ClinicalData } from '../types';
import { CCMQ_QUESTIONS, ANSWER_OPTIONS } from '../constants';

export const AdminPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'database'>('settings');
  const [dataSource, setDataSource] = useState<'local' | 'cloud'>('local');
  const [currentCounter, setCurrentCounter] = useState(0);
  const [newCounter, setNewCounter] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'missing_time'>('all'); 

  // --- CHỐT CHẶN CHỐNG LƯU ĐÈ CACHE ---
  const lastLoadedId = useRef<string | null>(null);
  const isTransitioning = useRef<boolean>(false);

  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(null);
  const [editingClinicalData, setEditingClinicalData] = useState<ClinicalData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    personalInfo: true, clinicalIndices: true, redGreenDetails: true, surveyDetails: true
  });

  const handleOpen = () => { setIsOpen(true); refreshData(); };
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => { setNotification(null); }, 3000);
  };

  const refreshData = async () => {
    setCurrentCounter(getCurrentSequenceCounter());
    setNewCounter(getCurrentSequenceCounter().toString());
    const url = getGoogleScriptUrl();
    setScriptUrl(url);

    if (dataSource === 'local') {
        const allRecords = getRecords().sort((a, b) => b.profile.sequenceNumber - a.profile.sequenceNumber);
        setRecords(allRecords);
    } else {
        if (!url) { showNotification("Chưa cấu hình Google Script URL!", 'error'); setDataSource('local'); return; }
        setIsLoadingCloud(true);
        const result = await fetchRecordsFromCloud(url);
        setIsLoadingCloud(false);
        if (result.success && result.data) {
            const sorted = result.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRecords(sorted);
        } else {
            showNotification(`Lỗi tải dữ liệu Cloud: ${result.message}`, 'error');
            setDataSource('local');
        }
    }
    setSelectedRecord(null);
    setCurrentPage(1);
  };

  useEffect(() => { if (isOpen && isAuthenticated) refreshData(); }, [dataSource]);

  // --- SỬA LỖI 1: NẠP CACHE AN TOÀN ---
  useEffect(() => {
    setSyncStatus('idle');
    if (selectedRecord) {
      // Khóa chức năng lưu tạm thời để nạp dữ liệu mới
      isTransitioning.current = true;
      lastLoadedId.current = null;

      const draftKey = `draft_clinical_${selectedRecord.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      
      const dataToSet = savedDraft 
        ? JSON.parse(savedDraft) 
        : JSON.parse(JSON.stringify(selectedRecord.clinicalData || {}));
      
      setEditingClinicalData(dataToSet);

      // Mở khóa sau khi nạp xong
      setTimeout(() => {
        lastLoadedId.current = selectedRecord.id;
        isTransitioning.current = false;
      }, 50); 
    } else {
      setEditingClinicalData(null);
      lastLoadedId.current = null;
    }
  }, [selectedRecord?.id]); // Chỉ chạy khi đổi ID

  // --- SỬA LỖI 2: LƯU NHÁP AN TOÀN (CHỈ LƯU KHI ĐÃ NẠP XONG VÀ ĐÚNG ID) ---
  useEffect(() => {
    if (
      !isTransitioning.current && 
      selectedRecord?.id && 
      editingClinicalData && 
      lastLoadedId.current === selectedRecord.id
    ) {
      const draftKey = `draft_clinical_${selectedRecord.id}`;
      const currentDataStr = JSON.stringify(editingClinicalData);
      const originalDataStr = JSON.stringify(selectedRecord.clinicalData || {});

      // Chỉ lưu nếu có thay đổi so với bản gốc của chính người đó
      if (currentDataStr !== originalDataStr) {
        localStorage.setItem(draftKey, currentDataStr);
      }
    }
  }, [editingClinicalData]); // Theo dõi sự thay đổi nội dung ô nhập

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) { 
      setIsAuthenticated(true); 
      setPassword(''); 
      sessionStorage.setItem('isAdmin', 'true'); 
    } else { alert('Mật khẩu không đúng!'); } 
  };

  const handleUpdateSettings = (e: React.FormEvent) => { e.preventDefault(); const val = parseInt(newCounter, 10); if (!isNaN(val) && val >= 0) { setSequenceCounter(val); setCurrentCounter(val); } setGoogleScriptUrl(scriptUrl.trim()); showNotification('Đã lưu cấu hình!'); };
  
  const handleBackupToDrive = async () => {
    const url = getGoogleScriptUrl();
    if (!url || getRecords().length === 0) return alert("Dữ liệu trống!");
    if (!confirm("Backup CSV lên Drive?")) return;
    setIsBackingUp(true);
    const result = await backupDataToCloud(url);
    setIsBackingUp(false);
    result.success ? showNotification("Backup thành công!") : showNotification(`Lỗi: ${result.message}`, 'error');
  };

  const handleDeleteRecord = (id: string, name: string) => { if(dataSource === 'cloud') return alert("Xóa trên Sheet!"); if (confirm(`Xóa ${name}?`)) { deleteRecord(id); refreshData(); if (selectedRecord?.id === id) setSelectedRecord(null); showNotification(`Đã xóa ${name}`); } };
  const handleClearAll = () => { if(dataSource==='cloud') return; if (prompt("Nhập 'XOA' để xóa:") === 'XOA') { clearAllRecords(); refreshData(); showNotification('Đã xóa sạch DB!'); } };
  const handleGenerateData = () => { if (confirm("Tạo hồ sơ giả?")) { generateTestData(); refreshData(); showNotification("Đã tạo Data giả!"); } };

  const handleSyncToCloud = async () => {
    if (!selectedRecord) return;
    const url = getGoogleScriptUrl();
    if (!url) return alert("Chưa có URL!");
    setSyncStatus('syncing');
    const currentClinicalData = editingClinicalData || selectedRecord.clinicalData;
    const recordToSync = { ...selectedRecord, clinicalData: currentClinicalData };
    if (!recordToSync.asScores) recordToSync.asScores = calculateASScores(recordToSync.surveyData);
    if (dataSource === 'local') saveRecord(recordToSync.profile, recordToSync.surveyData, currentClinicalData, recordToSync.asScores);
    
    const result = await syncRecordToCloud(recordToSync, url);
    if (result.success) { 
      localStorage.removeItem(`draft_clinical_${selectedRecord.id}`); 
      setSyncStatus('success'); 
      setTimeout(refreshData, 1000); 
      showNotification('Đồng bộ thành công!'); 
    } 
    else { setSyncStatus('error'); showNotification(`Lỗi: ${result.message}`, 'error'); }
  };

  const handleSyncAll = async () => { 
      const url = getGoogleScriptUrl();
      if (!url || !confirm(`Đồng bộ ${records.length} hồ sơ?`)) return;
      setIsSyncingAll(true);
      for (const rec of records) { await syncRecordToCloud(rec, url); await new Promise(r => setTimeout(r, 300)); }
      setIsSyncingAll(false);
      showNotification('Đồng bộ hoàn tất!');
  };

  const handleSaveClinicalData = async () => {
    if (selectedRecord && editingClinicalData) {
      saveRecord(selectedRecord.profile, selectedRecord.surveyData, editingClinicalData, selectedRecord.asScores);
      localStorage.removeItem(`draft_clinical_${selectedRecord.id}`); // Xóa nháp vì đã lưu thật
      refreshData();
      showNotification("Đã lưu Local!");
    }
  };

  const handleClinicalInputChange = (phase: 'pre' | 'postImmediate' | 'post10Min', point: string, type: 'green' | 'red', value: string) => {
    if (!editingClinicalData) return;
    setEditingClinicalData(prev => {
      if (!prev) return null;
      const currentPhase = prev[phase] || {};
      const newPhaseData = { ...currentPhase, [`${type}_${point}`]: value };
      const g = type === 'green' ? value : (newPhaseData as any)[`green_${point}`];
      const r = type === 'red' ? value : (newPhaseData as any)[`red_${point}`];
      const { ei, mi, ri } = calculateClinicalIndices(r, g);
      (newPhaseData as any)[`ei_${point}`] = ei;
      (newPhaseData as any)[`mi_${point}`] = mi;
      (newPhaseData as any)[`ri_${point}`] = ri;
      return { ...prev, [phase]: newPhaseData };
    });
  };

  const handleFileChange = (phase: string, val: string) => {
      if (editingClinicalData) setEditingClinicalData({...editingClinicalData, [phase]: {...((editingClinicalData as any)[phase] || {}), file: val}});
  };

  const getRecordSummary = (rec: SurveyRecord) => {
    const scores = rec.asScores || calculateASScores(rec.surveyData);
    const highest = getHighestScores(scores);
    if (scores.binhHoa >= 60 && highest.every(h => !h.includes("Bình hòa") ? parseInt(h.match(/\d+/)?.[0] || '0') < 40 : true)) {
       return <span className="text-emerald-600 font-bold text-xs">Bình hòa ({scores.binhHoa})</span>;
    }
    return <span className="text-red-600 font-medium text-xs">{highest.slice(0, 1).join(', ')}</span>;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, phase: 'pre' | 'postImmediate' | 'post10Min') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return showNotification('File không hợp lệ!', 'error');

      const header = lines[0].split(',').map(h => h.trim().replace(/["']/g, ""));
      const labelIdx = header.indexOf('Label');
      const meanIdx = header.indexOf('Mean');
      if (labelIdx === -1 || meanIdx === -1) return showNotification('Thiếu cột Label/Mean!', 'error');

      const reds: number[] = []; const greens: number[] = [];
      for (let i = 1; i < lines.length; i++) {
        const c = lines[i].split(',');
        const label = c[labelIdx].trim().replace(/["']/g, "");
        const mean = parseFloat(c[meanIdx]);
        if (label === 'Red') reds.push(mean);
        if (label === 'Green') greens.push(mean);
      }

      if (reds.length >= 4 && greens.length >= 4) {
        setEditingClinicalData(prev => {
          if (!prev) return prev;
          const newPhase = { ...(prev[phase] || {}) };
          ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].forEach((pt, idx) => {
            const r = reds[idx].toFixed(3); const g = greens[idx].toFixed(3);
            (newPhase as any)[`red_${pt}`] = r; (newPhase as any)[`green_${pt}`] = g;
            const { ei, mi, ri } = calculateClinicalIndices(r, g);
            (newPhase as any)[`ei_${pt}`] = ei; (newPhase as any)[`mi_${pt}`] = mi; (newPhase as any)[`ri_${pt}`] = ri;
          });
          return { ...prev, [phase]: newPhase };
        });
        showNotification(`Trích xuất thành công!`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredRecords = (records || []).filter(r => {
    const fullName = r.profile?.fullName || '';
    const patientCode = r.profile?.patientCode || '';
    const matchSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        patientCode.toLowerCase().includes(searchTerm.toLowerCase());
    let matchFilter = true;
    if (filterStatus === 'missing_time') {
      const time = r.clinicalData?.cuppingMarkTime;
      matchFilter = !time || String(time).trim() === ''; 
    }
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);
  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  if (!isOpen) return <button onClick={handleOpen} className="fixed bottom-4 left-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-200 z-40"><Settings size={20} /></button>;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${isAuthenticated ? 'max-w-6xl h-[90vh]' : 'max-w-md'} flex flex-col overflow-hidden transition-all duration-300 relative`}>
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <h3 className="font-semibold flex items-center gap-2 text-lg"><Settings size={20} className="text-blue-400" /> Quản trị hệ thống</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-hidden p-0 bg-gray-50 flex flex-col relative">
          {!isAuthenticated ? (
             <div className="p-8 flex-1 flex items-center"><form onSubmit={handleLogin} className="space-y-6 w-full"><div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="text-blue-600" size={32} /></div><h2 className="text-xl font-bold text-gray-800">Đăng nhập Quản trị</h2></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label><div className="relative"><Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập mật khẩu..." autoFocus /></div></div><Button type="submit" className="w-full py-3 text-base">Truy cập</Button></form></div>
          ) : (
            <div className="flex flex-col h-full relative">
              <div className="flex border-b border-gray-200 bg-white shrink-0 items-center justify-between pr-4">
                 <div className="flex">
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Settings size={18} /> Cấu hình</button>
                    <button onClick={() => { setActiveTab('database'); refreshData(); }} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${activeTab === 'database' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Database size={18} /> Dữ liệu ({records.length})</button>
                 </div>
                 {activeTab === 'database' && (<div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200"><button onClick={() => setDataSource('local')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${dataSource === 'local' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><Database size={14} /> Local</button><button onClick={() => setDataSource('cloud')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${dataSource === 'cloud' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Cloud size={14} /> Cloud</button></div>)}
              </div>

              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && ( 
                  <div className="h-full overflow-y-auto p-8"><div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200"><h4 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Cài đặt Hệ thống</h4><form onSubmit={handleUpdateSettings} className="space-y-6"><div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm border border-blue-100 flex items-start gap-3"><div className="bg-blue-200 p-2 rounded-full text-blue-700"><RefreshCw size={16}/></div><div><p className="font-bold text-base mb-1">Bộ đếm STT hiện tại</p><p>Tiếp theo: <strong className="text-xl">{currentCounter + 1}</strong></p></div></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Đặt lại STT</label><input type="number" value={newCounter} onChange={(e) => setNewCounter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" min="0" /></div><hr className="my-4 border-gray-100" /><div><label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Cloud size={18} className="text-blue-500" /> Apps Script URL</label><div className="flex gap-2"><input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/..." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-xs font-mono" /><Button type="button" onClick={handleBackupToDrive} disabled={isBackingUp} className="bg-green-600 hover:bg-green-700 shrink-0 px-3">{isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <HardDriveUpload size={16} />}</Button></div></div><div className="pt-4"><Button type="submit" className="w-full justify-center"><Save size={18} /> Lưu Cấu hình</Button></div></form></div></div>
                )}

                {activeTab === 'database' && (
                  <div className="flex h-full">
                    <div className={`${selectedRecord ? 'w-1/3 hidden md:flex' : 'w-full flex'} flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
                       <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                         <div className="flex flex-col xl:flex-row gap-2 mb-2">
                           <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                              <input type="text" placeholder="Tìm Tên hoặc Mã BN..." className="w-full pl-10 pr-4 py-2 text-sm border-2 border-blue-200 rounded-lg outline-none focus:border-blue-500" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                           </div>
                           <select className="py-2 px-3 text-sm border-2 border-blue-200 rounded-lg outline-none bg-white cursor-pointer xl:w-48" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}>
                             <option value="all">Tất cả hồ sơ</option>
                             <option value="missing_time">⚠️ Thiếu TG Mất Vết</option>
                           </select>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {dataSource === 'local' && (
                               <Button variant="primary" onClick={handleSyncAll} disabled={isSyncingAll} className="!py-1.5 !px-3 text-xs bg-blue-600 hover:bg-blue-700 border-blue-600 flex-1 justify-center whitespace-nowrap">
                                {isSyncingAll ? <RefreshCw size={14} className="animate-spin" /> : <CloudLightning size={14} />} {isSyncingAll ? 'Đang gửi...' : 'Đẩy Local -> Cloud'}
                               </Button>
                           )}
                           <Button variant="primary" onClick={() => setShowExportModal(true)} className="!py-1.5 !px-3 text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-600 flex-1 justify-center whitespace-nowrap"><Download size={14} /> Xuất file CSV</Button>
                         </div>
                         {dataSource === 'local' && (
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleGenerateData} className="!py-1.5 !px-3 text-xs bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500 flex-1 justify-center"><Zap size={14} /> Fake Data</Button>
                                <Button variant="outline" onClick={handleClearAll} className="!py-1.5 !px-3 text-xs text-red-600 border-red-600 hover:bg-red-50 flex-1 justify-center"><Trash2 size={14} /> Xóa Local</Button>
                            </div>
                         )}
                       </div>

                       <div className="flex-1 overflow-y-auto">
                         {paginatedRecords.map(rec => (
                           <div key={rec.id} onClick={() => setSelectedRecord(rec)} className={`p-4 cursor-pointer hover:bg-blue-50 ${selectedRecord?.id === rec.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}>
                             <div className="flex justify-between items-start">
                               <span className="font-bold text-gray-800 text-sm">{rec.profile.fullName}</span>
                               <div className="flex items-center gap-2">
                                 <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{rec.profile.patientCode}</span>
                                 {dataSource === 'local' && <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(rec.id, rec.profile.fullName); }} className="text-gray-400 hover:text-red-500 p-1 rounded"><Trash2 size={14} /></button>}
                               </div>
                             </div>
                             <div className="text-xs text-gray-500 mt-1 flex justify-between">
                               <span>{new Date(rec.timestamp).toLocaleDateString('vi-VN')}</span>
                               {getRecordSummary(rec)}
                             </div>
                           </div>
                         ))}
                       </div>

                       {filteredRecords.length > 0 && (
                        <div className="p-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-2">
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">Hiển thị:</span>
                             <select value={recordsPerPage} onChange={(e) => { setRecordsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-xs border border-gray-300 rounded p-1 outline-none cursor-pointer">
                               <option value={5}>5 dòng</option><option value={10}>10 dòng</option><option value={20}>20 dòng</option><option value={50}>50 dòng</option>
                             </select>
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600"><ChevronLeft size={20}/></button>
                            <div className="flex flex-col items-center"><span className="text-xs font-bold text-gray-700">Trang {currentPage}/{totalPages}</span></div>
                            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 transition-colors text-gray-600"><ChevronRight size={20}/></button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`${selectedRecord ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 flex-col bg-gray-50 h-full overflow-hidden`}>
                      {selectedRecord && editingClinicalData ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm shrink-0">
                             <div className="flex items-center gap-3"><button onClick={() => setSelectedRecord(null)} className="md:hidden p-2 -ml-2 text-gray-600"><ArrowLeft size={20} /></button><div><h2 className="text-lg font-bold text-gray-800">{selectedRecord.profile.fullName}</h2></div></div>
                             <div className="flex gap-2"><Button onClick={handleSaveClinicalData} className="!py-1 !px-3 bg-blue-600"><Save size={14}/> Lưu</Button></div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {['pre', 'postImmediate', 'post10Min'].map((phaseKey: any) => {
                              const labels: any = { pre: '1. TRƯỚC (PRE)', postImmediate: '2. NGAY SAU (POST IMM)', post10Min: '3. SAU 10P (POST 10M)' };
                              return (
                                <div key={phaseKey} className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                                 <div className="flex justify-between items-center mb-3 border-b pb-1">
                                    <h6 className="font-bold text-blue-900">{labels[phaseKey]}</h6>
                                    <label className="cursor-pointer bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md text-xs font-bold border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-sm">
                                      <UploadCloud size={14} /> Tự động bằng CSV
                                      <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCSVUpload(e, phaseKey)} />
                                    </label>
                                 </div>
                                  <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500">File Ảnh:</label>
                                    <input type="text" className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 block w-full p-2" placeholder="Tên file..." value={(editingClinicalData as any)[phaseKey]?.file || ''} onChange={(e) => handleFileChange(phaseKey, e.target.value)} />
                                  </div>
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                     {[ { id: 'bl23_l', name: 'Thận Du (Trái)' }, { id: 'bl23_r', name: 'Thận Du (Phải)' }, { id: 'bl25_l', name: 'Đại Trường Du (Trái)' }, { id: 'bl25_r', name: 'Đại Trường Du (Phải)' } ].map(point => (
                                       <div key={point.id} className="border border-gray-200 p-2 rounded bg-gray-50">
                                         <div className="text-xs font-bold text-center mb-2 text-gray-700">{point.name}</div>
                                         <div className="grid grid-cols-2 gap-2 mb-2">
                                            <div><label className="text-[10px] text-green-700 font-bold">Green</label><input type="number" className="w-full p-1 text-sm border rounded" placeholder="G" value={(editingClinicalData as any)[phaseKey]?.[`green_${point.id}`] || ''} onChange={(e) => handleClinicalInputChange(phaseKey, point.id, 'green', e.target.value)} /></div>
                                            <div><label className="text-[10px] text-red-700 font-bold">Red</label><input type="number" className="w-full p-1 text-sm border rounded" placeholder="R" value={(editingClinicalData as any)[phaseKey]?.[`red_${point.id}`] || ''} onChange={(e) => handleClinicalInputChange(phaseKey, point.id, 'red', e.target.value)} /></div>
                                         </div>
                                         <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded border border-gray-200">
                                            <div className="text-center"><div className="text-[9px] text-gray-400">EI</div><div className="text-xs font-mono font-bold text-blue-600">{(editingClinicalData as any)[phaseKey]?.[`ei_${point.id}`] || '-'}</div></div>
                                            <div className="text-center"><div className="text-[9px] text-gray-400">MI</div><div className="text-xs font-mono font-bold text-purple-600">{(editingClinicalData as any)[phaseKey]?.[`mi_${point.id}`] || '-'}</div></div>
                                            <div className="text-center"><div className="text-[9px] text-gray-400">RI</div><div className="text-xs font-mono font-bold text-rose-600">{(editingClinicalData as any)[phaseKey]?.[`ri_${point.id}`] || '-'}</div></div>
                                         </div>
                                       </div>
                                     ))}
                                  </div>
                                </div>
                              );
                            })}

                            <div className="bg-white p-4 rounded border">
                               <label className="font-bold text-sm">Thời gian mất vết giác:</label>
                               <input type="text" className="w-full mt-1 p-2 border rounded" value={editingClinicalData.cuppingMarkTime || ''} onChange={(e) => setEditingClinicalData({...editingClinicalData, cuppingMarkTime: e.target.value})} />
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2"><Settings size={16} className="text-blue-500"/> Kết quả AS Score</h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                                {selectedRecord.asScores && Object.entries(selectedRecord.asScores).map(([key, val]) => {
                                   const mapName: any = { binhHoa: 'Bình Hòa', duongHu: 'Dương Hư', amHu: 'Âm Hư', khiHu: 'Khí Hư', damThap: 'Đàm Thấp', thapNhiet: 'Thấp Nhiệt', huyetU: 'Huyết Ứ', khiTre: 'Khí Trệ', dacBiet: 'Đặc Biệt' };
                                   return (
                                     <div key={key} className="flex justify-between items-center p-2 rounded bg-gray-50"><span className="text-gray-600">{mapName[key]}</span><span className={`font-bold ${key !== 'binhHoa' && (val as number) >= 30 ? 'text-red-600' : 'text-gray-800'}`}>{val}</span></div>
                                   );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Chọn hồ sơ để nhập liệu</div>
                      )}
                    </div>
                  </div>
                )}
                {notification && <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl text-white z-[60] ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{notification.message}</div>}
                {showExportModal && (
                  <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><Download className="text-emerald-600" /> Tùy chọn xuất CSV</h3>
                      <div className="space-y-3 mb-6">
                        {[ { key: 'personalInfo', label: '1. Thông tin cá nhân' }, { key: 'clinicalIndices', label: '2. Thông số lâm sàng & Mất vết' }, { key: 'redGreenDetails', label: '3. Chi tiết màu (Red, Green)' }, { key: 'surveyDetails', label: '4. Chi tiết 60 câu khảo sát' } ].map(item => (
                          <label key={item.key} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-emerald-50 cursor-pointer transition-all shadow-sm">
                            <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" checked={(exportOptions as any)[item.key]} onChange={(e) => setExportOptions({...exportOptions, [item.key]: e.target.checked})} />
                            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setShowExportModal(false)}>Hủy</Button><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { generateCustomCSV(records, exportOptions); setShowExportModal(false); }}><Download size={16} /> Tải CSV</Button></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
