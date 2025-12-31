import React, { useState, useRef, useEffect } from 'react';
import { QuestionCard } from './QuestionCard';
import { Button } from './Button';
import { SurveyData, AnswerValue } from '../types';
import { CCMQ_QUESTIONS } from '../constants';

interface SurveyFormProps {
  onComplete: (data: SurveyData) => void;
}

const QUESTIONS_PER_PAGE = 10;

export const SurveyForm: React.FC<SurveyFormProps> = ({ onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<SurveyData>({});
  const [showError, setShowError] = useState(false); // State để kích hoạt hiển thị lỗi
  const topRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(CCMQ_QUESTIONS.length / QUESTIONS_PER_PAGE);
  const currentQuestions = CCMQ_QUESTIONS.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  // Reset error state khi chuyển trang
  useEffect(() => {
    setShowError(false);
  }, [currentPage]);

  const handleAnswer = (questionId: number, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const isPageComplete = () => {
    return currentQuestions.every(q => answers[q.id] !== undefined);
  };

  const handleNext = () => {
    // Kiểm tra xem trang hiện tại đã làm hết chưa
    if (!isPageComplete()) {
      setShowError(true);
      
      // Tìm câu đầu tiên chưa làm và cuộn tới đó
      const firstMissing = currentQuestions.find(q => answers[q.id] === undefined);
      if (firstMissing) {
        const element = document.getElementById(`question-${firstMissing.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      // Có thể thêm alert nếu muốn gây chú ý mạnh hơn
      alert("Bạn vẫn còn câu hỏi chưa trả lời trên trang này. Vui lòng kiểm tra lại các ô được tô đỏ.");
      return;
    }

    // Nếu đã hoàn thành
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      onComplete(answers);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      setTimeout(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const progress = (Object.keys(answers).length / CCMQ_QUESTIONS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto" ref={topRef}>
      {/* Sticky Header with Progress */}
      <div className="sticky top-0 z-30 bg-gray-50 pt-4 pb-4 mb-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-800">
            Trang {currentPage + 1} / {totalPages}
          </h2>
          <span className="text-sm font-medium text-blue-600">
            Đã hoàn thành {Object.keys(answers).length}/{CCMQ_QUESTIONS.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Instructions Reminder */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Hãy chọn đáp án phù hợp nhất dựa trên tình trạng của bạn trong <strong>01 năm qua</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {currentQuestions.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            answer={answers[q.id]}
            onAnswer={handleAnswer}
            showError={showError} // Truyền trạng thái lỗi xuống từng thẻ
          />
        ))}
      </div>

      {/* Error Message if Validation Fails */}
      {showError && !isPageComplete() && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center animate-bounce">
          <strong>Lưu ý:</strong> Vui lòng hoàn thành tất cả các câu hỏi được tô đỏ ở trên trước khi tiếp tục.
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 mb-12 p-4 bg-white rounded-xl shadow-sm border border-gray-100 sticky bottom-4 z-20">
        <Button 
          variant="secondary" 
          onClick={handlePrev} 
          disabled={currentPage === 0}
          className="w-32"
        >
          Quay lại
        </Button>
        <Button 
          variant="primary" 
          onClick={handleNext} 
          // Removed disabled prop so user can click to trigger validation
          className="w-32 shadow-lg shadow-blue-200"
        >
          {currentPage === totalPages - 1 ? 'Hoàn tất' : 'Tiếp theo'}
        </Button>
      </div>
    </div>
  );
};