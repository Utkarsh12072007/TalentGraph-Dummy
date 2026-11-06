import { Link } from 'react-router-dom';
import {
  Search, UserRound, ClipboardList, KanbanSquare, CalendarCheck, Building2, ArrowRight, CheckCircle2, FileUp,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

// Public homepage. No fake logos, testimonials, or user counts — the
// product is described by what it actually does.

function Hero() {
  return (
    <section className="border-b bg-gradient-to-b from-secondary/60 to-background">
      <div className="page-container py-16 text-center sm:py-24">
        <p className="mx-auto mb-4 w-fit rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Recruitment platform with a built-in ATS
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Hire better. <span className="text-primary">Get hired faster.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          TalentGraph connects job seekers with companies and gives recruiters one workspace
          to publish jobs, review applications, run interviews, and make hiring decisions.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild={false} onClick={() => (window.location.href = '/jobs')}>
            Find Opportunities <ArrowRight />
          </Button>
          <Button size="lg" variant="outline" onClick={() => (window.location.href = '/signup?role=recruiter')}>
            Hire Talent
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Free to join · No credit card</p>
      </div>
    </section>
  );
}

const CANDIDATE_JOURNEY = [
  { icon: UserRound, title: 'Build your profile', text: 'Education, experience, skills, projects and certifications in one professional profile.' },
  { icon: Search, title: 'Discover jobs', text: 'Search by title, skill, location, work mode, experience level and salary — filters hit a real database.' },
  { icon: FileUp, title: 'Apply with a resume', text: 'Upload your resume once, pick the right one per application, and track every application status.' },
  { icon: CalendarCheck, title: 'Interview & get hired', text: 'See interview invitations with time, place and round — and every status update as it happens.' },
];

const COMPANY_JOURNEY = [
  { icon: Building2, title: 'Create your workspace', text: 'Register your company, invite teammates, and assign admin, recruiter or interviewer roles.' },
  { icon: ClipboardList, title: 'Publish jobs', text: 'Draft, preview, publish, close and archive postings with skills, salary ranges and deadlines.' },
  { icon: KanbanSquare, title: 'Manage the pipeline', text: 'Review applications, shortlist candidates, keep private notes, and move people through stages.' },
  { icon: CalendarCheck, title: 'Run interviews', text: 'Schedule rounds, assign interviewers, collect structured feedback, and make the final call.' },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="page-container py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Two journeys, one connected workflow — everything you do on one side is visible to the other in real time.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>For candidates</CardTitle>
            <CardDescription>From discovery to offer, with full visibility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {CANDIDATE_JOURNEY.map((step, i) => (
              <div key={step.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{i + 1}. {step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>For companies</CardTitle>
            <CardDescription>A complete hiring workspace, not just a job board.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {COMPANY_JOURNEY.map((step, i) => (
              <div key={step.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <step.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium">{i + 1}. {step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const FEATURES = [
  { title: 'Job discovery', text: 'Real search and filters — keywords, location, remote/hybrid/on-site, employment type, experience band and salary — with sorting and pagination.' },
  { title: 'Professional candidate profiles', text: 'Structured education, experience, skills, projects and certifications that recruiters can actually evaluate.' },
  { title: 'Application tracking', text: 'Candidates see every status change with a timestamped history. No black-hole applications.' },
  { title: 'Recruitment pipeline', text: 'Applied → In review → Shortlisted → Interview → Offered, with validated stage transitions on the server.' },
  { title: 'Interview management', text: 'Schedule rounds, assign company interviewers, record private feedback with ratings and recommendations.' },
  { title: 'Roles & permissions', text: 'Candidates, recruiters, company admins and platform admins each see exactly what they should — enforced in the API.' },
];

function PlatformFeatures() {
  return (
    <section id="platform-features" className="border-y bg-secondary/40">
      <div className="page-container py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Platform features</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-5">
                <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" />{f.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForCompaniesCta() {
  return (
    <section id="for-companies" className="page-container py-16">
      <div className="grid items-center gap-8 rounded-xl border bg-card p-8 lg:grid-cols-2 lg:p-12">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Running hiring in spreadsheets?</h2>
          <p className="mt-3 text-muted-foreground">
            Create a company workspace in minutes. Post your first job today, invite your team,
            and keep every application, note, interview and decision in one auditable place.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Unlimited jobs and pipeline stages</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Company-level roles: admin, recruiter, interviewer</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Your data is isolated per company — enforced server-side</li>
          </ul>
          <Button size="lg" className="mt-6" onClick={() => (window.location.href = '/signup?role=recruiter')}>
            Create a company workspace <ArrowRight />
          </Button>
        </div>
        <div className="rounded-lg border bg-secondary/50 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What recruiters see on TalentGraph</p>
          <ul className="mt-3 space-y-2">
            <li>• Every application with candidate profile, skills and resume</li>
            <li>• A pipeline board of where each candidate stands</li>
            <li>• Interview schedule with assigned interviewers and feedback</li>
            <li>• Analytics computed from your own data: funnel, top jobs, 14-day trend</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: 'Is TalentGraph free?',
    a: 'Creating a candidate profile and applying to jobs is free. Companies create a workspace and manage hiring from it; this deployment is a product launch without paid plans yet.',
  },
  {
    q: 'Who can see my resume?',
    a: 'Only you, and recruiters of companies you actively applied to. Resumes are never publicly downloadable — every download request is authorized against your applications.',
  },
  {
    q: 'Can I apply to the same job twice?',
    a: 'No. The platform blocks duplicate applications, and recruiters see your most recent application for each job.',
  },
  {
    q: 'How do interview invitations work?',
    a: 'When a recruiter schedules an interview, you get an in-app notification with the round, date, time, type and meeting link or location. Everything also appears on your Interviews page.',
  },
  {
    q: 'What statuses will I see on my application?',
    a: 'Applied, In review, Shortlisted, Interview, Offered, Rejected or Withdrawn. Every change is recorded with who and when — you see the timeline without recruiters\' private notes.',
  },
  {
    q: 'Can multiple people from my company use it?',
    a: 'Yes. A company admin adds registered recruiters by email and assigns them a role: Admin, Recruiter or Interviewer. Each sees only your company\'s data.',
  },
];

function Faq() {
  return (
    <section id="faq" className="border-t bg-secondary/40">
      <div className="page-container py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-lg border bg-card p-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PlatformFeatures />
      <ForCompaniesCta />
      <Faq />
    </>
  );
}
