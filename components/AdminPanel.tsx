import React, { useState, useEffect } from 'react';
import { Settings, Lock, Save, Database, Trash2, Download, RefreshCw, X, Cloud, FileCheck, ChevronLeft, ChevronRight, Zap, Eye, ArrowLeft, Search, UploadCloud, CheckCircle, AlertCircle, CloudLightning, FileText, Info, HardDriveUpload, Globe } from 'lucide-react';
import { 
  getCurrentSequenceCounter, 
  setSequenceCounter, 
  getRecords, 
  deleteRecord, 
  clearAllRecords,
  exportToCSVs,
  exportAllRecordsToCSV,
  exportConsentsToCSV,
  getGoogleScriptUrl,
  setGoogleScriptUrl,
  generateTestData,
  syncRecordToCloud,
  backupDataToCloud,
  saveRecord,
  fetchRecordsFromCloud // New Function
} from '../services/storageService';
import { calculateASScores, getHighestScores } from '../services/scoreService';
import { Button } from './Button';
import { SurveyRecord, ClinicalData } from '../types';
import { CCMQ_QUESTIONS, ANSWER_OPTIONS } from '../constants';

const RECORDS_PER_PAGE = 10;

export const AdminPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'database'>('settings');
  
  // Data Source Mode: 'local' (LocalStorage) or 'cloud' (Google Sheet)
  const [dataSource, setDataSource] = useState<'local' | 'cloud'>('local');

  // Settings State
  const [currentCounter, setCurrentCounter] = useState(0);
  const [newCounter, setNewCounter] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Database State
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(null);

  // Edit Clinical Data State
  const [editingClinicalData, setEditingClinicalData] = useState<ClinicalData | null>(null);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false); // Loading state for Fetching

  // Notification State
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    refreshData();
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
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
        // Cloud Mode: Fetch from GAS
        if (!url) {
            showNotification("Chưa cấu hình Google Script URL!", 'error');
            setDataSource('local');
            return;
        }
        setIsLoadingCloud(true);
        const result = await fetchRecordsFromCloud(url);
        setIsLoadingCloud(false);
        
        if (result.success && result.data) {
            // Sort by timestamp descending
            const sorted = result.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setRecords(sorted);
        } else {
            showNotification(`Lỗi tải dữ liệu Cloud: ${result.message}`, 'error');
            setDataSource('local'); // Revert on error
        }
    }
    
    // Reset selection and paging
    setSelectedRecord(null);
    setCurrentPage(1);
  };

  // Switch Data Source Effect
  useEffect(() => {
      if (isOpen && isAuthenticated) {
          refreshData();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  // Khi chọn 1 record, load data lâm sàng của nó vào state để edit
  useEffect(() => {
    setSyncStatus('idle');
    if (selectedRecord) {
      // Clone để tránh mutate trực tiếp
      setEditingClinicalData(JSON.parse(JSON.stringify(selectedRecord.clinicalData)));
    } else {
      setEditingClinicalData(null);
    }
  }, [selectedRecord]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Mật khẩu không đúng!');
    }
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newCounter, 10);
    if (!isNaN(val) && val >= 0) {
      setSequenceCounter(val);
      setCurrentCounter(val);
    }
    setGoogleScriptUrl(scriptUrl.trim());
    showNotification('Đã lưu cấu hình hệ thống thành công!');
  };

  // Handle Backup (Upload CSV to Drive)
  const handleBackupToDrive = async () => {
    const url = getGoogleScriptUrl();
    if (!url) {
      alert("Chưa cấu hình Google Script URL!");
      return;
    }
    
    if (getRecords().length === 0) {
      alert("Chưa có dữ liệu để sao lưu!");
      return;
    }

    if (!confirm("Bạn có chắc muốn tải lên file CSV chứa toàn bộ dữ liệu lên Google Drive không?")) {
      return;
    }

    setIsBackingUp(true);
    const result = await backupDataToCloud(url);
    setIsBackingUp(false);

    if (result.success) {
      showNotification("Đã sao lưu file CSV lên Drive thành công!", 'success');
    } else {
      showNotification(`Lỗi sao lưu: ${result.message}`, 'error');
    }
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (dataSource === 'cloud') {
        alert("Hiện tại chưa hỗ trợ xóa trực tiếp trên Cloud từ App. Vui lòng vào Google Sheet để xóa dòng tương ứng.");
        return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa dữ liệu của bệnh nhân: ${name}?`)) {
      deleteRecord(id);
      refreshData();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      showNotification(`Đã xóa hồ sơ của ${name}`);
    }
  };

  const handleClearAll = () => {
    if (dataSource === 'cloud') return;
    const confirmText = prompt("Hành động này sẽ XÓA TOÀN BỘ dữ liệu trên MÁY NÀY. Nhập 'XOA' để xác nhận:");
    if (confirmText === 'XOA') {
      clearAllRecords();
      setCurrentPage(1);
      setSelectedRecord(null);
      refreshData();
      showNotification('Đã xóa toàn bộ cơ sở dữ liệu local!', 'success');
    }
  };

  const handleGenerateData = () => {
    if (confirm("Thao tác này sẽ XÓA dữ liệu hiện tại và TẠO MỚI 10 hồ sơ giả lập để test. Bạn có chắc chắn không?")) {
        generateTestData();
        refreshData();
        setSelectedRecord(null);
        showNotification("Đã tạo 10 hồ sơ mẫu thành công!");
    }
  };

  // Sync single record (Also used for Updating Cloud Record)
  const handleSyncToCloud = async () => {
    if (!selectedRecord) return;
    const url = getGoogleScriptUrl();
    if (!url) {
      alert("Chưa cấu hình Google Script URL trong tab Cấu hình.");
      return;
    }

    setSyncStatus('syncing');

    // Ưu tiên dùng dữ liệu đang edit (nếu có)
    const currentClinicalData = editingClinicalData || selectedRecord.clinicalData;

    const recordToSync = { 
      ...selectedRecord, 
      clinicalData: currentClinicalData 
    };
    
    if (!recordToSync.asScores) {
      recordToSync.asScores = calculateASScores(recordToSync.surveyData);
    }

    // Nếu đang ở local mode, lưu local để backup
    if (dataSource === 'local') {
        saveRecord(recordToSync.profile, recordToSync.surveyData, currentClinicalData, recordToSync.asScores);
    }

    // Send to Cloud (Script handles both Insert and Update based on ID)
    const result = await syncRecordToCloud(recordToSync, url);

    if (result.success) {
      setSyncStatus('success');
      // Nếu đang ở cloud mode, refresh lại để thấy data mới nhất
      if (dataSource === 'cloud') {
          // Delay xíu để sheet kịp update
          setTimeout(refreshData, 1000); 
      } else {
          refreshData();
      }
      showNotification('Cập nhật lên Google Sheets thành công!');
    } else {
      setSyncStatus('error');
      showNotification(`Lỗi đồng bộ: ${result.message}`, 'error');
    }
  };

  // Sync ALL records
  const handleSyncAll = async () => {
    const url = getGoogleScriptUrl();
    if (!url) {
      alert("Chưa cấu hình Google Script URL trong tab Cấu hình.");
      return;
    }

    if (!confirm(`Bạn có chắc muốn đồng bộ ${records.length} hồ sơ lên Cloud? Việc này có thể mất vài phút.`)) {
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const rec of records) {
      const recordToSync = { ...rec };
      if (!recordToSync.asScores) {
        recordToSync.asScores = calculateASScores(recordToSync.surveyData);
      }

      const result = await syncRecordToCloud(recordToSync, url);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.error(`Failed to sync ${rec.profile.patientCode}: ${result.message}`);
      }
      
      // Add small delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsSyncingAll(false);
    
    if (failCount === 0) {
      showNotification(`Đồng bộ hoàn tất ${successCount} hồ sơ!`, 'success');
    } else {
      showNotification(`Đồng bộ: ${successCount} thành công, ${failCount} thất bại`, 'error');
    }
  };

  // Handle Clinical Data Input Change
  const handleClinicalInputChange = (
    phase: 'pre' | 'postImmediate' | 'post10Min', 
    field: 'file' | 'ei' | 'mi', 
    value: string
  ) => {
    if (!editingClinicalData) return;
    setEditingClinicalData(prev => prev ? ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [field]: value
      }
    }) : null);
  };

  // Save Clinical Data Only
  const handleSaveClinicalData = async () => {
    if (selectedRecord && editingClinicalData) {
      const updatedRecord = { ...selectedRecord, clinicalData: editingClinicalData };
      
      if (dataSource === 'local') {
          // Save to local storage
          saveRecord(
            updatedRecord.profile, 
            updatedRecord.surveyData, 
            editingClinicalData, 
            updatedRecord.asScores
          );
          refreshData(); // Refresh UI
          showNotification("Đã lưu thông tin lâm sàng (Local)!");
      } else {
          // Cloud Mode: Direct Sync Update
          if(confirm("Bạn đang ở chế độ Cloud. Hành động này sẽ gửi cập nhật trực tiếp lên Google Sheets. Tiếp tục?")) {
             // Use syncRecordToCloud logic to update
             handleSyncToCloud();
          }
      }
    }
  };

  const getRecordSummary = (rec: SurveyRecord) => {
    const scores = rec.asScores || calculateASScores(rec.surveyData);
    const highest = getHighestScores(scores);
    
    if (scores.binhHoa >= 60 && highest.every(h => !h.includes("Bình hòa") ? parseInt(h.match(/\d+/)?.[0] || '0') < 40 : true)) {
       return <span className="text-emerald-600 font-bold text-xs">Bình hòa ({scores.binhHoa})</span>;
    }
    
    return (
      <span className="text-red-600 font-medium text-xs">
        {highest.slice(0, 1).join(', ')}
      </span>
    );
  };

  // Filter & Pagination Logic
  const filteredRecords = records.filter(r => 
    r.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profile.patientCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const inputClasses = "w-full px-4 py-2 border border-gray-400 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const clinicalInputClasses = "bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2";

  if (!isOpen) {
    return (
      <button 
        onClick={handleOpen}
        className="fixed bottom-4 left-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-200 transition-colors z-40"
        title="Admin Panel"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${isAuthenticated ? 'max-w-6xl h-[90vh]' : 'max-w-md'} flex flex-col overflow-hidden transition-all duration-300 relative`}>
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-md">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <Settings size={20} className="text-blue-400" />
            Quản trị hệ thống
          </h3>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-0 bg-gray-50 flex flex-col relative">
          {!isAuthenticated ? (
            <div className="p-8 flex-1 flex items-center">
              <form onSubmit={handleLogin} className="space-y-6 w-full">
                <div className="text-center mb-6">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="text-blue-600" size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">Đăng nhập Quản trị</h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Nhập mật khẩu..."
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full py-3 text-base">Truy cập</Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-full relative">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-white shrink-0 items-center justify-between pr-4">
                <div className="flex">
                    <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${
                        activeTab === 'settings' 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    >
                    <Settings size={18} /> Cấu hình
                    </button>
                    <button
                    onClick={() => { setActiveTab('database'); refreshData(); }}
                    className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all border-b-2 ${
                        activeTab === 'database' 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                    >
                    <Database size={18} /> Dữ liệu ({records.length})
                    </button>
                </div>

                {/* Data Source Toggle Switch */}
                {activeTab === 'database' && (
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                        <button
                            onClick={() => setDataSource('local')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${
                                dataSource === 'local' 
                                ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Database size={14} /> Máy này (Local)
                        </button>
                        <button
                            onClick={() => setDataSource('cloud')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${
                                dataSource === 'cloud' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Cloud size={14} /> Hệ thống (Cloud)
                        </button>
                    </div>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'settings' && (
                  <div className="h-full overflow-y-auto p-8">
                    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                      <h4 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Cài đặt Hệ thống</h4>
                      <form onSubmit={handleUpdateSettings} className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm border border-blue-100 flex items-start gap-3">
                          <div className="bg-blue-200 p-2 rounded-full text-blue-700"><RefreshCw size={16}/></div>
                          <div>
                            <p className="font-bold text-base mb-1">Bộ đếm STT hiện tại</p>
                            <p>Số thứ tự bệnh nhân tiếp theo sẽ là: <strong className="text-xl">{currentCounter + 1}</strong></p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Đặt lại STT (Số thứ tự)
                          </label>
                          <input
                            type="number"
                            value={newCounter}
                            onChange={(e) => setNewCounter(e.target.value)}
                            className={inputClasses}
                            min="0"
                          />
                          <p className="text-xs text-gray-500 mt-1">Chỉ thay đổi khi bắt đầu đợt khảo sát mới.</p>
                        </div>

                        <hr className="my-4 border-gray-100" />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Cloud size={18} className="text-blue-500" />
                            Google Apps Script Web App URL
                          </label>
                          <div className="flex gap-2">
                             <input
                              type="text"
                              value={scriptUrl}
                              onChange={(e) => setScriptUrl(e.target.value)}
                              placeholder="https://script.google.com/macros/s/..."
                              className={`${inputClasses} text-sm font-mono text-gray-600 flex-1`}
                            />
                            <Button 
                              type="button" 
                              onClick={handleBackupToDrive}
                              disabled={isBackingUp}
                              className="bg-green-600 hover:bg-green-700 shrink-0 text-xs px-3"
                              title="Tải toàn bộ dữ liệu hiện có lên Google Drive dưới dạng file CSV"
                            >
                              {isBackingUp ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <HardDriveUpload size={16} />
                              )}
                              {isBackingUp ? 'Đang lưu...' : 'Lưu CSV lên Drive'}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Dùng để đồng bộ dữ liệu lên Google Sheets. Để trống nếu chỉ dùng Offline.
                          </p>
                        </div>
                        
                        <div className="pt-4">
                          <Button type="submit" className="w-full justify-center">
                            <Save size={18} />
                            Lưu Cấu hình
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {activeTab === 'database' && (
                  <div className="flex h-full">
                    {/* LEFT COLUMN: LIST VIEW & SEARCH */}
                    <div className={`${selectedRecord ? 'w-1/3 hidden md:flex' : 'w-full'} flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
                      {/* Toolbar */}
                      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                              type="text" 
                              placeholder="Tra cứu: Tên hoặc Mã BN..." 
                              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={searchTerm}
                              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                              autoFocus
                            />
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
                           
                           {/* Export Button - Available in Both */}
                           <Button variant="primary" onClick={exportAllRecordsToCSV} className="!py-1.5 !px-3 text-xs bg-green-600 hover:bg-green-700 border-green-600 flex-1 justify-center whitespace-nowrap">
                              <Download size={14} /> Tải CSV Tổng
                            </Button>
                         </div>
                         
                         {dataSource === 'local' ? (
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handleGenerateData} className="!py-1.5 !px-3 text-xs bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500 flex-1 justify-center">
                                <Zap size={14} /> Fake Data
                                </Button>
                                <Button variant="outline" onClick={handleClearAll} className="!py-1.5 !px-3 text-xs text-red-600 border-red-600 hover:bg-red-50 flex-1 justify-center">
                                <Trash2 size={14} /> Xóa Local
                                </Button>
                            </div>
                         ) : (
                             <div className="flex gap-2">
                                <Button variant="secondary" onClick={refreshData} className="!py-1.5 !px-3 text-xs bg-blue-500 text-white hover:bg-blue-600 border-blue-500 flex-1 justify-center">
                                    {isLoadingCloud ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />} 
                                    {isLoadingCloud ? 'Đang tải...' : 'Làm mới dữ liệu Cloud'}
                                </Button>
                             </div>
                         )}

                         {/* Status Indicator */}
                         <div className={`text-xs text-center py-1 rounded ${dataSource === 'local' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                             {dataSource === 'local' ? 'Đang xem dữ liệu lưu trên máy này' : 'Đang xem dữ liệu tập trung từ Google Sheets'}
                         </div>

                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-y-auto">
                        {paginatedRecords.length === 0 ? (
                           <div className="p-8 text-center text-gray-500 text-sm">
                               {isLoadingCloud ? 'Đang kết nối tới Google Sheets...' : 'Không tìm thấy dữ liệu.'}
                           </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {paginatedRecords.map(rec => (
                              <div 
                                key={rec.id} 
                                onClick={() => setSelectedRecord(rec)}
                                className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedRecord?.id === rec.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-gray-800 text-sm">{rec.profile.fullName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                      {rec.profile.patientCode || `#${rec.profile.sequenceNumber}`}
                                    </span>
                                    {/* Chỉ cho xóa ở Local mode */}
                                    {dataSource === 'local' && (
                                        <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteRecord(rec.id, rec.profile.fullName);
                                        }}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                        title="Xóa bản ghi"
                                        >
                                        <Trash2 size={14} />
                                        </button>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                  <span>{rec.profile.yearOfBirth} - {rec.profile.gender}</span>
                                  <span>•</span>
                                  <span>{new Date(rec.timestamp).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="bg-gray-100 rounded px-2 py-1">
                                     {getRecordSummary(rec)}
                                  </div>
                                  <div className="flex gap-1">
                                    {rec.clinicalData.pre.file && <div className="w-2 h-2 rounded-full bg-green-500" title="Đã có dữ liệu lâm sàng"></div>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pagination */}
                      {filteredRecords.length > 0 && (
                        <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between shrink-0 shadow-sm z-10">
                          <button 
                            onClick={() => goToPage(currentPage - 1)} 
                            disabled={currentPage === 1} 
                            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition-colors text-gray-600"
                            title="Trang trước"
                          >
                            <ChevronLeft size={20}/>
                          </button>
                          
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-bold text-gray-700">Trang {currentPage} / {totalPages}</span>
                            <span className="text-[10px] text-gray-500 mt-0.5">
                               {filteredRecords.length > 0 ? (currentPage - 1) * RECORDS_PER_PAGE + 1 : 0} - {Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length)} trong tổng số {filteredRecords.length}
                            </span>
                          </div>

                          <button 
                            onClick={() => goToPage(currentPage + 1)} 
                            disabled={currentPage === totalPages} 
                            className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition-colors text-gray-600"
                            title="Trang sau"
                          >
                            <ChevronRight size={20}/>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: DETAIL VIEW */}
                    <div className={`${selectedRecord ? 'flex' : 'hidden md:flex'} w-full md:w-2/3 flex-col bg-gray-50 h-full overflow-hidden`}>
                      {selectedRecord ? (
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                          {/* Detail Header */}
                          <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm shrink-0">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setSelectedRecord(null)} className="md:hidden p-2 -ml-2 text-gray-600">
                                <ArrowLeft size={20} />
                              </button>
                              <div>
                                <h2 className="text-lg font-bold text-gray-800">{selectedRecord.profile.fullName}</h2>
                                <p className="text-sm text-gray-500">Mã: {selectedRecord.profile.patientCode} | Lớp: {selectedRecord.profile.class} {selectedRecord.profile.phoneNumber && `| SĐT: ${selectedRecord.profile.phoneNumber}`}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* Cloud Sync Button (Single) */}
                              <button
                                onClick={handleSyncToCloud}
                                disabled={syncStatus === 'syncing' || syncStatus === 'success'}
                                className={`
                                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                                  ${syncStatus === 'success' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}
                                  ${syncStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                                  disabled:opacity-80 disabled:cursor-not-allowed
                                `}
                              >
                                {syncStatus === 'syncing' ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    Đang gửi...
                                  </>
                                ) : syncStatus === 'success' ? (
                                  <>
                                    <CheckCircle size={16} /> Đã cập nhật
                                  </>
                                ) : syncStatus === 'error' ? (
                                  <>
                                    <AlertCircle size={16} /> Lỗi - Gửi lại
                                  </>
                                ) : (
                                  <>
                                    <UploadCloud size={16} /> {dataSource === 'cloud' ? 'Cập nhật Cloud' : 'Lưu Cloud'}
                                  </>
                                )}
                              </button>

                               <button 
                                onClick={() => {
                                  const scores = selectedRecord.asScores || calculateASScores(selectedRecord.surveyData);
                                  exportToCSVs(selectedRecord.profile, selectedRecord.surveyData, scores, selectedRecord.clinicalData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors text-sm font-medium"
                              >
                                <Download size={16} /> Tải CSV
                              </button>
                              {dataSource === 'local' && (
                                <button 
                                    onClick={() => handleDeleteRecord(selectedRecord.id, selectedRecord.profile.fullName)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors text-sm font-medium"
                                >
                                    <Trash2 size={16} /> Xóa
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Detail Content (Scrollable) */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                             {/* SECTION: CLINICAL DATA INPUT */}
                             {editingClinicalData && (
                                <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${dataSource === 'cloud' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                                  <div className={`px-4 py-3 border-b flex justify-between items-center ${dataSource === 'cloud' ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'}`}>
                                    <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                                      <FileText size={16} className={dataSource === 'cloud' ? "text-blue-600" : "text-purple-600"}/> 
                                      {dataSource === 'cloud' ? 'Cập Nhật Chỉ Số (Sửa trực tiếp trên Cloud)' : 'Phiếu Thu Thập Chỉ Số Lâm Sàng (EI/MI)'}
                                    </h5>
                                    <Button 
                                      onClick={handleSaveClinicalData}
                                      className={`!py-1 !px-3 text-xs ${dataSource === 'cloud' ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
                                    >
                                      <Save size={14} /> {dataSource === 'cloud' ? 'Lưu & Đồng bộ' : 'Lưu Chỉ Số'}
                                    </Button>
                                  </div>
                                  <div className="p-4">
                                     <div className="mb-2 text-xs text-gray-500 italic">* Nhập mã file ảnh và chỉ số EI/MI. Nhấn nút Lưu để cập nhật.</div>
                                     <table className="min-w-full text-sm text-left text-gray-500 border border-gray-200 rounded-lg">
                                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                          <th scope="col" className="px-4 py-2 border-b font-bold w-1/4">Giai đoạn</th>
                                          <th scope="col" className="px-2 py-2 border-b font-bold">Mã File / Ghi chú</th>
                                          <th scope="col" className="px-2 py-2 border-b font-bold w-24">Chỉ số EI</th>
                                          <th scope="col" className="px-2 py-2 border-b font-bold w-24">Chỉ số MI</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {/* Row 1: Pre */}
                                        <tr className="bg-white border-b hover:bg-gray-50">
                                          <td className="px-4 py-2 font-medium text-gray-900">Trước khi thực hiện</td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="File ảnh..."
                                              value={editingClinicalData.pre.file}
                                              onChange={(e) => handleClinicalInputChange('pre', 'file', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="EI..."
                                              value={editingClinicalData.pre.ei}
                                              onChange={(e) => handleClinicalInputChange('pre', 'ei', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="MI..."
                                              value={editingClinicalData.pre.mi}
                                              onChange={(e) => handleClinicalInputChange('pre', 'mi', e.target.value)}
                                            />
                                          </td>
                                        </tr>
                                        {/* Row 2: Post Immediate */}
                                        <tr className="bg-white border-b hover:bg-gray-50">
                                          <td className="px-4 py-2 font-medium text-gray-900">Ngay sau khi thực hiện</td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="File ảnh..."
                                              value={editingClinicalData.postImmediate.file}
                                              onChange={(e) => handleClinicalInputChange('postImmediate', 'file', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="EI..."
                                              value={editingClinicalData.postImmediate.ei}
                                              onChange={(e) => handleClinicalInputChange('postImmediate', 'ei', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="MI..."
                                              value={editingClinicalData.postImmediate.mi}
                                              onChange={(e) => handleClinicalInputChange('postImmediate', 'mi', e.target.value)}
                                            />
                                          </td>
                                        </tr>
                                        {/* Row 3: Post 10 Min */}
                                        <tr className="bg-white hover:bg-gray-50">
                                          <td className="px-4 py-2 font-medium text-gray-900">Sau khi thực hiện 10 phút</td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="File ảnh..."
                                              value={editingClinicalData.post10Min.file}
                                              onChange={(e) => handleClinicalInputChange('post10Min', 'file', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="EI..."
                                              value={editingClinicalData.post10Min.ei}
                                              onChange={(e) => handleClinicalInputChange('post10Min', 'ei', e.target.value)}
                                            />
                                          </td>
                                          <td className="px-2 py-1">
                                            <input 
                                              type="text" 
                                              className={clinicalInputClasses}
                                              placeholder="MI..."
                                              value={editingClinicalData.post10Min.mi}
                                              onChange={(e) => handleClinicalInputChange('post10Min', 'mi', e.target.value)}
                                            />
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div className="mt-3 flex items-center gap-2">
                                       <label className="text-sm font-medium text-gray-900 whitespace-nowrap">TG Mất vết giác:</label>
                                       <input 
                                          type="text" 
                                          className={clinicalInputClasses}
                                          placeholder="Ví dụ: 3 ngày, 1 tuần..."
                                          value={editingClinicalData.cuppingMarkTime}
                                          onChange={(e) => setEditingClinicalData({...editingClinicalData, cuppingMarkTime: e.target.value})}
                                        />
                                    </div>
                                  </div>
                                </div>
                             )}

                            {/* Card: AS Scores */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                              <h5 className="font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                                <Settings size={16} className="text-blue-500"/> Kết quả AS Score
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                                {selectedRecord.asScores && Object.entries(selectedRecord.asScores).map(([key, val]) => {
                                   const mapName: any = {
                                     binhHoa: 'Bình Hòa', duongHu: 'Dương Hư', amHu: 'Âm Hư', khiHu: 'Khí Hư',
                                     damThap: 'Đàm Thấp', thapNhiet: 'Thấp Nhiệt', huyetU: 'Huyết Ứ', khiTre: 'Khí Trệ', dacBiet: 'Đặc Biệt'
                                   };
                                   const isHigh = key !== 'binhHoa' && (val as number) >= 30;
                                   const isGood = key === 'binhHoa' && (val as number) >= 60;
                                   
                                   return (
                                     <div key={key} className="flex justify-between items-center p-2 rounded bg-gray-50">
                                       <span className="text-gray-600">{mapName[key]}</span>
                                       <span className={`font-bold ${isHigh ? 'text-red-600' : isGood ? 'text-green-600' : 'text-gray-800'}`}>
                                         {val}
                                       </span>
                                     </div>
                                   );
                                })}
                              </div>
                            </div>

                            {/* Card: 60 Answers */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h5 className="font-semibold text-gray-800">Chi tiết 60 câu trả lời</h5>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                                  Đỏ: Thường xuyên (4) / Luôn luôn (5)
                                </span>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {CCMQ_QUESTIONS.map(q => {
                                  const ansVal = selectedRecord.surveyData[q.id];
                                  const ansLabel = ANSWER_OPTIONS.find(o => o.value === ansVal)?.label || '-';
                                  // Highlight high frequency symptoms (4 or 5)
                                  const isHigh = ansVal === 4 || ansVal === 5;
                                  
                                  return (
                                    <div key={q.id} className={`p-3 text-sm flex gap-3 ${isHigh ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                      <div className="w-8 shrink-0 text-gray-400 font-mono text-xs pt-0.5">#{q.id}</div>
                                      <div className="flex-1 text-gray-700">{q.text}</div>
                                      <div className="w-32 shrink-0 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                          isHigh ? 'bg-red-100 text-red-700' : 
                                          ansVal === 3 ? 'bg-yellow-100 text-yellow-700' : 
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {ansLabel} ({ansVal})
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <Database size={32} className="text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-600">Chưa chọn hồ sơ nào</h3>
                          <p className="text-sm max-w-xs mt-2">Sử dụng ô tìm kiếm bên trái để tra cứu bệnh nhân. <br/>Chọn hồ sơ để nhập chỉ số lâm sàng (EI/MI).</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notification Toast */}
                {notification && (
                  <div 
                    className={`
                      fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl text-white 
                      flex items-center gap-3 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300
                      ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}
                    `}
                  >
                    {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    <span className="font-medium">{notification.message}</span>
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