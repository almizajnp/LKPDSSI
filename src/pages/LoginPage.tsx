import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle redirecting based on profile role
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
          <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <LogIn className="text-blue-600" size={24} />
          </div>
          <CardTitle className="text-2xl">Masuk LKPD Interaktif</CardTitle>
          <p className="text-slate-500 text-sm">Selamat datang kembali! Silakan masuk ke akun Anda.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs italic">{error}</p>}
            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 py-4">
          <p className="text-sm text-slate-600">
            Belum punya akun? <Link to="/register" className="text-blue-600 font-medium hover:underline">Daftar sekarang</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
