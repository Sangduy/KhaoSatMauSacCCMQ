import React, { useState, useEffect, useRef } from 'react';
import { Settings, Lock, Save, Database, Trash2, Download, RefreshCw, X, Cloud, ArrowLeft, Search, UploadCloud, CloudLightning, Zap, Globe, HardDriveUpload, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
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

  // --- REFS QUẢN LÝ TRẠNG THÁI CACHE (CHỐNG NHẢY DỮ LIỆU) ---
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
    personalInfo: true,
    clinicalIndices: true,
    redGreenDetails: true,
    surveyDetails: true
  });

  const handleOpen = () => { setIsOpen(true); refreshData(); };
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => { setNotification(null); }, 3000);
  };

  // --- TÍNH NĂNG HARD RESET ---
  const handleHardReset = () => {
    if (confirm("CẢNH BÁO: Thao tác này sẽ xóa sạch MỌI dữ liệu tạm và bản nháp trên máy này để sửa lỗi. Bạn có chắc không?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const refreshData = async () => {
    setCurrentCounter(getCurrentSequenceCounter());
    setNewCounter(getCurrentSequenceCounter().toString());
    const url = getGoogleScriptUrl();
    setScriptUrl(url);

    if (dataSource === 'local') {
        const allRecords = getRecords().sort((a, b) => (b.profile?.sequenceNumber || 0) - (a.profile?.sequenceNumber || 0));
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

  // --- LOGIC NẠP CACHE (LOAD) AN TOÀN ---
  useEffect(() => {
    if (!selectedRecord) {
      setEditingClinicalData(null);
      lastLoadedId.current = null;
      return;
    }

    // Khóa chức năng lưu tạm thời
    isTransitioning.current = true;
    lastLoadedId.current = null;

    const draftKey = `draft_clinical_${selectedRecord.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    try {
      const dataToSet = savedDraft 
        ? JSON.parse(savedDraft) 
        : JSON.parse(JSON.stringify(selectedRecord.clinicalData || {}));
      
      setEditingClinicalData(dataToSet);

      // Mở khóa sau khi React đã render xong dữ liệu mới
      setTimeout(() => {
        lastLoadedId.current = selectedRecord.id;
        isTransitioning.current = false;
      }, 50);
    } catch (e) {
      console.error("Lỗi nạp nháp:", e);
      setEditingClinicalData(JSON.parse(JSON.stringify(selectedRecord.clinicalData || {})));
      isTransitioning.current = false;
    }
  }, [selectedRecord?.id]);

  // --- LOGIC LƯU NHÁP (SAVE) AN TOÀN ---
  useEffect(() => {
    if (
      !isTransitioning.current && 
      selectedRecord?.id && 
      editingClinicalData && 
      lastLoadedId.current === selectedRecord.id
    ) {
      const draftKey = `draft_clinical_${selectedRecord.id}`;
      // Chỉ lưu nếu thực sự khác biệt với bản gốc
      if (JSON.stringify(editingClinicalData) !== JSON.stringify(selectedRecord.clinicalData || {})) {
        localStorage.setItem(draftKey, JSON.stringify(editingClinicalData));
      }
    }
  }, [editingClinicalData]);

  const handleLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (password === import.meta.env.VITE_ADMIN_PASSWORD) { 
      setIsAuthenticated(true); 
      setPassword(''); 
      sessionStorage.setItem('isAdmin', 'true'); 
    } else { 
      alert('Mật khẩu không đúng!'); 
    } 
  };
  
  const handleUpdateSettings = (e: React.FormEvent) => { e.preventDefault(); const val = parseInt(newCounter, 10); if (!isNaN(val) && val >= 0) { setSequenceCounter(val); setCurrentCounter(val); } setGoogleScriptUrl(scriptUrl.trim()); showNotification('Đã lưu cấu hình!'); };
  
  const handleBackupToDrive = async () => {
    const url = getGoogleScriptUrl();
    if (!url || records.length === 0) return alert("Kiểm tra URL hoặc dữ liệu!");
    setIsBackingUp(true);
    const result = await backupDataToCloud(url);
    setIsBackingUp(false);
    result.success ? showNotification("Backup thành công!") : showNotification(`Lỗi: ${result.message}`, 'error');
  };

  const handleDeleteRecord = (id: string, name: string) => { if(dataSource === 'cloud') return alert("Xóa trên Sheet!"); if (confirm(`Xóa ${name}?`)) { deleteRecord(id); refreshData(); showNotification(`Đã xóa ${name}`); } };
  const handleClearAll = () => { if (prompt("Nhập 'XOA' để xóa sạch Local DB:") === 'XOA') { clearAllRecords(); refreshData(); showNotification('Đã xóa sạch!'); } };

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
    } else { 
      setSyncStatus('error'); 
      showNotification(`Lỗi: ${result.message}`, 'error'); 
    }
  };

  const handleSyncAll = async () => { 
      const url = getGoogleScriptUrl();
      if (!url || !confirm(`Gửi ${records.length} hồ sơ lên Cloud?`)) return;
      setIsSyncingAll(true);
      for (const rec of records) { await syncRecordToCloud(rec, url); await new Promise(r => setTimeout(r, 200)); }
      setIsSyncingAll(false);
      showNotification('Hoàn tất đồng bộ!');
  };

  const handleSaveClinicalData = async () => {
    if (selectedRecord && editingClinicalData) {
      saveRecord(selectedRecord.profile, selectedRecord.surveyData, editingClinicalData, selectedRecord.asScores);
      localStorage.removeItem(`draft_clinical_${selectedRecord.id}`); 
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
            const r =
