'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ROLE_LABELS } from '@/lib/types';
import {
  Kanban,
  LayoutDashboard,
  FolderKanban,
  Shield,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'project_manager', 'team_member'] },
  { href: '/projects', label: 'Projects', icon: FolderKanban, roles: ['admin', 'project_manager', 'team_member'] },
  { href: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
];

function NavLinks({ onNavigate }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => profile && item.roles.includes(profile.role));

  return (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              active ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!profile) return null;

  const initials = profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
        <Avatar className="w-9 h-9 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium truncate">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 animate-scale-in">
            <button
              onClick={async () => { await signOut(); router.push('/login'); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <Kanban className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-card/30 p-4 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Kanban className="w-5 h-5 text-white" /></div>
          <span className="text-lg font-bold tracking-tight">TaskFlow</span>
        </div>
        <div className="flex-1"><NavLinks /></div>
        <div className="flex items-center gap-2 px-2 mb-2">
          <ThemeToggle />
        </div>
        <UserCard />
      </aside>

      {/* Mobile Sheet - FIXED: SheetTrigger is now INSIDE Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Kanban className="w-5 h-5 text-white" /></div>
            <span className="text-lg font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex-1"><NavLinks onNavigate={() => setMobileOpen(false)} /></div>
          <div className="mt-4"><UserCard /></div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header - FIXED: Using button directly, no SheetTrigger outside Sheet */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border/60 bg-card/30 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><Kanban className="w-4 h-4 text-white" /></div>
            <span className="font-bold">TaskFlow</span>
          </div>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}