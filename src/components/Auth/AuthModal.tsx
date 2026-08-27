import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Department } from '../../types';
import {
  ShieldCheck,
  User as UserIcon,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Mail,
  Phone,
  Briefcase,
  Layers,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, signup, users } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'admin'>('login');

  // Form states start strictly empty
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDepartment, setSignupDepartment] = useState<Department>('Both');
  const [signupTitle, setSignupTitle] = useState('Biomedical Service Engineer');
  const [signupPhone, setSignupPhone] = useState('+974 ');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Admin state
  const [adminUsername, setAdminUsername] = useState('ADMIN');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      setErrorMsg('Please enter Username or Email.');
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(identifier, password, rememberMe);
      setIsLoading(false);

      if (success) {
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 350);
      } else {
        setErrorMsg('Authentication failed. Please verify your credentials.');
      }
    }, 250);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = signupName.trim().toUpperCase();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter Full Name.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Email Address.');
      return;
    }

    if (!signupPassword || signupPassword.length < 3) {
      setErrorMsg('Password must be at least 3 characters.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.name.toUpperCase() === cleanName
    );

    if (existing) {
      setErrorMsg('Account with this Email or Name already exists.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      signup({
        name: cleanName,
        email: cleanEmail,
        role: 'Service Engineer',
        department: signupDepartment,
        phone: signupPhone.trim(),
        title: signupTitle.trim(),
        password: signupPassword,
        bio: `${signupDepartment} Service Engineer at Sharq Medical Supply.`,
      });

      setIsLoading(false);
      setSuccessMsg(`Welcome Eng. ${cleanName}!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 350);
    }, 300);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const passcode = adminPasscode.trim();

    if (!passcode) {
      setErrorMsg('Admin Passcode is required.');
      return;
    }

    if (passcode !== '2277') {
      setErrorMsg('Invalid Passcode.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(adminUsername || 'ADMIN', passcode, true);
      setIsLoading(false);

      if (success) {
        setSuccessMsg('Administrator access verified!');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 350);
      } else {
        setErrorMsg('Admin authentication failed.');
      }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header - Deep Navy */}
        <div className="bg-[#1D3557] text-white p-4 sm:p-5 relative border-b border-[#152741]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-white/10 rounded-lg border border-white/20 text-white">
                <ShieldCheck className="w-5 h-5 text-[#4CAF50]" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-tight text-white uppercase">
                  SHARQ MEDICAL SUPPLY
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">Service Desk Authentication</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white text-sm p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 bg-[#FFFFFF] dark:bg-slate-900 text-[#212529] dark:text-slate-100">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {authMode !== 'admin' ? (
            <div>
              {/* Dual Tabs: Log In vs Sign Up */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 pb-2.5 text-xs font-black tracking-wide text-center transition-all cursor-pointer border-b-2 ${
                    authMode === 'login'
                      ? 'border-[#1D3557] dark:border-[#4CAF50] text-[#1D3557] dark:text-[#4CAF50]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>LOG IN</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 pb-2.5 text-xs font-black tracking-wide text-center transition-all cursor-pointer border-b-2 ${
                    authMode === 'signup'
                      ? 'border-[#1D3557] dark:border-[#4CAF50] text-[#1D3557] dark:text-[#4CAF50]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>SIGN UP</span>
                  </div>
                </button>
              </div>

              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                      Username or Email
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter Username or Email"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#1D3557] focus:ring-[#1D3557] cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        Remember login
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#1D3557] hover:bg-[#152741] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>LOG IN TO PORTAL</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {authMode === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="ENG. AHMED ALI"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-bold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@sharqmedical.qa"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                        Department
                      </label>
                      <select
                        value={signupDepartment}
                        onChange={(e) => setSignupDepartment(e.target.value as Department)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      >
                        <option value="Both">Both (Med & Dent)</option>
                        <option value="Medical">Medical Only</option>
                        <option value="Dental">Dental Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value)}
                        placeholder="+974 5500 0000"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                        Password
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                        Confirm
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Profile & engineer details automatically saved to connected Google Sheet (Engineers tab).</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#1D3557] hover:bg-[#152741] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>REGISTER & SIGN IN</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* SEPARATE ADMIN PORTAL BUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">System Administrator?</span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('admin');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setAdminPasscode('');
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-[#1D3557] dark:text-[#4CAF50] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1D3557] dark:text-[#4CAF50]" />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          ) : (
            /* SEPARATE ADMIN PASSCODE SCREEN */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1D3557]/10 dark:bg-white/10 text-[#1D3557] dark:text-[#4CAF50] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#1D3557] dark:text-white uppercase">
                      ADMINISTRATOR CONSOLE
                    </h3>
                    <p className="text-[10px] text-slate-500">Enter Admin Passcode</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Back to Engineer Login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                    Admin Username
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="ADMIN"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-bold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#212529] dark:text-slate-300 mb-1">
                    Admin Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showAdminPasscode ? 'text' : 'password'}
                      required
                      autoFocus
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Enter Admin Passcode"
                      className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-[#F8F9FA] dark:bg-slate-800 text-[#212529] dark:text-white font-mono font-bold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showAdminPasscode ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1D3557] hover:bg-[#152741] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                      <span>AUTHENTICATE AS ADMIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-[#1D3557] transition-colors cursor-pointer"
                  >
                    ← Back to Engineer Login
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
