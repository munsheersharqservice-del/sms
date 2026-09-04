import React, { useState } from 'react';
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
  Sparkles,
  ArrowLeft,
  KeyRound,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signup, users, sendOtp, verifyOtp, resetPassword } = useApp();

  // Mode: 'login' | 'signup' | 'admin' | 'forgot_password'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'admin' | 'forgot_password'>('login');

  // Login form state - starts strictly empty
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

  // Admin Separate Mode state - starts strictly empty
  const [adminUsername, setAdminUsername] = useState('ADMIN');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    }, 250);
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
      setErrorMsg('Invalid Admin Passcode.');
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

  return (
    <div
      id="login-page-container"
      className="min-h-screen bg-[#F8F9FA] text-[#212529] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background Decorative Soft Geometry */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1D3557]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#1D3557]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/40 rounded-full blur-2xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Company Header Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3.5 bg-[#FFFFFF] rounded-2xl border border-slate-200 shadow-md">
              <SharqLogo size="lg" variant="color" showText={false} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#1D3557] lowercase">
                sharq
              </span>
              <span className="text-2xl sm:text-3xl font-black text-[#4CAF50] lowercase">
                medical supply
              </span>
              <span className="bg-[#1D3557]/10 text-[#1D3557] text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-[#1D3557]/20 uppercase ml-1">
                QATAR
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-bold mt-1">
              Biomedical & Dental Engineering Service Desk
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Equipment Registry, Work Logging & Asset Management Portal
            </p>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="mt-6 bg-[#FFFFFF] border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8">
          {/* FEEDBACK NOTICES */}
          {errorMsg && (
            <div
              id="login-error-alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              id="login-success-alert"
              className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-[#4CAF50] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD WITH OTP RESET */}
          {authMode === 'forgot_password' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1D3557]/10 text-[#1D3557] flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#1D3557] uppercase tracking-wide">
                      PASSWORD RECOVERY (OTP)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
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
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {forgotStep === 'request_otp' ? (
                <form onSubmit={handleSendForgotOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
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
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15 focus:outline-hidden transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      We will send a 6-digit One-Time Password (OTP) code to verify your identity.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#1D3557] hover:bg-[#152741] text-white rounded-xl font-black text-xs sm:text-sm tracking-wider shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
                      className="text-xs font-bold text-slate-500 hover:text-[#1D3557] cursor-pointer"
                    >
                      ← Back to Log In
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs text-blue-900 font-semibold">
                      OTP sent to: <span className="font-bold">{forgotEmail}</span>
                    </p>
                  </div>

                  {forgotDebugOtp && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-mono">
                      <span>Quick Test OTP: </span>
                      <strong className="tracking-widest font-black text-amber-950">{forgotDebugOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
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
                      className="w-full text-center tracking-[0.4em] py-2.5 bg-[#F8F9FA] border border-slate-300 rounded-xl text-[#1D3557] text-lg font-black font-mono focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || forgotOtp.length < 4}
                    className="w-full py-3 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-xl font-black text-xs sm:text-sm tracking-wider shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
                      className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={isLoading}
                      className="text-[#1D3557] hover:underline font-bold cursor-pointer"
                    >
                      Resend OTP code
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : authMode !== 'admin' ? (
            <div>
              {/* Dual Tabs: Log In vs Sign Up */}
              <div className="flex border-b border-slate-200 mb-5">
                <button
                  type="button"
                  id="tab-login"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-black tracking-wide text-center transition-all cursor-pointer border-b-2 ${
                    authMode === 'login'
                      ? 'border-[#1D3557] text-[#1D3557]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <LogIn className="w-4 h-4" />
                    <span>LOG IN</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="tab-signup"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 pb-3 text-xs sm:text-sm font-black tracking-wide text-center transition-all cursor-pointer border-b-2 ${
                    authMode === 'signup'
                      ? 'border-[#1D3557] text-[#1D3557]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <UserPlus className="w-4 h-4" />
                    <span>SIGN UP</span>
                  </div>
                </button>
              </div>

              {/* TAB 1: LOG IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
                      Username or Email
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        id="user-login-identifier"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter your username or email"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-semibold focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15 focus:outline-hidden transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5 flex items-center justify-between">
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
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-medium focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/15 focus:outline-hidden transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
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
                        className="w-4 h-4 rounded border-slate-300 bg-white text-[#1D3557] focus:ring-[#1D3557] cursor-pointer"
                      />
                      <span className="text-xs text-slate-600 font-medium">
                        Remember login
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
                      className="text-xs font-bold text-[#1D3557] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Primary Action: Deep Navy #1D3557 */}
                  <button
                    type="submit"
                    id="submit-user-login-btn"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#1D3557] hover:bg-[#152741] active:bg-[#0f1d31] text-white rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
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

              {/* TAB 2: SIGN UP FORM WITH OTP VERIFICATION */}
              {authMode === 'signup' && signupStep === 'fill_form' && (
                <form onSubmit={handleInitiateSignupOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1">
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
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-bold focus:bg-white focus:border-[#1D3557] focus:ring-1 focus:ring-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1">
                      Email Address (For Work Notifications & OTP)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="name@sharqmedical.qa"
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-medium focus:bg-white focus:border-[#1D3557] focus:ring-1 focus:ring-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#212529] mb-1">
                        Department
                      </label>
                      <div className="relative">
                        <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={signupDepartment}
                          onChange={(e) => setSignupDepartment(e.target.value as Department)}
                          className="w-full pl-9 pr-2 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-semibold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                        >
                          <option value="Both">Both (Med & Dent)</option>
                          <option value="Medical">Medical Only</option>
                          <option value="Dental">Dental Only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#212529] mb-1">
                        Phone (Qatar)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="+974 5500 0000"
                          className="w-full pl-9 pr-2 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1">
                      Job Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={signupTitle}
                        onChange={(e) => setSignupTitle(e.target.value)}
                        placeholder="Service Engineer"
                        className="w-full pl-9 pr-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-medium focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-[#212529] mb-1">
                        Password
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-semibold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#212529] mb-1">
                        Confirm
                      </label>
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Re-enter"
                        className="w-full px-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs font-semibold focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="submit-engineer-signup-btn"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#1D3557] hover:bg-[#152741] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 mt-3"
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
                </form>
              )}

              {/* TAB 2 STEP 2: VERIFY OTP CODE FOR ENGINEER REGISTRATION */}
              {authMode === 'signup' && signupStep === 'verify_otp' && (
                <form onSubmit={handleVerifyAndCompleteSignup} className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-xs font-bold text-[#1D3557]">Email Verification</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Registering: <span className="font-bold text-[#212529]">{signupName}</span> ({signupEmail})
                    </p>
                  </div>

                  {signupDebugOtp && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-mono">
                      <span>Quick Test OTP: </span>
                      <strong className="tracking-widest font-black text-amber-950">{signupDebugOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-[#212529] mb-1.5">
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
                      className="w-full text-center tracking-[0.4em] py-3 bg-[#F8F9FA] border border-slate-300 rounded-xl text-[#1D3557] text-lg font-black font-mono focus:bg-white focus:border-[#1D3557] focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || signupOtp.length < 4}
                    className="w-full py-3 bg-[#4CAF50] hover:bg-[#43a047] text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
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
                      className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      ← Edit details
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiateSignupOtp}
                      disabled={isLoading}
                      className="text-[#1D3557] hover:underline font-bold cursor-pointer"
                    >
                      Resend OTP code
                    </button>
                  </div>
                </form>
              )}

              {/* SEPARATE ADMIN ENTRY POINT (DISCREET BOTTOM SECTION) */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">System Administrator?</span>
                <button
                  type="button"
                  id="switch-to-admin-btn"
                  onClick={() => {
                    setAuthMode('admin');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setAdminPasscode('');
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold text-[#1D3557] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1D3557]" />
                  <span>Admin Portal</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: DEDICATED SEPARATE ADMINISTRATOR PORTAL */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1D3557]/10 text-[#1D3557] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#1D3557] uppercase tracking-wide">
                      ADMINISTRATOR CONSOLE
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
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
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Back to Engineer Login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#212529] mb-1.5">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-bold focus:bg-white focus:border-[#1D3557] focus:ring-1 focus:ring-[#1D3557] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#212529] mb-1.5">
                    Admin Passcode
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
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-[#212529] text-xs sm:text-sm font-mono font-bold focus:bg-white focus:border-[#1D3557] focus:ring-2 focus:ring-[#1D3557]/20 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    >
                      {showAdminPasscode ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 font-medium">
                  <KeyRound className="w-4 h-4 text-[#1D3557] shrink-0" />
                  <span>Admin access unlocks Sheets Live Sync, Master Clear & Configuration.</span>
                </div>

                <button
                  type="submit"
                  id="admin-auth-submit-btn"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#1D3557] hover:bg-[#152741] active:bg-[#0f1d31] text-white rounded-xl font-black text-xs sm:text-sm tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
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
                    className="text-xs font-bold text-slate-500 hover:text-[#1D3557] transition-colors cursor-pointer"
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
          <p className="mt-0.5 text-slate-400">
            Biomedical Engineering & Dental Technical Services Division
          </p>
        </div>
      </div>
    </div>
  );
};
