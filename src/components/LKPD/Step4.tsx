import React, { useState } from 'react';
import { useLKPD } from '../../contexts/LKPDContext';
import { ScientificTextarea } from '../ui/ScientificTextarea';
import { exportLKPDToPDF } from '../../utils/exportPDF';
import { Download, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const questions = [
  { id: 'q1', label: 'Apa tujuan penyelidikan yang kamu lakukan?' },
  { id: 'q2', label: 'Bagaimana cara memperoleh data?' },
  { id: 'q3', label: 'Apa kesimpulan yang diperoleh berdasarkan data?' },
];

export default function Step4() {
  const { answers, updateStepData, submitStep4 } = useLKPD();
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = (field: string, value: string) => {
    updateStepData('step4', { [field]: value });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitStep4();
      toast.success('Jawaban Anda telah berhasil disimpan!', {
        duration: 4000,
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (error) {
      toast.error('Gagal menyimpan jawaban. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (answers) {
      exportLKPDToPDF(answers, 'individual');
    }
  };

  const isComplete = answers?.step4?.q1 && answers?.step4?.q2 && answers?.step4?.q3;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-blue-600 pl-4">STEP 4 — Laporan Investigasi Penutup</h2>
        <p className="text-slate-600 text-sm">Secara Individu Berikan ringkasan akhir mengenai proses penyelidikan yang telah Anda lakukan.</p>
      </div>

      <div className="space-y-8">
        {questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <label className="block text-sm font-bold text-slate-800">
              {q.label}
            </label>
            <ScientificTextarea 
              placeholder="Tuliskan jawaban reflektif Anda..."
              value={answers?.step4?.[q.id] || ''}
              onChange={(val) => handleUpdate(q.id, val)}
              minHeight="160px"
              italic
            />
          </div>
        ))}
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl text-white space-y-6 text-center shadow-xl shadow-slate-100">
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Simpan Hasil Penyelidikan</h3>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Klik tombol di bawah untuk memastikan seluruh jawaban Tahap 4 Anda terekam di database guru sebagai laporan mandiri.
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            className={`flex items-center gap-2 font-bold py-4 px-10 rounded-2xl transition-all shadow-lg text-lg
              ${!isComplete || submitting 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95 shadow-emerald-500/20'
              }`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send size={20} />
            )}
            {submitting ? 'Menyimpan...' : 'SIMPAN & KIRIM LAPORAN'}
          </button>

          {isComplete && (
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
              >
                <Download size={18} /> Pratinjau PDF Laporan Tahap 4
              </button>
              <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/30">
                <CheckCircle size={12} /> Siap Dikirim
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
