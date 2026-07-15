'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban, CheckCircle2, Clock, AlertCircle, TrendingUp, Plus, ArrowRight, ListTodo,
} from 'lucide-react';
import {
  PROJECT_STATUS_LABELS, TASK_STATUS_LABELS,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  planning: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  on_hold: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
};

const PRIORITY_COLORS = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, totalTasks: 0, completedTasks: 0, myTasks: 0, overdueTasks: 0 });
  const [recentProjects, setRecentProjects] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
  async function fetchData() {
    if (!profile) return;
    try { 

      let projects = [];
      if (profile.role === 'admin') {
        const { data } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
        projects = data || [];
      } else {

        const { data: owned } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', profile.id); 
          
        const { data: memberships } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', profile.id);
        const memberIds = (memberships || []).map(m => m.project_id);
        let memberProjects = [];
        if (memberIds.length > 0) {
          const { data: mData } = await supabase
            .from('projects')
            .select('*')
            .in('id', memberIds);
          memberProjects = mData || [];
        }
        const all = [...(owned || []), ...memberProjects];
        const uniqueIds = new Set();
        projects = all
          .filter(p => { if (uniqueIds.has(p.id)) return false; uniqueIds.add(p.id); return true; })
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      let allTasks = [];
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });
        allTasks = tasks || [];
      }

      const { data: assignedTasks } = await supabase
        .from('tasks')
        .select('*, project:projects(name)')
        .eq('assigned_to', profile.id)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);

      let activityData = [];
      try {
        const projectIds = projects.map(p => p.id);
        let activityQuery = supabase
          .from('activity_log')
          .select('*, profile:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(10);
        if (profile.role !== 'admin' && projectIds.length > 0) {
          activityQuery = activityQuery.in('project_id', projectIds);
        }
        const { data: act } = await activityQuery;
        activityData = act || [];
      } catch (activityErr) {
        console.warn('Activity fetch failed, continuing without activity', activityErr);
      }

      const today = new Date().toISOString().split('T')[0];
      setStats({
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'done').length,
        myTasks: (assignedTasks || []).length,
        overdueTasks: allTasks.filter(
          t => t.due_date && t.due_date < today && t.status !== 'done'
        ).length,
      });

      setRecentProjects(projects.slice(0, 4));
      setMyTasks(assignedTasks || []);
      setActivity(activityData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, [profile]);

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your projects today.</p>
        </div>
        <div className="flex items-center gap-3">
          {profile?.role !== 'team_member' && (
            <Link href="/projects"><Button><Plus className="w-4 h-4 mr-2" />New Project</Button></Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Active Projects', value: stats.activeProjects, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
          { label: 'My Open Tasks', value: stats.myTasks, icon: ListTodo, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Completion Rate', value: `${completionRate}%`, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/60 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you that need attention</CardDescription>
            </div>
            <Link href="/projects"><Button variant="ghost" size="sm">View all<ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-success/50" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No pending tasks assigned to you.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => (
                  <Link key={task.id} href={`/projects/${task.project_id}`} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-muted/50 transition-all group">
                    <div className={cn('w-2 h-2 rounded-full', PRIORITY_COLORS[task.priority])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.project?.name || 'Unknown project'}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{TASK_STATUS_LABELS[task.status]}</Badge>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest actions across your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarFallback className="text-xs bg-muted">{item.profile?.full_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{item.profile?.full_name || 'Unknown'}</span>{' '}
                        <span className="text-muted-foreground">{item.description || item.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Projects</CardTitle>
            <CardDescription>Projects you're currently working on</CardDescription>
          </div>
          <Link href="/projects"><Button variant="ghost" size="sm">View all<ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No projects yet</p>
              <p className="text-sm">{profile?.role === 'team_member' ? "You haven't been added to any projects yet." : 'Create your first project to get started.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="p-4 rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{project.name}</h3>
                    <Badge className={cn('text-xs', STATUS_COLORS[project.status])}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description || 'No description provided.'}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

