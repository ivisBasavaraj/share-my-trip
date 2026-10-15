import React, { useState, useRef } from 'react';
import { RegisterPayload } from '../../context/AuthContext';
import { useAuth } from '../../context/useAuth';
import { TravelStyle } from '../../types';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, X, Plus, Camera } from 'lucide-react';

interface Props { onSuccess: () => void; onBackToLogin: () => void; }

const STYLES: { value: TravelStyle; icon: string; label: string }[] = [
  { value: 'adventure', icon: '🏔️', label: 'Adventure' },
  { value: 'cultural',  icon: '🏛️', label: 'Cultural'  },
  { value: 'relaxed',   icon: '🌊', label: 'Relaxed'   },
  { value: 'budget',    icon: '🎒', label: 'Budget'    },
  { value: 'luxury',    icon: '✨', label: 'Luxury'    },
  { value: 'nature',    icon: '🌿', label: 'Nature'    },
  { value: 'foodie',    icon: '🍜', label: 'Foodie'    },
];

const INTEREST_TAGS = [
  'Trekking','Road Trips','Photography','Heritage Sites','Local Food',
  'Camping','Wildlife','Beaches','Mountains','Backpacking',
  'Cycling','Eco-Travel','Coffee Trails','Night Drives','Waterfalls',
];

const STEPS = ['Account', 'Profile', 'Interests', 'Review'];

export const RegisterScreen: React.FC<Props> = ({ onSuccess, onBackToLogin }) => {
  const { loginWithGoogle, registerWithEmail } = useAuth();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string,string>>({});
  const [submitErr, setSubmitErr] = useState('');

  // Step 0
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showCPw,   setShowCPw]   = useState(false);

  // Step 1
  const [bio,       setBio]       = useState('');
  const [phone,     setPhone]     = useState('');
  const [city,      setCity]      = useState('');
  const [style,     setStyle]     = useState<TravelStyle>('adventure');
  const [avatarSrc, setAvatarSrc] = useState('/src/assets/images/avatar_traveler_alex_1791735824369.jpg');
  const [avatarData,setAvatarData]= useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);
  const [custom,    setCustom]    = useState('');

  const ic = (err?: string) =>
    `appearance-none relative block w-full px-3 py-2 border ${err ? 'border-rose-400 bg-rose-50' : 'border-gray-300'} placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm bg-white`;

  const Err = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1 text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0"/>{msg}</p> : null;

  const v0 = () => {
    const e: Record<string,string> = {};
    if (fullName.trim().length < 2) e.fullName = 'Enter your full name (min 2 chars)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (password.length < 6) e.password = 'Min 6 characters';
    if (password !== confirmPw) e.confirmPw = 'Passwords do not match';
    setErrors(e); return !Object.keys(e).length;
  };
  const v1 = () => { const e: Record<string,string> = {}; if (bio.trim().length < 10) e.bio = 'Min 10 characters'; setErrors(e); return !Object.keys(e).length; };
  const v2 = () => { const e: Record<string,string> = {}; if (interests.length < 2) e.interests = 'Pick at least 2 interests'; setErrors(e); return !Object.keys(e).length; };

  const next = () => {
    if (step === 0 && !v0()) return;
    if (step === 1 && !v1()) return;
    if (step === 2 && !v2()) return;
    setErrors({}); setStep(s => s + 1);
  };

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { const u = ev.target?.result as string; setAvatarSrc(u); setAvatarData(u); };
    r.readAsDataURL(f);
  };

  const toggle = (t: string) => setInterests(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const addCustom = () => {
    const t = custom.trim();
    if (t && !interests.includes(t)) { setInterests(p => [...p, t]); setCustom(''); }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try { await loginWithGoogle(); onSuccess(); }
    catch (err: any) {
      const code = err?.code || '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request')
        setSubmitErr(err?.message || 'Google sign-up failed.');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    setLoading(true); setSubmitErr('');
    try {
      await registerWithEmail({
        fullName: fullName.trim(), email: email.trim(), password,
        bio: bio.trim(), travelStyle: style, interests,
        homeCity: city.trim() || undefined,
        phone: phone.trim() || undefined,
        photoURL: avatarData || undefined,
      } as RegisterPayload);
      onSuccess();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use')    setSubmitErr('This email is already registered. Try signing in.');
      else if (code === 'auth/weak-password')       setSubmitErr('Password is too weak.');
      else if (code === 'auth/operation-not-allowed') setSubmitErr('Email/Password sign-up is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      else if (code === 'auth/network-request-failed') setSubmitErr('No internet connection.');
      else setSubmitErr(err?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const pwLen = password.length;
  const strength = pwLen >= 12 ? 'Strong' : pwLen >= 8 ? 'Medium' : pwLen > 0 ? 'Weak' : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-emerald-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={onBackToLogin} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
          <span className="font-brand text-xl text-gray-950">Smart Ride Sharing Platform</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h1>
            <p className="text-sm text-gray-500 mt-1">Join verified co-travelers — plan, split &amp; explore together.</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i < step ? 'bg-orange-500 border-orange-500 text-white' : i === step ? 'bg-white border-orange-500 text-orange-600' : 'bg-white border-gray-200 text-gray-400'}`}>
                    {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-semibold hidden sm:block ${i === step ? 'text-orange-600' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-orange-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-orange-100 shadow-md overflow-hidden">

            {/* STEP 0 — Account */}
            {step === 0 && (
              <div className="p-6 space-y-4 animate-in">
                <div><h2 className="text-base font-bold text-gray-900">Account details</h2></div>
                <button onClick={handleGoogle} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 shadow-sm transition disabled:opacity-60">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin"/> :
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>}
                  Sign up with Google
                </button>
                <div className="flex items-center gap-3 text-xs text-gray-400"><div className="flex-1 h-px bg-gray-100"/><span>or register with email</span><div className="flex-1 h-px bg-gray-100"/></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Anusha K N" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(ev => ({...ev, fullName: ''})); }} className={ic(errors.fullName)} />
                  <Err msg={errors.fullName}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setErrors(ev => ({...ev, email: ''})); }} className={ic(errors.email)} />
                  <Err msg={errors.email}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showPw?'text':'password'} placeholder="Min 6 chars" value={password} onChange={e => { setPassword(e.target.value); setErrors(ev => ({...ev, password: ''})); }} className={`${ic(errors.password)} pr-9`}/>
                      <button type="button" onClick={() => setShowPw(v=>!v)} className="absolute right-2.5 top-2.5 text-gray-400">{showPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                    </div>
                    <Err msg={errors.password}/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input type={showCPw?'text':'password'} placeholder="Repeat" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setErrors(ev => ({...ev, confirmPw: ''})); }} className={`${ic(errors.confirmPw)} pr-9`}/>
                      <button type="button" onClick={() => setShowCPw(v=>!v)} className="absolute right-2.5 top-2.5 text-gray-400">{showCPw?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
                    </div>
                    <Err msg={errors.confirmPw}/>
                  </div>
                </div>
                {strength && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Strength</span>
                      <span className={strength==='Strong'?'text-emerald-600':strength==='Medium'?'text-amber-500':'text-rose-500'}>{strength}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength==='Strong'?'bg-emerald-500 w-full':strength==='Medium'?'bg-amber-400 w-2/3':'bg-rose-400 w-1/3'}`}/>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1 — Profile */}
            {step === 1 && (
              <div className="p-6 space-y-4 animate-in">
                <div><h2 className="text-base font-bold text-gray-900">Your traveler profile</h2></div>
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <img src={avatarSrc} alt="avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-200 shadow-sm"/>
                    <button type="button" onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Camera className="w-5 h-5"/></button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar}/>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Profile photo</p>
                    <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-xs font-semibold text-orange-600 hover:text-orange-800">Upload photo</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">About You <span className="text-red-500">*</span></label>
                  <textarea rows={3} placeholder="e.g. Weekend trekker from Bengaluru looking for carpool partners." value={bio} onChange={e => { setBio(e.target.value); setErrors(ev => ({...ev, bio: ''})); }}
                    className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none transition ${errors.bio?'border-rose-400 bg-rose-50':'border-gray-300 bg-white'}`}/>
                  <div className="flex justify-between mt-0.5"><Err msg={errors.bio}/><span className={`text-[11px] ml-auto ${bio.length>250?'text-rose-500':'text-gray-400'}`}>{bio.length}/250</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-semibold text-gray-700 mb-1">Home City</label><input type="text" placeholder="Bengaluru, Karnataka" value={city} onChange={e => setCity(e.target.value)} className={ic()}/></div>
                  <div><label className="block text-xs font-semibold text-gray-700 mb-1">Phone (optional)</label><input type="tel" placeholder="+91 98451 00000" value={phone} onChange={e => setPhone(e.target.value)} className={ic()}/></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Travel Style <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {STYLES.map(s => (
                      <button key={s.value} type="button" onClick={() => setStyle(s.value)}
                        className={`p-2 rounded-xl border text-center transition-all ${style===s.value?'border-orange-400 bg-orange-50 ring-2 ring-orange-300/30':'border-gray-200 bg-gray-50 hover:border-orange-300'}`}>
                        <span className="text-xl leading-none block">{s.icon}</span>
                        <p className="text-[10px] font-bold text-gray-800 mt-1">{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Interests */}
            {step === 2 && (
              <div className="p-6 space-y-4 animate-in">
                <div><h2 className="text-base font-bold text-gray-900">What do you love?</h2><p className="text-xs text-gray-500 mt-0.5">Pick at least 2 — powers the AI companion matching.</p></div>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map(tag => { const on = interests.includes(tag); return (
                    <button key={tag} type="button" onClick={() => toggle(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on?'bg-orange-500 text-white border-orange-500':'bg-white text-gray-700 border-gray-200 hover:border-orange-400 hover:text-orange-700'}`}>
                      {on && '✓ '}{tag}
                    </button>
                  );})}
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Add custom interest…" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); addCustom(); }}} className={`${ic()} flex-1`}/>
                  <button type="button" onClick={addCustom} className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0"><Plus className="w-3.5 h-3.5"/> Add</button>
                </div>
                {interests.length > 0 && (
                  <div><p className="text-xs font-semibold text-gray-600 mb-2">Selected ({interests.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold rounded-full">
                          {tag}<button type="button" onClick={() => toggle(tag)} className="text-orange-400 hover:text-orange-800 ml-0.5"><X className="w-3 h-3"/></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Err msg={errors.interests}/>
              </div>
            )}

            {/* STEP 3 — Review */}
            {step === 3 && (
              <div className="p-6 space-y-4 animate-in">
                <div><h2 className="text-base font-bold text-gray-900">Review &amp; create account</h2></div>
                <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <img src={avatarSrc} alt={fullName} className="w-14 h-14 rounded-xl object-cover border border-orange-200 shrink-0"/>
                  <div>
                    <p className="font-bold text-gray-900">{fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{email}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full capitalize">{style}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">Pending Verification</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1"><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Bio</p><p className="text-sm text-gray-700">{bio}</p></div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">City</p><p className="text-gray-700">{city||'—'}</p></div>
                  <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Phone</p><p className="text-gray-700">{phone||'—'}</p></div>
                </div>
                <div><p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Interests ({interests.length})</p>
                  <div className="flex flex-wrap gap-1.5">{interests.map(t => (<span key={t} className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold rounded-full">{t}</span>))}</div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"/>
                  <span>Your profile will be saved to Firebase Firestore and appear in companion matching and trip listings.</span>
                </div>
                {submitErr && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>{submitErr}
                  </div>
                )}
              </div>
            )}

            {/* Footer nav */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              {step > 0
                ? <button onClick={() => { setErrors({}); setStep(s => s-1); }} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"><ArrowLeft className="w-4 h-4"/> Back</button>
                : <div/>}
              {step < STEPS.length - 1
                ? <button onClick={next} className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all">Continue →</button>
                : <button onClick={handleSubmit} disabled={loading}
                    className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Creating account…</> : 'Create Account'}
                  </button>}
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-5">
            Already have an account?{' '}
            <button onClick={onBackToLogin} className="font-semibold text-sky-600 hover:text-sky-700">Sign in.</button>
          </p>
        </div>
      </div>
    </div>
  );
};
