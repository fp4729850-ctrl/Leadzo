// Leadzo Edge Optimizer CDN Script (optimizer.js)
// Automatically loaded on client sites to deploy approved SEO/AI optimizations.

(async function () {
  console.log("⚡ Leadzo Edge Optimizer CDN Initialized.");
  
  // 1. Get siteId from script query parameters
  const currentScript = document.currentScript;
  if (!currentScript) return;
  const scriptUrl = new URL(currentScript.src);
  const siteId = scriptUrl.searchParams.get("siteId");
  if (!siteId) {
    console.warn("⚠️ Leadzo CDN: siteId parameter missing.");
    return;
  }

  const SUPABASE_URL = "https://stbqeiapgdaklktrlrjm.supabase.co";
  const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0YnFlaWFwZ2Rha2xrdHJscmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MTYxODgsImV4cCI6MjA5OTI5MjE4OH0.dobxKtLAQ9iG82IpwBqjE_QVw0hqU1Jq28VblFet78g";

  try {
    // 2. Fetch approved recommendations for this site
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ranking_recommendations?site_id=eq.${siteId}&status=in.%28approved,done%29`,
      {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const recommendations = await response.json();

    if (recommendations.length === 0) {
      console.log("ℹ️ Leadzo CDN: No active approved recommendations found.");
      return;
    }

    console.log(`⚡ Leadzo CDN: Deploying ${recommendations.length} active optimizations...`);

    recommendations.forEach((rec) => {
      // Opt 1: JSON-LD Schema Architecture (Organization)
      if (
        rec.title.includes("Schema") || 
        rec.category === "GEO & AI Visibility" ||
        rec.category === "AI Readiness"
      ) {
        if (!document.getElementById("leadzo-org-schema")) {
          const script = document.createElement("script");
          script.id = "leadzo-org-schema";
          script.type = "application/ld+json";
          
          const orgSchema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Leadzo AI",
            "url": window.location.origin,
            "logo": window.location.origin + "/logo.png",
            "description": "Autonomous AI lead management and SEO optimizer.",
            "sameAs": [
              "https://twitter.com/leadzoai",
              "https://linkedin.com/company/leadzoai"
            ]
          };

          script.text = JSON.stringify(orgSchema);
          document.head.appendChild(script);
          console.log("✅ Leadzo CDN: Organization JSON-LD Schema injected.");
        }
      }

      // Opt 2: FAQPage Schema
      if (rec.title.includes("FAQ") || rec.reason.includes("FAQ")) {
        if (!document.getElementById("leadzo-faq-schema")) {
          const script = document.createElement("script");
          script.id = "leadzo-faq-schema";
          script.type = "application/ld+json";

          const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is Leadzo AI?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Leadzo AI is an autonomous CRM and ad optimization system that increases search presence and LLM indexing."
                }
              },
              {
                "@type": "Question",
                "name": "How does Autopilot optimization work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Autopilot automatically audits on-page tags, generates schemas, and deploys fixes directly through the Leadzo Edge CDN."
                }
              }
            ]
          };

          script.text = JSON.stringify(faqSchema);
          document.head.appendChild(script);
          console.log("✅ Leadzo CDN: FAQPage JSON-LD Schema injected.");
        }
      }

      // Opt 3: Meta Title/Description updates
      if (rec.title.includes("Title") || rec.title.includes("Meta")) {
        // Update document title if matches unoptimized pattern
        if (document.title === "Leadzo AI") {
          document.title = "Leadzo AI | Autonomous Lead Management & AI Ad Campaigns";
          console.log("✅ Leadzo CDN: Dynamic Title tags optimized.");
        }
      }
    });

  } catch (error) {
    console.error("❌ Leadzo CDN: Optimization deployment failed:", error);
  }
})();
