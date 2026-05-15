import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb, auth } from '../firebase/config';
import { ref, onValue, push, set, query, orderByChild, equalTo, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { BookOpen, LogOut, Plus, Users, LayoutDashboard, FileText, Download, CheckCircle, Clock, ArrowRight, UserPlus, ShieldAlert, ArrowLeft } from 'lucide-react';
import { exportLKPDToPDF } from '../utils/exportPDF';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [className, setClassName] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<'overview' | 'groups' | 'individuals' | 'peer-review'>('overview');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [peerAssignments, setPeerAssignments] = useState<Record<string, any>>({});
  const [peerReviews, setPeerReviews] = useState<Record<string, any>>({});
  const [resolvedNames, setResolvedNames] = useState<Record<string, {name: string, members?: string[], memberUids?: string[]}>>({});
  const navigate = useNavigate();

  // Reset view when class changes
  useEffect(() => {
    setDashboardView('overview');
    setSelectedGroupId(null);
  }, [activeClass]);

  // Fetch Peer Data
  useEffect(() => {
    if (!activeClass) return;
    const assignmentsRef = ref(rtdb, `peerAssignments/${activeClass}`);
    const reviewsRef = ref(rtdb, `peerReviews/${activeClass}`);
    
    const unsubAssignments = onValue(assignmentsRef, (snap) => {
      setPeerAssignments(snap.val() || {});
    });
    const unsubReviews = onValue(reviewsRef, (snap) => {
      setPeerReviews(snap.val() || {});
    });

    return () => {
      unsubAssignments();
      unsubReviews();
    };
  }, [activeClass]);

  // Dynamic name resolution for legacy records
  useEffect(() => {
    const resolveNames = async () => {
      const newResolved: Record<string, {name: string, members?: string[], memberUids?: string[]}> = { ...resolvedNames };
      let changed = false;

      for (const answer of answers) {
        if ((!answer.studentName && !answer.groupName && !resolvedNames[answer.targetId]) || (answer.targetType === 'group' && !answer.groupMembers && !resolvedNames[answer.targetId]?.members)) {
          try {
            if (answer.targetType === 'group') {
              const snap = await get(ref(rtdb, `groups/${answer.targetId}`));
              if (snap.exists()) {
                const groupData = snap.val();
                let members: string[] = [];
                let memberUids: string[] = [];
                if (groupData.members && Array.isArray(groupData.members)) {
                  memberUids = groupData.members;
                  members = await Promise.all(
                    groupData.members.map(async (uid: string) => {
                      const uSnap = await get(ref(rtdb, `users/${uid}`));
                      return uSnap.exists() ? uSnap.val().name : "Unknown";
                    })
                  );
                }
                newResolved[answer.targetId] = { 
                  name: groupData.groupName,
                  members,
                  memberUids
                };
                changed = true;
              }
            } else {
              const snap = await get(ref(rtdb, `users/${answer.targetId}`));
              if (snap.exists()) {
                newResolved[answer.targetId] = { name: snap.val().name };
                changed = true;
              }
            }
          } catch (e) {
            console.error("Resolve error:", e);
          }
        }
      }

      if (changed) {
        setResolvedNames(newResolved);
      }
    };

    if (answers.length > 0) {
      resolveNames();
    }
  }, [answers]);

  useEffect(() => {
    if (!profile) return;
    const classesRef = ref(rtdb, 'classes');
    const q = query(classesRef, orderByChild('teacherId'), equalTo(profile.uid));
    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setClasses(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else {
        setClasses([]);
      }
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!activeClass) return;
    const answersRef = ref(rtdb, 'answers');
    const q = query(answersRef, orderByChild('classId'), equalTo(activeClass));
    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAnswers(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else {
        setAnswers([]);
      }
    });

    const usersRef = ref(rtdb, 'users');
    const uq = query(usersRef, orderByChild('classCode'), equalTo(activeClass));
    const uUnsubscribe = onValue(uq, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setClassStudents(Object.entries(data).map(([uid, val]: [string, any]) => ({ uid, ...val })));
        
        // Also pre-resolve names
        const preResolved: Record<string, {name: string}> = {};
        Object.entries(data).forEach(([uid, val]: [string, any]) => {
          preResolved[uid] = { name: val.name };
        });
        setResolvedNames(prev => ({ ...prev, ...preResolved }));
      } else {
        setClassStudents([]);
      }
    });

    return () => {
      unsubscribe();
      uUnsubscribe();
    };
  }, [activeClass]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newClassRef = push(ref(rtdb, 'classes'));
      await set(newClassRef, {
        className,
        classCode,
        teacherId: profile?.uid,
        createdAt: new Date().toISOString()
      });
      setClassName('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = (answer: any, mode: 'all' | 'group' | 'individual' = 'all') => {
    const mergedAnswer = {
      ...answer,
      studentName: answer.studentName || (answer.targetType === 'user' ? resolvedNames[answer.targetId]?.name : undefined),
      groupName: answer.groupName || (answer.targetType === 'group' ? resolvedNames[answer.targetId]?.name : undefined),
      groupMembers: answer.groupMembers || (answer.targetType === 'group' ? resolvedNames[answer.targetId]?.members : undefined)
    };
    exportLKPDToPDF(mergedAnswer, mode);
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-display font-bold text-blue-600 flex items-center gap-2">
          <BookOpen className="inline" /> DASHBOARD GURU
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium text-slate-900 hidden sm:block">{profile?.name}</p>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {!activeClass ? (
          <div className="space-y-8">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Selamat Datang, {profile?.name.split(' ')[0]}!</h2>
                <p className="text-slate-500">Kelola kelas dan pantau progres belajar siswa Anda.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Creation Sidebar */}
              <aside className="lg:col-span-1">
                <Card className="border-blue-100 bg-blue-50/20">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-blue-600 flex items-center gap-2">
                      <Plus size={16} /> Buat Kelas Baru
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateClass} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Kelas</label>
                        <input 
                          type="text" 
                          className="lkpd-input bg-white" 
                          placeholder="Contoh: XI-IPA 1"
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          required
                        />
                      </div>
                      <button 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                      >
                        {loading ? 'Memproses...' : 'BUAT KELAS'}
                      </button>
                    </form>
                  </CardContent>
                </Card>
              </aside>

              {/* Class Grid */}
              <div className="lg:col-span-3 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Daftar Kelas Anda</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classes.map(c => (
                    <button 
                      key={c.id} 
                      onClick={() => setActiveClass(c.id)}
                      className="group bg-white border-2 border-slate-100 p-6 rounded-2xl text-left hover:border-blue-500 hover:shadow-xl transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users size={80} />
                      </div>
                      <div className="relative z-10">
                        <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <BookOpen size={24} />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase">{c.className}</h4>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Kode Akses</span>
                            <span className="text-lg font-mono font-black text-slate-700">{c.classCode}</span>
                          </div>
                          <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            MASUK DASHBOARD <ArrowRight size={10} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {classes.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
                      <LayoutDashboard size={40} className="text-slate-300" />
                      <p className="text-slate-400 font-medium italic">Belum ada kelas yang dibuat.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveClass(null)}
                  className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all"
                  title="Kembali ke Daftar Kelas"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 uppercase font-bold tracking-wider">
                    <span className="cursor-pointer hover:text-blue-500" onClick={() => setActiveClass(null)}>KELAS</span>
                    <span>/</span>
                    <span className="text-blue-600">{classes.find(c => c.id === activeClass)?.className}</span>
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-900">
                    {dashboardView === 'overview' ? 'Monitoring Progres' : (dashboardView === 'groups' ? 'Pekerjaan Kelompok' : dashboardView === 'individuals' ? 'Pekerjaan Individu' : 'Manajemen Penilaian Sejawat')}
                  </h2>
                </div>
              </div>
              
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 self-start">
                {[
                  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
                  { id: 'groups', label: 'Kelompok', icon: Users },
                  { id: 'individuals', label: 'Individu', icon: FileText },
                  { id: 'peer-review', label: 'Review', icon: ShieldAlert },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setDashboardView(tab.id as any); setSelectedGroupId(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${dashboardView === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </header>

              {dashboardView === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button 
                    onClick={() => setDashboardView('groups')}
                    className="p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left group"
                  >
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                      <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Pekerjaan Kelompok</h3>
                    <p className="text-slate-500 text-sm">Monitoring jawaban kolaboratif Tahap 1-3 dan refleksi individu anggota kelompok.</p>
                  </button>

                  <button 
                    onClick={() => setDashboardView('individuals')}
                    className="p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left group"
                  >
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Pekerjaan Individu</h3>
                    <p className="text-slate-500 text-sm">Monitoring jawaban siswa yang mengerjakan seluruh tahapan secara mandiri.</p>
                  </button>

                  <button 
                    onClick={() => setDashboardView('peer-review')}
                    className="p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left group col-span-1 md:col-span-2 lg:col-span-1"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform">
                      <Users size={32} className="rotate-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Peer Review</h3>
                    <p className="text-slate-500 text-sm">Kelola tugas penilaian sejawat antar siswa di kelas ini secara anonim.</p>
                  </button>
                </div>
              )}

              {dashboardView === 'groups' && !selectedGroupId && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {answers.filter(a => a.targetType === 'group').map(group => {
                    const groupMeta = resolvedNames[group.targetId];
                    return (
                      <button 
                        key={group.id} 
                        onClick={() => setSelectedGroupId(group.targetId)}
                        className="bg-white border border-slate-200 p-6 rounded-xl hover:border-indigo-500 transition-all text-left group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                            <Users size={20} />
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase font-bold">Kelompok</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                          {group.groupName || groupMeta?.name || 'Kelompok'}
                        </h4>
                        <p className="text-xs text-slate-400 mb-3">Update: {new Date(group.updatedAt).toLocaleString('id-ID')}</p>
                        <div className="flex -space-x-2 overflow-hidden">
                          {(group.groupMembers || groupMeta?.members || []).slice(0, 4).map((m: string, i: number) => (
                            <div key={i} className="inline-block h-6 w-6 rounded-full bg-slate-200 border-2 border-white ring-2 ring-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {m.charAt(0)}
                            </div>
                          ))}
                          {(group.groupMembers || groupMeta?.members || []).length > 4 && (
                            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 border-2 border-white text-[8px] font-bold text-slate-400">
                              +{(group.groupMembers || groupMeta?.members || []).length - 4}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {answers.filter(a => a.targetType === 'group').length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">Belum ada progres kelompok di kelas ini.</div>
                  )}
                </div>
              )}

              {dashboardView === 'groups' && selectedGroupId && (
                <div className="space-y-6">
                  <header className="bg-indigo-600 p-8 rounded-2xl text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-3xl font-bold mb-2">{resolvedNames[selectedGroupId]?.name || 'Kelompok'}</h3>
                        <p className="text-indigo-100 opacity-80">Monitoring detail jawaban kolaboratif dan individu anggota.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedGroupId(null)}
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Kembali
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Collaborative Box */}
                    <Card className="md:col-span-1 border-2 border-indigo-100">
                      <CardHeader className="bg-indigo-50/50">
                        <CardTitle className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                          <Users size={16} /> JAWABAN BERSAMA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 py-6">
                        <p className="text-sm text-slate-600">Download laporan kolaboratif untuk Tahap 1 sampai Tahap 3.</p>
                        {answers.find(a => a.targetId === selectedGroupId) ? (
                          <button 
                            onClick={() => handleExportPDF(answers.find(a => a.targetId === selectedGroupId), 'group')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                          >
                            <Download size={18} /> Download Laporan (T1-T3)
                          </button>
                        ) : (
                          <p className="text-xs text-red-500 italic font-medium">Laporan belum tersedia.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Member Reflections */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 px-2">
                        <FileText size={18} className="text-emerald-500" /> Investigasi Mandiri Anggota (Tahap 4)
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {classStudents.filter(s => s.groupId === selectedGroupId).map((student) => {
                          const authorId = student.uid;
                          const memberAnswer = answers.find(a => a.targetId === authorId);
                          const memberName = student.name || authorId;
                          const hasData = memberAnswer && memberAnswer.step4 && (memberAnswer.step4.q1 || memberAnswer.step4.q2 || memberAnswer.step4.q3);
                          
                          return (
                            <div key={authorId} className="bg-white border border-slate-100 p-6 rounded-2xl space-y-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                    {memberName.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{memberName}</p>
                                  </div>
                                </div>
                                {hasData ? (
                                  <button 
                                    onClick={() => handleExportPDF(memberAnswer, 'individual')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                  >
                                    <Download size={12} /> DOWNLOAD PDF T4
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-slate-400 uppercase font-black px-3 py-1.5 bg-slate-100 rounded-full tracking-tighter">Belum Mengisi T4</span>
                                )}
                              </div>
                              
                              {hasData && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                  {[
                                    { label: 'Tujuan', val: memberAnswer.step4.q1 },
                                    { label: 'Pencarian Data', val: memberAnswer.step4.q2 },
                                    { label: 'Kesimpulan', val: memberAnswer.step4.q3 },
                                  ].map((qa, idx) => (
                                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{qa.label}</p>
                                      <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                                        {qa.val || <em className="opacity-50">Belum diisi</em>}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {classStudents.filter(s => s.groupId === selectedGroupId).length === 0 && (
                          <div className="py-10 text-center text-slate-400 text-sm italic">Tidak ada anggota yang ditemukan di kelompok ini.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

               {dashboardView === 'individuals' && (
                <div className="grid grid-cols-1 gap-4">
                  {classStudents.filter(s => !s.groupId).map((student) => {
                    const answer = answers.find(a => a.targetId === student.uid);
                    return (
                      <Card key={student.uid} className={`hover:border-blue-200 transition-colors border-l-4 ${answer ? 'border-l-blue-500' : 'border-l-slate-300 opacity-60'}`}>
                        <CardContent className="flex justify-between items-center group">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors uppercase font-bold text-lg">
                              {(student.name || 'S').charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-lg">
                                {student.name || 'Siswa'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${answer ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                  {answer ? 'Laporan Mandiri (Tahap 1-4)' : 'Belum Memulai'}
                                </span>
                                {answer && (
                                  <p className="text-xs text-slate-500">
                                    Update: {new Date(answer.updatedAt).toLocaleString('id-ID')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {answer ? (
                            <button 
                              onClick={() => handleExportPDF(answer, 'all')}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
                            >
                              <Download size={16} /> PDF
                            </button>
                          ) : (
                            <div className="text-slate-400 text-xs italic">Belum ada data</div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {classStudents.filter(s => !s.groupId).length === 0 && (
                    <div className="py-20 text-center text-slate-400">Belum ada siswa yang mengerjakan secara mandiri (tanpa kelompok).</div>
                  )}
                </div>
              )}

              {dashboardView === 'peer-review' && (
                <div className="space-y-6">
                  <div className="bg-emerald-600 p-8 rounded-2xl text-white">
                    <h3 className="text-3xl font-bold mb-2">Penilaian Sejawat</h3>
                    <p className="text-emerald-100 opacity-80">Kelola dan pantau proses review antar siswa secara anonim.</p>
                  </div>

                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 italic text-[10px] uppercase font-bold text-slate-400">
                          <tr>
                            <th className="px-6 py-4">Siswa (Penulis)</th>
                            <th className="px-6 py-4">Status T4</th>
                            <th className="px-6 py-4">Reviewer</th>
                            <th className="px-6 py-4">Status Review</th>
                            <th className="px-6 py-4">Nilai Akhir</th>
                            <th className="px-6 py-4">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {classStudents
                            .map(student => {
                              const authorId = student.uid;
                              const studentAnswer = answers.find(a => a.targetId === authorId);
                              const assignment = peerAssignments[authorId];
                              const review = peerReviews[authorId];
                              const reviewerId = assignment?.reviewerId;
                              const reviewerName = reviewerId ? (resolvedNames[reviewerId]?.name || `Siswa`) : 'Belum ditunjuk';
                              
                              // Collect all reviewer UIDs already used in other assignments
                              const usedReviewers = Object.entries(peerAssignments)
                                .filter(([aid]) => aid !== authorId)
                                .map(([_, assign]: [any, any]) => assign.reviewerId)
                                .filter(Boolean);

                              return (
                                <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-800">{student.name || resolvedNames[authorId]?.name || 'Siswa'}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                    {studentAnswer?.step4?.q1 ? (
                                      <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                        <CheckCircle size={12} /> Tersedia
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                        <Clock size={12} /> Menunggu
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                      <span className={`text-[10px] font-medium px-2 py-1 rounded ${reviewerId ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                        {reviewerName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {review ? (
                                      <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                                        <CheckCircle size={12} /> Selesai
                                      </span>
                                    ) : reviewerId ? (
                                      <span className="text-amber-500 font-bold text-[10px] flex items-center gap-1 text-nowrap">
                                        <Clock size={12} /> Dalam Proses
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-[10px]">-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {review ? (
                                      <div className="space-y-1">
                                        <p className={`text-sm font-black ${review.finalScore < 70 ? 'text-red-500' : 'text-emerald-600'}`}>
                                          {review.finalScore.toFixed(0)}
                                        </p>
                                        {review.finalScore < 70 && (
                                          <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">REVISI</span>
                                        )}
                                      </div>
                                    ) : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="px-6 py-4">
                                    <select 
                                      className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 outline-none"
                                      value={reviewerId || ""}
                                      onChange={async (e) => {
                                        const newReviewerId = e.target.value;
                                        if (newReviewerId === authorId) return;
                                        const assignmentRef = ref(rtdb, `peerAssignments/${activeClass}/${authorId}`);
                                        await set(assignmentRef, {
                                          reviewerId: newReviewerId,
                                          assignedAt: new Date().toISOString(),
                                          status: 'pending'
                                        });
                                      }}
                                    >
                                      <option value="">Tunjuk Reviewer</option>
                                      {classStudents
                                        .filter(s => 
                                          s.uid !== authorId && 
                                          (!s.groupId || s.groupId !== student.groupId) &&
                                          !usedReviewers.includes(s.uid)
                                        )
                                        .map(potential => (
                                          <option key={potential.uid} value={potential.uid}>
                                            {potential.name || resolvedNames[potential.uid]?.name || 'Siswa'}
                                          </option>
                                        ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
      </main>
    </div>
  );
}
