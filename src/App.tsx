import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import MetaCallback from "./pages/auth/meta-callback.tsx";
import GoogleAdsCallback from "./pages/auth/google-ads-callback.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./pages/app-layout.tsx";
import LandingPage from "./pages/landing/page.tsx";
import PipelinePage from "./pages/pipeline/page.tsx";
import DashboardPage from "./pages/dashboard/page.tsx";
import InboxPage from "./pages/inbox/page.tsx";
import AnalyticsPage from "./pages/analytics/page.tsx";
import WASenderPage from "./pages/campaigns/wa-sender.tsx";
import EmailCampaignPage from "./pages/campaigns/email-campaign.tsx";
import InstaCampaignPage from "./pages/campaigns/insta-campaign.tsx";
import CeoDashboardPage from "./pages/ceo-dashboard/page.tsx";
import MarketIntelligencePage from "./pages/market-intelligence/page.tsx";
import CreativeGenerationPage from "./pages/creative-generation/page.tsx";
import CampaignLaunchPage from "./pages/campaign-launch/page.tsx";
import OptimizationPage from "./pages/optimization/page.tsx";
import CrmPage from "./pages/crm/page.tsx";
import SeoAgentPage from "./pages/seo-agent/page.tsx";
import GscCallback from "./pages/auth/gsc-callback/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import LearningAgentPage from "./pages/learning-agent/page.tsx";
import BulkCallingPage from "./pages/bulk-calling/page.tsx";
import AiRemindersPage from "./pages/ai-reminders/page.tsx";
import GscDashboardPage from "./pages/gsc-dashboard/page.tsx";
import ScrapersPage from "./pages/scrapers/page.tsx";
import BlogListingPage from "./pages/blog/page.tsx";
import BlogArticlePage from "./pages/blog/article.tsx";
import RedditAgentPage from "./pages/reddit-agent/page.tsx";

import { useServiceWorker } from "@/hooks/use-service-worker.ts";

import { ErrorBoundary } from "./components/providers/error-boundary.tsx";

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <ErrorBoundary>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/meta-callback" element={<MetaCallback />} />
          <Route path="/auth/gsc-callback" element={<GscCallback />} />
          <Route path="/auth/google-ads-callback" element={<GoogleAdsCallback />} />
          <Route path="/blog" element={<BlogListingPage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/wa-sender" element={<WASenderPage />} />
            <Route path="/email-campaign" element={<EmailCampaignPage />} />
            <Route path="/insta-campaign" element={<InstaCampaignPage />} />
            <Route path="/ceo-dashboard" element={<CeoDashboardPage />} />
            <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
            <Route path="/creative-generation" element={<CreativeGenerationPage />} />
            <Route path="/campaign-launch" element={<CampaignLaunchPage />} />
            <Route path="/optimization" element={<OptimizationPage />} />
            <Route path="/crm" element={<CrmPage />} />
            <Route path="/seo-agent" element={<SeoAgentPage />} />
            <Route path="/reddit-agent" element={<RedditAgentPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/learning-agent" element={<LearningAgentPage />} />
            <Route path="/bulk-calling" element={<BulkCallingPage />} />
            <Route path="/ai-reminders" element={<AiRemindersPage />} />
            <Route path="/gsc-dashboard" element={<GscDashboardPage />} />
            <Route path="/scrapers" element={<ScrapersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </DefaultProviders>
  );
}
