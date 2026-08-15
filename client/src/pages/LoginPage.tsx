import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Store } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired')) {
      sessionStorage.removeItem('sessionExpired');
      showToast('Your session has expired — please sign in again', 'info');
    }
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
      showToast(isLogin ? 'Welcome back!' : 'Account created!', 'success');
      navigate('/shop');
    } catch (err: any) {
      showToast(err?.message || err?.data?.message || 'Something went wrong', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ShopEase</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border dark:border-gray-700 p-8">
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${isLogin ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setIsLogin(true)}>Login</button>
            <button className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${!isLogin ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setIsLogin(false)}>Register</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
