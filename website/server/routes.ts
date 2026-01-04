import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/contact", async (req, res) => {
    try {
      const result = insertContactSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ 
          message: validationError.message 
        });
      }

      const contact = await storage.createContact(result.data);
      return res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      return res.status(500).json({ 
        message: "Failed to submit contact form" 
      });
    }
  });

  return httpServer;
}
