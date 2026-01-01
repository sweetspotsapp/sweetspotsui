import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";

const faqs = [
  {
    question: "How do I save a place to my favorites?",
    answer: "Tap the heart icon on any place card to save it to your favorites. You can view all saved places in the Saved tab at the bottom of the app.",
  },
  {
    question: "How does the AI recommendation work?",
    answer: "Our AI analyzes your preferences, past interactions, and current mood to suggest places you'll love. The more you use the app, the better recommendations become.",
  },
  {
    question: "Can I use the app offline?",
    answer: "Some features require an internet connection, but your saved places and recent searches are cached for offline viewing.",
  },
  {
    question: "How do I change my location settings?",
    answer: "Go to Settings > Privacy and toggle 'Share Location'. You can also manually set your location by tapping the location icon in the search bar.",
  },
  {
    question: "How do I delete my account?",
    answer: "You can delete your account in Settings > Danger Zone. This action is permanent and will remove all your data from our servers.",
  },
  {
    question: "How do I report an incorrect place listing?",
    answer: "On any place detail page, scroll down and tap 'Report an Issue'. Our team reviews all reports within 24-48 hours.",
  },
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24-48 hours.",
    });
    
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
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
          <h1 className="text-lg font-semibold text-foreground">Help & Support</h1>
        </div>
      </header>

      <div className="pb-8">
        {/* FAQ Section */}
        <section className="px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="bg-card rounded-xl border border-border overflow-hidden">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-border"
              >
                <AccordionTrigger className="px-4 text-left text-foreground hover:no-underline hover:bg-muted/50">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Contact Form Section */}
        <section className="px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Contact Us
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Can't find what you're looking for? Send us a message and we'll get back to you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-card border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-foreground">Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="What's this about?"
                value={formData.subject}
                onChange={handleInputChange}
                className="bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-foreground">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us how we can help..."
                rows={5}
                value={formData.message}
                onChange={handleInputChange}
                className="bg-card border-border resize-none"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default HelpSupport;
