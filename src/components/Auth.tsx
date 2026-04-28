import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LogIn, Mail, Github, Chrome, ShieldCheck, Phone, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('Rwanda');
  const [countryCode, setCountryCode] = useState('RW');
  const [phoneFlag, setPhoneFlag] = useState('🇷🇼');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('vercel.app')) {
        return;
      }

      if (event.data?.type === 'OAUTH_CALLBACK') {
        const { hash, search } = event.data;
        
        // Try hash first (for OAuth token with skipBrowserRedirect)
        if (hash) {
          setLoading(true);
          try {
            const hashParams = new URLSearchParams(hash.replace('#', ''));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const expiresIn = hashParams.get('expires_in');
            
            if (accessToken && refreshToken) {
              const expiresAt = Date.now() + (parseInt(expiresIn || '3600') * 1000);
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) throw error;
              toast.success('Logged in with Google!');
              window.location.href = '/';
              return;
            }
          } catch (err: any) {
            console.error('Hash-based OAuth error:', err);
          } finally {
            setLoading(false);
          }
        }
        
        // Fallback: Try search params for code-based exchange
        if (search) {
          setLoading(true);
          try {
            const params = new URLSearchParams(search);
            const code = params.get('code');
            
            if (code) {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              toast.success('Logged in with Google!');
              window.location.href = '/';
              return;
            }
          } catch (err: any) {
            toast.error(err.message || 'Failed to complete Google sign in');
          } finally {
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && 
                      import.meta.env.VITE_SUPABASE_ANON_KEY && 
                      !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!isConfigured) {
      setError('Supabase is not configured. Please set your environment variables.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.session) {
        toast.success('Logged in successfully!');
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!isConfigured) {
      setError('Supabase is not configured.');
      return;
    }
    setLoading(true);
    try {
      if (!showOtp) {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        setShowOtp(true);
        toast.success('OTP sent to your phone!');
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: 'sms'
        });
        if (error) throw error;
        if (data.session) {
          toast.success('Logged in successfully!');
          window.location.href = '/';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with phone');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!isConfigured) {
      setError('Supabase is not configured. Please set your environment variables.');
      return;
    }
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            country: country,
            country_code: countryCode,
            phone_flag: phoneFlag
          }
        }
      });
      if (error) throw error;
      
      if (!data.session) {
        setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
        setPassword('');
        setActiveTab('login');
        toast.success('Account created! Please verify your email.');
      } else {
        toast.success('Account created and logged in!');
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, 'supabase_oauth', 'width=600,height=700');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md max-h-[95vh] overflow-y-auto"
      >
        {!isConfigured && (
          <Card className="mb-6 border-destructive bg-destructive/5">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Configuration Required
              </CardTitle>
              <CardDescription className="text-xs text-destructive/80">
                Please set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> in the Secrets panel to enable authentication.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        <Card className="border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign in method
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 gap-4">
              <Button variant="outline" onClick={handleGoogleSignIn} disabled={loading}>
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <div className="flex gap-2 mb-4 mt-4">
                  <Button 
                    variant={authMethod === 'email' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={() => { setAuthMethod('email'); setShowOtp(false); }}
                  >
                    <Mail className="h-3 w-3 mr-2" />
                    Email
                  </Button>
                  <Button 
                    variant={authMethod === 'phone' ? 'default' : 'outline'} 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={() => setAuthMethod('phone')}
                  >
                    <Smartphone className="h-3 w-3 mr-2" />
                    Phone
                  </Button>
                </div>

                {authMethod === 'email' ? (
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    {successMessage && (
                      <div className="bg-green-500/10 border border-green-500/20 text-green-600 p-3 rounded-lg text-xs font-medium">
                        {successMessage}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading ? 'Loading...' : 'Sign In'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handlePhoneSignIn} className="space-y-4">
                    {!showOtp ? (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                        />
                        <p className="text-[10px] text-muted-foreground">Enter the code sent to {phone}</p>
                      </div>
                    )}
                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading ? 'Loading...' : showOtp ? 'Verify OTP' : 'Send OTP'}
                    </Button>
                    {showOtp && (
                      <Button variant="ghost" className="w-full text-xs" onClick={() => setShowOtp(false)}>
                        Change Phone Number
                      </Button>
                    )}
                  </form>
                )}
                
                {error && (
                  <p className="text-xs text-destructive text-center mt-4">{error}</p>
                )}
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleEmailSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="m@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <select 
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-20"
                        value={countryCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          const countryMap: Record<string, {name: string; flag: string}> = {
                            'RW': { name: 'Rwanda', flag: '🇷🇼' },
                            'UG': { name: 'Uganda', flag: '🇺🇬' },
                            'KE': { name: 'Kenya', flag: '🇰🇪' },
                            'TZ': { name: 'Tanzania', flag: '🇹🇿' },
                            'US': { name: 'United States', flag: '🇺🇸' },
                            'GB': { name: 'United Kingdom', flag: '🇬🇧' },
                            'CA': { name: 'Canada', flag: '🇨🇦' },
                            'AU': { name: 'Australia', flag: '🇦🇺' },
                            'ZA': { name: 'South Africa', flag: '🇿🇦' },
                            'NG': { name: 'Nigeria', flag: '🇳🇬' },
                            'EG': { name: 'Egypt', flag: '🇪🇬' },
                            'FR': { name: 'France', flag: '🇫🇷' },
                            'DE': { name: 'Germany', flag: '🇩🇪' },
                            'IT': { name: 'Italy', flag: '🇮🇹' },
                            'ES': { name: 'Spain', flag: '🇪🇸' },
                            'IN': { name: 'India', flag: '🇮🇳' },
                            'JP': { name: 'Japan', flag: '🇯🇵' },
                            'CN': { name: 'China', flag: '🇨🇳' },
                            'BR': { name: 'Brazil', flag: '🇧🇷' },
                            'MX': { name: 'Mexico', flag: '🇲🇽' }
                          };
                          const country = countryMap[code];
                          if (country) {
                            setCountryCode(code);
                            setCountry(country.name);
                            setPhoneFlag(country.flag);
                          }
                        }}
                      >
                        <option value="RW">🇷🇼 RW</option>
                        <option value="UG">🇺🇬 UG</option>
                        <option value="KE">🇰🇪 KE</option>
                        <option value="TZ">🇹🇿 TZ</option>
                        <option value="US">🇺🇸 US</option>
                        <option value="GB">🇬🇧 GB</option>
                        <option value="CA">🇨🇦 CA</option>
                        <option value="AU">🇦🇺 AU</option>
                        <option value="ZA">🇿🇦 ZA</option>
                        <option value="NG">🇳🇬 NG</option>
                        <option value="EG">🇪🇬 EG</option>
                        <option value="FR">🇫🇷 FR</option>
                        <option value="DE">🇩🇪 DE</option>
                        <option value="IT">🇮🇹 IT</option>
                        <option value="ES">🇪🇸 ES</option>
                        <option value="IN">🇮🇳 IN</option>
                        <option value="JP">🇯🇵 JP</option>
                        <option value="CN">🇨🇳 CN</option>
                        <option value="BR">🇧🇷 BR</option>
                        <option value="MX">🇲🇽 MX</option>
                      </select>
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="788984216"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">E.g., for Rwanda: 250788984216 or 788984216</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? 'Loading...' : 'Create Account'}
                  </Button>
                  {error && (
                    <p className="text-xs text-destructive text-center mt-2">{error}</p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-center w-full text-muted-foreground">
              By clicking continue, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
