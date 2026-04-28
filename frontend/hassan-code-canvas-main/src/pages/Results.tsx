import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularScore } from "@/components/CircularScore";
import { useAnalysis } from "@/store/analysis";
import { CheckCircle2, XCircle, Lightbulb, Download, Upload, FileText } from "lucide-react";

const Results = () => {
  const { result } = useAnalysis();
  const navigate = useNavigate();
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (!result) return;
    setAnimatedScore(0);
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setAnimatedScore(Math.round(p * result.score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  if (!result) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center animate-fade-in">
        <Card className="glass border-0 rounded-3xl p-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft mb-4">
            <FileText className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No results yet</h2>
          <p className="text-muted-foreground mb-6">Upload a resume to see your match insights here.</p>
          <Button onClick={() => navigate("/upload")} className="bg-gradient-primary border-0 shadow-soft rounded-xl">
            <Upload className="w-4 h-4" /> Upload Resume
          </Button>
        </Card>
      </div>
    );
  }

  const statusStyles =
    result.status === "Good Match"
      ? "bg-success/15 text-success border-success/30"
      : result.status === "Average Match"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";

  const total = result.matched.length + result.missing.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Card className="glass border-0 rounded-3xl p-6 md:p-10 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <CircularScore value={animatedScore} />
          <span className={`mt-4 inline-flex items-center px-4 py-1.5 rounded-full border text-sm font-semibold ${statusStyles}`}>
            {result.status}
          </span>
          <p className="text-sm text-muted-foreground mt-3">
            Analysis for <span className="font-medium text-foreground">{result.fileName}</span>
          </p>
          {result.predictedCategory ? (
            <p className="text-xs text-muted-foreground mt-1">
              Predicted category: <span className="font-semibold text-foreground">{result.predictedCategory}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Skill coverage</span>
            <span>{result.matched.length}/{total}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-primary rounded-full transition-all duration-1000"
              style={{ width: `${(result.matched.length / total) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass border-0 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <h4 className="font-semibold text-foreground">Matched Skills</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.matched.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-success/15 text-success text-sm font-medium border border-success/20">
                {s}
              </span>
            ))}
          </div>
        </Card>
        <Card className="glass border-0 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-destructive" />
            <h4 className="font-semibold text-foreground">Missing Skills</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.missing.map((s) => (
              <span key={s} className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                {s}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass border-0 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Improvement Suggestions</h4>
        </div>
        <ul className="space-y-2">
          {result.suggestions.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          disabled
          variant="outline"
          size="lg"
          className="flex-1 glass border-border rounded-xl"
        >
          <Download className="w-4 h-4" /> Download Report (Not configured)
        </Button>
        <Link to="/upload" className="flex-1">
          <Button size="lg" className="w-full bg-gradient-primary hover:opacity-90 border-0 shadow-soft rounded-xl">
            <Upload className="w-4 h-4" /> Upload Another Resume
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Results;
