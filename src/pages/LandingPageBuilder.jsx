import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Trash2, Eye, Copy, Link, Globe, Type, Image, MessageSquare, Star, Sparkles, Edit } from "lucide-react";
import { toast } from "sonner";

const sectionTypes = [
  { type: "hero", icon: Sparkles, label: "Hero Section" },
  { type: "features", icon: Star, label: "Features" },
  { type: "testimonial", icon: MessageSquare, label: "Testimonial" },
  { type: "text", icon: Type, label: "Text Block" },
  { type: "image", icon: Image, label: "Image" },
  { type: "cta", icon: Link, label: "Call to Action" }
];

export default function LandingPageBuilder() {
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [showNewPageDialog, setShowNewPageDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['landingPages'],
    queryFn: () => base44.entities.LandingPage.list('-created_date'),
    initialData: [],
  });

  const createPageMutation = useMutation({
    mutationFn: (data) => base44.entities.LandingPage.create(data),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries(['landingPages']);
      setSelectedPage(newPage);
      setShowNewPageDialog(false);
      toast.success("Landing page created!");
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LandingPage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['landingPages']);
      toast.success("Page updated!");
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id) => base44.entities.LandingPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['landingPages']);
      setSelectedPage(null);
      toast.success("Page deleted!");
    },
  });

  const handleCreatePage = () => {
    if (!newPageTitle || !newPageSlug) {
      toast.error("Please fill in all fields");
      return;
    }
    createPageMutation.mutate({
      title: newPageTitle,
      slug: newPageSlug,
      sections: [],
      theme: {
        primaryColor: "#f97316",
        secondaryColor: "#dc2626",
        fontFamily: "system-ui"
      },
      is_published: false
    });
    setNewPageTitle("");
    setNewPageSlug("");
  };

  const handleAddSection = (type) => {
    if (!selectedPage) return;
    const newSection = {
      id: Date.now().toString(),
      type,
      order: selectedPage.sections?.length || 0,
      content: getDefaultContent(type)
    };
    updatePageMutation.mutate({
      id: selectedPage.id,
      data: {
        sections: [...(selectedPage.sections || []), newSection]
      }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !selectedPage) return;
    const sections = Array.from(selectedPage.sections || []);
    const [reordered] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, reordered);
    const updatedSections = sections.map((s, i) => ({ ...s, order: i }));
    updatePageMutation.mutate({
      id: selectedPage.id,
      data: { sections: updatedSections }
    });
  };

  const handleDeleteSection = (sectionId) => {
    if (!selectedPage) return;
    const sections = selectedPage.sections.filter(s => s.id !== sectionId);
    updatePageMutation.mutate({
      id: selectedPage.id,
      data: { sections }
    });
  };

  const handleUpdateSection = (sectionId, content) => {
    if (!selectedPage) return;
    const sections = selectedPage.sections.map(s =>
      s.id === sectionId ? { ...s, content } : s
    );
    updatePageMutation.mutate({
      id: selectedPage.id,
      data: { sections }
    });
    setEditingSection(null);
  };

  const handlePublish = () => {
    if (!selectedPage) return;
    const publicUrl = `${window.location.origin}/public/landing/${selectedPage.slug}`;
    updatePageMutation.mutate({
      id: selectedPage.id,
      data: {
        is_published: true,
        published_url: publicUrl
      }
    });
  };

  const handleCopyLink = () => {
    if (selectedPage?.published_url) {
      navigator.clipboard.writeText(selectedPage.published_url);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Landing Page Builder</h1>
            <p className="text-gray-600">Create and publish beautiful landing pages</p>
          </div>
          <Dialog open={showNewPageDialog} onOpenChange={setShowNewPageDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500">
                <Plus className="w-4 h-4 mr-2" />
                New Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Landing Page</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Page Title</Label>
                  <Input
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    placeholder="e.g., Weight Loss Program"
                  />
                </div>
                <div>
                  <Label>URL Slug</Label>
                  <Input
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="e.g., weight-loss-program"
                  />
                </div>
                <Button onClick={handleCreatePage} className="w-full">
                  Create Page
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Pages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => setSelectedPage(page)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedPage?.id === page.id
                      ? 'bg-orange-100 border-2 border-orange-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{page.title}</div>
                  <div className="text-xs text-gray-600">/{page.slug}</div>
                  {page.is_published && (
                    <Badge className="mt-2 bg-green-100 text-green-700">Published</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            {selectedPage ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedPage.title}</CardTitle>
                        <p className="text-sm text-gray-600">/{selectedPage.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        {selectedPage.is_published && (
                          <Button variant="outline" size="sm" onClick={handleCopyLink}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={handlePublish}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          {selectedPage.is_published ? 'Update' : 'Publish'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePageMutation.mutate(selectedPage.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {sectionTypes.map(({ type, icon: Icon, label }) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSection(type)}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          Add {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="sections">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {(selectedPage.sections || []).map((section, index) => (
                          <Draggable key={section.id} draggableId={section.id} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="border-2"
                              >
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                      </div>
                                      <Badge>{section.type}</Badge>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingSection(section)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteSection(section.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <SectionPreview section={section} />
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </>
            ) : (
              <Card>
                <CardContent className="py-20 text-center text-gray-500">
                  Select a page or create a new one to get started
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <SectionEditor
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSave={handleUpdateSection}
      />
    </div>
  );
}

function SectionPreview({ section }) {
  const { content } = section;
  if (section.type === "hero") {
    return (
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-8 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">{content.heading || "Hero Heading"}</h2>
        <p className="text-lg mb-4">{content.subheading || "Subheading text"}</p>
        <button className="bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold">
          {content.ctaText || "Get Started"}
        </button>
      </div>
    );
  }
  if (section.type === "features") {
    return (
      <div className="grid grid-cols-3 gap-4">
        {(content.features || [{ title: "Feature 1" }, { title: "Feature 2" }, { title: "Feature 3" }]).map((f, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600">{f.description}</p>
          </div>
        ))}
      </div>
    );
  }
  if (section.type === "text") {
    return <p className="text-gray-700">{content.text || "Add your text here"}</p>;
  }
  if (section.type === "image") {
    return content.imageUrl ? (
      <img src={content.imageUrl} alt={content.alt || ""} className="w-full rounded-lg" />
    ) : (
      <div className="bg-gray-100 p-8 text-center rounded-lg">Image placeholder</div>
    );
  }
  if (section.type === "testimonial") {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <p className="italic mb-4">"{content.quote || "Add testimonial quote"}"</p>
        <p className="font-semibold">{content.author || "Author Name"}</p>
      </div>
    );
  }
  if (section.type === "cta") {
    return (
      <div className="bg-orange-500 text-white p-8 rounded-lg text-center">
        <h3 className="text-2xl font-bold mb-4">{content.heading || "Ready to get started?"}</h3>
        <button className="bg-white text-orange-600 px-6 py-2 rounded-lg font-semibold">
          {content.buttonText || "Take Action"}
        </button>
      </div>
    );
  }
  return null;
}

function SectionEditor({ section, onClose, onSave }) {
  const [content, setContent] = useState(section?.content || {});

  React.useEffect(() => {
    if (section) setContent(section.content);
  }, [section]);

  if (!section) return null;

  return (
    <Dialog open={!!section} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {section.type} Section</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {section.type === "hero" && (
            <>
              <div>
                <Label>Heading</Label>
                <Input
                  value={content.heading || ""}
                  onChange={(e) => setContent({ ...content, heading: e.target.value })}
                />
              </div>
              <div>
                <Label>Subheading</Label>
                <Textarea
                  value={content.subheading || ""}
                  onChange={(e) => setContent({ ...content, subheading: e.target.value })}
                />
              </div>
              <div>
                <Label>CTA Button Text</Label>
                <Input
                  value={content.ctaText || ""}
                  onChange={(e) => setContent({ ...content, ctaText: e.target.value })}
                />
              </div>
            </>
          )}
          {section.type === "text" && (
            <div>
              <Label>Text Content</Label>
              <Textarea
                rows={6}
                value={content.text || ""}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
              />
            </div>
          )}
          {section.type === "image" && (
            <>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={content.imageUrl || ""}
                  onChange={(e) => setContent({ ...content, imageUrl: e.target.value })}
                />
              </div>
              <div>
                <Label>Alt Text</Label>
                <Input
                  value={content.alt || ""}
                  onChange={(e) => setContent({ ...content, alt: e.target.value })}
                />
              </div>
            </>
          )}
          {section.type === "testimonial" && (
            <>
              <div>
                <Label>Quote</Label>
                <Textarea
                  value={content.quote || ""}
                  onChange={(e) => setContent({ ...content, quote: e.target.value })}
                />
              </div>
              <div>
                <Label>Author</Label>
                <Input
                  value={content.author || ""}
                  onChange={(e) => setContent({ ...content, author: e.target.value })}
                />
              </div>
            </>
          )}
          {section.type === "cta" && (
            <>
              <div>
                <Label>Heading</Label>
                <Input
                  value={content.heading || ""}
                  onChange={(e) => setContent({ ...content, heading: e.target.value })}
                />
              </div>
              <div>
                <Label>Button Text</Label>
                <Input
                  value={content.buttonText || ""}
                  onChange={(e) => setContent({ ...content, buttonText: e.target.value })}
                />
              </div>
            </>
          )}
        </div>
        <Button onClick={() => onSave(section.id, content)} className="w-full">
          Save Changes
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultContent(type) {
  const defaults = {
    hero: { heading: "Welcome", subheading: "Start your journey today", ctaText: "Get Started" },
    features: { features: [{ title: "Feature 1", description: "Description" }] },
    text: { text: "Add your content here" },
    image: { imageUrl: "", alt: "" },
    testimonial: { quote: "Great experience!", author: "Happy Client" },
    cta: { heading: "Ready to begin?", buttonText: "Sign Up Now" }
  };
  return defaults[type] || {};
}