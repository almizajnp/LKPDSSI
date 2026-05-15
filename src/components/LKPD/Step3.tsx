import React from 'react';
import { useLKPD } from '../../contexts/LKPDContext';
import { Info, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { ScientificTextarea } from '../ui/ScientificTextarea';
import { cn } from '../../lib/utils';

const sections = [
  { id: 'claim', label: 'Claim (Klaim)', desc: 'Tuliskan kesimpulan atau pendapat utama kelompokmu terkait permasalahan yang diberikan.' },
  { id: 'data', label: 'Data / Evidence', desc: 'Tuliskan data atau fakta yang mendukung klaim Anda.' },
  { id: 'warrant', label: 'Warrant (Jaminan)', desc: 'Jelaskan mengapa data tersebut mendukung kesimpulan Anda.' },
  { id: 'backing', label: 'Backing (Pendukung)', desc: 'Tambahkan teori atau referensi ilmiah pendukung lainnya.' },
  { id: 'qualifier', label: 'Qualifier (Kualifikasi)', desc: 'Tentukan tingkat keyakinan terhadap kesimpulan (misalnya: Pasti, Sangat mungkin, dsb).' },
  { id: 'rebuttal', label: 'Rebuttal (Sanggahan)', desc: 'Tuliskan kemungkinan pendapat lain yang dapat membantah klaim Anda.' },
];

export default function Step3() {
  const { answers, updateStepData } = useLKPD();

  const handleUpdate = (field: string, value: string) => {
    updateStepData('step3', { [field]: value });
  };

  const handleSubmitSection = (field: string) => {
    updateStepData('step3', { [`${field}_submitted`]: true });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-blue-600 pl-4">STEP 3 — Penyusunan Argumen (Model Toulmin)</h2>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm text-blue-800">
          <Info size={20} className="shrink-0" />
          <p>Gunakan Model Toulmin untuk menyusun argumen yang logis dan ilmiah. Isi setiap bagian berdasarkan data yang telah Anda kumpulkan pada tahap sebelumnya. <strong>Klik Submit di setiap bagian untuk membuka bagian selanjutnya.</strong></p>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {sections.map((sec, index) => {
          const isFirst = index === 0;
          const prevSecId = sections[index - 1]?.id;
          const isPrevSubmitted = isFirst || !!answers?.step3?.[`${prevSecId}_submitted`];
          const currentValue = answers?.step3?.[sec.id] || '';
          const isSubmitted = !!answers?.step3?.[`${sec.id}_submitted`];
          const isCurrentActive = isPrevSubmitted;

          return (
            <div 
              key={sec.id} 
              className={cn(
                "relative space-y-4 transition-all duration-500",
                !isCurrentActive ? "opacity-30 grayscale pointer-events-none" : "opacity-100"
              )}
            >
              {/* Connector line between steps */}
              {index < sections.length - 1 && (
                <div className="absolute left-4 top-10 bottom-[-48px] w-0.5 bg-slate-100 -z-10" />
              )}

              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-md transition-all duration-300",
                  isSubmitted 
                    ? "bg-green-500 text-white" 
                    : (isCurrentActive ? "bg-blue-600 text-white scale-110" : "bg-slate-200 text-slate-400")
                )}>
                  {isSubmitted ? <CheckCircle2 size={20} /> : index + 1}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-800">{sec.label}</span>
                    {isSubmitted && (
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Submited</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 italic">{sec.desc}</span>
                </div>
              </div>
              
              <div className="relative ml-0 md:ml-12">
                <ScientificTextarea 
                  placeholder={isCurrentActive ? `Tulis ${sec.label.split(' ')[0]} di sini (min. 15 karakter untuk lanjut)...` : "Selesaikan bagian sebelumnya terlebih dahulu..."}
                  value={currentValue}
                  onChange={(val) => handleUpdate(sec.id, val)}
                  minHeight="140px"
                  className={cn(
                    "text-sm shadow-sm transition-opacity",
                    isSubmitted ? "opacity-75" : "opacity-100"
                  )}
                  // Disable editing if submitted? The user didn't explicitly ask to lock editing, but "Submit" in Word usually means it's done.
                  // For now, let's keep it editable but maybe indicate it's submitted.
                />
                
                <div className="mt-4 flex justify-end">
                  {!isSubmitted ? (
                    <button
                      onClick={() => handleSubmitSection(sec.id)}
                      disabled={currentValue.trim().length < 15 || !isCurrentActive}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md active:scale-95",
                        currentValue.trim().length >= 15
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      Submit {sec.label.split(' ')[0]} <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-full border border-green-100">
                      <CheckCircle2 size={16} /> Selesai Disubmit
                    </div>
                  )}
                </div>

                {!isCurrentActive && (
                  <div className="absolute inset-0 -top-12 bg-slate-50/20 backdrop-blur-[1px] flex items-center justify-center rounded-xl cursor-not-allowed z-20">
                    <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg border border-slate-200 flex items-center gap-3 text-slate-500 text-sm font-bold animate-in zoom-in duration-300">
                      <Lock size={18} className="text-slate-400" /> 
                      Kunci: Submit {sections[index-1]?.label} dahulu
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
