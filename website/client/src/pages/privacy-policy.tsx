import { motion } from "framer-motion";
import { Shield, Lock, Users } from "lucide-react";

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

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
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
            Privacy Policy
          </motion.h1>
          <motion.p 
            variants={fadeInUp} 
            className="text-center text-muted-foreground mb-16"
          >
            Last updated: January 04, 2026
          </motion.p>

          <motion.div variants={fadeInUp} className="prose prose-lg dark:prose-invert max-w-4xl mx-auto">
            <p>MyBuddy is committed to protecting your privacy, especially for children under 13 and their parents.</p>

            <h2>Information We Collect</h2>
            <p>We collect minimal personal information necessary for the app to function:</p>
            <ul>
              <li>Parent account information (name and email for login via Keycloak)</li>
              <li>Child profile data (name, age, progress, and interests — stored securely)</li>
              <li>Chat conversations with the AI buddy (for responses and parental review)</li>
              <li>Usage data (completed flashcards, chores, etc.)</li>
            </ul>

            <h2>How We Use Information</h2>
            <p>Data is used only to provide and improve the educational experience. Conversations may be reviewed to enhance AI responses.</p>

            <h2>Parental Controls</h2>
            <p>Parents can access, review, and delete their child's data via the Parent Portal. We require verifiable parental consent for children under 13 (COPPA compliance).</p>

            <h2>Data Sharing</h2>
            <p>We do not sell or share personal data with third parties.</p>

            <h2>Contact</h2>
            <p>For questions: support@mybuddy-and-me.com</p>
          </motion.div>
        </div>
      </motion.section>

      {/* The footer is already in home.tsx — it will appear on these pages automatically if wrapped in a layout, or copy the footer markup here if needed */}
    </div>
  );
}