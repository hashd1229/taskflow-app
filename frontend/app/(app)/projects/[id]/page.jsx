'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Calendar, Users, Trash2, MessageSquare, X, UserPlus, Clock, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TASK_STATUSES, TASK_PRIORITIES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  planning: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  on_hold: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
};

const PRIORITY_COLORS = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-primary',
  high: 'border-l-warning',
  urgent: 'border-l-destructive',
};

const COLUMN_COLORS = {
  todo: 'bg-muted-foreground/10',
  in_progress: 'bg-primary/10',
  review: 'bg-warning/10',
  done: 'bg-success/10',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  const canManage = profile?.role === 'admin' ||
    (profile && project?.owner_id === profile.id) ||
    (profile && members.some((m) => m.user_id === profile.id && m.role === 'manager'));

  const canCreateTasks = profile?.role === 'admin' || canManage;

  const fetchProject = useCallback(async () => {
    if (!profile) return;
    try {
      const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
      if (!proj) { router.push('/projects'); return; }
      setProject(proj);

      const { data: mbrs } = await supabase
  .from('project_members')
  .select('*')
  .eq('project_id', projectId);

if (mbrs && mbrs.length > 0) {
  const userIds = [...new Set(mbrs.map(m => m.user_id))];
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .in('id', userIds);
  
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const enrichedMembers = mbrs.map(m => ({
    ...m,
    profile: profileMap[m.user_id] || null
  }));
  
  setMembers(enrichedMembers);
} else {
  setMembers([]);
}

      const { data: allP } = await supabase.from('profiles').select('id, full_name, role, avatar_url').order('full_name');
      setAllProfiles(allP || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, profile, router]);

  const fetchTasks = useCallback(async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Task fetch error:', error);
    toast.error('Failed to load tasks');
    return;
  }
  setTasks(data || []);
}, [projectId]);

  useEffect(() => { fetchProject(); fetchTasks(); }, [fetchProject, fetchTasks]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl" />)}</div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Projects
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge className={cn('text-xs', STATUS_COLORS[project.status])}>{project.status.charAt(0).toUpperCase() + project.status.slice(1)}</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{project.description || 'No description provided.'}</p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{members.length} {members.length === 1 ? 'member' : 'members'}</span>
            {project.due_date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Due {new Date(project.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
            <span>Created {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border/60">
        <button onClick={() => setActiveTab('board')} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px', activeTab === 'board' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>Task Board</button>
        <button onClick={() => setActiveTab('members')} className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px', activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>Members</button>
      </div>

      {activeTab === 'board' && (
        <KanbanBoard tasks={tasks} canCreateTasks={!!canCreateTasks} members={members} projectId={projectId} onTasksChanged={fetchTasks} onEditTask={(task) => { setEditingTask(task); setTaskDialogOpen(true); }} onNewTask={() => { setEditingTask(null); setTaskDialogOpen(true); }} userId={profile.id} />
      )}

      {activeTab === 'members' && (
        <MembersTab members={members} allProfiles={allProfiles} projectId={projectId} canManage={!!canManage} onMembersChanged={fetchProject} onAddMember={() => setMemberDialogOpen(true)} />
      )}

      <Dialog 
  open={taskDialogOpen} 
  onOpenChange={setTaskDialogOpen}
  key={editingTask?.id || 'new-task'}
>
  <TaskDialog 
    task={editingTask} 
    projectId={projectId} 
    members={members} 
    allProfiles={allProfiles} 
    canManage={!!canManage} 
    onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }} 
    onSaved={() => { fetchTasks(); setTaskDialogOpen(false); setEditingTask(null); }} 
  />
</Dialog>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <AddMemberDialog allProfiles={allProfiles} projectId={projectId} onClose={() => setMemberDialogOpen(false)} onAdded={() => { fetchProject(); setMemberDialogOpen(false); }} />
      </Dialog>
    </div>
  );
}

function KanbanBoard({ tasks, canCreateTasks, members, projectId, onTasksChanged, onEditTask, onNewTask, userId }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, taskId) => { setDraggingId(taskId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, status) => { e.preventDefault(); setDragOverCol(status); };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggingId) return;
    const task = tasks.find((t) => t.id === draggingId);
    if (!task || task.status === status) { setDraggingId(null); return; }
    try {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', draggingId);
      if (error) throw error;
      await supabase.from('activity_log').insert({action: 'task_status_changed',description: `moved "${task.title}" to ${TASK_STATUS_LABELS[status]}`,project_id: projectId,task_id: draggingId,user_id: userId,});
      onTasksChanged();
      toast.success(`Task moved to ${TASK_STATUS_LABELS[status]}`);
    } catch (err) {
      toast.error('Failed to move task');
    } finally {
      setDraggingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {canCreateTasks && (
        <div className="flex justify-end"><Button onClick={onNewTask} size="sm"><Plus className="w-4 h-4 mr-2" />Add Task</Button></div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TASK_STATUSES.map((status) => {
          const colTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} onDragOver={(e) => handleDragOver(e, status)} onDrop={(e) => handleDrop(e, status)} onDragLeave={() => setDragOverCol(null)}
              className={cn('rounded-xl border border-border/60 p-3 min-h-[300px] transition-colors', COLUMN_COLORS[status], dragOverCol === status && 'border-primary border-dashed bg-primary/5')}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
                <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} dragging={draggingId === task.id} onDragStart={(e) => handleDragStart(e, task.id)} onDragEnd={() => setDraggingId(null)} onClick={() => onEditTask(task)} />
                ))}
                {colTasks.length === 0 && <div className="text-center py-8 text-xs text-muted-foreground/60">No tasks</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, dragging, onDragStart, onDragEnd, onClick }) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className={cn('p-3 bg-card rounded-lg border border-border/60 border-l-4 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group', PRIORITY_COLORS[task.priority], dragging && 'opacity-50 rotate-2')}>
      <p className="text-sm font-medium mb-2 line-clamp-2 group-hover:text-primary transition-colors">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-xs">{TASK_PRIORITY_LABELS[task.priority]}</Badge>
        <div className="flex items-center gap-2">
          {isOverdue && <span className="flex items-center gap-0.5 text-xs text-destructive font-medium"><AlertCircle className="w-3 h-3" /></span>}
          {task.due_date && <span className={cn('flex items-center gap-0.5 text-xs', isOverdue ? 'text-destructive' : 'text-muted-foreground')}><Clock className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          {task.assignee && <Avatar className="w-6 h-6 border border-border"><AvatarFallback className="text-[10px] bg-muted">{task.assignee.full_name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>}
        </div>
      </div>
    </div>
  );
}

function TaskDialog({ task, projectId, members, allProfiles, canManage, onClose, onSaved }) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState(task?.status || 'todo');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || 'unassigned');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const { profile } = useAuth();

  const assigneeOptions = members.length > 0 ? members : allProfiles.map((p) => ({ profile: p, user_id: p.id }));

  useEffect(() => { if (task) fetchComments(); }, [task]);

  const fetchComments = async () => {
    if (!task) return;
    // const { data } = await supabase.from('task_comments').select('*, profile:profiles!task_comments_user_id_fkey(full_name)').eq('task_id', task.id).order('created_at', { ascending: true });
    // setComments(data || []);
    const { data: commentsData, error: commentsError } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', task.id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
    setComments([]);
    return;
  }

  // 2. Get profiles for those comments
  if (commentsData && commentsData.length > 0) {
    const userIds = [...new Set(commentsData.map(c => c.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // Combine
    const enriched = commentsData.map(c => ({
      ...c,
      profile: profileMap[c.user_id] || null,
    }));

    setComments(enriched);
  } else {
    setComments([]);
  }

  };

  const handleSave = async () => {
  if (!title.trim()) { toast.error('Task title is required'); return; }
  if (!profile) { toast.error('You must be logged in'); return; }
  
  setSaving(true);
  try {
    if (task) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          status,
          priority,
          assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
          due_date: dueDate || null,
        })
        .eq('id', task.id);
      if (error) throw error;
      
      await supabase.from('activity_log').insert({
        action: 'task_updated',
        description: `updated task "${title}"`,
        project_id: projectId,
        task_id: task.id,
        user_id: profile.id  
});
      toast.success('Task updated');
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title,
          description,
          status,
          priority,
          assigned_to: assignedTo === 'unassigned' ? null : assignedTo,
          due_date: dueDate || null,
          created_by: profile.id,   
        })
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('activity_log').insert({
        action: 'task_created',
        description: `created task "${title}"`,
        project_id: projectId,
        task_id: data.id,
        user_id: profile.id  
});
      toast.success('Task created');
    }
    onSaved();
  } catch (err) {
    toast.error(err.message || 'Failed to save task');
  } finally {
    setSaving(false);
  }
};

  const handleDelete = async () => {
    if (!task) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) throw error;
      toast.success('Task deleted');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const handleAddComment = async () => {
  if (!newComment.trim() || !task) return;
  setCommentLoading(true);
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        content: newComment,
        user_id: profile.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', profile.id)
      .single();

    const newCommentEnriched = {
      ...data,
      profile: profileData || null,
    };

    setComments(prev => [...prev, newCommentEnriched]);
    setNewComment('');

    toast.success('Comment added'); 
  } catch (err) {
    toast.error(err.message || 'Failed to add comment');
  } finally {
    setCommentLoading(false);
  }
};

  return (
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{task ? 'Task Details' : 'Create New Task'}</DialogTitle>
                <DialogDescription>{task ? 'Update task details and manage comments.' : 'Fill in the details to create a new task.'}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input placeholder="e.g. Design homepage mockup" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the task..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {assigneeOptions.map((m) => <SelectItem key={m.user_id || m.id} value={m.user_id || m.id}>{m.profile?.full_name || m.full_name}</SelectItem>)}
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
  
                            {task && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>
                  </div>

                {/* Display comments */}
                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {comments.map((comment) => {
                      const canDeleteComment =
                        profile?.id === comment.user_id ||
                        canManage;   

                      return (
                        <div key={comment.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 group relative">
                          <Avatar className="w-7 h-7 border border-border">
                            <AvatarFallback className="text-[10px] bg-card">
                              {comment.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{comment.profile?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{comment.content}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                              {new Date(comment.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          {canDeleteComment && (
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('task_comments')
                                    .delete()
                                    .eq('id', comment.id);
                                  if (error) throw error;
                                  setComments((prev) => prev.filter((c) => c.id !== comment.id));
                                  toast.success('Comment deleted');
                                } catch (err) {
                                  toast.error('Failed to delete comment');
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded absolute top-1 right-1"
                            >
                              <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    

                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>

                {/* New comment input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={commentLoading || !newComment.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            )}
      </div>
      <DialogFooter className="flex items-center justify-between">
        <div>{task && canManage && (<Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>)}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function MembersTab({ members, allProfiles, projectId, canManage, onMembersChanged, onAddMember }) {
  const { profile } = useAuth();
  const handleRemove = async (memberId, memberName) => {
    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;

      await supabase.from('activity_log').insert({
        action: 'member_removed',
        description: `removed ${memberName} from the project`,
        project_id: projectId,
        user_id: profile?.id,
      });
      
      toast.success(`${memberName} removed from project`);
      onMembersChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      const { error } = await supabase.from('project_members').update({ role }).eq('id', memberId);
      if (error) throw error;
      toast.success('Member role updated');
      onMembersChanged();
    } catch (err) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (<div className="flex justify-end"><Button size="sm" onClick={onAddMember}><UserPlus className="w-4 h-4 mr-2" />Add Member</Button></div>)}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">No members yet</p>
              <p className="text-sm">Add team members to this project to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{member.profile?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{member.profile?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{member.role === 'manager' ? 'Project Manager' : 'Team Member'}</p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="member">Member</SelectItem></SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleRemove(member.id, member.profile?.full_name || 'Member')}><X className="w-4 h-4 text-muted-foreground" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AddMemberDialog({ allProfiles, projectId, onClose, onAdded }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('member');
  const [saving, setSaving] = useState(false);
  const [currentMemberIds, setCurrentMemberIds] = useState([]);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchCurrentMembers = async () => {
      const { data } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);
      setCurrentMemberIds((data || []).map(m => m.user_id));
    };
    fetchCurrentMembers();
  }, [projectId]);

  const available = allProfiles.filter(p => !currentMemberIds.includes(p.id));

  const handleAdd = async () => {
    if (!selectedUser) { toast.error('Please select a user'); return; }
    if (!profile) { toast.error('You must be logged in'); return; }

    if (currentMemberIds.includes(selectedUser)) {
      toast.error('User is already a member');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: selectedUser, role });

      if (error) throw error;

      const userName = allProfiles.find(p => p.id === selectedUser)?.full_name;
      await supabase.from('activity_log').insert({
        action: 'member_added',
        description: `added ${userName} to the project`,
        project_id: projectId,
        user_id: profile.id,
      });

      toast.success('Member added to project');
      onAdded();
    } catch (err) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogDescription>Select a user to add to this project.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>User</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
            <SelectContent>
              {available.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {available.length === 0 && (
            <p className="text-xs text-muted-foreground">All users are already members of this project.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manager">Project Manager</SelectItem>
              <SelectItem value="member">Team Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={saving || !selectedUser}>
          {saving ? 'Adding...' : 'Add Member'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}