import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/context/AppContext";
import { FeedbackProvider } from "@/context/FeedbackContext";
import { AuthProvider } from "@/hooks/useAuth";
import { usePageView } from "@/hooks/usePageView";
import PersistentLayout from "./components/PersistentLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-loaded routes (not part of the persistent layout)
const Auth = lazy(() => import("./pages/Auth"));
const PlaceDetails = lazy(() => import("./pages/PlaceDetails"));
const CategorySeeAll = lazy(() => import("./pages/CategorySeeAll"));
const Settings = lazy(() => import("./pages/Settings"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — avoid redundant refetches
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      refetchOnWindowFocus: false, // don't refetch every time user tabs back
      retry: 1,
    },
  },
});

function PageViewTracker() {
  usePageView();
  return null;
}

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-full max-w-md space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <FeedbackProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PageViewTracker />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route element={<PersistentLayout />}>
                    <Route path="/" element={null} />
                    <Route path="/saved" element={null} />
                    <Route path="/trip" element={null} />
                    <Route path="/place/:placeId" element={<PlaceDetails />} />
                    <Route path="/see-all" element={<CategorySeeAll />} />
                  </Route>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/help-support" element={<HelpSupport />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </FeedbackProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
