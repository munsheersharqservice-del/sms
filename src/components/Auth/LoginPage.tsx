import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SharqLogo } from '../Common/SharqLogo';
import { Department } from '../../types';
import {
  ShieldCheck,
  User as UserIcon,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
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
  CheckCircle,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signup, users, sendOtp, verifyOtp, resetPassword, isDarkMode, toggleDarkMode } = useApp();

  // Mode: 'login' | 'signup' | 'admin' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'admin' | 'forgot_password'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupDepartment, setSignupDepartment] = useState<Department>('Both');
  const [signupTitle, setSignupTitle] = useState('Biomedical Service Engineer');
  const [signupPhone, setSignupPhone] = useState('+974 ');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<'fill_form' | 'verify_otp'>('fill_form');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupDebugOtp, setSignupDebugOtp] = useState<string | null>(null);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request_otp' | 'verify_and_reset'>('request_otp');
  const [forgotDebugOtp, setForgotDebugOtp] = useState<string | null>(null);

  // Admin Separate Mode state
  const [adminUsername, setAdminUsername] = useState('ADMIN');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Restore remembered username on mount for convenience (without bypassing the login page)
  useEffect(() => {
    try {
      const rem = localStorage.getItem('sharq_remember_login');
      const savedUser = localStorage.getItem('sharq_remembered_username');
      if (rem && savedUser) {
        setLoginIdentifier(savedUser);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // Handle Standard User / Engineer Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const identifier = loginIdentifier.trim();
    const password = loginPassword.trim();

    if (!identifier) {
      setErrorMsg('Please enter your Username or Email.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your Password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(identifier, password, rememberMe);
      setIsLoading(false);

      if (success) {
        setSuccessMsg('Welcome back! Logging into Service Portal...');
      } else {
        setErrorMsg('Authentication failed. Please verify your username and password.');
      }
    }, 200);
  };

  // Quick select an existing engineer for fast testing / access
  const handleQuickSelectEngineer = (userName: string, email: string) => {
    setLoginIdentifier(email || userName);
    setLoginPassword('123');
    setErrorMsg('');
    setSuccessMsg(`Selected Eng. ${userName}`);
  };

  // Step 1: Send OTP to Engineer Email for Sign Up
  const handleInitiateSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = signupName.trim().toUpperCase();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter your Full Name.');
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
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === cleanEmail || u.name.toUpperCase() === cleanName
    );

    if (existing) {
      setErrorMsg('An account with this Email or Name already exists. Please log in.');
      return;
    }

    setIsLoading(true);
    const otpResult = await sendOtp(cleanEmail, 'signup', cleanName);
    setIsLoading(false);

    if (otpResult.success) {
      setSignupStep('verify_otp');
      if (otpResult.debugOtp) setSignupDebugOtp(otpResult.debugOtp);
      setSuccessMsg(`A 6-digit OTP code has been sent to ${cleanEmail}. Enter it below to register.`);
    } else {
      setErrorMsg(otpResult.message || 'Failed to dispatch verification code to email.');
    }
  };

  // Step 2: Verify OTP and Complete Engineer Registration
  const handleVerifyAndCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanName = signupName.trim().toUpperCase();
    const enteredOtp = signupOtp.trim();

    if (!enteredOtp || enteredOtp.length < 4) {
      setErrorMsg('Please enter the verification code received via email.');
      return;
    }

    setIsLoading(true);
    const verifyResult = await verifyOtp(cleanEmail, enteredOtp);

    if (!verifyResult.success) {
      setIsLoading(false);
      setErrorMsg(verifyResult.message || 'Invalid or expired OTP code.');
      return;
    }

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
    setSuccessMsg(`Verification successful! Account created for Eng. ${cleanName}. Welcome aboard!`);
  };

  // Step 1: Send OTP for Password Reset
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = forgotEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const result = await sendOtp(email, 'reset_password');
    setIsLoading(false);

    if (result.success) {
      setForgotStep('verify_and_reset');
      if (result.debugOtp) setForgotDebugOtp(result.debugOtp);
      setSuccessMsg(`OTP verification code sent to ${email}. Please check your email.`);
    } else {
      setErrorMsg(result.message || 'Failed to send OTP code.');
    }
  };

  // Step 2: Verify OTP and Apply New Password
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = forgotEmail.trim().toLowerCase();
    const otp = forgotOtp.trim();
    const newPass = forgotNewPassword.trim();
    const confirmPass = forgotConfirmPassword.trim();

    if (!otp) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    if (!newPass || newPass.length < 3) {
      setErrorMsg('New password must be at least 3 characters long.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);
    const resetResult = await resetPassword(email, otp, newPass);
    setIsLoading(false);

    if (resetResult.success) {
      setSuccessMsg('Your password has been successfully reset! You can now log in.');
      setTimeout(() => {
        setAuthMode('login');
        setLoginIdentifier(email);
        setLoginPassword(newPass);
        setForgotStep('request_otp');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotDebugOtp(null);
      }, 1500);
    } else {
      setErrorMsg(resetResult.message || 'Failed to reset password. Please check your OTP code.');
    }
  };

  // Handle Separate Administrator Login
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
      setErrorMsg('Invalid Admin Passcode (Must be 2277).');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = login(adminUsername || 'ADMIN', passcode, true);
      setIsLoading(false);

      if (success) {
        setSuccessMsg('Administrator Access Granted! Loading Console...');
      } else {
        setErrorMsg('Admin authentication failed. Please verify credentials.');
      }
    }, 250);
  };

  // Non-admin engineers for quick-select demo pills
  const engineerList = users.filter((u) => u.role !== 'Admin').slice(0, 6);

  return (
    <div
      id="login-page-container"
      className={`min-h-screen flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#0B0F17] text-slate-100 selection:bg-sky-500 selection:text-slate-950'
          : 'bg-[#F8F9FA] text-[#212529] selection:bg-[#1D3557] selection:text-white'
      }`}
    >
      {/* Background Ambient Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Theme Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleDarkMode}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
            isDarkMode
              ? 'bg-slate-900/90 text-amber-300 border-slate-700 hover:bg-slate-800'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[11px] font-bold">Light View</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-bold">Dark View</span>
            </>
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Company Header Branding */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <div
              className={`p-3 rounded-2xl border shadow-lg transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-slate-800 shadow-sky-950/30'
                  : 'bg-white border-slate-200 shadow-md'
              }`}
            >
              <SharqLogo size="lg" variant={isDarkMode ? 'light' : 'color'} showText={false} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight lowercase ${isDarkMode ? 'text-white' : 'text-[#1D3557]'}`}>
                sharq
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#10B981] lowercase">
                medical supply
              </span>
              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase ml-1">
                QATAR
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-bold mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Biomedical & Dental Engineering Service Portal
            </p>
            <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Equipment Registry, Work Logging & Asset Management
            </p>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div
          className={`mt-6 rounded-2xl shadow-2xl p-6 sm:p-7 border transition-all backdrop-blur-xl ${
            isDarkMode
              ? 'bg-slate-900/95 border-slate-800 shadow-black/50'
              : 'bg-white border-slate-200 shadow-xl'
          }`}
        >
          {/* FEEDBACK NOTICES */}
          {errorMsg && (
            <div
              id="login-error-alert"
              className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              id="login-success-alert"
              className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD WITH OTP RESET */}
          {authMode === 'forgot_password' ? (
            <div className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-blue-50 text-[#1D3557]'}`}>
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-[#1D3557]'}`}>
                      PASSWORD RECOVERY (OTP)
                    </h3>
                    <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Reset your password with email verification
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {forgotStep === 'request_otp' ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter your registered engineer email"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      We will send a 6-digit One-Time Password (OTP) code to verify your identity.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white rounded-xl font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-sky-950/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>SEND 6-DIGIT OTP CODE</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-sky-950/40 border-sky-800 text-sky-300' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                    <p className="text-xs font-semibold">
                      OTP sent to: <span className="font-bold">{forgotEmail}</span>
                    </p>
                  </div>

                  {forgotDebugOtp && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono">
                      <span>Quick Test OTP: </span>
                      <strong className="tracking-widest font-black text-amber-200">{forgotDebugOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className={`w-full text-center tracking-[0.4em] py-2.5 rounded-xl text-base font-black font-mono focus:outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-sky-500'
                          : 'bg-[#F8F9FA] border border-slate-300 text-[#1D3557] focus:bg-white focus:border-[#1D3557]'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        New Password
                      </label>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Min 3 characters"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-sky-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Confirm
                      </label>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-sky-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl font-black text-xs sm:text-sm tracking-wider shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>RESET PASSWORD & LOG IN</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('request_otp')}
                      className="text-slate-400 hover:text-white font-bold cursor-pointer"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={isLoading}
                      className="text-sky-400 hover:underline font-bold cursor-pointer"
                    >
                      Resend OTP code
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : authMode !== 'admin' ? (
            <div>
              {/* Dual Tabs: [ SIGN IN / LOG IN ] vs [ CREATE ACCOUNT / SIGN UP ] */}
              <div className={`grid grid-cols-2 p-1 rounded-xl mb-5 border ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <button
                  type="button"
                  id="tab-login"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-black tracking-wide text-center rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                    authMode === 'login'
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md'
                        : 'bg-[#1D3557] text-white shadow-md'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>SIGN IN</span>
                </button>

                <button
                  type="button"
                  id="tab-signup"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-black tracking-wide text-center rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                    authMode === 'signup'
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md'
                        : 'bg-[#10B981] text-white shadow-md'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>SIGN UP</span>
                </button>
              </div>

              {/* TAB 1: LOG IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Quick Select Engineer Selector for fast access */}
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        ⚡ Quick Select Engineer:
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">Tap name to fill</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {engineerList.map((eng) => (
                        <button
                          key={eng.id}
                          type="button"
                          onClick={() => handleQuickSelectEngineer(eng.name, eng.email)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer border ${
                            loginIdentifier.toLowerCase() === eng.email.toLowerCase() ||
                            loginIdentifier.toUpperCase() === eng.name.toUpperCase()
                              ? 'bg-sky-500 text-white border-sky-400'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-sky-500 hover:text-white'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-[#1D3557]'
                          }`}
                        >
                          {eng.name.replace('ENG. ', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Engineer Username or Email
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        id="user-login-identifier"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. munsheer.sharqservice@gmail.com"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 flex items-center justify-between ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="user-login-password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter password"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 cursor-pointer"
                      />
                      <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Remember username
                      </span>
                    </label>

                    <button
                      type="button"
                      id="btn-forgot-password-link"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setForgotStep('request_otp');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    id="submit-user-login-btn"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-500 hover:to-blue-600 text-white rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-sky-950/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>LOG IN TO FIELD DESK</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Prominent Link to Sign Up */}
                  <div className="text-center pt-2">
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="font-black text-emerald-400 hover:underline cursor-pointer ml-1"
                      >
                        Create Engineer Account (Sign Up) →
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: SIGN UP FORM WITH OTP VERIFICATION */}
              {authMode === 'signup' && signupStep === 'fill_form' && (
                <form onSubmit={handleInitiateSignupOtp} className="space-y-3.5">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. ENG. AHMED ALI"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold transition-all focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Email Address (Work Notifications & OTP)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="name@sharqmedical.qa"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium transition-all focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Department
                      </label>
                      <div className="relative">
                        <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={signupDepartment}
                          onChange={(e) => setSignupDepartment(e.target.value as Department)}
                          className={`w-full pl-9 pr-2 py-2 rounded-xl text-xs font-semibold focus:outline-hidden ${
                            isDarkMode
                              ? 'bg-slate-800 border border-slate-700 text-white focus:border-emerald-500'
                              : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                          }`}
                        >
                          <option value="Both">Both (Med & Dent)</option>
                          <option value="Medical">Medical Only</option>
                          <option value="Dental">Dental Only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Phone (Qatar)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="+974 5500 0000"
                          className={`w-full pl-9 pr-2 py-2 rounded-xl text-xs font-medium focus:outline-hidden ${
                            isDarkMode
                              ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'
                              : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Job Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={signupTitle}
                        onChange={(e) => setSignupTitle(e.target.value)}
                        placeholder="Service Engineer"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Password
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Password"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-emerald-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Confirm
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter"
                        className={`w-full px-3 py-2 rounded-xl text-xs font-semibold focus:outline-hidden ${
                          isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-emerald-500'
                            : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit-engineer-signup-btn"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-3"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>SEND EMAIL VERIFICATION CODE (OTP)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Prominent Link to Log In */}
                  <div className="text-center pt-2">
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Already have an engineer account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="font-black text-sky-400 hover:underline cursor-pointer ml-1"
                      >
                        Log In to Field Portal →
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2 STEP 2: VERIFY OTP CODE FOR ENGINEER REGISTRATION */}
              {authMode === 'signup' && signupStep === 'verify_otp' && (
                <form onSubmit={handleVerifyAndCompleteSignup} className="space-y-4">
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-sky-950/40 border-sky-800 text-sky-300' : 'bg-blue-50 border-blue-200 text-[#1D3557]'}`}>
                    <p className="text-xs font-bold">Email Verification</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Registering: <span className="font-bold text-white">{signupName}</span> ({signupEmail})
                    </p>
                  </div>

                  {signupDebugOtp && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono">
                      <span>Quick Test OTP: </span>
                      <strong className="tracking-widest font-black text-amber-200">{signupDebugOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Enter 6-Digit Verification Code (OTP)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className={`w-full text-center tracking-[0.4em] py-3 rounded-xl text-lg font-black font-mono focus:outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-emerald-500'
                          : 'bg-[#F8F9FA] border border-slate-300 text-[#1D3557] focus:bg-white focus:border-[#1D3557]'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || signupOtp.length < 4}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>VERIFY & COMPLETE REGISTRATION</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setSignupStep('fill_form')}
                      className="text-slate-400 hover:text-white font-bold cursor-pointer"
                    >
                      ← Edit details
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiateSignupOtp}
                      disabled={isLoading}
                      className="text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Resend OTP code
                    </button>
                  </div>
                </form>
              )}

              {/* SEPARATE ADMIN ENTRY POINT (DISCREET BOTTOM SECTION) */}
              <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <span className="text-slate-400 text-[11px]">System Administrator?</span>
                <button
                  type="button"
                  id="switch-to-admin-btn"
                  onClick={() => {
                    setAuthMode('admin');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setAdminPasscode('');
                  }}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border ${
                    isDarkMode
                      ? 'text-sky-400 bg-slate-800/80 hover:bg-slate-800 border-slate-700'
                      : 'text-[#1D3557] bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: DEDICATED SEPARATE ADMINISTRATOR PORTAL */
            <div className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${isDarkMode ? 'text-white' : 'text-[#1D3557]'}`}>
                      ADMINISTRATOR CONSOLE
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Passcode Protected Management Access
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  title="Back to Engineer Login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Admin Username
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="admin-username-field"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="ADMIN"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold focus:outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-sky-500'
                          : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Admin Passcode (System: 2277)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showAdminPasscode ? 'text' : 'password'}
                      id="admin-passcode-field"
                      required
                      autoFocus
                      value={adminPasscode}
                      onChange={(e) => setAdminPasscode(e.target.value)}
                      placeholder="Enter Admin Passcode"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-hidden ${
                        isDarkMode
                          ? 'bg-slate-800/80 border border-slate-700 text-white focus:border-sky-500'
                          : 'bg-[#F8F9FA] border border-slate-200 text-[#212529] focus:bg-white focus:border-[#1D3557]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                    >
                      {showAdminPasscode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className={`flex items-center space-x-1.5 p-2.5 rounded-xl border text-[11px] font-medium ${
                  isDarkMode
                    ? 'bg-slate-800/50 border-slate-700 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Admin passcode (2277) unlocks Sheets Live Sync, Master Clear & Configuration.</span>
                </div>

                <button
                  type="submit"
                  id="admin-auth-submit-btn"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all shadow-lg shadow-sky-950/40 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>SIGN IN AS ADMINISTRATOR</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Return to Regular Engineer Login
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Sharq Medical Supply W.L.L. Doha, Qatar</p>
          <p className="mt-0.5 text-slate-500">
            Biomedical Engineering & Dental Technical Services Division
          </p>
        </div>
      </div>
    </div>
  );
};
