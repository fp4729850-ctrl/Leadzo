import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Calendar, User, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function setMetaTags(title: string, description: string, url: string) {
  // Title
  document.title = title;

  // Helper to upsert a <meta> tag
  const setMeta = (selector: string, attr: string, value: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:type"]', "content", "article");
  setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);

  // Canonical link
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

function resetMetaTags() {
  document.title = "Leadzo AI";
  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector) as HTMLMetaElement | null;
    if (el) el.setAttribute(attr, value);
  };
  setMeta('meta[name="description"]', "content", "Leadzo AI - AI-Powered Marketing Automation");
  setMeta('meta[property="og:title"]', "content", "Leadzo AI");
  setMeta('meta[property="og:url"]', "content", "https://www.leadzoai.com");
}

// Estimate reading time
function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlog() {
      if (!slug) return;

      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (error || !data) {
        console.error("Error fetching blog:", error);
        navigate("/blog", { replace: true });
      } else {
        setBlog(data);
        // Inject SEO meta tags dynamically
        const pageUrl = `https://www.leadzoai.com/blog/${data.slug}`;
        const metaDesc = data.seo_description || data.title;
        setMetaTags(data.title, metaDesc, pageUrl);
      }
      setLoading(false);
    }
    fetchBlog();

    // Reset on unmount
    return () => resetMetaTags();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-24 mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-12 w-3/4 mb-8" />
          <div className="flex space-x-4 mb-12">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!blog) return null;

  const mins = readingTime(blog.html_content || "");

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Top Nav Bar */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/blog"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Articles
          </Link>
          <Link to="/" className="text-sm font-bold text-blue-600 dark:text-blue-400">
            Leadzo AI
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <article>
          {/* Article Header */}
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10">
                Article
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {mins} min read
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6 leading-tight">
              {blog.title}
            </h1>

            {blog.seo_description && (
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {blog.seo_description}
              </p>
            )}

            <div className="flex flex-wrap items-center text-sm text-slate-500 dark:text-slate-400 gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {blog.author || "Leadzo AI"}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(blog.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </header>

          {/* Article Body */}
          <div
            className="prose prose-slate dark:prose-invert prose-lg max-w-none 
              prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
              prose-a:text-blue-600 hover:prose-a:text-blue-700
              prose-strong:text-slate-900 dark:prose-strong:text-white
              prose-img:rounded-xl prose-img:shadow-md
              prose-li:text-slate-700 dark:prose-li:text-slate-300"
            dangerouslySetInnerHTML={{ __html: blog.html_content }}
          />

          {/* Footer CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/40 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Ready to automate your marketing?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
              Leadzo AI handles your SEO, calls, WhatsApp, and CRM — on autopilot.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Get Started Free →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
