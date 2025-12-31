import React, { useState, useEffect } from 'react';
import { Settings, Lock, Save, Database, Trash2, Download, RefreshCw, X, Cloud, FileCheck, ChevronLeft, ChevronRight, Zap, Eye, ArrowLeft, Search } from 'lucide-react';
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
  generateTestData
} from '../services/storageService';
import { calculateASScores, getHighestScores } from '../services/scoreService';
import { Button } from './Button';
import { SurveyRecord } from '../types';
import { CCMQ_QUESTIONS, ANSWER_OPTIONS } from '../constants';

const RECORDS_PER_PAGE = 10;

export const AdminPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'database'>('settings');
  
  // Settings State
  const [currentCounter, setCurrentCounter] = useState(0);
  const [newCounter, setNewCounter] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');

  // Database State
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SurveyRecord | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    refreshData();
  };

  const refreshData = () => {
    setCurrentCounter(getCurrentSequenceCounter());
    setNewCounter(getCurrentSequenceCounter().toString());
    setScriptUrl(getGoogleScriptUrl());
    const allRecords = getRecords().sort((a, b) => b.profile.sequenceNumber - a.profile.sequenceNumber);
    setRecords(allRecords);
    
    // Reset pages
    const maxPage = Math.max(1, Math.ceil(allRecords.length / RECORDS_PER_PAGE));
    if (currentPage > maxPage) setCurrentPage(maxPage);
  };

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
    alert('Đã cập nhật cấu hình!');
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa dữ liệu của bệnh nhân: ${name}?`)) {
      deleteRecord(id);
      refreshData();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  const handleClearAll = () => {
    const confirmText = prompt("Hành động này sẽ XÓA TOÀN BỘ dữ liệu (bao gồm cả danh sách đồng thuận). Nhập 'XOA' để xác nhận:");
    if (confirmText === 'XOA') {
      clearAllRecords();
      setCurrentPage(1);
      setSelectedRecord(null);
      refreshData();
    }
  };

  const handleGenerateData = () => {
    if (confirm("Thao tác này sẽ XÓA dữ liệu hiện tại và TẠO MỚI 10 hồ sơ giả lập để test. Bạn có chắc chắn không?")) {
        generateTestData();
        refreshData();
        setSelectedRecord(null);
        alert("Đã tạo 10 hồ sơ mẫu thành công!");
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
      <div className={`bg-white rounded-xl shadow-2xl w-full ${isAuthenticated ? 'max-w-6xl h-[90vh]' : 'max-w-md'} flex flex-col overflow-hidden transition-all duration-300`}>
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
        <div className="flex-1 overflow-hidden p-0 bg-gray-50 flex flex-col">
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
            <div className="flex flex-col h-full">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 bg-white shrink-0">
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
                  <Database size={18} /> Cơ sở dữ liệu ({records.length})
                </button>
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
                          <input
                            type="text"
                            value={scriptUrl}
                            onChange={(e) => setScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className={`${inputClasses} text-sm font-mono text-gray-600`}
                          />
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
                    {/* LEFT COLUMN: LIST VIEW */}
                    <div className={`${selectedRecord ? 'w-1/3 hidden md:flex' : 'w-full'} flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
                      {/* Toolbar */}
                      <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                              type="text" 
                              placeholder="Tìm tên hoặc mã BN..." 
                              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              value={searchTerm}
                              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                         </div>
                         <div className="flex flex-wrap gap-2">
                           <Button variant="secondary" onClick={refreshData} className="!py-1.5 !px-3 text-xs flex-1 justify-center">
                            <RefreshCw size={14} /> Làm mới
                           </Button>
                           <Button variant="primary" onClick={exportConsentsToCSV} className="!py-1.5 !px-3 text-xs bg-purple-600 hover:bg-purple-700 border-purple-600 flex-1 justify-center">
                            <FileCheck size={14} /> DS Đồng thuận
                           </Button>
                           <Button variant="primary" onClick={exportAllRecordsToCSV} className="!py-1.5 !px-3 text-xs bg-green-600 hover:bg-green-700 border-green-600 flex-1 justify-center">
                              <Download size={14} /> Tải DL Tổng
                            </Button>
                         </div>
                         <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleGenerateData} className="!py-1.5 !px-3 text-xs bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500 flex-1 justify-center">
                              <Zap size={14} /> Fake Data
                            </Button>
                             <Button variant="outline" onClick={handleClearAll} className="!py-1.5 !px-3 text-xs text-red-600 border-red-600 hover:bg-red-50 flex-1 justify-center">
                              <Trash2 size={14} /> Xóa tất cả
                            </Button>
                         </div>
                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-y-auto">
                        {paginatedRecords.length === 0 ? (
                           <div className="p-8 text-center text-gray-500 text-sm">Không tìm thấy dữ liệu.</div>
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
                                  <span className="text-xs font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                    {rec.profile.patientCode || `#${rec.profile.sequenceNumber}`}
                                  </span>
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
                      {filteredRecords.length > RECORDS_PER_PAGE && (
                        <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between">
                          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16}/></button>
                          <span className="text-xs text-gray-600">Trang {currentPage}/{totalPages}</span>
                          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16}/></button>
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
                               <button 
                                onClick={() => {
                                  const scores = selectedRecord.asScores || calculateASScores(selectedRecord.surveyData);
                                  exportToCSVs(selectedRecord.profile, selectedRecord.surveyData, scores, selectedRecord.clinicalData);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors text-sm font-medium"
                              >
                                <Download size={16} /> Tải CSV
                              </button>
                              <button 
                                onClick={() => handleDeleteRecord(selectedRecord.id, selectedRecord.profile.fullName)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors text-sm font-medium"
                              >
                                <Trash2 size={16} /> Xóa
                              </button>
                            </div>
                          </div>

                          {/* Detail Content (Scrollable) */}
                          <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
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
                          <p className="text-sm max-w-xs mt-2">Chọn một bệnh nhân từ danh sách bên trái để xem chi tiết câu trả lời và chỉnh sửa dữ liệu.</p>
                        </div>
                      )}
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