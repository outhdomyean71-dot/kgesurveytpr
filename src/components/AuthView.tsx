import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, Mail, LogIn, UserPlus, AlertCircle, MonitorPlay, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  schoolLogo?: string;
  onSuccessRedirect: () => void;
}

export default function AuthView({ schoolLogo, onSuccessRedirect }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onSuccessRedirect();
    } catch (err: any) {
      const errorCode = err?.code;
      console.warn('Google Sign In Notice:', errorCode, err?.message);
      if (errorCode === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setError(`Domain not authorized in Firebase Console (${domain}). Please add this domain under Firebase Console > Authentication > Settings > Authorized domains, or use Email/Password login.`);
      } else if (errorCode === 'auth/popup-closed-by-user') {
        setError('ការចូលប្រើប្រាស់ត្រូវបានបោះបង់ (Sign in window closed)');
      } else if (errorCode === 'auth/popup-blocked') {
        setError('Popup blocked by browser. Please allow popups for this site.');
      } else {
        setError(`Google Sign In failed: ${err?.message || errorCode || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    setResendSuccess(false);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setResendSuccess(true);
      } else {
        // Sign in briefly to send email verification
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (cred.user) {
          await sendEmailVerification(cred.user);
          await signOut(auth);
          setResendSuccess(true);
        }
      }
    } catch (err: any) {
      console.warn('Failed to resend verification email:', err);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) {
          try {
            await sendEmailVerification(user);
          } catch (verr) {
            console.warn('Error sending email verification:', verr);
          }
          const userEmail = user.email || email;
          await signOut(auth);
          setUnverifiedEmail(userEmail);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) {
          if (!user.emailVerified) {
            try {
              await sendEmailVerification(user);
            } catch (verr) {
              console.warn('Verification email status:', verr);
            }
            const userEmail = user.email || email;
            await signOut(auth);
            setUnverifiedEmail(userEmail);
            return;
          }
          onSuccessRedirect();
        }
      }
    } catch (err: any) {
      const errorCode = err?.code;
      console.warn('Firebase Auth Notice:', errorCode, err?.message);

      if (isSignUp) {
        if (errorCode === 'auth/email-already-in-use') {
          setError('User already exists. Please sign in');
        } else if (errorCode === 'auth/weak-password') {
          setError('Password must be at least 6 characters');
        } else if (errorCode === 'auth/invalid-email') {
          setError('Invalid email address format');
        } else {
          setError(err?.message || 'Failed to sign up');
        }
      } else {
        if (
          errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/user-not-found' ||
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-email'
        ) {
          setError('Email or password is incorrect');
        } else {
          setError('Email or password is incorrect');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (unverifiedEmail) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 text-center relative overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Mail className="h-8 w-8" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-[#0f2a4a] mb-3">
            Email Verification
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
            We have sent you a verification email to <span className="font-bold text-[#0f2a4a]">{unverifiedEmail}</span>. Please verify it and log in.
          </p>

          <button
            type="button"
            onClick={() => {
              setUnverifiedEmail(null);
              setIsSignUp(false);
              setError(null);
            }}
            className="w-full py-3 px-4 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 font-bold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-8 relative overflow-hidden">
        {/* Top Header Logo & Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {schoolLogo ? (
              <img 
                src={schoolLogo} 
                alt="School Logo" 
                className="h-20 w-20 rounded-full object-contain border-2 border-slate-100 shadow-md bg-white p-1" 
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-amber-400 flex items-center justify-center text-[#0f2a4a] shadow-md border-2 border-white">
                <MonitorPlay className="h-10 w-10" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-[#0f2a4a]">
            {isSignUp ? 'បង្កើតគណនីថ្មី (Sign Up)' : 'ចូលប្រើប្រាស់ប្រព័ន្ធ (Sign In)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isSignUp 
              ? 'សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់ដើម្បីបង្កើតគណនី' 
              : 'សូមបញ្ចូលអ៊ីមែល និងលេខសម្ងាត់ដើម្បីចូលប្រើប្រាស់'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-blue-600" />
              អ៊ីមែល (Email)
            </label>
            <input
              type="email"
              required
              placeholder="example@school.edu.kh"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              លេខសម្ងាត់ (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 text-sm outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : isSignUp ? (
              <>
                <UserPlus className="h-4 w-4" />
                <span>ចុះឈ្មោះ (Sign Up)</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>ចូលប្រើប្រាស់ (Sign In)</span>
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium">ឬ (OR)</span>
          </div>
        </div>

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-sm transition cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>បន្តជាមួយ Google (Continue with Google)</span>
        </button>

        {/* Toggle Mode Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer underline"
          >
            {isSignUp
              ? 'មានគណនីរួចហើយ? ចូលប្រើប្រាស់ (Sign In)'
              : 'មិនទាន់មានគណនី? បង្កើតគណនីថ្មី (Sign Up)'}
          </button>
        </div>
      </div>
    </div>
  );
}

