import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { rtdb, auth } from "../firebase/config";
import {
  ref,
  update,
  get,
  query,
  orderByChild,
  equalTo,
  set,
  push,
  onValue,
} from "firebase/database";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import {
  BookOpen,
  Users,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  LineChart,
  Star,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type ReviewScoreKey = "q1" | "q2" | "q3";

const peerReviewRubric: Array<{
  id: ReviewScoreKey;
  answerLabel: string;
  aspect: string;
  criteria: Record<1 | 2 | 3 | 4, string>;
}> = [
  {
    id: "q1",
    answerLabel: "Tujuan Penyelidikan",
    aspect: "Kejelasan Tujuan dan Urgensi Isu (Konteks SSI)",
    criteria: {
      4: "Menjelaskan tujuan dengan sangat spesifik, yaitu menganalisis benzena dalam rokok, dan mengaitkan urgensinya dengan dilema kesehatan masyarakat serta stabilitas ekonomi negara secara mendalam.",
      3: "Menjelaskan tujuan penyelidikan dengan jelas, tetapi pentingnya kajian hanya fokus pada satu sisi, misalnya hanya dampak kesehatan.",
      2: "Tujuan disebutkan secara umum, tetapi alasan pentingnya kajian tidak dijelaskan atau kurang relevan dengan materi benzena.",
      1: "Tidak menyebutkan tujuan atau alasan kajian dengan benar.",
    },
  },
  {
    id: "q2",
    answerLabel: "Cara Perolehan Data",
    aspect: "Prosedur Ilmiah",
    criteria: {
      4: "Merinci langkah pencarian data seperti studi literatur, artikel ilmiah, dan data ekonomi, serta memberi alasan logis mengapa cara tersebut efektif untuk memperoleh bukti yang valid, relevan, dan cukup.",
      3: "Menyebutkan langkah perolehan data dengan baik, tetapi alasan pemilihan cara tersebut kurang dikaitkan dengan kualitas bukti ilmiah.",
      2: "Hanya menyebutkan langkah secara singkat, misalnya mencari di internet, tanpa menjelaskan mengapa cara itu dipilih.",
      1: "Langkah-langkah tidak runtut atau tidak sesuai dengan prosedur penyelidikan yang diminta.",
    },
  },
  {
    id: "q3",
    answerLabel: "Analisis dan Kesimpulan",
    aspect: "Kualitas Argumen Ilmiah",
    criteria: {
      4: "Kesimpulan, klaim, data/evidence, warrant, backing, qualifier, dan rebuttal disampaikan secara runtut, logis, kuat, dan mendalam.",
      3: "Kesimpulan, klaim, data/evidence, warrant, backing, qualifier, dan rebuttal sudah disampaikan, tetapi masih kurang kuat atau kurang mendalam.",
      2: "Membuat kesimpulan, tetapi tidak menyertakan bukti konkret atau alasan pendukung masih berupa opini pribadi, bukan data.",
      1: "Kesimpulan tidak menjawab pertanyaan penelitian atau tidak didasarkan pada data hasil penyelidikan.",
    },
  },
];

const initialReviewScores: Record<ReviewScoreKey, number> = {
  q1: 0,
  q2: 0,
  q3: 0,
};

export default function StudentDashboard() {
  const { profile, refreshProfile } = useAuth();
  const [classCode, setClassCode] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classMetadata, setClassMetadata] = useState<any>(null);
  const [groupMetadata, setGroupMetadata] = useState<any>(null);
  const [myReviewTask, setMyReviewTask] = useState<any>(null);
  const [targetAnswer, setTargetAnswer] = useState<any>(null);
  const [myReviewResult, setMyReviewResult] = useState<any>(null);
  const [isReviewInProgress, setIsReviewInProgress] = useState(false);

  const [reviewScores, setReviewScores] =
    useState<Record<ReviewScoreKey, number>>(initialReviewScores);
  const [reviewComment, setReviewComment] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.classCode || !profile?.uid) return;

    // Listen for assignments (Tasks assigned to ME)
    const assignmentsRef = ref(rtdb, `peerAssignments/${profile.classCode}`);
    const unsubscribeAssignments = onValue(assignmentsRef, async (snap) => {
      const data = snap.val();
      if (data) {
        // Find if I am a reviewer for ANY author
        const myTaskAuthorId = Object.keys(data).find(
          (authorId) => data[authorId].reviewerId === profile.uid,
        );
        if (myTaskAuthorId) {
          const taskData = data[myTaskAuthorId];
          setMyReviewTask({ authorId: myTaskAuthorId, ...taskData });

          // Fetch the author's answer (Target content)
          const answerSnap = await get(
            ref(rtdb, `answers/${profile.classCode}_${myTaskAuthorId}`),
          );
          if (answerSnap.exists()) {
            setTargetAnswer(answerSnap.val());
          }
        } else {
          setMyReviewTask(null);
          setTargetAnswer(null);
        }
      }
    });

    // Listen for my own review result (Reviews of MY work)
    const reviewsRef = ref(
      rtdb,
      `peerReviews/${profile.classCode}/${profile.uid}`,
    );
    const unsubscribeResult = onValue(reviewsRef, (snap) => {
      setMyReviewResult(snap.val());
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeResult();
    };
  }, [profile?.classCode, profile?.uid]);

  useEffect(() => {
    let unsubscribeClass: (() => void) | undefined;
    let unsubscribeGroup: (() => void) | undefined;

    if (profile?.classCode) {
      const classRef = ref(rtdb, `classes/${profile.classCode}`);
      unsubscribeClass = onValue(classRef, (snap) => {
        if (snap.exists()) setClassMetadata(snap.val());
      });
    }

    if (profile?.groupId) {
      const groupRef = ref(rtdb, `groups/${profile.groupId}`);
      unsubscribeGroup = onValue(groupRef, (snap) => {
        if (snap.exists()) setGroupMetadata(snap.val());
      });
    }

    return () => {
      if (unsubscribeClass) unsubscribeClass();
      if (unsubscribeGroup) unsubscribeGroup();
    };
  }, [profile?.classCode, profile?.groupId]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const trimmedCode = classCode.trim().toUpperCase();

    try {
      const classesRef = ref(rtdb, "classes");
      const q = query(
        classesRef,
        orderByChild("classCode"),
        equalTo(trimmedCode),
      );
      const snapshot = await get(q);

      if (!snapshot.exists()) {
        throw new Error(`Kelas dengan kode "${trimmedCode}" tidak ditemukan.`);
      }

      const classData = snapshot.val();
      const classId = Object.keys(classData)[0];

      await update(ref(rtdb, `users/${profile!.uid}`), {
        classCode: classId,
      });
      await refreshProfile();
    } catch (err: any) {
      console.error("Join Class Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const trimmedGroupCode = groupCode.trim().toUpperCase();
      const groupsRef = ref(rtdb, "groups");
      const q = query(
        groupsRef,
        orderByChild("groupCode"),
        equalTo(trimmedGroupCode),
      );
      const snapshot = await get(q);

      if (!snapshot.exists()) {
        throw new Error("Kode kelompok tidak valid.");
      }

      const groups = snapshot.val();
      const groupId = Object.keys(groups)[0];
      const groupData = groups[groupId];

      if (groupData.classId !== profile!.classCode) {
        throw new Error("Kelompok ini tidak terdaftar di kelas Anda.");
      }

      const currentMembers = groupData.members || [];
      if (!currentMembers.includes(profile!.uid)) {
        const newMembers = [...currentMembers, profile!.uid];
        await update(ref(rtdb, `groups/${groupId}`), {
          members: newMembers,
        });
      }

      await update(ref(rtdb, `users/${profile!.uid}`), {
        groupId: groupId,
      });

      await refreshProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setError("Nama kelompok harus diisi.");
      return;
    }
    setLoading(true);
    try {
      const groupCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const groupsRef = ref(rtdb, "groups");
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key;

      await set(newGroupRef, {
        groupCode,
        groupName: newGroupName.trim(),
        classId: profile!.classCode,
        members: [profile!.uid],
        createdBy: profile!.uid,
        createdAt: new Date().toISOString(),
      });

      await update(ref(rtdb, `users/${profile!.uid}`), {
        groupId: groupId,
      });

      await refreshProfile();
      setIsCreatingGroup(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate("/login");
  };

  const handleSubmitReview = async () => {
    if (!profile?.classCode || !myReviewTask?.authorId) return;
    setLoading(true);
    try {
      const totalScore = reviewScores.q1 + reviewScores.q2 + reviewScores.q3;
      const finalScore = (totalScore / 12) * 100;

      const reviewRef = ref(
        rtdb,
        `peerReviews/${profile.classCode}/${myReviewTask.authorId}`,
      );
      await set(reviewRef, {
        scores: reviewScores,
        rubricVersion: "ssi-peer-review-v1",
        rubricAspects: peerReviewRubric.map(({ id, aspect, answerLabel }) => ({
          id,
          aspect,
          answerLabel,
        })),
        comment: reviewComment,
        finalScore,
        reviewerId: profile.uid, // Still stored in DB but UI won't show it to author
        submittedAt: new Date().toISOString(),
      });

      // Update assignment status
      const assignmentRef = ref(
        rtdb,
        `peerAssignments/${profile.classCode}/${myReviewTask.authorId}`,
      );
      await update(assignmentRef, { status: "completed" });

      setIsReviewInProgress(false);
      setMyReviewTask(null);
      setReviewScores(initialReviewScores);
      setReviewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-display font-bold text-blue-600 flex items-center gap-2">
          <BookOpen className="inline" /> LKPD INTERAKTIF
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">
              {profile?.name}
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              {profile?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Revision Alert */}
        {myReviewResult && myReviewResult.finalScore < 70 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 shadow-lg shadow-red-100"
          >
            <div className="bg-red-500 text-white p-4 rounded-xl shadow-lg shadow-red-200">
              <ShieldAlert size={32} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h3 className="text-xl font-bold text-red-800">
                Revisi Diperlukan!
              </h3>
              <p className="text-red-600 text-sm italic">
                Hasil penilaian sejawat menunjukkan skor Anda (
                {myReviewResult.finalScore.toFixed(0)}) di bawah KKM 70. Silakan
                perbaiki laporan Tahap 4 Anda.
              </p>
            </div>
            <button
              onClick={() => navigate("/lkpd?step=4")}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-red-200 flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowRight size={20} /> KE TAHAP 4
            </button>
          </motion.div>
        )}

        <header className="space-y-2">
          <h2 className="text-3xl font-display font-bold text-slate-900">
            Halo, {profile?.name.split(" ")[0]}!
          </h2>
          <p className="text-slate-600">
            Teruslah mengeksplorasi dan belajar hal-hal baru.
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Class Section */}
          {!profile?.classCode ? (
            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search size={20} className="text-blue-500" /> Gabung Kelas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Masukkan kode kelas yang diberikan oleh guru Anda untuk mulai
                  mengerjakan LKPD.
                </p>
                <form onSubmit={handleJoinClass} className="flex gap-2">
                  <input
                    type="text"
                    className="lkpd-input bg-white"
                    placeholder="Kode Kelas (misal: ABCDEF)"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                    required
                  />
                  <button
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Gabung
                  </button>
                </form>
                {error && <p className="text-red-500 text-xs">{error}</p>}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-100 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 size={20} className="text-green-600" /> Kelas
                  Terdaftar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-green-100 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    Kelas Anda
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {classMetadata?.className || profile.classCode}
                  </p>
                </div>
                <p className="text-sm text-slate-600 italic">
                  Anda siap untuk belajar.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Group Section */}
          <Card
            className={
              !profile?.classCode ? "opacity-50 pointer-events-none" : ""
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <Users size={20} className="text-indigo-500" /> Bekerja Kelompok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!profile?.groupId ? (
                <>
                  {!isCreatingGroup ? (
                    <button
                      onClick={() => setIsCreatingGroup(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 text-indigo-600 font-medium py-3 rounded-xl hover:bg-indigo-50 transition-colors mb-4"
                    >
                      <Plus size={20} /> Buat Kelompok
                    </button>
                  ) : (
                    <form
                      onSubmit={handleCreateGroup}
                      className="space-y-3 pb-4"
                    >
                      <input
                        type="text"
                        className="lkpd-input bg-white"
                        placeholder="Nama Kelompok"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        required
                      />
                      <div className="flex gap-2">
                        <button className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg text-sm">
                          Buat
                        </button>
                        <button
                          onClick={() => setIsCreatingGroup(false)}
                          className="px-4 text-slate-400 text-sm"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  )}
                  <form onSubmit={handleJoinGroup} className="flex gap-2">
                    <input
                      type="text"
                      className="lkpd-input bg-white flex-1"
                      placeholder="Kode Kelompok"
                      value={groupCode}
                      onChange={(e) =>
                        setGroupCode(e.target.value.toUpperCase())
                      }
                    />
                    <button className="bg-indigo-600 text-white px-4 rounded-lg hover:bg-indigo-700 transition-colors">
                      OK
                    </button>
                  </form>
                </>
              ) : (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm flex justify-between items-center">
                  <div>
                    <p className="text-xs text-indigo-600 uppercase font-semibold">
                      Kelompok
                    </p>
                    <p className="text-lg font-bold text-slate-900">
                      {groupMetadata?.groupName || "Kelompok"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">
                      Kode Akses
                    </p>
                    <p
                      className="text-xl font-mono font-black text-indigo-600 select-all"
                      title="Klik untuk menyalin"
                    >
                      {groupMetadata?.groupCode || "..."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Peer Review Task Card */}
          {myReviewTask && myReviewTask.status === "pending" && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="md:col-span-1"
            >
              <Card className="border-emerald-200 bg-emerald-50/20 border-l-4 border-l-emerald-500 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <Star
                      size={20}
                      className="fill-emerald-500 text-emerald-500"
                    />{" "}
                    Tugas Penilaian
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-700">
                    Anda mendapat satu tugas review untuk laporan penyelidikan
                    teman Anda (Anonim).
                  </p>
                  <button
                    onClick={() => {
                      setReviewScores(initialReviewScores);
                      setReviewComment("");
                      setIsReviewInProgress(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 group"
                  >
                    MULAI REVIEW{" "}
                    <ExternalLink
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Peer Review Results Section */}
        {myReviewResult && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <LineChart size={24} className="text-blue-500" /> Hasil Penilaian
              Sejawat
            </h3>
            <Card className="bg-white border-slate-200 overflow-hidden">
              <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-6 flex flex-col items-center justify-center bg-slate-50 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Nilai Akhir
                  </p>
                  <p
                    className={`text-4xl font-black ${myReviewResult.finalScore < 70 ? "text-red-500" : "text-emerald-600"}`}
                  >
                    {myReviewResult.finalScore.toFixed(0)}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${myReviewResult.finalScore < 70 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {myReviewResult.finalScore < 70
                      ? "Revisi Laporan"
                      : "Lulus KKM"}
                  </span>
                </div>
                <div className="p-6 md:col-span-3 space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    {peerReviewRubric.map((aspect) => (
                      <div key={aspect.id} className="space-y-1">
                        <p className="text-xs font-bold text-slate-500">
                          {aspect.aspect}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Skor {myReviewResult.scores?.[aspect.id] || 0}/4
                        </p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((s) => (
                            <div
                              key={s}
                              className={`h-1.5 flex-1 rounded-full ${s <= (myReviewResult.scores?.[aspect.id] || 0) ? "bg-indigo-500" : "bg-slate-100"}`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Komentar Reviewer:
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 italic leading-relaxed">
                      "{myReviewResult.comment || "Tidak ada komentar khusus."}"
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* LKPD Action Button */}
        <div className="pt-4 pb-12">
          <button
            disabled={!profile?.classCode}
            onClick={() => navigate("/lkpd")}
            className="w-full bg-slate-900 text-white font-display font-bold py-5 rounded-2xl text-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <BookOpen
              size={28}
              className="group-hover:rotate-12 transition-transform"
            />
            {profile?.classCode
              ? "MULAI PENGERJAAN LKPD"
              : "GABUNG KELAS UNTUK MEMULAI"}
          </button>
        </div>
      </main>

      {/* Peer Review Portal Overlay */}
      <AnimatePresence>
        {isReviewInProgress && myReviewTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Portal Penilaian Sejawat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gunakan rubrik penilaian agar masukan Anda adil, jelas, dan
                    membantu.
                  </p>
                </div>
                <button
                  onClick={() => setIsReviewInProgress(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Laporan Yang Di-Review
                  </div>
                  <div className="space-y-8">
                    {peerReviewRubric.map((item, i) => (
                      <div key={i} className="space-y-3">
                        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">
                            {i + 1}
                          </span>
                          {item.answerLabel}
                        </label>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-serif min-h-[100px]">
                          {targetAnswer?.step4?.[item.id] || (
                            <em className="text-slate-300">
                              Siswa belum mengisi bagian ini.
                            </em>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Lembar Penilaian
                  </div>

                  <div className="space-y-6">
                    {peerReviewRubric.map((aspect) => (
                      <div key={aspect.id} className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {aspect.aspect}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Nilai aspek jawaban: {aspect.answerLabel}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {[4, 3, 2, 1].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() =>
                                setReviewScores((prev) => ({
                                  ...prev,
                                  [aspect.id]: score,
                                }))
                              }
                              className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3
                                ${
                                  reviewScores[aspect.id] === score
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                                }`}
                            >
                              <span
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0
                                ${reviewScores[aspect.id] === score ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}
                              `}
                              >
                                {score}
                              </span>
                              <span className="text-xs leading-relaxed font-medium">
                                {aspect.criteria[score as 1 | 2 | 3 | 4]}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Nilai sementara
                        </p>
                        <p className="text-xs text-slate-500">
                          Rumus: skor diperoleh / 12 x 100
                        </p>
                      </div>
                      <p className="text-2xl font-black text-indigo-600">
                        {Math.round(
                          ((reviewScores.q1 +
                            reviewScores.q2 +
                            reviewScores.q3) /
                            12) *
                            100,
                        )}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-800 text-nowrap">
                        Komentar & Saran (Opsional)
                      </p>
                      <textarea
                        className="lkpd-input bg-white min-h-[120px] text-sm resize-none"
                        placeholder="Berikan masukan konstruktif untuk teman Anda..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      ></textarea>
                    </div>

                    <button
                      onClick={handleSubmitReview}
                      disabled={
                        loading ||
                        reviewScores.q1 === 0 ||
                        reviewScores.q2 === 0 ||
                        reviewScores.q3 === 0
                      }
                      className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2
                        ${
                          loading ||
                          reviewScores.q1 === 0 ||
                          reviewScores.q2 === 0 ||
                          reviewScores.q3 === 0
                            ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-slate-900 text-white hover:scale-[1.02] active:scale-95 shadow-indigo-100"
                        }`}
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          KIRIM PENILAIAN <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
