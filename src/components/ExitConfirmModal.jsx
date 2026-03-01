import transferManager from '../utils/transferManager';
import changeLogSync from '../utils/changeLogSync';
import localDB from '../utils/localDB';

export default function ExitConfirmModal({ dirtyCount, onCancel, onExit }) {
  const handleSaveToServer = async () => {
    // ChangeLog zaten yazıldı, sadece dirty temizle
    localDB.clearDirty();
    
    // Bugünün cache'ıni kaydet
    await transferManager.exportData(true);
    
    onExit();
  };

  const handleSaveToLocal = async () => {
    // Yerel yedek oluştur
    await transferManager.exportData();
    localDB.clearDirty();
    onExit();
  };

  const handleExitWithoutSave = async () => {
    // Yine de cache kaydet (sessiz)
    await transferManager.exportData(true);
    localDB.clearDirty();
    onExit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kaydedilmemiş Değişiklikler</h2>
            <p className="text-sm text-gray-600">{dirtyCount} değişiklik kaydedilmedi</p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          Çıkmadan önce değişikliklerinizi kaydetmek ister misiniz?
        </p>

        <div className="space-y-3">
          <button
            onClick={handleSaveToServer}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Servera Kaydet ve Çık
          </button>

          <button
            onClick={handleSaveToLocal}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Yerel Yedek Al ve Çık
          </button>

          <button
            onClick={handleExitWithoutSave}
            className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 font-semibold transition-all"
          >
            Kaydetmeden Çık
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-all"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
