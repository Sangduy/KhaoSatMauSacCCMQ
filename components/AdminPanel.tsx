import React, { useState, useEffect } from 'react';
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
        if (!url) { setDataSource('local'); return; }
        setIsLoadingCloud(true);
        const result = await fetchRecordsFromCloud(url);
        setIsLoadingCloud(false);
        if (result.success && result.data) {
            setRecords(result.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } else {
            setDataSource('local');
        }
    }
    setSelectedRecord(null);
    setCurrentPage(1);
  };

  useEffect(() => { if (isOpen && isAuthenticated) refreshData(); }, [dataSource]);

  // --- THAY ĐỔI QUAN TRỌNG: CHỈ NẠP DỮ LIỆU GỐC, KHÔNG CÓ CACHE ---
  useEffect(() => {
    setSyncStatus('idle');
    if (selectedRecord) {
      // Chỉ đơn giản là copy dữ liệu từ hồ sơ gốc vào ô nhập liệu
      setEditingClinicalData(JSON.parse(JSON.stringify(selectedRecord.clinicalData || {})));
    } else {
      setEditingClinicalData(null);
    }
  }, [selectedRecord?.id]); 

  // (ĐÃ XÓA useEffect TỰ ĐỘNG LƯU NHÁP Ở ĐÂY)

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) { 
      setIsAuthenticated(true); 
      setPassword(''); 
      sessionStorage.setItem('isAdmin', 'true'); 
    } else { alert('Mật khẩu không đúng!'); } 
  };

  const handleUpdateSettings = (e: React.FormEvent) => { e.preventDefault(); const val = parseInt(newCounter, 10); if (!isNaN(val)) setSequenceCounter(val); setGoogleScriptUrl(scriptUrl.trim()); showNotification('Đã lưu cấu hình!'); refreshData(); };
  
  const handleBackupToDrive = async () => {
    const url = getGoogleScriptUrl();
    if (!url || records.length === 0) return alert("Kiểm tra URL hoặc dữ liệu!");
    setIsBackingUp(true);
    const result = await backupDataToCloud(url);
    setIsBackingUp(false);
    result.success ? showNotification("Backup thành công!") : showNotification(`Lỗi: ${result.message}`, 'error');
  };

  const handleDeleteRecord = (id: string, name: string) => { if(dataSource === 'cloud') return alert("Xóa trên Sheet!"); if (confirm(`Xóa ${name}?`)) { deleteRecord(id); refreshData(); } };
  const handleClearAll = () => { if (prompt("Nhập 'XOA' để xóa:") === 'XOA') { clearAllRecords(); refreshData(); } };

  const handleSyncToCloud = async () => {
    if (!selectedRecord || !editingClinicalData) return;
    const url = getGoogleScriptUrl();
    setSyncStatus('syncing');
    const recordToSync = { ...selectedRecord, clinicalData: editingClinicalData };
    if (!recordToSync.asScores) recordToSync.asScores = calculateASScores(recordToSync.surveyData);
    
    // Lưu Local trước khi đẩy Cloud
    saveRecord(recordToSync.profile, recordToSync.surveyData, editingClinicalData, recordToSync.asScores);
    
    const result = await syncRecordToCloud(recordToSync, url);
    if (result.success) { 
      setSyncStatus('success'); 
      showNotification('Đồng bộ thành công!'); 
      refreshData();
    } else { 
      setSyncStatus('error'); 
      showNotification(`Lỗi: ${result.message}`, 'error'); 
    }
  };

  const handleSaveClinicalData = async () => {
    if (selectedRecord && editingClinicalData) {
      saveRecord(selectedRecord.profile, selectedRecord.surveyData, editingClinicalData, selectedRecord.asScores);
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

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, phase: 'pre' | 'postImmediate' | 'post10Min') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const header = lines[0].split(',').map(h => h.trim().replace(/["']/g, ""));
      const labelIdx = header.indexOf('Label');
      const meanIdx = header.indexOf('Mean');
      const reds: number[] = []; const greens: number[] = [];
      lines.slice(1).forEach(line => {
        const c = line.split(',');
        const label = c[labelIdx]?.replace(/["']/g, "");
        const mean = parseFloat(c[meanIdx]);
        if (label === 'Red') reds.push(mean);
        if (label === 'Green') greens.push(mean);
      });
      if (reds.length >= 4 && greens.length >= 4) {
        setEditingClinicalData(prev => {
          if (!prev) return null;
          const newPhase = { ...(prev[phase] || {}) };
          ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].forEach((pt, i) => {
            const r = reds[i].toFixed(3); const g = greens[i].toFixed(3);
            (newPhase as any)[`red_${pt}`] = r; (newPhase as any)[`green_${pt}`] = g;
            const { ei, mi, ri } = calculateClinicalIndices(r, g);
            (newPhase as any)[`ei_${pt}`] = ei; (newPhase as any)[`mi_${pt}`] = mi; (newPhase as any)[`ri_${pt}`] = ri;
          });
          return { ...prev, [phase]: newPhase };
        });
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
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  if (!isOpen) return <button onClick={handleOpen} className="fixed bottom-4 left-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-200 z-40"><Settings size={20} /></button>;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${isAuthenticated ? 'max-w-6xl h-[90vh]' : 'max-w-md'} flex flex-col overflow-hidden`}>
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-semibold flex items-center gap-2"><Settings size={20} className="text-blue-400" /> Quản trị hệ thống</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-hidden p-0 bg-gray-50 flex flex-col relative">
          {!isAuthenticated ? (
             <div className="p-8 flex-1 flex items-center">
               <form onSubmit={handleLogin} className="space-y-6 w-full">
                 <h2 className="text-xl font-bold text-center">Đăng nhập Quản trị</h2>
                 <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Nhập mật khẩu..." autoFocus />
                 <Button type="submit" className="w-full py-3">Truy cập</Button>
               </form>
             </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b bg-white shrink-0 items-center justify-between pr-4">
                 <div className="flex">
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-4 text-sm font-medium ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Cấu hình</button>
                    <button onClick={() => { setActiveTab('database'); refreshData(); }} className={`px-6 py-4 text-sm font-medium ${activeTab === 'database' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>Dữ liệu</button>
                 </div>
                 {activeTab === 'database' && (
                    <div className="flex bg-gray-100 rounded-lg p-1 border">
                      <button onClick={() => setDataSource('local')} className={`px-3 py-1 text-xs font-bold rounded ${dataSource === 'local' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Local</button>
                      <button onClick={() => setDataSource('cloud')} className={`px-3 py-1 text-xs font-bold rounded ${dataSource === 'cloud' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Cloud</button>
                    </div>
                 )}
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'settings' && ( 
                  <div className="h-full overflow-y-auto p-8 max-w-xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-xl border">
                      <h4 className="font-bold mb-4">Cài đặt hệ thống</h4>
                      <form onSubmit={handleUpdateSettings} className="space-y-4">
                        <div><label className="text-xs font-bold">Số STT tiếp theo</label><input type="number" value={newCounter} onChange={(e) => setNewCounter(e.target.value)} className="w-full p-2 border rounded" /></div>
                        <div><label className="text-xs font-bold">Google Script URL</label><input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} className="w-full p-2 border rounded font-mono text-xs" /></div>
                        <Button type="submit" className="w-full">Lưu cấu hình</Button>
                      </form>
                      <Button onClick={handleBackupToDrive} disabled={isBackingUp} className="w-full mt-4 bg-green-600">{isBackingUp ? "Đang backup..." : "Backup CSV lên Drive"}</Button>
                    </div>
                  </div>
                )}

                {activeTab === 'database' && (
                  <div className="flex h-full">
                    {/* Sidebar */}
                    <div className={`${selectedRecord ? 'w-1/3 hidden md:flex' : 'w-full flex'} flex-col border-r bg-white`}>
                       <div className="p-4 bg-gray-50 border-b space-y-2">
                         <div className="flex gap-2">
                            <input type="text" placeholder="Tìm tên/mã..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="flex-1 p-2 text-sm border rounded" />
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="text-xs border rounded px-1">
                              <option value="all">Tất cả</option><option value="missing_time">Thiếu TG</option>
                            </select>
                         </div>
                         <Button onClick={() => setShowExportModal(true)} className="w-full bg-emerald-600 text-xs py-1.5">Xuất CSV</Button>
                       </div>
                       <div className="flex-1 overflow-y-auto">
                         {paginatedRecords.map(rec => (
                           <div key={rec.id} onClick={() => setSelectedRecord(rec)} className={`p-3 border-b cursor-pointer hover:bg-blue-50 ${selectedRecord?.id === rec.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                             <div className="flex justify-between font-bold text-sm"><span>{rec.profile?.fullName}</span><span className="text-gray-400 font-mono text-xs">{rec.profile?.patientCode}</span></div>
                             <div className="text-[10px] text-gray-500 mt-1">{new Date(rec.timestamp).toLocaleDateString('vi-VN')}</div>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Chi tiết */}
                    <div className={`${selectedRecord ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white overflow-hidden`}>
                      {selectedRecord && editingClinicalData ? (
                        <>
                          <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm shrink-0">
                            <div className="flex items-center gap-2"><button onClick={() => setSelectedRecord(null)} className="md:hidden"><ArrowLeft size={20}/></button><h2 className="font-bold">{selectedRecord.profile?.fullName}</h2></div>
                            <div className="flex gap-2">
                              <Button onClick={handleSaveClinicalData} className="bg-blue-600 text-xs px-3 py-1.5">Lưu Local</Button>
                              <Button onClick={handleSyncToCloud} className="bg-orange-500 text-xs px-3 py-1.5">Lưu Cloud</Button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50">
                            {['pre', 'postImmediate', 'post10Min'].map((k) => {
                              const labels: any = { pre: '1. TRƯỚC (PRE)', postImmediate: '2. NGAY SAU (POST IMM)', post10Min: '3. SAU 10P (POST 10M)' };
                              return (
                                <div key={k} className="bg-white p-4 rounded-xl border shadow-sm">
                                  <div className="flex justify-between border-b pb-2 mb-3 items-center">
                                    <h6 className="font-bold text-blue-900 text-xs">{labels[k]}</h6>
                                    <label className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-1 rounded cursor-pointer">CSV ImageJ <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCSVUpload(e, k as any)} /></label>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                     {['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].map(pt => (
                                       <div key={pt} className="p-2 bg-gray-50 rounded border">
                                          <p className="text-[9px] font-bold text-gray-500 mb-1 text-center">{pt.toUpperCase()}</p>
                                          <div className="flex gap-2">
                                            <input type="number" placeholder="G" value={(editingClinicalData as any)[k]?.[`green_${pt}`] || ''} onChange={(e) => handleClinicalInputChange(k as any, pt, 'green', e.target.value)} className="w-full text-xs p-1 border rounded" />
                                            <input type="number" placeholder="R" value={(editingClinicalData as any)[k]?.[`red_${pt}`] || ''} onChange={(e) => handleClinicalInputChange(k as any, pt, 'red', e.target.value)} className="w-full text-xs p-1 border rounded" />
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="bg-white p-4 rounded-xl border shadow-sm">
                               <label className="font-bold text-sm">Thời gian mất vết giác:</label>
                               <input type="text" className="w-full mt-2 p-2 border rounded" value={editingClinicalData.cuppingMarkTime || ''} onChange={(e) => setEditingClinicalData({...editingClinicalData, cuppingMarkTime: e.target.value})} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 italic">Chọn hồ sơ để nhập liệu</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold mb-4 text-center border-b pb-2">Xuất dữ liệu CSV</h3>
            <div className="space-y-2 mb-6">
              {[{k: 'personalInfo', l: 'Thông tin cá nhân'}, {k: 'clinicalIndices', l: 'Lâm sàng'}, {k: 'redGreenDetails', l: 'Red/Green'}, {k: 'surveyDetails', l: '60 Câu hỏi'}].map(opt => (
                <label key={opt.k} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={(exportOptions as any)[opt.k]} onChange={(e) => setExportOptions({...exportOptions, [opt.k]: e.target.checked})} />
                  <span className="text-xs">{opt.l}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowExportModal(false)} variant="outline" className="flex-1">Hủy</Button>
              <Button onClick={() => { generateCustomCSV(records, exportOptions); setShowExportModal(false); }} className="flex-1 bg-emerald-600">Tải về</Button>
            </div>
          </div>
        </div>
      )}
      {notification && <div className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-xl text-white z-[110] ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{notification.message}</div>}
    </div>
  );
};
