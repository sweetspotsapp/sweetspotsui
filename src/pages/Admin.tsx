import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Users, Search, TrendingUp, Eye, CheckCircle, Trash2, Clock, BarChart3, DollarSign, Zap, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const ADMIN_EMAILS = ["ilhamrazakofficial@gmail.com", "sweetspotsai@gmail.com"];

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalSearches: number;
  totalTrips: number;
  totalSavedPlaces: number;
  totalSubmissions: number;
  searchesToday: number;
  searchesThisWeek: number;
}

interface RevenueData {
  totalRevenue: number;
  activeSubscriptions: number;
  customers: { email: string; status: string; plan: string; amount: number; currency: string; currentPeriodEnd: string }[];
}

type TabKey = "overview" | "submissions" | "users" | "revenue";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueLoading, setRevenueLoading] = useState(false);

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Fetch data only after admin role is positively confirmed
  useEffect(() => {
    if (isAdmin !== true) return;
    fetchData();
  }, [isAdmin]);

  // Fetch revenue when tab changes — only if confirmed admin
  useEffect(() => {
    if (isAdmin !== true) return;
    if (activeTab === "revenue" && !revenue) {
      fetchRevenue();
    }
  }, [isAdmin, activeTab]);

  const fetchRevenue = async () => {
    if (isAdmin !== true) return;
    setRevenueLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-revenue");
      if (error) throw error;
      setRevenue(data);
    } catch (err) {
      console.error("Revenue fetch error:", err);
      toast({ title: "Error", description: "Failed to load revenue data.", variant: "destructive" });
    } finally {
      setRevenueLoading(false);
    }
  };

  const fetchData = async () => {
    if (isAdmin !== true) return;
    setLoading(true);
    try {
      const [
        { count: userCount },
        { count: searchCount },
        { count: tripCount },
        { count: savedCount },
        { data: subs },
        { count: todaySearches },
        { count: weekSearches },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("searches").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("saved_places").select("*", { count: "exact", head: true }),
        supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("searches").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from("searches").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      setStats({
        totalUsers: userCount || 0,
        totalSearches: searchCount || 0,
        totalTrips: tripCount || 0,
        totalSavedPlaces: savedCount || 0,
        totalSubmissions: subs?.length || 0,
        searchesToday: todaySearches || 0,
        searchesThisWeek: weekSearches || 0,
      });

      setSubmissions(subs || []);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setUsers(profileData || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    } else {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      toast({ title: "Updated", description: `Marked as ${status}.` });
    }
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    } else {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted", description: "Submission removed." });
    }
  };

  // Estimated cost calculations
  const estimatedSearchCost = (stats?.totalSearches || 0) * 0.015; // ~$0.015 per AI search call
  const estimatedTripCost = (stats?.totalTrips || 0) * 0.05; // ~$0.05 per trip generation
  const totalEstimatedCost = estimatedSearchCost + estimatedTripCost;

  // Admin login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const email = loginEmail.trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) {
      setLoginError("This email is not authorized for admin access.");
      return;
    }

    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });
      if (error) {
        setLoginError(error.message);
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Show login form if not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Authorized personnel only</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={loginEmail}
                onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                required
              />
            </div>

            {loginError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{loginError}</p>
            )}

            <Button type="submit" className="w-full" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loginLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4 py-2 transition-colors"
          >
            Back to app
          </button>
        </div>
      </div>
    );
  }

  // Checking admin role...
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center">
          {user.email} doesn't have admin permissions.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
          <Button onClick={() => supabase.auth.signOut()} variant="ghost">Sign Out</Button>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === "new") return "bg-primary/10 text-primary border-primary/20";
    if (s === "read") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-green-500/10 text-green-600 border-green-500/20";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-4 px-4 lg:px-8 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border px-4 lg:px-8 gap-1 overflow-x-auto">
        {[
          { key: "overview" as TabKey, label: "Overview", icon: BarChart3 },
          { key: "revenue" as TabKey, label: "Revenue", icon: DollarSign },
          { key: "submissions" as TabKey, label: "Messages", icon: Mail },
          { key: "users" as TabKey, label: "Users", icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "text-primary" },
                { label: "Total Searches", value: stats?.totalSearches ?? "—", icon: Search, color: "text-primary" },
                { label: "Searches Today", value: stats?.searchesToday ?? "—", icon: TrendingUp, color: "text-green-600" },
                { label: "This Week", value: stats?.searchesThisWeek ?? "—", icon: BarChart3, color: "text-amber-600" },
                { label: "Trips Created", value: stats?.totalTrips ?? "—", icon: TrendingUp, color: "text-primary" },
                { label: "Saved Places", value: stats?.totalSavedPlaces ?? "—", icon: Eye, color: "text-primary" },
                { label: "Contact Messages", value: stats?.totalSubmissions ?? "—", icon: Mail, color: "text-primary" },
                { label: "New Messages", value: submissions.filter((s) => s.status === "new").length, icon: Mail, color: "text-destructive" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-card rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-8 w-16" /> : value}
                  </p>
                </div>
              ))}
            </div>

            {/* Estimated API costs */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Estimated API Usage Costs
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-card rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">AI Search Calls</p>
                  <p className="text-lg font-bold text-foreground">{stats?.totalSearches || 0} calls</p>
                  <p className="text-xs text-muted-foreground">~${estimatedSearchCost.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Trip Generations</p>
                  <p className="text-lg font-bold text-foreground">{stats?.totalTrips || 0} trips</p>
                  <p className="text-xs text-muted-foreground">~${estimatedTripCost.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-2xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Total Estimated Cost</p>
                  <p className="text-lg font-bold text-primary">${totalEstimatedCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">AI + Maps API calls</p>
                </div>
              </div>
            </div>

            {/* Recent submissions preview */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Recent Messages</h3>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                <div className="space-y-2">
                  {submissions.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="flex items-start justify-between gap-3 bg-card rounded-xl p-3 border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sub.subject || "No subject"}</p>
                        <p className="text-xs text-muted-foreground">{sub.name} · {sub.email}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColor(sub.status)}`}>
                        {sub.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Revenue & Subscriptions</h2>
              <Button size="sm" variant="outline" onClick={fetchRevenue} disabled={revenueLoading}>
                {revenueLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {revenueLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : revenue ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card rounded-2xl p-5 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Monthly Revenue</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      ${(revenue.totalRevenue / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-card rounded-2xl p-5 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Active Subscribers</span>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {revenue.activeSubscriptions}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Subscribers</h3>
                  {revenue.customers.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No subscribers yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Revenue data will appear here once users subscribe.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {revenue.customers.map((c, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 bg-card rounded-xl p-3 border border-border/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.plan} · Renews {format(new Date(c.currentPeriodEnd), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground">
                              ${(c.amount / 100).toFixed(2)}/{c.currency.toUpperCase()}
                            </p>
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                              {c.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Click Refresh to load revenue data.</p>
              </div>
            )}
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Contact Submissions</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No submissions yet.</p>
              </div>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-card rounded-2xl p-4 border border-border/50 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{sub.subject || "No subject"}</p>
                      <p className="text-xs text-muted-foreground">{sub.name} · {sub.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(sub.created_at), "MMM d, yyyy · h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColor(sub.status)}`}>
                      {sub.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{sub.message}</p>
                  <div className="flex items-center gap-2 pt-1">
                    {sub.status === "new" && (
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => updateSubmissionStatus(sub.id, "read")}>
                        <Eye className="w-3 h-3" /> Mark Read
                      </Button>
                    )}
                    {sub.status !== "resolved" && (
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => updateSubmissionStatus(sub.id, "resolved")}>
                        <CheckCircle className="w-3 h-3" /> Resolve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteSubmission(sub.id)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Users ({users.length})</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/50">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{u.username || "No name"}</p>
                    <p className="text-xs text-muted-foreground">{u.sweetspots_id || "—"} · Joined {format(new Date(u.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
