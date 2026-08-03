import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, Clock } from "lucide-react";

function readingTime(html: string): number {
  const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogListingPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set page-level SEO
    document.title = "Blog | Leadzo AI — Marketing Automation Insights";
    let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.setAttribute("name", "description");
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute("content", "Insights, guides, and updates on AI-powered marketing automation, SEO, bulk calling, and lead generation from Leadzo AI.");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://www.leadzoai.com/blog");

    // Fetch blogs
    async function fetchBlogs() {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, seo_description, author, created_at, html_content")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching blogs:", error);
      } else {
        setBlogs(data || []);
      }
      setLoading(false);
    }
    fetchBlogs();

    return () => {
      document.title = "Leadzo AI";
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
            Leadzo AI
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Heading */}
        <div className="text-center mb-14">
          <span className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold px-3 py-1 rounded-full mb-4 ring-1 ring-blue-200 dark:ring-blue-800">
            Leadzo AI Blog
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            Marketing Automation Insights
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-500 dark:text-slate-400">
            Guides, strategies, and updates on AI-powered lead generation, SEO, bulk calling, and WhatsApp automation.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-700 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No articles yet</h2>
            <p className="text-slate-500">Our AI is writing — check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => {
              const mins = readingTime(blog.html_content || "");
              return (
                <Link
                  key={blog.id}
                  to={`/blog/${blog.slug}`}
                  className="group block h-full"
                >
                  <article className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10">
                        Article
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {mins} min
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                      {blog.title}
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-5">
                      {blog.seo_description || "Read this article for marketing insights and actionable strategies."}
                    </p>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {new Date(blog.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
                        Read
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-16 py-8 text-center">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Leadzo AI. All rights reserved.{" "}
          <Link to="/" className="text-blue-600 hover:underline">Back to App</Link>
        </p>
      </footer>
    </div>
  );
}
