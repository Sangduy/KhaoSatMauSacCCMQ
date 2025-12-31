import React, { useEffect, useState } from 'react';
import { SurveyData, UserProfile, ClinicalData, ASScores } from '../types';
import { exportToCSVs, getGoogleScriptUrl, saveRecord } from '../services/storageService';
import { calculateASScores } from '../services/scoreService';
import { Button } from './Button';
import { Download, RotateCcw, FileText, CloudUpload, CheckCircle, Activity, AlertCircle, Database, Save, XCircle, UserPlus } from 'lucide-react';

interface ResultsViewProps {
  data: SurveyData;
  profile: UserProfile;
  onReset: () => void;
}

const ScoreBar: React.FC<{ label: string; score: number; isReverse?: boolean }> = ({ label, score, isReverse = false }) => {
  // Logic màu sắc:
  // Nếu là Bình Hòa (isReverse=true): >60 Tốt (Xanh), <60 Kém (Vàng/Đỏ)
  // Các thể khác: <30 Tốt (Xanh), 30-39 Xu hướng (Vàng), >=40 Bệnh lý (Đỏ)
  
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
  
  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [scriptUrl, setScriptUrl] = useState('');

  // State cho dữ liệu lâm sàng (Admin nhập)
  const [clinicalData, setClinicalData] = useState<ClinicalData>({
    pre: { file: '' },
    postImmediate: { file: '' },
    post10Min: { file: '' },
    cuppingMarkTime: ''
  });

  useEffect(() => {
    // 1. Calculate Scores immediately
    const scores = calculateASScores(data);
    setAsScores(scores);

    setScriptUrl(getGoogleScriptUrl());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleClinicalChange = (
    phase: 'pre' | 'postImmediate' | 'post10Min', 
    field: 'file', 
    value: string
  ) => {
    setClinicalData(prev => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        [field]: value
      }
    }));
  };

  // Nút: Lưu vào CSDL
  const handleSaveToDB = () => {
    if (asScores) {
      saveRecord(profile, data, clinicalData, asScores);
      alert("Đã lưu thành công vào Cơ sở dữ liệu!");
    }
  };

  // Nút: Tải về file dữ liệu
  const handleDownloadFiles = () => {
    if (asScores) {
      // exportToCSVs cũng tự động gọi saveRecord bên trong
      exportToCSVs(profile, data, asScores, clinicalData);
    }
  };

  const handleSyncToCloud = async () => {
    if (!scriptUrl) {
      alert("Chưa cấu hình Google Script URL trong Admin Panel.");
      return;
    }
    if (!asScores) return;

    setSyncStatus('syncing');
    
    // Save to local storage first
    saveRecord(profile, data, clinicalData, asScores);

    try {
      const payload = {
        profile,
        clinicalData,
        asScores,
        surveyData: data, 
        timestamp: new Date().toISOString()
      };

      // Sử dụng text/plain để tránh Preflight check (OPTIONS) của Google Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(payload),
      });

      const resText = await response.text();
      
      // Google Script trả về JSON, ta parse để check status
      try {
          const resJson = JSON.parse(resText);
          if (resJson.status === 'success') {
            setSyncStatus('success');
            // setTimeout(() => setSyncStatus('idle'), 5000);
          } else {
            console.error("Script error:", resJson);
            setSyncStatus('error');
            alert("Lỗi từ Server: " + (resJson.message || "Unknown error"));
          }
      } catch (e) {
          // Nếu không phải JSON (có thể lỗi HTML từ Google), coi như thành công nếu status 200
          if (response.ok) {
             setSyncStatus('success');
          } else {
             setSyncStatus('error');
          }
      }

    } catch (error) {
      console.error("Sync error", error);
      setSyncStatus('error');
    }
  };

  const inputClasses = "bg-white border border-gray-400 text-gray-900 text-sm rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 placeholder-gray-400";
  const smallInputClasses = "bg-white border border-gray-400 text-gray-900 text-sm rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-24 p-2.5 placeholder-gray-400";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Kết quả Khảo sát</h2>
        <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-medium mb-4">
          Mã BN: <span className="text-blue-600 font-bold">{profile.patientCode}</span> | Tên: {profile.fullName} | Lớp: {profile.class}
        </div>
        <p className="text-gray-600">Điểm số CCMQ đã được tính toán tự động dựa trên câu trả lời của bạn.</p>
      </div>

      {/* AS SCORES CARD */}
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
            {/* Cột trái: Biểu đồ */}
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

            {/* Cột phải: Giải thích */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 text-sm space-y-4">
               <h4 className="font-bold text-gray-800 border-b pb-2 border-gray-300">Hướng dẫn đọc kết quả</h4>
               
               <div>
                 <span className="block font-semibold text-emerald-700">1. Thể Bình Hòa (Lý tưởng):</span>
                 <p className="text-gray-600 mt-1">
                   Điểm càng cao càng tốt (Tiêu chuẩn {'>'} 60). Đây là trạng thái cân bằng âm dương, khí huyết.
                 </p>
               </div>

               <div>
                 <span className="block font-semibold text-red-700">2. Các Thể Bệnh Lý (Còn lại):</span>
                 <p className="text-gray-600 mt-1">
                   Điểm càng thấp càng tốt.
                 </p>
                 <ul className="list-disc ml-5 mt-1 text-gray-500 space-y-1">
                   <li><span className="font-medium text-blue-600">Dưới 30 điểm:</span> Không rõ rệt (An toàn).</li>
                   <li><span className="font-medium text-yellow-600">30 - 39 điểm:</span> Có xu hướng lệch lạc (Cần lưu ý).</li>
                   <li><span className="font-medium text-red-600">Trên 40 điểm:</span> Thể chất bệnh lý rõ rệt (Cần điều chỉnh).</li>
                 </ul>
               </div>

               <div className="bg-white p-3 rounded border border-gray-200 mt-4">
                 <p className="font-semibold text-gray-700 mb-1">Kết luận sơ bộ:</p>
                 {/* Fix: Cast s to number to avoid comparison with unknown */}
                 {asScores.binhHoa >= 60 && Object.values(asScores).filter(s => s !== asScores.binhHoa).every(s => (s as number) < 30) ? (
                   <div className="text-emerald-600 font-bold">🎉 Chúc mừng! Bạn có thể chất Bình Hòa khỏe mạnh.</div>
                 ) : (
                    <div>
                      Bạn có xu hướng thiên về: 
                      <span className="font-bold text-red-600">
                        {' ' + Object.entries(asScores)
                          /* Fix: Cast val to number to avoid comparison with unknown */
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

      {/* ADMIN INPUT SECTION */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
           <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText size={20} />
            Phiếu Thu Thập Chỉ Số (Dành cho Cán bộ Y tế)
          </h3>
          <div className="flex gap-2">
            {scriptUrl && (
              <button
                onClick={handleSyncToCloud}
                disabled={syncStatus === 'syncing' || syncStatus === 'success'}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${syncStatus === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                  ${syncStatus === 'error' ? 'bg-red-600 text-white' : ''}
                  disabled:opacity-80 disabled:cursor-not-allowed
                `}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <CheckCircle size={14} /> Đã lưu Drive
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <AlertCircle size={14} /> Lỗi - Thử lại
                  </>
                ) : (
                  <>
                    <CloudUpload size={14} /> Lưu lên Drive
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 overflow-x-auto">
          <div className="mb-4 text-sm text-gray-600 italic">
            * Nhập tên file hình ảnh tương ứng với từng giai đoạn.
          </div>
          <table className="min-w-full text-sm text-left text-gray-500 border border-gray-200 rounded-lg">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 border-b font-bold w-1/3">Giai đoạn</th>
                <th scope="col" className="px-6 py-3 border-b font-bold">Tên File</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Trước khi thực hiện</td>
                <td className="px-6 py-2">
                  <input 
                    type="text" 
                    className={inputClasses}
                    placeholder="Nhập tên file"
                    value={clinicalData.pre.file}
                    onChange={(e) => handleClinicalChange('pre', 'file', e.target.value)}
                  />
                </td>
              </tr>
              <tr className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Ngay sau khi thực hiện</td>
                <td className="px-6 py-2">
                  <input 
                    type="text" 
                    className={inputClasses}
                    placeholder="Nhập tên file"
                    value={clinicalData.postImmediate.file}
                    onChange={(e) => handleClinicalChange('postImmediate', 'file', e.target.value)}
                  />
                </td>
              </tr>
              <tr className="bg-white hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">Sau khi thực hiện 10 phút</td>
                <td className="px-6 py-2">
                  <input 
                    type="text" 
                    className={inputClasses}
                    placeholder="Nhập tên file"
                    value={clinicalData.post10Min.file}
                    onChange={(e) => handleClinicalChange('post10Min', 'file', e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 border-t border-gray-100 pt-4">
             <label className="block text-sm font-medium text-gray-900 mb-2">Thời gian mất vết giác</label>
             <input 
                type="text" 
                className={`${inputClasses} max-w-md`}
                placeholder="Ví dụ: 3 ngày, 1 tuần..."
                value={clinicalData.cuppingMarkTime}
                onChange={(e) => setClinicalData(prev => ({ ...prev, cuppingMarkTime: e.target.value }))}
              />
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 pb-8 pt-8 border-t border-gray-200 flex-wrap">
        <Button 
          onClick={handleSaveToDB} 
          className="bg-blue-700 hover:bg-blue-800 shadow-lg shadow-blue-200 min-w-[200px] py-3"
          title="Lưu dữ liệu vào hệ thống (không tải file)"
        >
          <Database size={20} />
          Lưu vào Cơ sở dữ liệu
        </Button>

        <Button 
          onClick={handleDownloadFiles} 
          className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 min-w-[200px] py-3"
          title="Lưu vào hệ thống và Tải 3 file CSV về máy"
        >
          <Download size={20} />
          Tải về file dữ liệu
        </Button>

        <div className="w-full sm:w-auto border-l border-gray-300 pl-0 sm:pl-4 ml-0 sm:ml-2">
            <Button 
              onClick={() => {
                 if(confirm("Bạn có chắc chắn muốn chuyển sang người tiếp theo? Hãy đảm bảo đã LƯU dữ liệu.")) {
                    onReset();
                 }
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 min-w-[200px] py-3"
              title="Kết thúc và nhập người mới"
            >
              <UserPlus size={20} />
              Người tiếp theo
            </Button>
        </div>

        <Button 
          onClick={() => {
              if (confirm("Bạn có chắc muốn hủy kết quả hiện tại?")) {
                  onReset();
              }
          }} 
          variant="outline"
          className="border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400 min-w-[100px] mt-2 sm:mt-0"
          title="Hủy bỏ kết quả này"
        >
          <XCircle size={18} />
          Hủy
        </Button>
      </div>
    </div>
  );
};