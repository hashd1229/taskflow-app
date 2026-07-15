'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, FolderKanban, Calendar, Users, MoreVertical, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';


const STATUS_COLORS = {
  planning: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  on_hold: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
};

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [memberCounts, setMemberCounts] = useState({});
  const [taskCounts, setTaskCounts] = useState({});

  const canManage = profile?.role === 'admin' || profile?.role === 'project_manager';

  const fetchProjects = useCallback(async () => {
  if (!profile) return;
  try {
    let projectList = [];

    if (profile.role === 'admin') {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      projectList = data || [];
    } else {
      const { data: owned } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', profile.id);

      const { data: memberships } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', profile.id);

      const memberProjectIds = (memberships || []).map(m => m.project_id);
      let memberProjects = [];
      if (memberProjectIds.length > 0) {
        const { data: memberData } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds);
        memberProjects = memberData || [];
      }

      const all = [...(owned || []), ...memberProjects];
      const uniqueIds = new Set();
      projectList = all
        .filter(p => {
          if (uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setProjects(projectList);

    if (projectList.length > 0) {
      const { data: members } = await supabase
        .from('project_members')
        .select('project_id')
        .in('project_id', projectList.map(p => p.id));
      const counts = {};
      (members || []).forEach(m => {
        counts[m.project_id] = (counts[m.project_id] || 0) + 1;
      });
      setMemberCounts(counts);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectList.map(p => p.id));
      const tCounts = {};
      (tasks || []).forEach(t => {
        if (!tCounts[t.project_id]) tCounts[t.project_id] = { total: 0, done: 0 };
        tCounts[t.project_id].total++;
        if (t.status === 'done') tCounts[t.project_id].done++;
      });
      setTaskCounts(tCounts);
    }
  } catch (err) {
    toast.error('Failed to load projects');
  } finally {
    setLoading(false);
  }
}, [profile]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">{canManage ? 'Create and manage your projects' : 'Projects you are a member of'}</p>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Project</Button></DialogTrigger>
            <ProjectDialog onClose={() => setCreateOpen(false)} onSaved={fetchProjects} />
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-1">No projects found</h3>
          <p className="text-sm text-muted-foreground">{search ? 'Try a different search term.' : canManage ? 'Create your first project to get started.' : "You haven't been added to any projects yet."}</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const counts = taskCounts[project.id] || { total: 0, done: 0 };
            const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
            return (
              <ProjectCard
                key={project.id}
                project={project}
                memberCount={memberCounts[project.id] || 0}
                taskTotal={counts.total}
                taskDone={counts.done}
                progress={progress}
                canManage={canManage && (profile?.role === 'admin' || project.owner_id === profile?.id)}
                onEdit={() => setEditingProject(project)}
                onDeleted={fetchProjects}
              />
            );
          })}
        </div>
      )}

      <Dialog 
        open={!!editingProject} 
        onOpenChange={(open) => !open && setEditingProject(null)}
         key={editingProject?.id || 'new'}  // <-- Add this line
>
        <ProjectDialog project={editingProject} onClose={() => setEditingProject(null)} onSaved={fetchProjects} />
      </Dialog>
    </div>
  );
}

function ProjectCard({ project, memberCount, taskTotal, taskDone, progress, canManage, onEdit, onDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      toast.success('Project deleted');
      setDeleteOpen(false);
      onDeleted();
    } catch (err) {
      toast.error(err.message || 'Failed to delete project');
    }
  };

  return (
    <Card className="border-border/60 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all group">
      <div className="flex flex-row items-start justify-between gap-2 p-6 pb-0">
        <div className="flex-1 min-w-0">
          <Link href={`/projects/${project.id}`}>
            <h3 className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description || 'No description provided.'}</p>
        </div>
        {canManage && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-md hover:bg-muted"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 min-w-[120px] animate-scale-in">
                  <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />Edit
                  </button>
                  <button onClick={() => { setMenuOpen(false); setDeleteOpen(true); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="p-6 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={cn('text-xs', STATUS_COLORS[project.status])}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            <span className="flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5" />{taskDone}/{taskTotal} tasks</span>
          </div>
          {project.due_date && (
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>This will permanently delete "{project.name}" and all its tasks. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ProjectDialog({ project, onClose, onSaved }) {
  const { user } = useAuth(); 
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [status, setStatus] = useState(project?.status || 'planning');
  const [startDate, setStartDate] = useState(project?.start_date || '');
  const [dueDate, setDueDate] = useState(project?.due_date || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Project name is required'); return; }
    if (!user) { toast.error('You must be logged in'); return; }
    
    setSaving(true);
    try {
      if (project) {

        const { error } = await supabase
          .from('projects')
          .update({ name, description, status, start_date: startDate || null, due_date: dueDate || null })
          .eq('id', project.id);
        if (error) throw error;
        toast.success('Project updated');
      } else {

        const { data, error } = await supabase
          .from('projects')
          .insert({
            name,
            description,
            status,
            start_date: startDate || null,
            due_date: dueDate || null,
            owner_id: user.id,  
          })
          .select()
          .single();
        if (error) throw error;
        
        await supabase.from('activity_log').insert({
          action: 'project_created',
          description: `created project "${name}"`,
          project_id: data.id,
          user_id: user.id
        });
        toast.success('Project created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{project ? 'Edit Project' : 'Create New Project'}</DialogTitle>
        <DialogDescription>
          {project ? 'Update project details below.' : 'Fill in the details below to create a new project.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input id="name" placeholder="e.g. Website Redesign" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Brief description of the project..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
