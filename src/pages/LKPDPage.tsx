import React from 'react';
import { useLKPD } from '../contexts/LKPDContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Home, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

// Steps
import Step1 from '../components/LKPD/Step1';
import Step2 from '../components/LKPD/Step2';
import Step3 from '../components/LKPD/Step3';
import Step4 from '../components/LKPD/Step4';

export default function LKPDPage() {
  const { answers, loading } = useLKPD();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Validation logic - checking if steps are completed to unlock next stages
  const isStep1Complete = !!answers?.step1?.initialOpinion && answers.step1.initialOpinion.trim().length > 20;
  
  const isStep2Complete = 
    (answers?.step2?.table1 && answers.step2.table1.some((row: any) => row.chemical && row.source)) ||
    (answers?.step2?.table2 && answers.step2.table2.some((row: any) => row.impact && row.source)) ||
    (answers?.step2?.table3 && answers.step2.table3.some((row: any) => row.impact && row.source));

  const isStep3Complete = 
    !!answers?.step3?.claim_submitted &&
    !!answers?.step3?.data_submitted &&
    !!answers?.step3?.warrant_submitted &&
    !!answers?.step3?.backing_submitted &&
    !!answers?.step3?.qualifier_submitted &&
    !!answers?.step3?.rebuttal_submitted;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse">Menghubungkan ke LKPD...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Statis */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/student')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Home size={20} className="text-slate-500" />
            </button>
            <div className="border-l border-slate-200 pl-4">
              <h1 className="text-lg font-bold text-slate-900 leading-tight uppercase tracking-tight">LKPD SSI: ROKOK & EKONOMI</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                MODE: <span className={profile?.groupId ? "text-indigo-600" : "text-emerald-600"}>
                  {profile?.groupId ? `KOLABORASI KELOMPOK` : 'BELAJAR MANDIRI'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> SINKRONISASI AKTIF
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-12 space-y-16">
        
        {/* Info Box */}
        <div className="bg-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CheckCircle2 size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Selamat Datang di Lembar Kerja!</h2>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Selesaikan setiap tahapan secara berurutan. Tahapan berikutnya akan terbuka secara otomatis setelah Anda memberikan jawaban yang memadai pada tahapan sebelumnya.
            </p>
          </div>
        </div>

        {/* Step 1: Selalu Aktif */}
        <section id="step-1" className="relative">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden transition-all">
            {isStep1Complete && (
              <div className="absolute top-6 right-6 text-green-500 flex items-center gap-1.5 text-xs font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <CheckCircle2 size={16} /> SELESAI
              </div>
            )}
            <Step1 />
          </div>
        </section>

        {/* Step 2: Dilindungi Step 1 */}
        <StepWrapper 
          id="step-2"
          isLocked={!isStep1Complete} 
          isComplete={isStep2Complete}
          lockMessage="Tuliskan rumusan pertanyaan investigasi Anda di Step 1 (minimal 20 karakter) untuk membuka materi investigasi ini."
        >
          <Step2 />
        </StepWrapper>

        {/* Step 3: Dilindungi Step 2 */}
        <StepWrapper 
          id="step-3"
          isLocked={!isStep2Complete} 
          isComplete={isStep3Complete}
          lockMessage="Lengkapi setidaknya satu baris data pada tabel investigasi di atas untuk mulai menyusun argumen Anda."
        >
          <Step3 />
        </StepWrapper>

        {/* Step 4: Dilindungi Step 3 */}
        <StepWrapper 
          id="step-4"
          isLocked={!isStep3Complete} 
          isComplete={!!answers?.step4?.q3}
          lockMessage="Selesaikan seluruh rangkaian argumen Toulmin (Klaim hingga Sanggahan) pada Step 3 untuk membuka tahap refleksi dan kesimpulan akhir."
        >
          <Step4 />
        </StepWrapper>

        {/* Action Bar / Completion Check */}
        <div className="py-20 border-t border-slate-200 flex flex-col items-center">
            {isStep1Complete && isStep2Complete && isStep3Complete && answers?.step4?.q3 ? (
                <div className="bg-green-500 p-8 rounded-3xl text-white text-center shadow-xl shadow-green-200 max-w-lg">
                    <CheckCircle2 size={48} className="mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Luar Biasa!</h3>
                    <p className="text-green-50">Anda telah menyelesaikan seluruh rangkaian LKPD ini. Pastikan semua jawaban sudah sesuai sebelum meninggalkan halaman.</p>
                </div>
            ) : (
                <div className="flex items-center gap-3 text-slate-400 bg-slate-100 px-6 py-4 rounded-2xl">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">Selesaikan seluruh tahapan untuk melengkapi pembelajaran Anda hari ini.</span>
                </div>
            )}
        </div>

      </main>
      
      {/* Floating Progress Tracker */}
      <div className="fixed bottom-6 right-6 z-40 bg-slate-900/95 backdrop-blur-sm text-white p-5 rounded-2xl shadow-2xl border border-white/10 hidden lg:block w-64 ring-1 ring-white/20">
        <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em] flex justify-between items-center">
          Pencapaian Belajar <span>{Math.round((([isStep1Complete, isStep2Complete, isStep3Complete, answers?.step4?.q3].filter(Boolean).length) / 4) * 100)}%</span>
        </p>
        <div className="space-y-3">
          {[
            { label: 'Opini Awal', ok: isStep1Complete },
            { label: 'Investigasi Data', ok: isStep2Complete },
            { label: 'Struktur Argumen', ok: isStep3Complete },
            { label: 'Refleksi Akhir', ok: !!answers?.step4?.q3 }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`}></div>
              <span className={`text-xs font-medium ${item.ok ? 'text-white' : 'text-slate-500'}`}>{item.label}</span>
              {item.ok && <CheckCircle2 size={12} className="ml-auto text-green-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface StepWrapperProps {
  id: string;
  children: React.ReactNode;
  isLocked: boolean;
  isComplete: boolean;
  lockMessage: string;
}

function StepWrapper({ id, children, isLocked, isComplete, lockMessage }: StepWrapperProps) {
  return (
    <section id={id} className="relative group">
      {/* Visual background for locked state */}
      <div className={`transition-all duration-700 ease-in-out ${isLocked ? 'blur-md grayscale opacity-30 select-none' : 'blur-0 grayscale-0 opacity-100'}`}>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
          {isComplete && !isLocked && (
            <div className="absolute top-6 right-6 text-green-500 flex items-center gap-1.5 text-xs font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100 z-10">
              <CheckCircle2 size={16} /> SELESAI
            </div>
          )}
          {children}
        </div>
      </div>
      
      {/* Overlay for locked state */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-5 max-w-md text-center transform scale-95 group-hover:scale-100 transition-transform duration-500">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-inner">
               <Lock size={32} />
            </div>
            <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-lg uppercase tracking-tight">Tahapan Belum Terbuka</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{lockMessage}</p>
            </div>
            <div className="pt-2">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-12 animate-shimmer"></div>
                </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
