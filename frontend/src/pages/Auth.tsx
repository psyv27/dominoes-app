import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Divider, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined, CompassOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './Auth.css';

const { Title, Text } = Typography;

type FormState = 'login' | 'register' | 'verify' | 'forgot_password' | 'reset_password';

export default function Auth() {
    const [formState, setFormState] = useState<FormState>('login');
    const [formData, setFormData] = useState({ email: '', username: '', password: '', nickname: '', otp: '', newPassword: '' });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register, verifyOtp, forgotPassword, resetPassword, playAsGuest } = useAuth() as any;
    const navigate = useNavigate();

    const switchState = (newState: FormState) => {
        setFormState(newState);
        setError('');
        setMessage('');
    };

    const handleSubmit = async () => {
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

    const renderHeader = () => {
        let titleText = 'Dominoes Master';
        let subText = '';
        if (formState === 'login') subText = 'Sign in to your account';
        else if (formState === 'register') subText = 'Create a new account';
        else if (formState === 'verify') subText = 'Verify Your Email';
        else if (formState === 'forgot_password') subText = 'Reset Your Password';
        else if (formState === 'reset_password') subText = 'Set New Password';

        return (
            <div className="auth-header">
                <Title level={2} style={{ margin: 0, color: '#f5f0e6' }}>{titleText}</Title>
                <Text type="secondary">{subText}</Text>
            </div>
        );
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {renderHeader()}

                {error && <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: '1rem', borderRadius: 8 }} />}
                {message && <Alert message={message} type="info" showIcon closable onClose={() => setMessage('')} style={{ marginBottom: '1rem', borderRadius: 8 }} />}

                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* EMAIL INPUT */}
                    {(formState === 'register' || formState === 'forgot_password') && (
                        <Input
                            size="large"
                            prefix={<MailOutlined />}
                            placeholder="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            onPressEnter={handleSubmit}
                        />
                    )}

                    {/* NICKNAME & USERNAME INPUTS */}
                    {formState === 'register' && (
                        <Input
                            size="large"
                            prefix={<UserAddOutlined />}
                            placeholder="Nickname (Display Name)"
                            value={formData.nickname}
                            onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                        />
                    )}
                    {(formState === 'login' || formState === 'register') && (
                        <Input
                            size="large"
                            prefix={<UserOutlined />}
                            placeholder="Username"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            onPressEnter={handleSubmit}
                        />
                    )}

                    {/* PASSWORD INPUT */}
                    {(formState === 'login' || formState === 'register') && (
                        <Input.Password
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="Password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            onPressEnter={handleSubmit}
                        />
                    )}

                    {/* FORGOT PASSWORD LINK */}
                    {formState === 'login' && (
                        <div style={{ textAlign: 'right', marginTop: '-10px' }}>
                            <Button type="link" size="small" onClick={() => switchState('forgot_password')} style={{ fontWeight: 600, padding: 0 }}>
                                Forgot Password?
                            </Button>
                        </div>
                    )}

                    {/* OTP INPUT */}
                    {(formState === 'verify' || formState === 'reset_password') && (
                        <Input
                            size="large"
                            prefix={<SafetyCertificateOutlined />}
                            placeholder="6-digit Verification Code"
                            maxLength={6}
                            value={formData.otp}
                            onChange={e => setFormData({ ...formData, otp: e.target.value })}
                            onPressEnter={handleSubmit}
                            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                        />
                    )}

                    {/* NEW PASSWORD INPUT */}
                    {formState === 'reset_password' && (
                        <Input.Password
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="New Password"
                            value={formData.newPassword}
                            onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                            onPressEnter={handleSubmit}
                        />
                    )}

                    {/* SUBMIT BUTTON */}
                    <Button
                        type="primary"
                        size="large"
                        block
                        loading={loading}
                        icon={formState === 'login' ? <LoginOutlined /> : formState === 'register' ? <UserAddOutlined /> : null}
                        onClick={handleSubmit}
                        style={{ height: 48, fontWeight: 700, fontSize: '1.05rem', marginTop: '0.5rem' }}
                    >
                        {formState === 'login' && 'Sign In'}
                        {formState === 'register' && 'Register Account'}
                        {formState === 'verify' && 'Verify & Login'}
                        {formState === 'forgot_password' && 'Send Reset Code'}
                        {formState === 'reset_password' && 'Update Password'}
                    </Button>
                </Space>

                {(formState === 'login' || formState === 'register') && (
                    <>
                        <Divider plain style={{ borderColor: 'rgba(212,169,98,0.15)', color: '#a8b3a0' }}>or</Divider>
                        <Button size="large" block icon={<CompassOutlined />} onClick={handleGuestPlay} style={{ height: 44, fontWeight: 600 }}>
                            Play as Guest
                        </Button>
                    </>
                )}

                <div className="auth-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    {formState === 'login' && (
                        <Text type="secondary">Don't have an account? <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => switchState('register')}>Sign up</Button></Text>
                    )}
                    {(formState === 'register' || formState === 'forgot_password' || formState === 'reset_password' || formState === 'verify') && (
                        <Text type="secondary">Back to <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => switchState('login')}>Sign in</Button></Text>
                    )}
                </div>
            </div>
        </div>
    );
}
