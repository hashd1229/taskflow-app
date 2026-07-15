'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Kanban, Loader2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success('Password reset link sent! Check your email.');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-accent relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="flex flex-col justify-between p-12 text-white relative z-10 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Kanban className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">Manage projects,<br />teams, and tasks<br />all in one place.</h1>
            <p className="text-lg text-white/80 max-w-md">A comprehensive platform for project managers and teams to collaborate, track progress, and deliver on time.</p>
          </div>
          <p className="text-sm text-white/60">© 2026 TaskFlow. All rights reserved.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background relative">
        <div className="absolute top-6 right-6"><ThemeToggle /></div>
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Kanban className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold">TaskFlow</span>
          </div>
          <Card className="border-0 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1">
              {sent ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  </div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription>
                    We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. Click the link in the email to reset your password.
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Forgot password?</CardTitle>
                  <CardDescription>Enter your email and we'll send you a link to reset your password.</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {!sent ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send reset link<ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder, or try again with a different email address.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => { setSent(false); setEmail(''); }}>
                    Try another email
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
