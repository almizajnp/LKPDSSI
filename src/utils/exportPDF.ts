import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportLKPDToPDF = (answer: any, mode: 'all' | 'group' | 'individual' = 'all') => {
  const doc = new jsPDF();
  let title = `LAPORAN HASIL LKPD INTERAKTIF`;
  
  if (mode === 'individual') {
    title = "LAPORAN INVESTIGASI MANDIRI (TAHAP 4)";
  } else if (mode === 'group') {
    title = "LAPORAN KERJA KELOMPOK (TAHAP 1-3)";
  }
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(title, 105, 18, { align: 'center' });
  
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);
  
  // Identity Section
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // Slate 600
  
  let infoY = 35;
  doc.setFont("helvetica", "normal");
  
  const isTargetGroup = answer.targetType === 'group' || mode === 'group';
  
  if (!isTargetGroup) {
    doc.text(`Nama  : ${answer.studentName || 'Siswa'}`, 20, infoY);
    infoY += 7;
    doc.text(`Kelas : ${answer.className || '-'}`, 20, infoY);
  } else {
    doc.text(`Kelompok: ${answer.groupName || 'Kelompok'}`, 20, infoY);
    infoY += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Anggota:", 20, infoY);
    doc.setFont("helvetica", "normal");
    
    const members = answer.groupMembers || [];
    if (members.length > 0) {
      members.forEach((name: string, index: number) => {
        infoY += 6;
        doc.text(`${index + 1}. ${name}`, 20, infoY);
      });
    } else {
      infoY += 6;
      doc.text("-", 20, infoY);
    }
  }
  
  infoY += 10;
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(`Selesai Pada: ${answer.updatedAt ? new Date(answer.updatedAt).toLocaleString('id-ID') : '-'}`, 20, infoY);
  
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(20, infoY + 5, 190, infoY + 5);
  
  let y = infoY + 15;

  // Decide what to show
  const showStages1to3 = mode === 'all' || mode === 'group';
  const showStage4 = mode === 'all' || mode === 'individual';

  if (showStages1to3) {
    // Step 1
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Blue 600
    doc.text("TAHAP 1: PENENTUAN TUGAS (OPINI AWAL)", 20, y);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    y += 8;
    const q1Desc = "Kasus: Apakah produksi rokok perlu dihentikan demi kesehatan atau dilanjutkan demi keseimbangan ekonomi?";
    doc.text(q1Desc, 20, y);
    
    y += 10;
    doc.setFont("helvetica", "italic");
    const step1Text = answer.step1?.initialOpinion || "Tidak ada jawaban yang diberikan.";
    const splitStep1 = doc.splitTextToSize(step1Text, 170);
    doc.text(splitStep1, 20, y);
    y += (splitStep1.length * 6) + 15;

    // Step 2
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TAHAP 2: INVESTIGASI DATA (DATA GENERATION)", 20, y);
    y += 10;
    
    doc.setFontSize(11);
    if (answer.step2) {
      if (answer.step2.table1 && answer.step2.table1.length > 0) {
        doc.text("Tabel 1: Zat Kimia Berbahaya dalam Rokok", 20, y);
        autoTable(doc, {
          startY: y + 5,
          margin: { left: 20 },
          head: [['Zat Kimia', 'Sumber Pengamatan']],
          body: answer.step2.table1.map((r: any) => [r.chemical || '-', r.source || '-']),
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
      
      if (y > 250) { doc.addPage(); y = 20; }

      if (answer.step2.table2 && answer.step2.table2.length > 0) {
        doc.text("Tabel 2: Dampak Merokok Terhadap Kesehatan", 20, y);
        autoTable(doc, {
          startY: y + 5,
          margin: { left: 20 },
          head: [['Dampak Kesehatan', 'Sumber Pengamatan']],
          body: answer.step2.table2.map((r: any) => [r.impact || '-', r.source || '-']),
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      if (y > 250) { doc.addPage(); y = 20; }

      if (answer.step2.table3 && answer.step2.table3.length > 0) {
        doc.text("Tabel 3: Dampak Rokok Terhadap Ekonomi", 20, y);
        autoTable(doc, {
          startY: y + 5,
          margin: { left: 20 },
          head: [['Dampak Ekonomi', 'Sumber Pengamatan']],
          body: answer.step2.table3.map((r: any) => [r.impact || '-', r.source || '-']),
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    if (y > 220) { doc.addPage(); y = 20; }

    // Step 3
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TAHAP 3: PENYUSUNAN ARGUMEN (TOULMIN MODEL)", 20, y);
    y += 10;
    
    const sections = [
      { id: 'claim', label: 'Claim (Klaim)' },
      { id: 'data', label: 'Data' },
      { id: 'warrant', label: 'Warrant (Penjamin)' },
      { id: 'backing', label: 'Backing (Pendukung)' },
      { id: 'qualifier', label: 'Qualifier (Pemberi Syarat)' },
      { id: 'rebuttal', label: 'Rebuttal (Sanggahan)' }
    ];

    sections.forEach(sec => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${sec.label}:`, 20, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const val = answer.step3?.[sec.id] || "Tidak ada jawaban.";
      const splitVal = doc.splitTextToSize(val, 170);
      doc.text(splitVal, 20, y);
      y += (splitVal.length * 5) + 8;
      
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  if (y > 240) { doc.addPage(); y = 20; }

  // Step 4 (Individual or Solo Individual)
  if (showStage4) { 
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TAHAP 4: REFLEKSI & KESIMPULAN AKHIR", 20, y);
    y += 10;

    const questions = [
      { id: 'q1', label: 'Tujuan Penyelidikan' },
      { id: 'q2', label: 'Cara Memperoleh Data' },
      { id: 'q3', label: 'Kesimpulan Berdasarkan Data' }
    ];

    questions.forEach(q => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${q.label}:`, 20, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const val = answer.step4?.[q.id] || "Tidak ada jawaban.";
      const splitVal = doc.splitTextToSize(val, 170);
      doc.text(splitVal, 20, y);
      y += (splitVal.length * 5) + 8;
      
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  // Filename logic
  let suffix = "LAPORAN";
  if (mode === 'group') suffix = "KELOMPOK_T1-T3";
  else if (mode === 'individual') suffix = "REFLEKSI_T4";
  else if (answer.targetType === 'user') suffix = "INDIVIDU_LENGKAP";

  const fileName = `LKPD_${answer.className || 'Hasil'}_${answer.groupName || answer.studentName || 'Laporan'}_${suffix}.pdf`;
  doc.save(fileName);
};
