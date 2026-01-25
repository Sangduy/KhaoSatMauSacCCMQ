import React, { useState, useEffect } from 'react';
import { Settings, Lock, Save, Database, Trash2, Download, RefreshCw, X, Cloud, FileText, ArrowLeft, Search, UploadCloud, CheckCircle, AlertCircle, CloudLightning, Zap, Globe, HardDriveUpload } from 'lucide-react';
import { 
  getCurrentSequenceCounter, setSequenceCounter, getRecords, deleteRecord, clearAllRecords,
  exportToCSVs, exportAllRecordsToCSV, getGoogleScriptUrl, setGoogleScriptUrl, generateTestData,
  syncRecordToCloud, backupDataToCloud, saveRecord, fetchRecordsFromCloud
} from '../services/storageService';
import { calculateASScores, getHighestScores } from '../services/scoreService';
// Import Service tính toán
import { calculateClinicalIndices } from '../services/indicesService'; 
import { Button } from './Button';
import { SurveyRecord, ClinicalData } from '../types';
import { CCMQ_QUESTIONS, ANSWER_OPTIONS } from '../constants';

const RECORDS_PER_PAGE = 10;

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
  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(null);
  const [editingClinicalData, setEditingClinicalData] = useState<ClinicalData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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

  useEffect(() => {
    setSyncStatus('idle');
    if (selectedRecord) {
      setEditingClinicalData(JSON.parse(JSON.stringify(selectedRecord.clinicalData)));
    } else {
      setEditingClinicalData(null);
    }
  }, [selectedRecord]);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password === 'admin123') { setIsAuthenticated(true); setPassword(''); } else { alert('Mật khẩu không đúng!'); } };
  const handleUpdateSettings = (e: React.FormEvent) => { e.preventDefault(); const val = parseInt(newCounter, 10); if (!isNaN(val) && val >= 0) { setSequenceCounter(val); setCurrentCounter(val); } setGoogleScriptUrl(scriptUrl.trim()); showNotification('Đã lưu cấu hình hệ thống thành công!'); };
  
  const handleBackupToDrive = async () => {
    const url = getGoogleScriptUrl();
    if (!url || getRecords().length === 0) return alert("Kiểm tra URL hoặc dữ liệu trống!");
    if (!confirm("Backup CSV lên Drive?")) return;
    setIsBackingUp(true);
    const result = await backupDataToCloud(url);
    setIsBackingUp(false);
    result.success ? showNotification("Backup thành công!", 'success') : showNotification(`Lỗi: ${result.message}`, 'error');
  };

  const handleDeleteRecord = (id: string, name: string) => { if(dataSource === 'cloud') return alert("Vui lòng xóa trên Sheet!"); if (confirm(`Xóa ${name}?`)) { deleteRecord(id); refreshData(); if (selectedRecord?.id === id) setSelectedRecord(null); showNotification(`Đã xóa ${name}`); } };
  const handleClearAll = () => { if(dataSource==='cloud') return; if (prompt("Nhập 'XOA' để xóa toàn bộ Local DB:") === 'XOA') { clearAllRecords(); refreshData(); showNotification('Đã xóa sạch DB!', 'success'); } };
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
    if (result.success) { setSyncStatus('success'); setTimeout(refreshData, 1000); showNotification('Đồng bộ thành công!'); } 
    else { setSyncStatus('error'); showNotification(`Lỗi: ${result.message}`, 'error'); }
  };

  const handleSyncAll = async () => { 
      const url = getGoogleScriptUrl();
      if (!url || !confirm(`Đồng bộ ${records.length} hồ sơ?`)) return;
      setIsSyncingAll(true);
      for (const rec of records) { await syncRecordToCloud(rec, url); await new Promise(r => setTimeout(r, 300)); }
      setIsSyncingAll(false);
      showNotification('Đồng bộ hoàn tất!', 'success');
  };

  const handleSaveClinicalData = async () => {
    if (selectedRecord && editingClinicalData) {
      const updatedRecord = { ...selectedRecord, clinicalData: editingClinicalData };
      if (dataSource === 'local') {
          saveRecord(updatedRecord.profile, updatedRecord.surveyData, editingClinicalData, updatedRecord.asScores);
          refreshData();
          showNotification("Đã lưu Local!");
      } else {
          if(confirm("Lưu trực tiếp lên Cloud?")) handleSyncToCloud();
      }
    }
  };

  // --- HÀM XỬ LÝ NHẬP LIỆU VÀ TỰ ĐỘNG TÍNH TOÁN ---
  const handleClinicalInputChange = (
    phase: 'pre' | 'postImmediate' | 'post10Min', 
    point: string, 
    type: 'green' | 'red', 
    value: string
  ) => {
    if (!editingClinicalData) return;

    setEditingClinicalData(prev => {
      if (!prev) return null;
      
      const currentPhase = prev[phase];
      // Cập nhật giá trị mới
      const newPhaseData = { ...currentPhase, [`${type}_${point}`]: value };

      // Lấy cặp giá trị Red/Green để tính toán
      // Dùng as any để tránh lỗi TypeScript index
      const greenVal = type === 'green' ? value : (newPhaseData as any)[`green_${point}`];
      const redVal = type === 'red' ? value : (newPhaseData as any)[`red_${point}`];

      // GỌI HÀM TỪ SERVICE
      const { ei, mi } = calculateClinicalIndices(redVal, greenVal);

      // Cập nhật EI và MI vào state
      (newPhaseData as any)[`ei_${point}`] = ei;
      (newPhaseData as any)[`mi_${point}`] = mi;

      return {
        ...prev,
        [phase]: newPhaseData
      };
    });
  };

  const handleFileChange = (phase: string, val: string) => {
      if (editingClinicalData) setEditingClinicalData({...editingClinicalData, [phase]: {...(editingClinicalData as any)[phase], file: val}});
  };

  const filteredRecords = records.filter(r => r.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || r.profile.patientCode.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);
  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };
  const inputClasses = "w-full px-4 py-2 border border-gray-400 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const clinicalInputClasses = "bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2";

  if (!isOpen) return <button onClick={handleOpen} className="fixed bottom-4 left-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-200 transition-colors z-40"><Settings size={20} /></button>;

  // RENDER UI
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${isAuthenticated ? 'max-w-6xl h-[90vh]' : 'max-w-md'} flex flex-col overflow-hidden transition-all duration-300 relative`}>
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <h3 className="font-semibold flex items-center gap-2 text-lg"><Settings size={20} className="text-blue-400" /> Quản trị hệ thống</h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-hidden p-0 bg-gray-50 flex flex-col relative">
          {!isAuthenticated ? (
             <div className="p-8 flex-1 flex items-center"><form onSubmit={handleLogin} className="space-y-6 w-full"><div className="text-center mb-6"><div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><Lock className="text-blue-600" size={32} /></div><h2 className="text-xl font-bold text-gray-800">Đăng nhập Quản trị</h2></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label><div className="relative"><Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập mật khẩu..." autoFocus /></div></div><Button type="submit" className="w-full py-3 text-base">Truy cập</Button></form></div>
          ) : (
            <div className="flex flex-col h-full relative">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-white shrink-0 items-center justify-between pr-4">
                 <div className="flex">
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Settings size={18} /> Cấu hình</button>
                    <button onClick={() => { setActiveTab('database'); refreshData(); }} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${activeTab === 'database' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}><Database size={18} /> Dữ liệu ({records.length})</button>
                 </div>
                 {activeTab === 'database' && (<div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200"><button onClick={() => setDataSource('local')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${dataSource === 'local' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><Database size={14} /> Local</button><button onClick={() => setDataSource('cloud')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${dataSource === 'cloud' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Cloud size={14} /> Cloud</button></div>)}
              </div>

              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && ( 
                  <div className="h-full overflow-y-auto p-8"><div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200"><h4 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Cài đặt Hệ thống</h4><form onSubmit={handleUpdateSettings} className="space-y-6"><div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm border border-blue-100 flex items-start gap-3"><div className="bg-blue-200 p-2 rounded-full text-blue-700"><RefreshCw size={16}/></div><div><p className="font-bold text-base mb-1">Bộ đếm STT hiện tại</p><p>Tiếp theo: <strong className="text-xl">{currentCounter + 1}</strong></p></div></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Đặt lại STT</label><input type="number" value={newCounter} onChange={(e) => setNewCounter(e.target.value)} className={inputClasses} min="0" /></div><hr className="my-4 border-gray-100" /><div><label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Cloud size={18} className="text-blue-500" /> Apps Script URL</label><div className="flex gap-2"><input type="text" value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/..." className={`${inputClasses} text-sm font-mono text-gray-600 flex-1`} /><Button type="button" onClick={handleBackupToDrive} disabled={isBackingUp} className="bg-green-600 hover:bg-green-700 shrink-0 text-xs px-3">{isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <HardDriveUpload size={16} />}</Button></div></div><div className="pt-4"><Button type="submit" className="w-full justify-center"><Save size={18} /> Lưu Cấu hình</Button></div></form></div></div>
                )}

                {activeTab === 'database' && (
                  <div className="flex h-full">
                    {/* LEFT COLUMN: LIST VIEW */}
                    <div className={`${selectedRecord ? 'w-1/3 hidden md:flex' : 'w-full flex'} flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
                       {/* Toolbar (Đã khôi phục đầy đủ các nút) */}
                       <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" placeholder="Tra cứu..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} autoFocus />
                         </div>
                         
                         <div className="flex flex-wrap gap-2">
                           {/* Sync All Button - Only available in Local Mode */}
                           {dataSource === 'local' && (
                               <Button 
                                  variant="primary" 
                                  onClick={handleSyncAll} 
                                  disabled={isSyncingAll}
                                  className="!py-1.5 !px-3 text-xs bg-blue-600 hover:bg-blue-700 border-blue-600 flex-1 justify-center whitespace-nowrap"
                               >
                                {isSyncingAll ? <RefreshCw size={14} className="animate-spin" /> : <CloudLightning size={14} />} 
                                {isSyncingAll ? 'Đang gửi...' : 'Đẩy Local -> Cloud'}
                               </Button>
                           )}
                           
                           {/* Export Button */}
                           <Button variant="primary" onClick={exportAllRecordsToCSV} className="!py-1.5 !px-3 text-xs bg-green-600 hover:bg-green-700 border-green-600 flex-1 justify-center whitespace-nowrap">
                              <Download size={14} /> Tải CSV Tổng
                            </Button>
                         </div>
                         
                         {/* Local Actions: Fake Data, Clear All */}
                         {dataSource === 'local' ? (
                            <div className="flex gap-2">
                                {/* Nút Fake Data (Đã khôi phục) */}
                                <Button variant="secondary" onClick={handleGenerateData} className="!py-1.5 !px-3 text-xs bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500 flex-1 justify-center">
                                    <Zap size={14} /> Fake Data
                                </Button>
                                {/* Nút Xóa Local (Đã khôi phục) */}
                                <Button variant="outline" onClick={handleClearAll} className="!py-1.5 !px-3 text-xs text-red-600 border-red-600 hover:bg-red-50 flex-1 justify-center">
                                    <Trash2 size={14} /> Xóa Local
                                </Button>
                            </div>
                         ) : (
                             /* Cloud Actions */
                             <div className="flex gap-2">
                                <Button variant="secondary" onClick={refreshData} className="!py-1.5 !px-3 text-xs bg-blue-500 text-white hover:bg-blue-600 border-blue-500 flex-1 justify-center">
                                    {isLoadingCloud ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />} 
                                    {isLoadingCloud ? 'Đang tải...' : 'Làm mới dữ liệu Cloud'}
                                </Button>
                             </div>
                         )}
                       </div>

                       <div className="flex-1 overflow-y-auto">{paginatedRecords.map(rec => (<div key={rec.id} onClick={() => setSelectedRecord(rec)} className={`p-4 cursor-pointer hover:bg-blue-50 ${selectedRecord?.id === rec.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}><div className="flex justify-between items-start"><span className="font-bold text-gray-800 text-sm">{rec.profile.fullName}</span><span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{rec.profile.patientCode}</span></div><div className="text-xs text-gray-500 mt-1">{new Date(rec.timestamp).toLocaleDateString('vi-VN')}</div></div>))}</div>
                    </div>

                    {/* RIGHT COLUMN: DETAIL VIEW & INPUT */}
                    <div className={`${selectedRecord ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 flex-col bg-gray-50 h-full overflow-hidden`}>
                      {selectedRecord && editingClinicalData ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm shrink-0">
                             <div className="flex items-center gap-3"><button onClick={() => setSelectedRecord(null)} className="md:hidden p-2 -ml-2 text-gray-600"><ArrowLeft size={20} /></button><div><h2 className="text-lg font-bold text-gray-800">{selectedRecord.profile.fullName}</h2></div></div>
                             <div className="flex gap-2"><Button onClick={handleSaveClinicalData} className="!py-1 !px-3 bg-blue-600"><Save size={14}/> Lưu</Button></div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Vòng lặp 3 thời điểm */}
                            {[
                              { key: 'pre', label: '1. TRƯỚC (PRE)' },
                              { key: 'postImmediate', label: '2. NGAY SAU (POST IMM)' },
                              { key: 'post10Min', label: '3. SAU 10P (POST 10M)' }
                            ].map((phase: any) => (
                              <div key={phase.key} className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                                <h6 className="font-bold text-blue-900 mb-3 border-b pb-1">{phase.label}</h6>
                                
                                <div className="mb-4">
                                  <label className="text-xs font-bold text-gray-500">File Ảnh:</label>
                                  <input type="text" className={clinicalInputClasses} placeholder="Tên file..." 
                                    value={(editingClinicalData as any)[phase.key].file} 
                                    onChange={(e) => handleFileChange(phase.key, e.target.value)} />
                                </div>

                                {/* Grid 4 huyệt */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                   {[
                                     { id: 'bl23_l', name: 'Thận Du (Trái)' },
                                     { id: 'bl23_r', name: 'Thận Du (Phải)' },
                                     { id: 'bl25_l', name: 'Đại Trường Du (Trái)' },
                                     { id: 'bl25_r', name: 'Đại Trường Du (Phải)' },
                                   ].map(point => (
                                     <div key={point.id} className="border border-gray-200 p-2 rounded bg-gray-50">
                                       <div className="text-xs font-bold text-center mb-2 text-gray-700">{point.name}</div>
                                       <div className="grid grid-cols-2 gap-2 mb-2">
                                          <div>
                                            <label className="text-[10px] text-green-700 font-bold">Green</label>
                                            <input type="number" className="w-full p-1 text-sm border rounded" placeholder="G"
                                              value={(editingClinicalData as any)[phase.key][`green_${point.id}`]}
                                              onChange={(e) => handleClinicalInputChange(phase.key as any, point.id, 'green', e.target.value)}
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-red-700 font-bold">Red</label>
                                            <input type="number" className="w-full p-1 text-sm border rounded" placeholder="R"
                                              value={(editingClinicalData as any)[phase.key][`red_${point.id}`]}
                                              onChange={(e) => handleClinicalInputChange(phase.key as any, point.id, 'red', e.target.value)}
                                            />
                                          </div>
                                       </div>
                                       {/* Hiển thị kết quả tính toán */}
                                       <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded border border-gray-200">
                                          <div className="text-center">
                                            <div className="text-[9px] text-gray-400">EI</div>
                                            <div className="text-xs font-mono font-bold text-blue-600">
                                              {(editingClinicalData as any)[phase.key][`ei_${point.id}`] || '-'}
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-[9px] text-gray-400">MI</div>
                                            <div className="text-xs font-mono font-bold text-purple-600">
                                              {(editingClinicalData as any)[phase.key][`mi_${point.id}`] || '-'}
                                            </div>
                                          </div>
                                       </div>
                                     </div>
                                   ))}
                                </div>
                              </div>
                            ))}

                            <div className="bg-white p-4 rounded border">
                               <label className="font-bold text-sm">Thời gian mất vết giác:</label>
                               <input type="text" className="w-full mt-1 p-2 border rounded" 
                                  value={editingClinicalData.cuppingMarkTime}
                                  onChange={(e) => setEditingClinicalData({...editingClinicalData, cuppingMarkTime: e.target.value})} />
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
