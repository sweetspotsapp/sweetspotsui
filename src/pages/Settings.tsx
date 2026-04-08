import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { ArrowLeft, User, Bell, Shield, ChevronRight, Mail, Lock, Trash2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface NotificationSettings {
  pushEnabled: boolean;
  emailDigest: boolean;
  newPlaces: boolean;
  recommendations: boolean;
}

interface PrivacySettings {
  shareLocation: boolean;
  personalizedAds: boolean;
  analyticsEnabled: boolean;
}

const defaultNotifications: NotificationSettings = {
  pushEnabled: true,
  emailDigest: false,
  newPlaces: true,
  recommendations: true,
};

const defaultPrivacy: PrivacySettings = {
  shareLocation: true,
  personalizedAds: false,
  analyticsEnabled: true,
};

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [privacy, setPrivacy] = useState<PrivacySettings>(defaultPrivacy);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("Explorer");

  // Change email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  // Change password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("notification_settings, privacy_settings, avatar_url, username")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading settings:", error);
          return;
        }

        if (data) {
          if (data.notification_settings) {
            setNotifications(data.notification_settings as unknown as NotificationSettings);
          }
          if (data.privacy_settings) {
            setPrivacy(data.privacy_settings as unknown as PrivacySettings);
          }
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
          if (data.username) setUsername(data.username);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const saveSettings = async (
    notificationSettings: NotificationSettings,
    privacySettings: PrivacySettings
  ) => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_settings: notificationSettings as unknown as Json,
          privacy_settings: privacySettings as unknown as Json,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving settings:", error);
        toast({
          title: "Error saving",
          description: "Failed to save your preferences. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Preference updated",
        description: "Your settings have been saved.",
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    saveSettings(updated, privacy);
  };

  const handlePrivacyChange = (key: keyof PrivacySettings) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    saveSettings(notifications, updated);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Confirmation sent",
          description: "Check both your old and new email to confirm the change.",
        });
        setEmailDialogOpen(false);
        setNewEmail("");
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords don't match.", variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password updated", description: "Your password has been changed." });
        setPasswordDialogOpen(false);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "We'll send you an email to confirm this action.",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-4 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          {isSaving && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
      </header>

      <div className="pb-8">
        {/* Account Section */}
        <section className="px-4 py-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Account
          </h2>
          <div className="space-y-1 bg-card rounded-xl border border-border overflow-hidden">
            <button className="flex items-center gap-4 w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{username}</p>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{user?.email || "Not set"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <Separator />

            <button
              onClick={() => setEmailDialogOpen(true)}
              className="flex items-center gap-4 w-full p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {user?.email || "Not set"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <Separator />

            <button
              onClick={() => setPasswordDialogOpen(true)}
              className="flex items-center gap-4 w-full p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Lock className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Password</p>
                <p className="text-sm text-muted-foreground">Change your password</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="px-4 py-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Notifications
          </h2>
          <div className="space-y-1 bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified on your device</p>
              </div>
              <Switch
                checked={notifications.pushEnabled}
                onCheckedChange={() => handleNotificationChange("pushEnabled")}
                disabled={isSaving}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Weekly Email Digest</p>
                <p className="text-sm text-muted-foreground">Receive weekly summaries</p>
              </div>
              <Switch
                checked={notifications.emailDigest}
                onCheckedChange={() => handleNotificationChange("emailDigest")}
                disabled={isSaving}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Personalized Recommendations</p>
                <p className="text-sm text-muted-foreground">Tips based on your preferences</p>
              </div>
              <Switch
                checked={notifications.recommendations}
                onCheckedChange={() => handleNotificationChange("recommendations")}
                disabled={isSaving}
              />
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="px-4 py-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Privacy
          </h2>
          <div className="space-y-1 bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Share Location</p>
                <p className="text-sm text-muted-foreground">Allow location-based features</p>
              </div>
              <Switch
                checked={privacy.shareLocation}
                onCheckedChange={() => handlePrivacyChange("shareLocation")}
                disabled={isSaving}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Personalized Ads</p>
                <p className="text-sm text-muted-foreground">See relevant advertisements</p>
              </div>
              <Switch
                checked={privacy.personalizedAds}
                onCheckedChange={() => handlePrivacyChange("personalizedAds")}
                disabled={isSaving}
              />
            </div>

            <Separator />

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-medium text-foreground">Analytics</p>
                <p className="text-sm text-muted-foreground">Help improve the app</p>
              </div>
              <Switch
                checked={privacy.analyticsEnabled}
                onCheckedChange={() => handlePrivacyChange("analyticsEnabled")}
                disabled={isSaving}
              />
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="px-4 py-6">
          <h2 className="text-xs font-semibold text-destructive uppercase tracking-wide mb-4">
            Danger Zone
          </h2>
          <div className="bg-card rounded-xl border border-destructive/30 overflow-hidden">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-4 w-full p-4 hover:bg-destructive/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently remove your account and data
                    </p>
                  </div>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>

      {/* Change Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Email</DialogTitle>
            <DialogDescription>
              A confirmation link will be sent to both your current and new email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current email</p>
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
            </div>
            <Input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangeEmail()}
            />
            <Button
              onClick={handleChangeEmail}
              disabled={emailSaving || !newEmail.trim()}
              className="w-full"
            >
              {emailSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) { setNewPassword(""); setConfirmPassword(""); }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password with at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords don't match</p>
            )}
            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full"
            >
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
