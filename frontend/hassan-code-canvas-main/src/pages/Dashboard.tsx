import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, Sparkles, ArrowRight, FileCheck, Clock } from "lucide-react";
import { getBackendHealth, useAnalysis } from "@/store/analysis";
import { useAuth } from "@/store/auth";

const Dashboard = () => {
  const { result } = useAnalysis();
  const auth = useAuth();
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);

  const latestScore = result?.score ?? auth.user?.latestMatchScore ?? null;
  const latestStatus = result?.status ?? auth.user?.latestStatus ?? null;
  const latestCategory = result?.predictedCategory ?? auth.user?.latestPredictedCategory ?? null;
  const latestSource = result?.fileName ?? auth.user?.lastAnalysisSource ?? null;

  useEffect(() => {
    let active = true;
    getBackendHealth()
      .then((health) => {
        if (!active) return;
        setBackendReady(health.status === "ok");
        setModelReady(health.modelReady);
      })
      .catch(() => {
        if (!active) return;
        setBackendReady(false);
        setModelReady(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "Backend status",
      value: backendReady === null ? "Checking..." : backendReady ? "Online" : "Offline",
      icon: FileCheck,
      hint: modelReady ? "Model ready" : "Model not ready",
    },
    {
      label: "Latest match score",
      value: latestScore !== null ? `${latestScore}%` : "--",
      icon: BarChart3,
      hint: latestStatus ?? "Run analysis to see score",
    },
    {
      label: "Latest predicted category",
      value: latestCategory ?? "--",
      icon: Clock,
      hint: latestSource ?? "No analysis yet",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3 text-primary" /> Quick start
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Screen your next resume in seconds
          </h1>
          <p className="text-muted-foreground mb-6 max-w-xl">
            Upload a resume, paste a job description, and let our AI surface match scores, skill gaps, and improvement tips.
          </p>
          <Link to="/upload">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 border-0 shadow-soft hover:shadow-glow transition-smooth h-11 rounded-xl">
              <Upload className="w-4 h-4" /> Upload Resume <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="glass border-0 rounded-2xl p-5 hover:-translate-y-1 transition-smooth">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
                <s.icon className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            <p className="text-xs text-muted-foreground/70 mt-2">{s.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="glass border-0 rounded-3xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Recent activity</h2>
        {latestScore !== null ? (
          <Link to="/results" className="flex items-center justify-between p-4 rounded-2xl hover:bg-secondary/40 transition-smooth">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{latestSource ?? "Latest analysis"}</p>
                <p className="text-sm text-muted-foreground">{latestStatus ?? "Completed"} · {latestScore}%</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ) : (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No analyses yet. <Link to="/upload" className="text-primary hover:underline">Upload your first resume</Link>.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
