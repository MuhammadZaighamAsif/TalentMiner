import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/AuthLayout";
import { useToast } from "@/hooks/use-toast";
import { signup, useAuth } from "@/store/auth";
import { User, Mail, Lock } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isReady && auth.token) {
      navigate("/dashboard", { replace: true });
    }
  }, [auth.isReady, auth.token, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      toast({ title: "Signup failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start screening resumes in seconds">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe" className="pl-10 bg-background/50 backdrop-blur-sm rounded-xl h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com" className="pl-10 bg-background/50 backdrop-blur-sm rounded-xl h-11" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters" className="pl-10 bg-background/50 backdrop-blur-sm rounded-xl h-11" />
          </div>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 border-0 shadow-soft h-11 rounded-xl">
          {loading ? "Creating account..." : "Sign Up"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Signup;
