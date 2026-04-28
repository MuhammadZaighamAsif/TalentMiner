import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Brain, Loader2, X } from "lucide-react";
import { extractResumeText, isSupportedResumeType } from "@/lib/resumeExtractor";
import {
  analysisStore, useAnalysis, LOADING_STEPS, runAnalysis,
} from "@/store/analysis";

const UploadPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { file, resumeText, jobDesc } = useAnalysis();
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File | null) => {
    if (!f) return;
    const ok = isSupportedResumeType(f);
    if (!ok) {
      toast({ title: "Unsupported file", description: "Upload a PDF, image (PNG/JPG), or text file.", variant: "destructive" });
      return;
    }
    analysisStore.setFile(f);

    try {
      const extracted = await extractResumeText(f);
      if (extracted.length > 0) {
        analysisStore.setResumeText(extracted.slice(0, 120000));
        toast({
          title: "Resume text extracted",
          description: "You can review/edit extracted text before analysis.",
        });
      } else {
        toast({
          title: "No text detected",
          description: "Please paste resume text manually for best results.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Extraction failed",
        description: "Could not extract text from this file. Please paste resume text manually.",
        variant: "destructive",
      });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const analyze = async () => {
    if (resumeText.trim().length < 40) return toast({ title: "Add resume text", description: "Paste your resume text so the backend can analyze it.", variant: "destructive" });
    if (jobDesc.trim().length < 20) return toast({ title: "Add a job description", description: "Paste the JD for accurate matching.", variant: "destructive" });

    setLoading(true);
    setStep(0);
    setProgress(0);
    const stepDuration = 700;
    const timers = LOADING_STEPS.map((_, i) =>
      setTimeout(() => {
        setStep(i);
        setProgress(((i + 1) / LOADING_STEPS.length) * 100);
      }, i * stepDuration)
    );

    try {
      const result = await runAnalysis({
        resumeText,
        jobDescription: jobDesc,
        fileName: file?.name ?? "Pasted Resume",
      });
      analysisStore.setResult(result);
      navigate("/results");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not analyze resume";
      toast({ title: "Analysis failed", description: message, variant: "destructive" });
    } finally {
      timers.forEach((id) => clearTimeout(id));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Card className="glass border-0 rounded-3xl p-6 md:p-10 shadow-soft">
        {!loading ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Upload Resume</h1>
              <p className="text-muted-foreground">Upload a resume or paste resume text, then add the job description.</p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-smooth ${
                file ? "border-primary/40 bg-primary/5" : "cursor-pointer"
              } ${dragOver ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:border-primary hover:bg-primary/5"}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
                    <FileText className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); analysisStore.setFile(null); }}
                    className="ml-2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft mb-4 animate-float">
                    <Upload className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">Drop your resume here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">PDF, PNG, JPG · max 10MB</p>
                </>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Resume Text</label>
              </div>
              <Textarea
                value={resumeText}
                onChange={(e) => analysisStore.setResumeText(e.target.value)}
                placeholder="Auto-filled from uploaded file (edit if needed), or paste manually..."
                className="min-h-[160px] resize-none rounded-xl bg-background/50 backdrop-blur-sm"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Actual scoring uses this text. Upload now auto-extracts from PDF/images when possible.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Job Description</label>
              </div>
              <Textarea
                value={jobDesc}
                onChange={(e) => analysisStore.setJobDesc(e.target.value)}
                placeholder="Paste the job description here..."
                className="min-h-[160px] resize-none rounded-xl bg-background/50 backdrop-blur-sm"
              />
            </div>

            <Button
              onClick={analyze}
              size="lg"
              className="w-full bg-gradient-primary hover:opacity-90 border-0 shadow-soft hover:shadow-glow transition-smooth h-12 text-base rounded-xl"
            >
              <Brain className="w-4 h-4" /> Analyze Resume
            </Button>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-primary blur-2xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">AI is analyzing your resume...</h3>
            <p className="text-muted-foreground mb-6">{LOADING_STEPS[step]}</p>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2" />
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md">
              {LOADING_STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition-smooth ${
                    i <= step ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}. {s.replace("...", "")}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UploadPage;
