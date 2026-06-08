import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Brain, MapPin, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicFlow AI — Report. Route. Resolve." },
      { name: "description", content: "AI-powered civic complaint management. Citizens report issues, AI triages and routes to the right department, officers resolve in time." },
      { property: "og:title", content: "CivicFlow AI" },
      { property: "og:description", content: "Intelligent civic complaint management and resolution platform." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">CivicFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/feed"><Button variant="ghost" size="sm">Public Issues</Button></Link>
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              AI-powered triage · Built for municipalities
            </span>
            <h1 className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Civic issues, <span className="text-accent">resolved faster</span>.
            </h1>
            <p className="mt-5 text-pretty text-lg text-muted-foreground md:text-xl">
              Report potholes, water leaks, garbage overflow and more. AI categorises, prioritises and routes each issue to the right department — automatically.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                <Button size="lg">Report an issue<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </Link>
              <Link to="/auth"><Button size="lg" variant="outline">I'm an officer</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Brain, title: "AI triage", body: "Each complaint is automatically classified, scored for urgency and routed to the correct department." },
            { icon: MapPin, title: "Geo-aware", body: "GPS-tagged reports power live maps, hotspot detection and duplicate consolidation." },
            { icon: Zap, title: "SLA tracking", body: "Time-bound resolution with automatic escalation to supervisors, engineers and commissioners." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
              <p className="mt-3 text-muted-foreground">A clear, accountable path from report to resolution.</p>
            </div>
            <ol className="space-y-4">
              {[
                "Citizen submits with photo, description and GPS location.",
                "AI detects category, severity, priority and recommends a department.",
                "Duplicate detection links nearby reports to consolidate effort.",
                "Officers accept, update status, and upload resolution proof.",
                "Overdue tasks auto-escalate through 4 levels until closed.",
              ].map((s, i) => (
                <li key={s} className="flex gap-3 rounded-lg border bg-card p-4">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Secure · Role-based access · Audit logged
          </div>
          <span>© {new Date().getFullYear()} CivicFlow</span>
        </div>
      </footer>
    </div>
  );
}
