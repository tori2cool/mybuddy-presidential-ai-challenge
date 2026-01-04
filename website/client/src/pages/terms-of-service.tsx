import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

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

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Back button top left */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
        </Link>
      </div>

      <motion.section 
        className="py-24"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="max-w-6xl mx-auto px-4">
          <motion.h1 
            variants={fadeInUp} 
            className="text-4xl md:text-5xl font-bold text-center mb-8"
          >
            Terms of Service
          </motion.h1>
          <motion.p 
            variants={fadeInUp} 
            className="text-center text-muted-foreground mb-16"
          >
            Last updated: January 04, 2026
          </motion.p>

          <motion.div 
            variants={fadeInUp} 
            className="prose prose-lg dark:prose-invert max-w-4xl mx-auto"
          >
            <p>By using MyBuddy, you agree to these terms.</p>

            <h2>Use of the App</h2>
            <p>The app is intended for children with parental supervision. Parents are responsible for monitoring usage.</p>

            <h2>Content</h2>
            <p>All content is educational and age-appropriate. We do not guarantee suitability for every child.</p>

            <h2>Account Responsibility</h2>
            <p>Parents must create accounts and add children. Parents are responsible for maintaining account security.</p>

            <h2>Changes</h2>
            <p>We may update these terms. Continued use constitutes acceptance.</p>

            <h2>Contact</h2>
            <p>For questions: sales@mybuddy-and-me.com</p>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}