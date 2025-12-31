import React from 'react';
import { Question, AnswerValue } from '../types';
import { ANSWER_OPTIONS } from '../constants';

interface QuestionCardProps {
  question: Question;
  answer?: AnswerValue;
  onAnswer: (questionId: number, value: AnswerValue) => void;
  showError?: boolean; // Prop mới để hiển thị lỗi
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, onAnswer, showError }) => {
  // Hiển thị lỗi nếu đã yêu cầu check lỗi (showError=true) mà chưa có câu trả lời (!answer)
  const isMissing = showError && !answer;

  return (
    <div 
      id={`question-${question.id}`} 
      className={`bg-white p-6 rounded-lg shadow-sm border mb-4 transition-all hover:shadow-md 
        ${isMissing ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-gray-200'}`}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          <span className={`inline-block text-xs px-2 py-1 rounded mr-2 align-middle ${isMissing ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            Câu {question.id}
          </span>
          {question.text}
        </h3>
        {question.subText && (
          <p className="text-gray-500 text-sm mt-1 ml-1">{question.subText}</p>
        )}
        {isMissing && (
          <p className="text-red-600 text-sm font-medium mt-2 animate-pulse">
            * Vui lòng chọn một đáp án cho câu hỏi này.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {ANSWER_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onAnswer(question.id, option.value as AnswerValue)}
            className={`
              relative p-3 rounded-lg border text-sm text-left transition-all
              ${answer === option.value 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' 
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300'}
            `}
          >
            <div className="font-bold mb-1">{option.label}</div>
            <div className={`text-xs ${answer === option.value ? 'text-blue-100' : 'text-gray-500'}`}>
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};