import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Props { children: ReactNode; title: string; subtitle: string; }

/** Centered glass card layout for login/signup. */
export const AuthLayout = ({ children, title, subtitle }: Props) => (
  <div className="relative min-h-screen bg-gradient-soft font-sans flex flex-col overflow-hidden">
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/25 blur-3xl animate-blob" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-glow/25 blur-3xl animate-blob" style={{ animationDelay: "5s" }} />
    </div>

    <header className="flex items-center justify-between p-6">
      <a href="/" className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">Resume AI</span>
      </a>
      <ThemeToggle />
    </header>

    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-3xl p-8 shadow-soft animate-scale-in">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  </div>
);
