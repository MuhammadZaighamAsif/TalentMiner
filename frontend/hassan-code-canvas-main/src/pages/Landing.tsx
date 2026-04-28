import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sparkles, Upload, Brain, Target, Lightbulb, ArrowRight } from "lucide-react";

const Landing = () => (
  <div className="relative min-h-screen bg-gradient-soft font-sans overflow-x-hidden">
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/25 blur-3xl animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-[450px] h-[450px] rounded-full bg-primary-glow/25 blur-3xl animate-blob" style={{ animationDelay: "3s" }} />
      <div className="absolute bottom-[-15%] left-[20%] w-[500px] h-[500px] rounded-full bg-accent-foreground/15 blur-3xl animate-blob" style={{ animationDelay: "6s" }} />
    </div>

    <header className="sticky top-0 z-50 glass">
      <nav className="container mx-auto flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">Resume AI</span>
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="bg-gradient-primary hover:opacity-90 border-0 shadow-soft">Sign Up</Button>
          </Link>
        </div>
      </nav>
    </header>

    <section className="container mx-auto pt-20 pb-24 text-center">
      <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-sm font-medium mb-8 animate-fade-in">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-foreground">Premium AI Screening</span>
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in">
        <span className="gradient-text">AI Resume Intelligence</span><br />
        <span className="text-foreground">for modern HR teams</span>
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
        Match resumes to job descriptions with precision. Discover skill gaps, get smart suggestions, and hire faster.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in">
        <Link to="/signup">
          <Button size="lg" className="bg-gradient-primary hover:opacity-90 border-0 shadow-soft hover:shadow-glow transition-smooth h-12 px-8 text-base">
            Start Matching <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="outline" className="glass border-border h-12 px-8 text-base">
            Sign In
          </Button>
        </Link>
      </div>
    </section>

    <section className="container mx-auto pb-24">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: Upload, title: "Resume Upload", desc: "Drag & drop PDFs or images securely." },
          { icon: Brain, title: "AI Analysis", desc: "Deep parsing of skills and experience." },
          { icon: Target, title: "Smart Matching", desc: "Match against any job description." },
          { icon: Lightbulb, title: "Skill Insights", desc: "Actionable suggestions to improve fit." },
        ].map((f, i) => (
          <Card key={i} className="glass p-6 hover:-translate-y-2 hover:shadow-soft transition-smooth border-0 group rounded-3xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-soft group-hover:scale-110 transition-smooth">
              <f.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-1.5">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </Card>
        ))}
      </div>
    </section>

    <footer className="border-t border-border/50 py-8 mt-10 glass">
      <div className="container mx-auto text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Resume AI · Built for smarter hiring.
      </div>
    </footer>
  </div>
);

export default Landing;
