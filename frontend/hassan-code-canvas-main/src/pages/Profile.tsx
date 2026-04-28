import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { changePassword, updateProfile, useAuth } from "@/store/auth";
import { Camera, Lock } from "lucide-react";

const Profile = () => {
  const { toast } = useToast();
  const auth = useAuth();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState(auth.user?.name ?? "");
  const [email, setEmail] = useState(auth.user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth.user) {
      setName(auth.user.name);
      setEmail(auth.user.email);
    }
  }, [auth.user]);

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatar(URL.createObjectURL(f));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Card className="glass border-0 rounded-3xl p-6 md:p-8 shadow-soft">
        <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-soft overflow-hidden">
              {avatar ? <img src={avatar} alt="Avatar" className="w-full h-full object-cover" /> : name.charAt(0)}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-soft hover:scale-110 transition-smooth"
              aria-label="Upload avatar"
            >
              <Camera className="w-4 h-4 text-foreground" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
              className="bg-background/50 backdrop-blur-sm rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 backdrop-blur-sm rounded-xl h-11" />
          </div>
        </div>

        <div className="mt-6">
          <Button
            disabled={savingProfile}
            onClick={async () => {
              setSavingProfile(true);
              try {
                await updateProfile({ name, email });
                toast({ title: "Profile saved", description: "Your profile has been updated." });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to save profile";
                toast({ title: "Profile update failed", description: message, variant: "destructive" });
              } finally {
                setSavingProfile(false);
              }
            }}
            className="bg-gradient-primary border-0 shadow-soft rounded-xl">
            {savingProfile ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Card>

      <Card className="glass border-0 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Change password</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="bg-background/50 rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-background/50 rounded-xl h-11" />
          </div>
        </div>
        <div className="mt-6">
          <Button
            disabled={savingPassword}
            variant="outline"
            className="glass border-border rounded-xl"
            onClick={async () => {
              setSavingPassword(true);
              try {
                await changePassword({ currentPassword, newPassword });
                setCurrentPassword("");
                setNewPassword("");
                toast({ title: "Password updated", description: "Your password has been changed." });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to update password";
                toast({ title: "Password update failed", description: message, variant: "destructive" });
              } finally {
                setSavingPassword(false);
              }
            }}>
            {savingPassword ? "Updating..." : "Update password"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
