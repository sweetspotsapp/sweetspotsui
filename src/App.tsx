import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/context/AppContext";
import { FeedbackProvider } from "@/context/FeedbackContext";
import { AuthProvider } from "@/hooks/useAuth";
import PersistentLayout from "./components/PersistentLayout";

import Auth from "./pages/Auth";
import PlaceDetails from "./pages/PlaceDetails";
import CategorySeeAll from "./pages/CategorySeeAll";
import Settings from "./pages/Settings";
import HelpSupport from "./pages/HelpSupport";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import ProfilePage from "./components/ProfilePage";


const queryClient = new QueryClient();

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
            </BrowserRouter>
          </TooltipProvider>
          </FeedbackProvider>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
