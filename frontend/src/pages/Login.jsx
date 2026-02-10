import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(loginData.email, loginData.password);
    setIsLoading(false);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await register(registerData.name, registerData.email, registerData.password);
    setIsLoading(false);
    if (success) {
      setLoginData({ email: registerData.email, password: '' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FE5B1B] rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-2xl font-heading">V</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-heading font-bold text-gray-900 uppercase tracking-tight">
                Vertiv
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-lato-light">Control Tower</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm font-lato-light">Enterprise Initiative Management</p>
        </div>

        <Card className="border-gray-200/80 shadow-xl rounded-xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 bg-gradient-to-b from-white to-gray-50/50">
            <CardTitle className="text-xl font-heading uppercase tracking-tight">
              Access Control Tower
            </CardTitle>
            <CardDescription className="font-lato-light">
              Sign in or create an account to manage initiatives
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="login" 
                  data-testid="login-tab"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5B1B] font-lato-bold transition-all"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  data-testid="register-tab"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5B1B] font-lato-bold transition-all"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-lato-regular">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@vertiv.com"
                      data-testid="login-email-input"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="rounded-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-lato-regular">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        data-testid="login-password-input"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="rounded-sm pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    data-testid="login-submit-btn"
                    disabled={isLoading}
                    className="w-full text-white rounded-lg font-lato-bold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-lato-regular">
                      Full Name
                    </Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="John Smith"
                      data-testid="register-name-input"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      className="rounded-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-lato-regular">
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="name@vertiv.com"
                      data-testid="register-email-input"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      className="rounded-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-lato-regular">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create password"
                        data-testid="register-password-input"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="rounded-sm pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    data-testid="register-submit-btn"
                    disabled={isLoading}
                    className="w-full text-white rounded-lg font-lato-bold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #FE5B1B 0%, #E0480E 100%)' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          Enterprise Initiative Control Tower • Vertiv © 2024
        </p>
      </div>
    </div>
  );
};

export default Login;
