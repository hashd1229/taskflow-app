'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Kanban, ArrowRight, Users, FolderKanban, CheckCircle2, Shield, Zap, BarChart3, ListChecks, GitBranch } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Kanban className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/signup"><Button size="sm">Get started<ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              Project & Team Task Management Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Manage projects, teams,<br />and tasks —{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                all in one place
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              TaskFlow gives administrators, project managers, and team members
              a unified workspace with role-based access, Kanban boards, and
              real-time progress tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup"><Button size="lg" className="w-full sm:w-auto">Start for free<ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
              <Link href="/login"><Button variant="outline" size="lg" className="w-full sm:w-auto">Sign in</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'Role-Based Access', desc: 'Three distinct roles — Administrator, Project Manager, and Team Member — with granular permissions and secure authentication.' },
            { icon: FolderKanban, title: 'Project Management', desc: 'Create projects, assign team members, set deadlines, and track status from planning to completion.' },
            { icon: ListChecks, title: 'Kanban Task Board', desc: 'Visual task board with drag-friendly columns, priority levels, assignments, and due dates.' },
            { icon: Users, title: 'Team Collaboration', desc: 'Add members to projects, assign tasks, leave comments, and keep everyone aligned.' },
            { icon: BarChart3, title: 'Dashboard Analytics', desc: 'Real-time stats on project progress, task completion, and team activity.' },
            { icon: GitBranch, title: 'CI/CD Ready', desc: 'Built with Next.js, PostgreSQL, and a CI/CD pipeline for linting, testing, and build validation.' },
          ].map((feature) => (
            <div key={feature.title} className="group p-6 rounded-2xl border border-border/60 bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card/50 border-y border-border/60 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">Three roles, one platform</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Every role has exactly the permissions they need — no more, no less.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: 'Administrator', icon: Shield, color: 'text-primary', items: ['Manage all users and roles', 'Oversee all projects', 'Control system access'] },
              { role: 'Project Manager', icon: FolderKanban, color: 'text-accent', items: ['Create & manage projects', 'Assign team members', 'Create and assign tasks'] },
              { role: 'Team Member', icon: CheckCircle2, color: 'text-success', items: ['View assigned projects', 'Update task progress', 'Comment on tasks'] },
            ].map((r) => (
              <div key={r.role} className="p-6 rounded-2xl bg-background border border-border/60">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <r.icon className={`w-5 h-5 ${r.color}`} />
                </div>
                <h3 className="font-semibold mb-3">{r.role}</h3>
                <ul className="space-y-2">
                  {r.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-success flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-8">Create your free account and start managing your projects today.</p>
        <Link href="/signup"><Button size="lg">Create your account<ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Kanban className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">TaskFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 TaskFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
