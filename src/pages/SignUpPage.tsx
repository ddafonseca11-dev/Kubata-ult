import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
          <p className="text-slate-500 mt-1">Junta-te à Kubata Kié</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Nome completo</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="João Silva" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="o@email.com" className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Palavra-passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
            {loading ? 'A criar conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Já tens conta? <Link to="/signin" className="text-teal-600 hover:text-teal-700 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
