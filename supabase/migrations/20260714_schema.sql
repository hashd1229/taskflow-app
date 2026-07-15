
-- 1. TABLES

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'team_member' CHECK (role IN ('admin', 'project_manager', 'team_member')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed')),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date date,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 2. INDEXES

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_pm_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON public.activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at DESC);

-- 3. ROW LEVEL SECURITY (Enable on all tables)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 4. HELPER FUNCTION (non-recursive, SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.can_manage_project_members(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN true;
  END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND owner_id = auth.uid()) THEN
    RETURN true;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = 'manager'
  ) THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

-- 5. RLS POLICIES

-- Profiles
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR owner_id = auth.uid()
  OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'project_manager'))
);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR owner_id = auth.uid()
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR owner_id = auth.uid()
);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR owner_id = auth.uid()
);

-- Project Members
CREATE POLICY "pm_select" ON public.project_members FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR public.can_manage_project_members(project_id)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "pm_insert" ON public.project_members FOR INSERT TO authenticated WITH CHECK (
  public.can_manage_project_members(project_id)
);
CREATE POLICY "pm_update" ON public.project_members FOR UPDATE TO authenticated USING (
  public.can_manage_project_members(project_id)
) WITH CHECK (
  public.can_manage_project_members(project_id)
);
CREATE POLICY "pm_delete" ON public.project_members FOR DELETE TO authenticated USING (
  public.can_manage_project_members(project_id)
);

-- Tasks
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'project_manager'))
  OR project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid() AND pm.role = 'manager'
  )
);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = tasks.project_id AND pm.user_id = auth.uid() AND pm.role = 'manager'
  )
);

-- Task Comments
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR task_id IN (
    SELECT t.id FROM public.tasks t WHERE t.project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR task_id IN (
    SELECT t.id FROM public.tasks t WHERE t.project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "comments_update" ON public.task_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.task_comments FOR DELETE TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.project_members pm ON pm.project_id = t.project_id
    WHERE t.id = task_comments.task_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'manager'
  )
);

-- Activity Log
CREATE POLICY "activity_select" ON public.activity_log FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR project_id IS NULL
  OR project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "activity_insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR user_id = auth.uid()
);

-- 6. TRIGGERS & FUNCTIONS

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'team_member'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON public.projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS comments_updated_at ON public.task_comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();