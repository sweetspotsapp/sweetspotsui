import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, User, Bell, Shield, ChevronRight, Mail, Lock, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Notification preferences (local state for now)
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    emailDigest: false,
    newPlaces: true,
    recommendations: true,
  });

  // Privacy preferences
  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    personalizedAds: false,
    analyticsEnabled: true,
  });

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Preference updated",
      description: "Your notification settings have been saved.",
    });
  };

  const handlePrivacyChange = (key: keyof typeof privacy) => {
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Preference updated",
      description: "Your privacy settings have been saved.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "We'll send you an email to confirm this action.",
      variant: "destructive",
    });
  };

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
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Profile Information</p>
                <p className="text-sm text-muted-foreground">Update your name and photo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <Separator />

            <button className="flex items-center gap-4 w-full p-4 hover:bg-muted/50 transition-colors">
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

            <button className="flex items-center gap-4 w-full p-4 hover:bg-muted/50 transition-colors">
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
              />
            </div>

            <Separator />

            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-medium text-foreground">New Places Nearby</p>
                <p className="text-sm text-muted-foreground">Alert when new spots open</p>
              </div>
              <Switch
                checked={notifications.newPlaces}
                onCheckedChange={() => handleNotificationChange("newPlaces")}
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
    </div>
  );
};

export default Settings;
