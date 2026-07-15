'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, FolderKanban, ListTodo, Shield, Search, ShieldCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';


const ROLE_COLORS = {
  admin: 'bg-primary/10 text-primary',
  project_manager: 'bg-accent/10 text-accent',
  team_member: 'bg-muted text-muted-foreground',
};

export default function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, totalProjects: 0, totalTasks: 0, admins: 0 });

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') router.push('/dashboard');
  }, [profile, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);

      const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      const { count: taskCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: data?.length || 0,
        totalProjects: projectCount || 0,
        totalTasks: taskCount || 0,
        admins: data?.filter((u) => u.role === 'admin').length || 0,
      });
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (profile?.role === 'admin') fetchUsers(); }, [profile, fetchUsers]);

  const handleRoleChange = async (userId, role, userName) => {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      toast.success(`${userName} is now ${ROLE_LABELS[role]}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  if (authLoading || (profile && profile.role !== 'admin')) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const filtered = users.filter((u) => u.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-5 h-5 text-primary" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          
        </div>
        <p className="text-muted-foreground ml-12">Manage users, roles, and system overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Administrators', value: stats.admins, icon: ShieldCheck, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Total Tasks', value: stats.totalTasks, icon: ListTodo, color: 'text-success', bg: 'bg-success/10' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="p-5">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" />User Management</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No users found</p>
              <p className="text-sm">Try a different search term.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {filtered.map((user) => {
                const initials = user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                const isSelf = user.id === profile?.id;
                return (
                  <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarFallback className={cn('text-sm font-semibold', user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted')}>{initials || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{user.full_name}</p>
                        {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
                      <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v, user.full_name)} disabled={isSelf}>
                        <SelectTrigger className="w-36 h-8 text-xs" disabled={isSelf}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="team_member">Team Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
