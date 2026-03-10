import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, KeyRound, UserPlus, LogIn, Compass, Eye, EyeOff } from 'lucide-react';
import './Auth.css'; // We'll create some styles shortly

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', nickname: '' });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const { login, register, playAsGuest } = useAuth() as any;
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (isLogin) {
            const res = await login(formData.username, formData.password);
            if (res.success) {
                navigate('/lobby');
            } else {
                setError(res.error || 'Login failed');
            }
        } else {
            const res = await register(formData.username, formData.password, formData.nickname);
            if (res.success) {
                navigate('/lobby');
            } else {
                setError(res.error || 'Registration failed');
            }
        }
    };

    const handleGuestPlay = () => {
        playAsGuest();
        navigate('/lobby');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Dominoes Master</h1>
                    <p>{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <UserPlus className="input-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="Nickname (Display Name)" 
                                value={formData.nickname}
                                onChange={e => setFormData({...formData, nickname: e.target.value})}
                                required={!isLogin}
                            />
                        </div>
                    )}
                    <div className="input-group">
                        <User className="input-icon" size={18} />
                        <input 
                            type="text" 
                            placeholder="Username (Unique)" 
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <KeyRound className="input-icon" size={18} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required
                        />
                        <button 
                            type="button" 
                            className="pwd-toggle-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {isLogin && (
                        <div className="forgot-pwd-wrap">
                            <button type="button" className="link-btn forgot-pwd-btn" onClick={() => alert('Forgot Password functionality coming soon!')}>
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button type="submit" className="primary-btn">
                        {isLogin ? <><LogIn size={18}/> Sign In</> : <><UserPlus size={18}/> Register</>}
                    </button>
                </form>

                <div className="auth-separator">
                    <span>or</span>
                </div>

                <button type="button" onClick={handleGuestPlay} className="secondary-btn guest-btn">
                    <Compass size={18} /> Play as Guest
                </button>

                <div className="auth-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button type="button" className="link-btn" onClick={() => {
                            setIsLogin(!isLogin);
                            setFormData({ username: '', password: '', nickname: '' });
                            setError('');
                        }}>
                            {isLogin ? "Sign up" : "Sign in"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
