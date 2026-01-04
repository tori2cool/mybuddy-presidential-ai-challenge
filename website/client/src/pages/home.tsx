import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Compass, 
  Star, 
  Heart, 
  Shield, 
  Lock, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  Sparkles,
  Brain,
  Palette,
  Globe,
  CheckCircle,
  ChevronDown,
  Dog,
  Cat
} from "lucide-react";
import { SiLinkedin, SiFacebook, SiInstagram, SiX } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

import heroImage from "@assets/IMG_5765_1766982224797.webp";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const buddyCharacters = [
  { name: "Buddy Dog", icon: Dog, trait: "Loyal & Encouraging", color: "bg-amber-100 dark:bg-amber-900/30" },
  { name: "Dino Rex", icon: Sparkles, trait: "Curious & Brave", color: "bg-green-100 dark:bg-green-900/30" },
  { name: "Robo Pal", icon: Brain, trait: "Smart & Helpful", color: "bg-blue-100 dark:bg-blue-900/30" },
  { name: "Whiskers", icon: Cat, trait: "Calm & Patient", color: "bg-purple-100 dark:bg-purple-900/30" },
  { name: "Sparkle", icon: Star, trait: "Creative & Fun", color: "bg-pink-100 dark:bg-pink-900/30" },
  { name: "Explorer", icon: Compass, trait: "Adventurous", color: "bg-teal-100 dark:bg-teal-900/30" },
];

const features = [
  {
    icon: BookOpen,
    title: "Flashcard Academy",
    description: "Bite-sized, interactive lessons in math, science, reading, and history that adapt to your child's interests and learning pace.",
    color: "text-amber-500"
  },
  {
    icon: Compass,
    title: "Outdoor Adventures",
    description: "Nature-based activities to spark curiosity and get kids moving. Real-world exploration meets digital guidance.",
    color: "text-green-500"
  },
  {
    icon: Star,
    title: "Chores Hub",
    description: "Gamified tasks that build responsibility with rewards and tips. Turn everyday chores into achievement opportunities.",
    color: "text-blue-500"
  },
  {
    icon: Heart,
    title: "Dream Tracker",
    description: "A personal dashboard to track progress, set mini-goals, and watch your buddy grow alongside your achievements.",
    color: "text-pink-500"
  }
];

const roadmapPhases = [
  {
    quarter: "Q1 2026",
    title: "Core Personalization & Daily Wellness",
    items: [
      "AI Learning Engine Beta with adaptive algorithms",
      "Expanded Affirmations & Voice-to-text Diary",
      "Life Skills Starter Pack with fun animations"
    ]
  },
  {
    quarter: "Q2 2026",
    title: "Social Sparks & Emotional Toolkit",
    items: [
      "Kid-Safe Local Network - Playdate Plaza",
      "Empathy Academy with interactive scenarios",
      "Parent dashboard with AI pattern alerts"
    ]
  },
  {
    quarter: "Q3 2026",
    title: "Creative & Academic Expansion",
    items: [
      "Enrichment Electives - Music & Art Studios",
      "Level-Up Challenges with Buddy Points",
      "Microlearning bursts for busy days"
    ]
  },
  {
    quarter: "Q4 2026",
    title: "Advanced AI & Community",
    items: [
      "Dream Tracker Pro with AI goal coaching",
      "Voice mode & multilingual support",
      "MyBuddy Meetups beta events"
    ]
  }
];

const safetyFeatures = [
  {
    icon: Shield,
    title: "COPPA Compliant",
    description: "Fully compliant with children's privacy regulations. Minimal data collection with verifiable parental consent."
  },
  {
    icon: Lock,
    title: "Privacy by Design",
    description: "Built from the ground up to protect young users. Data minimization and transparent AI explanations."
  },
  {
    icon: Users,
    title: "Parental Controls",
    description: "Full parental oversight with dashboards, alerts, and zero-tolerance policies for negativity."
  }
];

export default function Home() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      companyName: "",
      address: "",
      phone: "",
      email: ""
    }
  });

  const contactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Message sent!",
        description: "We'll be in touch with you soon.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: InsertContact) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="#" className="text-xl font-semibold text-foreground" data-testid="link-logo">
            MyBuddy
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#story" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-story">Our Story</a>
            <a href="#roadmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-roadmap">Roadmap</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-contact-nav">Contact</a>
          </div>
          <Button asChild data-testid="button-get-started-nav">
            <a href="#contact">Get Started</a>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="MyBuddy - Parent and child walking through a ring of fire together"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-6 bg-primary/90 text-primary-foreground border-none" data-testid="badge-beta">
              Now in Beta
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-tight" data-testid="text-hero-title">
              Meet MyBuddy: Your Child's<br />
              <span className="text-primary">AI-Powered Learning Companion</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
              From a 4-year-old's teaching dream to an app that grows with your child. 
              Choose your buddy, embark on adventures, and transform learning into a lifelong journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="text-lg px-8" asChild data-testid="button-hero-cta">
                <a href="#contact">Join the Beta</a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" asChild data-testid="button-hero-learn">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8 text-white/60" />
          </motion.div>
        </div>
      </section>

      {/* Buddy Characters Showcase */}
      <section className="py-20 bg-card" id="buddies">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4" data-testid="text-buddies-title">
              Choose Your Perfect Buddy
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-buddies-subtitle">
              Your buddy grows with you, offering advice, encouragement, and personalized guidance. 
              It's like sharing everything with your best friend!
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {buddyCharacters.map((buddy, index) => (
              <motion.div key={buddy.name} variants={fadeInUp}>
                <Card className={`text-center p-4 hover-elevate cursor-pointer transition-transform ${buddy.color}`} data-testid={`card-buddy-${index}`}>
                  <CardContent className="p-0">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-background/80 flex items-center justify-center">
                      <buddy.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground text-sm mb-1">{buddy.name}</h3>
                    <p className="text-xs text-muted-foreground">{buddy.trait}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20" id="features">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4" data-testid="text-features-title">
              A Solid Foundation for Learning
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our beta version is a delightful, intuitive app already sparking joy in early testers.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-md bg-muted">
                        <feature.icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Journey Story */}
      <section className="py-20 bg-card" id="story">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-8 text-center" data-testid="text-story-title">
              Our Journey: From a Preschool Dream
            </h2>
          </motion.div>

          <div className="space-y-12">
            <motion.div 
              className="flex flex-col md:flex-row gap-8 items-center"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="md:w-1/3">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="md:w-2/3">
                <h3 className="text-xl font-semibold text-foreground mb-3">The Spark</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-story-1">
                  It all began with our daughter, Cali, who at just four years old declared her dream of becoming a teacher. 
                  Inspired by our family's microgreens and hydroponics hobby, we helped her launch a monthly "Microgreen Mastery" 
                  class at her school. The kids loved it so much that the magic of child-led learning was undeniable.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex flex-col md:flex-row-reverse gap-8 items-center"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="md:w-1/3">
                <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                  <Brain className="w-12 h-12 text-secondary" />
                </div>
              </div>
              <div className="md:w-2/3">
                <h3 className="text-xl font-semibold text-foreground mb-3">The Evolution</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-story-2">
                  Fast-forward a few years: Our homeschooling experiments gained momentum just as breakthrough AI tools emerged, 
                  democratizing app development without massive costs. Enter MyBuddy, our AI-driven homeschool companion app. 
                  Born from Cali's passion and our shared vision, it's reimagining education as a holistic system that truly knows the child.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="flex flex-col md:flex-row gap-8 items-center"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="md:w-1/3">
                <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                  <Heart className="w-12 h-12 text-accent" />
                </div>
              </div>
              <div className="md:w-2/3">
                <h3 className="text-xl font-semibold text-foreground mb-3">The Vision</h3>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-story-3">
                  At its heart, MyBuddy ditches rigid grades for a flexible leveling system. You advance as fast or slow as feels right, 
                  always chasing your best self. It's more than lessons; it's a lifelong ally, from preschool explorers to college-bound 
                  trailblazers, evolving into tools like career simulations, personal coaching, fitness guidance, and health nudges.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Roadmap Timeline */}
      <section className="py-20" id="roadmap">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-accent text-accent-foreground" data-testid="badge-challenge">
              Presidential AI Challenge 2026
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4" data-testid="text-roadmap-title">
              Our 12-Month Roadmap
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Building the AI-Powered MyBuddy Ecosystem with transformative updates planned through 2026.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4" data-testid="accordion-roadmap">
              {roadmapPhases.map((phase, index) => (
                <AccordionItem key={phase.quarter} value={phase.quarter} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline" data-testid={`accordion-trigger-${index}`}>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="font-mono">{phase.quarter}</Badge>
                      <span className="font-medium text-left">{phase.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pl-4">
                      {phase.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Safety & Trust */}
      <section className="py-20 bg-card">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4" data-testid="text-safety-title">
              Safety First, Always
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your child's safety is our top priority. MyBuddy is built with robust ethical safeguards.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {safetyFeatures.map((feature, index) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="text-center h-full" data-testid={`card-safety-${index}`}>
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-primary">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div data-testid="stat-testers">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">10,000+</div>
              <div className="text-sm text-primary-foreground/80">Early Testers</div>
            </div>
            <div data-testid="stat-coppa">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">100%</div>
              <div className="text-sm text-primary-foreground/80">COPPA Compliant</div>
            </div>
            <div data-testid="stat-levels">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">50+</div>
              <div className="text-sm text-primary-foreground/80">Learning Levels</div>
            </div>
            <div data-testid="stat-launch">
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">Jan 2026</div>
              <div className="text-sm text-primary-foreground/80">Full Launch</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20" id="contact">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4" data-testid="text-contact-title">
              Join the MyBuddy Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Interested in learning more or becoming an early partner? Leave your information and we'll be in touch.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-12">
            <motion.div 
              className="md:col-span-3"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              {submitted ? (
                <Card className="p-8 text-center">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-success">Thank You!</h3>
                    <p className="text-muted-foreground">We've received your message and will be in touch soon.</p>
                    <Button 
                      className="mt-6" 
                      variant="outline" 
                      onClick={() => setSubmitted(false)}
                      data-testid="button-send-another"
                    >
                      Send Another Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-contact">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Your full name" {...field} data-testid="input-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your company (optional)" {...field} value={field.value || ""} data-testid="input-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Your address (optional)" 
                                  className="resize-none"
                                  {...field} 
                                  value={field.value || ""}
                                  data-testid="input-address"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full" 
                          size="lg"
                          disabled={contactMutation.isPending}
                          data-testid="button-submit"
                        >
                          {contactMutation.isPending ? "Sending..." : "Join the Journey"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                  <CardDescription>We'd love to hear from you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-md bg-muted">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">Phone</h4>
                      <a 
                        href="tel:321-479-7422" 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-phone"
                      >
                        321-479-7422
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-md bg-muted">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">Email</h4>
                      <a 
                        href="mailto:sales@MyBuddy-and-Me.com" 
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-email"
                      >
                        sales@MyBuddy-and-Me.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-md bg-muted">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">Website</h4>
                      <span className="text-sm text-muted-foreground" data-testid="text-website">
                        MyBuddy-and-Me.com
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-semibold text-foreground mb-2">MyBuddy</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Your unwavering best friend in learning. Turning "I wish" into "I did" through AI-powered personalized education.
              </p>
              <div className="flex gap-3">
                <Button size="icon" variant="ghost" asChild data-testid="link-facebook">
                  <a href="#" aria-label="Facebook">
                    <SiFacebook className="w-5 h-5" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" asChild data-testid="link-instagram">
                  <a href="#" aria-label="Instagram">
                    <SiInstagram className="w-5 h-5" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" asChild data-testid="link-twitter">
                  <a href="#" aria-label="X (Twitter)">
                    <SiX className="w-5 h-5" />
                  </a>
                </Button>
                <Button size="icon" variant="ghost" asChild data-testid="link-linkedin">
                  <a href="#" aria-label="LinkedIn">
                    <SiLinkedin className="w-5 h-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#story" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Our Story</a></li>
                <li><a href="#roadmap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Roadmap</a></li>
                <li><a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="tel:321-479-7422" className="hover:text-foreground transition-colors">321-479-7422</a></li>
                <li><a href="mailto:sales@MyBuddy-and-Me.com" className="hover:text-foreground transition-colors">sales@MyBuddy-and-Me.com</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground" data-testid="text-copyright">
              © 2025 MyBuddy-and-Me.com. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
