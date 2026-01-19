import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function PublicLandingPage() {
  const slug = new URLSearchParams(window.location.search).get("slug");

  const { data: page, isLoading } = useQuery({
    queryKey: ['publicLandingPage', slug],
    queryFn: async () => {
      const pages = await base44.entities.LandingPage.filter({ slug, is_published: true });
      if (pages.length > 0) {
        // Increment view count
        await base44.entities.LandingPage.update(pages[0].id, {
          views_count: (pages[0].views_count || 0) + 1
        });
        return pages[0];
      }
      return null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600">This landing page does not exist or is not published.</p>
        </div>
      </div>
    );
  }

  const theme = page.theme || {};
  const sections = (page.sections || []).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen" style={{ fontFamily: theme.fontFamily || 'system-ui' }}>
      {sections.map((section) => (
        <RenderSection key={section.id} section={section} theme={theme} />
      ))}
    </div>
  );
}

function RenderSection({ section, theme }) {
  const { content } = section;
  const primaryColor = theme.primaryColor || '#f97316';
  const secondaryColor = theme.secondaryColor || '#dc2626';

  if (section.type === "hero") {
    return (
      <div
        className="py-20 px-6 text-center text-white"
        style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">{content.heading}</h1>
          <p className="text-xl md:text-2xl mb-8">{content.subheading}</p>
          <button
            className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow"
          >
            {content.ctaText}
          </button>
        </div>
      </div>
    );
  }

  if (section.type === "features") {
    return (
      <div className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(content.features || []).map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "text") {
    return (
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed">{content.text}</p>
        </div>
      </div>
    );
  }

  if (section.type === "image") {
    return (
      <div className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt={content.alt || ""}
              className="w-full rounded-2xl shadow-xl"
            />
          )}
        </div>
      </div>
    );
  }

  if (section.type === "testimonial") {
    return (
      <div className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-50 p-12 rounded-2xl shadow-lg">
            <p className="text-2xl italic text-gray-700 mb-6">"{content.quote}"</p>
            <p className="text-xl font-semibold" style={{ color: primaryColor }}>
              — {content.author}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (section.type === "cta") {
    return (
      <div
        className="py-20 px-6 text-center text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-8">{content.heading}</h2>
          <button className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-lg transition-shadow">
            {content.buttonText}
          </button>
        </div>
      </div>
    );
  }

  return null;
}