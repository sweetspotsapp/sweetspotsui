import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Users, Search, TrendingUp, Eye, CheckCircle, Trash2, Clock, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "submissions" | "users">("overview");
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch data
  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
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

      // Fetch user profiles
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

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-md p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center">You don't have permission to access this page.</p>
        <Button onClick={() => navigate("/")} variant="outline">Go Home</Button>
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
      <div className="flex border-b border-border px-4 lg:px-8 gap-1">
        {[
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "submissions", label: "Messages", icon: Mail },
          { key: "users", label: "Users", icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
