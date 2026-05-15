import React from 'react';
import { useLKPD } from '../../contexts/LKPDContext';
import { ScientificTextarea } from '../ui/ScientificTextarea';

export default function Step1() {
  const { answers, updateStepData } = useLKPD();

  const handleTextChange = (val: string) => {
    updateStepData('step1', { initialOpinion: val });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold border-l-4 border-blue-600 pl-4">STEP 1 — Penentuan Tugas (Identifikasi Masalah)</h2>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-lg">Simak Video Berikut:</h3>
            <p className="text-slate-600 text-sm">Amati fenomena yang ditampilkan dalam video untuk membantu Anda mengidentifikasi masalah yang ada.</p>
          </div>
          
          <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
            <iframe 
              className="w-full h-full"
              src="https://www.youtube.com/embed/_tLCQlB9eRs?si=sxWj1mBWwMKWftYu" 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              referrerPolicy="strict-origin-when-cross-origin" 
              allowFullScreen
            ></iframe>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900 text-sm font-medium italic">
              "Berdasarkan fenomena pada video dan kasus rokok (Kesehatan vs Ekonomi), permasalahan apa yang Anda temukan?"
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block font-bold text-slate-800">
          Rumusan Pertanyaan Investigasi:
          <span className="block text-xs font-normal text-slate-500 mt-1 uppercase tracking-wider">Tuliskan satu atau lebih pertanyaan yang akan Anda selidiki melalui LKPD ini.</span>
        </label>
        <ScientificTextarea 
          placeholder="Contoh: Bagaimana dampak zat kimia dalam rokok terhadap kesehatan paru-paru dibandingkan dengan kontribusi ekonominya?"
          value={answers?.step1?.initialOpinion || ''}
          onChange={handleTextChange}
          minHeight="200px"
        />
        <p className="text-right text-[10px] text-slate-400 italic flex items-center justify-end gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Tersimpan secara otomatis ke server
        </p>
      </div>
    </div>
  );
}
