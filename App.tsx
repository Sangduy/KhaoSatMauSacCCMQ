import React, { useState } from 'react';
import { IntroForm } from './components/IntroForm';
import { ConsentForm } from './components/ConsentForm';
import { SurveyForm } from './components/SurveyForm';
import { ResultsView } from './components/ResultsView';
import { AdminPanel } from './components/AdminPanel';
import { AppStep, UserProfile, SurveyData } from './types';

function App() {
  const [step, setStep] = useState<AppStep>(AppStep.CONSENT); // Bắt đầu bằng phiếu đồng thuận
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [surveyData, setSurveyData] = useState<SurveyData>({});

  // 1. Sau khi đồng thuận -> Chuyển sang nhập Info
  const handleConsentAgree = () => {
    setStep(AppStep.INTRO);
  };

  // 2. Sau khi nhập Info -> Chuyển sang Survey
  const handleIntroComplete = (data: UserProfile) => {
    setProfile(data);
    setStep(AppStep.SURVEY);
  };

  // 3. Sau khi làm Survey -> Xem kết quả
  const handleSurveyComplete = (data: SurveyData) => {
    setSurveyData(data);
    setStep(AppStep.RESULTS);
  };

  const handleReset = () => {
    setProfile(null);
    setSurveyData({});
    setStep(AppStep.CONSENT); // Reset về bước đồng thuận
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Nghiên Cứu Thể Chất YHCT</h1>
          </div>
          {profile && (
            <div className="text-sm text-gray-500 hidden sm:block font-medium">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                Mã BN: {profile.patientCode || profile.sequenceNumber}
              </span>
              {profile.fullName} ({profile.yearOfBirth})
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {step === AppStep.CONSENT && (
          <ConsentForm 
            onAgree={handleConsentAgree} 
          />
        )}

        {step === AppStep.INTRO && (
          <IntroForm onComplete={handleIntroComplete} />
        )}

        {step === AppStep.SURVEY && (
          <SurveyForm onComplete={handleSurveyComplete} />
        )}

        {step === AppStep.RESULTS && profile && (
          <ResultsView 
            data={surveyData} 
            profile={profile} 
            onReset={handleReset} 
          />
        )}
      </main>

      {/* Persistent Components */}
      <AdminPanel />
    </div>
  );
}

export default App;