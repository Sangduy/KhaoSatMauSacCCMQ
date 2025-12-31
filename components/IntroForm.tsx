import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Button } from './Button';
import { getNextSequenceNumber, getAbbreviation } from '../services/storageService';

interface IntroFormProps {
  onComplete: (profile: UserProfile) => void;
}

export const IntroForm: React.FC<IntroFormProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    class: '',
    phoneNumber: '',
    yearOfBirth: '',
    gender: '' as 'Nam' | 'Nữ' | '',
    weight: '',
    height: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fullName && formData.class && formData.yearOfBirth && formData.gender) {
      const sequenceNumber = getNextSequenceNumber();
      const abbr = getAbbreviation(formData.fullName);
      const patientCode = `${abbr}${sequenceNumber}`;
      
      const fullProfile: UserProfile = {
        ...formData,
        sequenceNumber,
        patientCode
      };
      
      onComplete(fullProfile);
    } else {
      alert("Vui lòng điền đầy đủ các trường bắt buộc (*)");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClasses = "w-full p-3 border border-gray-400 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400";

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div className="text-center mb-8">
         <h1 className="text-2xl font-bold text-gray-800 mb-2">THÔNG TIN KHẢO SÁT</h1>
         <p className="text-gray-600">Vui lòng cung cấp lại thông tin chi tiết để hệ thống tạo mã bệnh nhân.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên (Viết tắt tên) *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Ví dụ: Nguyễn Văn A"
              className={inputClasses}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Vui lòng ghi rõ Họ & Tên lót, chỉ viết tắt Tên gọi (hệ thống sẽ tự động tạo mã).
            </p>
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
              Lớp *
            </label>
            <input
              type="text"
              name="class"
              value={formData.class}
              onChange={handleChange}
              placeholder="VD: YHCT20"
              className={inputClasses}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm sinh *</label>
            <input
              type="number"
              name="yearOfBirth"
              value={formData.yearOfBirth}
              onChange={handleChange}
              placeholder="VD: 1990"
              className={inputClasses}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính *</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={inputClasses}
              required
            >
              <option value="">-- Chọn giới tính --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại (Không bắt buộc)
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="VD: 0912345678"
              className={inputClasses}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cân nặng (kg)</label>
            <input
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (cm)</label>
            <input
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full text-lg py-3">
            Bắt đầu làm 60 câu hỏi
          </Button>
        </div>
      </form>
    </div>
  );
};