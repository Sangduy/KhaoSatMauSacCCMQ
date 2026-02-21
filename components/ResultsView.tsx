import React, { useEffect, useState, useRef } from 'react';
import { SurveyData, UserProfile, ASScores, ClinicalData } from '../types';
import { exportToCSVs, getGoogleScriptUrl, saveRecord, syncRecordToCloud } from '../services/storageService';
import { calculateASScores } from '../services/scoreService';
import { Button } from './Button';
import { Download, UploadCloud, CheckCircle, Activity, AlertCircle, Database, XCircle, UserPlus, X, CloudLightning } from 'lucide-react';

interface ResultsViewProps {
  data: SurveyData;
  profile: UserProfile;
  onReset: () => void;
}

const ScoreBar: React.FC<{ label: string; score: number; isReverse?: boolean }> = ({ label, score, isReverse = false }) => {
  let colorClass = "bg-gray-500";
  let textColor = "text-gray-700";
  
  if (isReverse) {
    if (score >= 60) { colorClass = "bg-emerald-500"; textColor = "text-emerald-700 font-bold"; }
    else if (score >= 50) { colorClass = "bg-yellow-500"; textColor = "text-yellow-700"; }
    else { colorClass = "bg-red-500"; textColor = "text-red-700"; }
  } else {
    if (score < 30) { colorClass = "bg-blue-400"; textColor = "text-gray-600"; }
    else if (score < 40) { colorClass = "bg-yellow-500"; textColor = "text-yellow-700 font-medium"; }
    else { colorClass = "bg-red-500"; textColor = "text-red-700 font-bold"; }
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-1">
        <span className={`text-sm ${textColor}`}>{label}</span>
        <span className={`text-sm ${textColor}`}>{score.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${Math.min(score, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

export const ResultsView: React.FC<ResultsViewProps> = ({ data, profile, onReset }) => {
  const [asScores, setAsScores] = useState<ASScores | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [scriptUrl, setScriptUrl] = useState('');
  const hasAutoSynced = useRef(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- CẬP NHẬT: Khởi tạo giá trị mặc định đầy đủ theo cấu trúc mới ---
  const emptyPhase = {
    file: '',
    green_bl23_l: '', red_bl23_l: '', ei_bl23_l: '', mi_bl23_l: '', ri_bl23_l: '',
    green_bl23_r: '', red_bl23_r: '', ei_bl23_r: '', mi_bl23_r: '', ri_bl23_r: '',
    green_bl25_l: '', red_bl25_l: '', ei_bl25_l: '', mi_bl25_l: '', ri_bl25_l: '',
    green_bl25_r: '', red_bl25_r: '', ei_bl25_r: '', mi_bl25_r: '', ri_bl25_r: '',
  };

  const defaultClinicalData: ClinicalData = {
    pre: { ...emptyPhase },
    postImmediate: { ...emptyPhase },
    post10Min: { ...emptyPhase },
    cuppingMarkTime: ''
  };
  // -------------------------------------------------------------------

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    const timer = setTimeout(() => { setNotification(null); }, 5000);
    return () => clearTimeout(timer);
  };

  const performSync = async (scores: ASScores, url: string) => {
    if (syncStatus === 'success' || syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    saveRecord(profile, data, defaultClinicalData, scores);

    const recordPayload = {
      profile,
      clinicalData: defaultClinicalData,
      asScores: scores,
      surveyData: data, 
      timestamp: new Date().toISOString()
    };

    console.log("Đang gửi dữ liệu tới:", url);
    const result = await syncRecordToCloud(recordPayload, url);

    if (result.success) {
      setSyncStatus('success');
      showNotification("Đã gửi kết quả thành công!", 'success');
    } else {
      console.error("Sync error:", result.message);
      setSyncStatus('error');
      showNotification(`Gửi thất bại: ${result.message}`, 'error');
    }
  };

  useEffect(() => {
    const scores = calculateASScores(data);
    setAsScores(scores);
    const url = getGoogleScriptUrl();
    setScriptUrl(url);

    if (url && !hasAutoSynced.current) {
      hasAutoSynced.current = true;
      performSync(scores, url);
    }
  }, []); 

  const handleDownloadFiles = () => {
    if (asScores) {
      exportToCSVs(profile, data, asScores, defaultClinicalData);
      showNotification("Đang chuẩn bị tải xuống 3 file...", 'success');
    }
  };

  const handleRetrySync = () => {
     if(asScores && scriptUrl) {
         setSyncStatus('idle');
         performSync(asScores, scriptUrl);
     } else {
         alert("Lỗi: Không tìm thấy URL kết nối.");
     }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12 relative">
      <div className="text-center">
         <div className="flex justify-center mb-4">
            {syncStatus === 'syncing' && (
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold shadow-sm animate-pulse">
                    <CloudLightning size={20} /> Đang gửi kết quả về hệ thống...
                </div>
            )}
            {syncStatus === 'success' && (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold shadow-sm">
                    <CheckCircle size={20} /> Đã gửi kết quả thành công
                </div>
            )}
             {syncStatus === 'error' && (
                <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold shadow-sm cursor-pointer hover:bg-red-200" onClick={handleRetrySync}>
                    <AlertCircle size={20} /> Gửi lỗi. Nhấn để thử lại.
                </div>
            )}
         </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-2">Kết quả Khảo sát</h2>
        <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-medium mb-4">
          Mã BN: <span className="text-blue-600 font-bold">{profile.patientCode}</span> | Tên: {profile.fullName} | Lớp: {profile.class}
        </div>
        <p className="text-gray-600">Điểm số CCMQ đã được tính toán tự động dựa trên câu trả lời của bạn.</p>
      </div>

      {asScores && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 text-white flex justify-between items-center">
             <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={20} />
              Bảng Điểm Thể Chất (AS Scores)
            </h3>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Thang điểm 0 - 100</span>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
               <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Biểu đồ điểm số</h4>
               <ScoreBar label="Thể Bình Hòa" score={asScores.binhHoa} isReverse={true} />
               <div className="my-2 border-t border-dashed border-gray-200"></div>
               <ScoreBar label="Thể Khí Hư" score={asScores.khiHu} />
               <ScoreBar label="Thể Dương Hư" score={asScores.duongHu} />
               <ScoreBar label="Thể Âm Hư" score={asScores.amHu} />
               <ScoreBar label="Thể Đàm Thấp" score={asScores.damThap} />
               <ScoreBar label="Thể Thấp Nhiệt" score={asScores.thapNhiet} />
               <ScoreBar label="Thể Huyết Ứ" score={asScores.huyetU} />
               <ScoreBar label="Thể Khí Trệ" score={asScores.khiTre} />
               <ScoreBar label="Thể Đặc Biệt" score={asScores.dacBiet} />
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-sm space-y-4">
               <h4 className="font-bold text-gray-800 border-b pb-2 border-gray-300">Hướng dẫn đọc kết quả</h4>
               <div>
                 <span className="block font-semibold text-emerald-700">1. Thể Bình Hòa (Lý tưởng):</span>
                 <p className="text-gray-600 mt-1">Điểm càng cao càng tốt (Tiêu chuẩn {'>'} 60). Đây là trạng thái cân bằng âm dương, khí huyết.</p>
               </div>
               <div>
                 <span className="block font-semibold text-red-700">2. Các Thể Bệnh Lý (Còn lại):</span>
                 <p className="text-gray-600 mt-1">Điểm càng thấp càng tốt.</p>
                 <ul className="list-disc ml-5 mt-1 text-gray-500 space-y-1">
                   <li><span className="font-medium text-blue-600">Dưới 30 điểm:</span> Không rõ rệt (An toàn).</li>
                   <li><span className="font-medium text-yellow-600">30 - 39 điểm:</span> Có xu hướng lệch lạc (Cần lưu ý).</li>
                   <li><span className="font-medium text-red-600">Trên 40 điểm:</span> Thể chất bệnh lý rõ rệt (Cần điều chỉnh).</li>
                 </ul>
               </div>
               <div className="bg-white p-3 rounded border border-gray-200 mt-4">
                 <p className="font-semibold text-gray-700 mb-1">Kết luận sơ bộ:</p>
                 {asScores.binhHoa >= 60 && Object.values(asScores).filter(s => s !== asScores.binhHoa).every(s => (s as number) < 30) ? (
                   <div className="text-emerald-600 font-bold">🎉 Chúc mừng! Bạn có thể chất Bình Hòa khỏe mạnh.</div>
                 ) : (
                    <div>
                      Bạn có xu hướng thiên về: 
                      <span className="font-bold text-red-600">
                        {' ' + Object.entries(asScores)
                          .filter(([key, val]) => key !== 'binhHoa' && (val as number) >= 30)
                          .map(([key]) => {
                             const mapName: {[key: string]: string} = {
                               duongHu: 'Dương Hư', amHu: 'Âm Hư', khiHu: 'Khí Hư',
                               damThap: 'Đàm Thấp', thapNhiet: 'Thấp Nhiệt', huyetU: 'Huyết Ứ',
                               khiTre: 'Khí Trệ', dacBiet: 'Đặc Biệt'
                             };
                             return mapName[key];
                          }).join(', ') || ' (Chưa rõ rệt)'
                        }
                      </span>
                    </div>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 pb-8 pt-8 border-t border-gray-200 flex-wrap">
        {syncStatus === 'error' && (
             <Button 
              onClick={handleRetrySync} 
              className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 min-w-[200px] py-3 animate-pulse"
            >
              <UploadCloud size={20} />
              Gửi lại Kết quả
            </Button>
        )}
        <Button 
          onClick={handleDownloadFiles} 
          className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 min-w-[200px] py-3"
          title="Tải kết quả về máy cá nhân"
        >
          <Download size={20} />
          Tải kết quả về máy
        </Button>
        <div className="w-full sm:w-auto ml-0 sm:ml-2">
            <Button 
              onClick={() => {
                 if(confirm("Bạn có chắc chắn muốn thoát về màn hình chính?")) {
                    onReset();
                 }
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 min-w-[200px] py-3"
              title="Quay lại màn hình đầu"
            >
              <UserPlus size={20} />
              Làm phiếu mới
            </Button>
        </div>
      </div>

       {notification && (
        <div 
          className={`
            fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white 
            flex items-center gap-4 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300
            ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}
            cursor-pointer hover:scale-105 transition-transform
          `}
          onClick={() => setNotification(null)}
        >
          <div className="bg-white/20 p-2 rounded-full">
            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base">{notification.type === 'success' ? 'Thành công' : 'Thông báo lỗi'}</span>
            <span className="text-sm opacity-95">{notification.message}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setNotification(null); }} className="text-white/70 hover:text-white ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
        </div>
      )}
    </div>
  );
};
