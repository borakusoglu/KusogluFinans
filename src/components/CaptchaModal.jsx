import { useState } from 'react';

export default function CaptchaModal({ onVerify, onClose }) {
  const [answer, setAnswer] = useState('');
  const [num1] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [num2] = useState(() => Math.floor(Math.random() * 10) + 1);
  const correctAnswer = num1 + num2;

  const handleSubmit = () => {
    if (parseInt(answer) === correctAnswer) {
      onVerify(true);
    } else {
      alert('Yanlış cevap!');
      setAnswer('');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200]" style={{background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)'}}>
      <div className="bg-white rounded-2xl shadow-2xl w-[400px] p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Güvenlik Kontrolü</h3>
          <p className="text-gray-600">Lütfen aşağıdaki soruyu cevaplayın</p>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 mb-6 text-center">
          <p className="text-3xl font-bold text-gray-900 mb-4">
            {num1} + {num2} = ?
          </p>
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="?"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all font-semibold shadow-lg"
          >
            Doğrula
          </button>
          <button
            onClick={() => onVerify(false)}
            className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all font-semibold shadow-lg"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
