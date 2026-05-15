import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { useNavigate, Link } from 'react-router-dom';
import { auth, rtdb } from '../firebase/config';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await set(ref(rtdb, 'users/' + user.uid), {
        uid: user.uid,
        name,
        email,
        role,
        createdAt: new Date().toISOString()
      });
      
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <UserPlus className="text-green-600" size={24} />
          </div>
          <CardTitle className="text-2xl">Daftar Akun Baru</CardTitle>
          <p className="text-slate-500 text-sm">Mulai pengalaman belajar interaktif Anda hari ini.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
              <input 
                type="text" 
                className="lkpd-input" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input 
                type="email" 
                className="lkpd-input" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="nama@contoh.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input 
                type="password" 
                className="lkpd-input" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Daftar Sebagai</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="student" 
                    checked={role === 'student'} 
                    onChange={() => setRole('student')} 
                  />
                  <span className="text-sm">Siswa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="role" 
                    value="teacher" 
                    checked={role === 'teacher'} 
                    onChange={() => setRole('teacher')} 
                  />
                  <span className="text-sm">Guru</span>
                </label>
              </div>
            </div>
            {error && <p className="text-red-500 text-xs italic">{error}</p>}
            <button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Daftar Sekarang'}
            </button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 py-4">
          <p className="text-sm text-slate-600">
            Sudah punya akun? <Link to="/login" className="text-blue-600 font-medium hover:underline">Masuk</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
