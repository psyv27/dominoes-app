import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type FormState = 'login' | 'register' | 'verify' | 'forgot_password' | 'reset_password';

export default function Auth() {
    const [formState, setFormState] = useState<FormState>('login');
    const [formData, setFormData] = useState({ email: '', username: '', password: '', nickname: '', otp: '', newPassword: '' });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // For OTP 6-digit split input
    const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    const { login, register, verifyOtp, forgotPassword, resetPassword, playAsGuest } = useAuth() as any;
    const navigate = useNavigate();

    const switchState = (newState: FormState) => {
        setFormState(newState);
        setError('');
        setMessage('');
        setOtpArray(['', '', '', '', '', '']);
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newArr = [...otpArray];
        newArr[index] = value;
        setOtpArray(newArr);
        setFormData(prev => ({ ...prev, otp: newArr.join('') }));

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            if (formState === 'login') {
                const res = await login(formData.username, formData.password);
                if (res.success) {
                    navigate('/lobby');
                } else if (res.pending_verification) {
                    setFormData(prev => ({ ...prev, email: res.email }));
                    switchState('verify');
                    setMessage('Your account is not verified. A new code was sent to your email.');
                } else {
                    setError(res.error || 'Login failed');
                }
            } else if (formState === 'register') {
                const res = await register(formData.email, formData.username, formData.password, formData.nickname);
                if (res.success && res.pending_verification) {
                    setFormData(prev => ({ ...prev, email: res.email }));
                    switchState('verify');
                    setMessage('Registration successful! Please check your email for the verification code.');
                } else if (res.success) {
                    navigate('/lobby');
                } else {
                    setError(res.error || 'Registration failed');
                }
            } else if (formState === 'verify') {
                const res = await verifyOtp(formData.email, formData.otp);
                if (res.success) {
                    navigate('/lobby');
                } else {
                    setError(res.error || 'Verification failed');
                }
            } else if (formState === 'forgot_password') {
                const res = await forgotPassword(formData.email);
                if (res.success) {
                    switchState('reset_password');
                    setMessage(`A reset code has been sent to ${formData.email}.`);
                } else {
                    setError(res.error || 'Failed to send reset code');
                }
            } else if (formState === 'reset_password') {
                const res = await resetPassword(formData.email, formData.otp, formData.newPassword);
                if (res.success) {
                    switchState('login');
                    setFormData(prev => ({ ...prev, password: '', newPassword: '', otp: '' }));
                    setMessage('Password updated successfully. Please log in.');
                } else {
                    setError(res.error || 'Failed to reset password');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGuestPlay = async () => {
        setLoading(true);
        try {
            await playAsGuest();
            navigate('/lobby');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-vignette font-body text-on-background min-h-screen flex items-center justify-center p-6 overflow-hidden relative w-full">
            {/* Subtle Background Elements */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="w-full max-w-[440px] relative z-10">
                {/* Brand Header */}
                <header className="text-center mb-8">
                    <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
                        The Grandmaster's Lounge
                    </h1>
                    <p className="font-body text-on-surface-variant text-sm tracking-widest uppercase">Elite Dominoes Circuit</p>
                </header>

                {error && (
                    <div className="bg-error-container/20 border border-error/50 text-error px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-secondary-container/20 border border-secondary/50 text-secondary px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        {message}
                    </div>
                )}

                {/* MAIN AUTHENTICATION STATE */}
                {(formState === 'login' || formState === 'register') && (
                    <div className="glass-card rounded-[16px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        {/* Tab Toggles */}
                        <div className="flex p-1 bg-surface-container-lowest rounded-full mb-8 relative">
                            <button
                                type="button"
                                onClick={() => switchState('login')}
                                className={`flex-1 py-2 text-sm transition-all duration-300 rounded-full ${formState === 'login' ? 'font-bold bg-surface-container-highest text-primary' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Login
                            </button>
                            <button
                                type="button"
                                onClick={() => switchState('register')}
                                className={`flex-1 py-2 text-sm transition-all duration-300 rounded-full ${formState === 'register' ? 'font-bold bg-surface-container-highest text-primary' : 'font-medium text-on-surface-variant hover:text-on-surface'}`}
                            >
                                Register
                            </button>
                        </div>

                        {/* Form Details */}
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {formState === 'register' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                                            placeholder="master@lounge.com"
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">Nickname</label>
                                        <input
                                            className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                                            placeholder="Display Name"
                                            type="text"
                                            value={formData.nickname}
                                            onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">Username</label>
                                <input
                                    className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                                    placeholder="Grandmaster_01"
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">Password</label>
                                <input
                                    className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none"
                                    placeholder="••••••••"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed font-headline font-extrabold text-sm py-4 rounded-lg uppercase tracking-widest shadow-lg hover:shadow-primary-container/20 active:scale-[0.98] transition-all duration-200 mt-4 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : (formState === 'login' ? 'Login' : 'Create Account')}
                            </button>
                        </form>

                        <div className="mt-8 text-center space-y-4">
                            {formState === 'login' && (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => switchState('forgot_password')}
                                        className="inline-block font-label text-xs text-on-surface-variant hover:text-primary transition-colors duration-200 underline underline-offset-4 decoration-outline-variant hover:decoration-primary"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                            <div>
                                <button
                                    type="button"
                                    onClick={handleGuestPlay}
                                    disabled={loading}
                                    className="inline-block font-label text-xs text-on-surface-variant hover:text-primary transition-colors duration-200 uppercase tracking-widest"
                                >
                                    Play as Guest
                                </button>
                            </div>
                        </div>

                        {/* Decorative Domino Element Bleed */}
                        <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none rotate-12">
                            <span className="material-symbols-outlined text-[160px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
                        </div>
                    </div>
                )}

                {/* VERIFICATION / OTP / FORGOT PASS STATE */}
                {(formState === 'verify' || formState === 'reset_password' || formState === 'forgot_password') && (
                    <div className="glass-card rounded-[16px] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center">
                        <div className="w-16 h-16 bg-surface-container-lowest rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
                            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {formState === 'forgot_password' ? 'lock_reset' : 'mail'}
                            </span>
                        </div>

                        <h2 className="font-headline text-2xl font-bold text-white mb-2">
                            {formState === 'verify' && 'Verify Your Email'}
                            {formState === 'reset_password' && 'Reset Password'}
                            {formState === 'forgot_password' && 'Forgot Password'}
                        </h2>

                        <p className="text-sm text-on-surface-variant text-center mb-8">
                            {formState === 'verify' && 'Enter the 6-digit code sent to your email'}
                            {formState === 'reset_password' && 'Enter your new password and the code sent to your email.'}
                            {formState === 'forgot_password' && 'Enter your email address to receive a 6-digit recovery code.'}
                        </p>

                        <form className="w-full space-y-6" onSubmit={handleSubmit}>
                            {formState === 'forgot_password' && (
                                <div className="space-y-2">
                                    <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none text-center tracking-widest"
                                        placeholder="master@lounge.com"
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {(formState === 'verify' || formState === 'reset_password') && (
                                <div className="flex justify-center gap-2 mb-2">
                                    {otpArray.map((val, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            maxLength={1}
                                            className="w-12 h-14 bg-surface-container-lowest border border-transparent rounded-lg text-center text-xl font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                            value={val}
                                            ref={el => { otpRefs.current[idx] = el; }}
                                            onChange={e => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                                        />
                                    ))}
                                </div>
                            )}

                            {formState === 'reset_password' && (
                                <div className="space-y-2 mt-6">
                                    <label className="block font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1">New Password</label>
                                    <input
                                        className="w-full bg-surface-container-lowest border border-transparent rounded-lg py-3.5 px-4 text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all outline-none text-center"
                                        placeholder="••••••••"
                                        type="password"
                                        value={formData.newPassword}
                                        onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full font-headline font-extrabold text-sm py-4 rounded-lg uppercase tracking-widest shadow-lg transition-all duration-200 mt-4 disabled:opacity-50 ${formState === 'verify' ? 'bg-[#10b981] text-white hover:bg-[#059669]' : 'bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed hover:shadow-primary-container/20 active:scale-[0.98]'}`}
                            >
                                {loading ? 'Loading...' : (formState === 'forgot_password' ? 'Send Code' : (formState === 'reset_password' ? 'Update Password' : 'Verify'))}
                            </button>
                        </form>

                        {formState === 'verify' && (
                            <div className="mt-8 text-center">
                                <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-3">Didn't receive the code?</p>
                                <button
                                    type="button"
                                    onClick={() => {/* Implement resend */}}
                                    className="flex items-center justify-center gap-2 mx-auto text-xs font-bold text-primary hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                                    RESEND CODE
                                </button>
                            </div>
                        )}

                        {(formState === 'forgot_password' || formState === 'reset_password') && (
                            <div className="mt-8 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchState('login')}
                                    className="flex items-center justify-center gap-2 mx-auto text-xs font-bold text-on-surface-variant hover:text-white transition-colors uppercase tracking-widest"
                                >
                                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                    Back to Login
                                </button>
                            </div>
                        )}

                        <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none rotate-12">
                            <span className="material-symbols-outlined text-[120px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
                        </div>
                    </div>
                )}


                {/* System Status / Security Footer */}
                <div className="mt-8 flex items-center justify-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    <p className="text-on-surface-variant text-[11px] uppercase tracking-[0.2em] font-medium">
                        Secure Encryption Standard Active
                    </p>
                </div>
            </main>

            {/* Visual Anchor: Decorative Side Graphics */}
            <div className="hidden lg:block fixed left-12 bottom-12 opacity-20">
                <div className="space-y-4">
                    <div className="w-1 h-12 bg-primary"></div>
                    <p className="font-headline text-primary text-xl [writing-mode:vertical-lr] tracking-tighter">SKILL OVER LUCK</p>
                </div>
            </div>
        </div>
    );
}
