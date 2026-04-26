import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Upload, BarChart3, User, LogOut, Sparkles, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logout, useAuth } from "@/store/auth";

/** Glass sidebar + topbar layout used for all authenticated app pages. */
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Resume", icon: Upload },
  { to: "/results", label: "Results", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

export const AppLayout = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <div className="relative min-h-screen bg-gradient-soft font-sans overflow-x-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[450px] h-[450px] rounded-full bg-primary-glow/20 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 m-4 mr-0 rounded-3xl glass p-5 sticky top-4 h-[calc(100vh-2rem)]">
          <a href="/dashboard" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Resume AI</span>
          </a>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-smooth"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="sticky top-4 z-40 m-4 rounded-2xl glass">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="md:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">Resume AI</span>
              </div>
              <div className="hidden md:block text-sm text-muted-foreground">
                Welcome back 👋
              </div>
              <div className="flex items-center gap-3">
                <button
                  aria-label="Notifications"
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-smooth"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
                </button>
                <ThemeToggle />
                <button
                  onClick={() => navigate("/profile")}
                  className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-semibold shadow-soft hover:scale-105 transition-smooth"
                  aria-label="Profile"
                >
                  {(auth.user?.name?.charAt(0) ?? "U").toUpperCase()}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile nav pills */}
          <nav className="md:hidden mx-4 mb-2 flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-smooth ${
                    isActive
                      ? "bg-gradient-primary text-primary-foreground"
                      : "glass text-muted-foreground"
                  }`
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <main className="flex-1 p-4 pt-2">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
