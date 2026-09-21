import app from "./app";
import config from "./config";
import { transporter } from "./lib/nodemailer";
import { prisma } from "./lib/prisma";
import { redisClient } from "./lib/redis";

const PORT = config.port;

const startServer = async () => {
  try {
    // Verify database connection before starting the server
    await prisma.$connect();
    console.log("Database connected");

    //Redis
    redisClient.on("error", (err) => console.log("Redis Client Error", err));
    await redisClient.connect();
    console.log("Redis connected successfully");

    //Nodemailer
    await transporter.verify();
    console.log("Nodemailer connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    // Handle server errors (e.g. port already in use)
    server.on("error", async (error) => {
      console.error("Server error:", error);
      await prisma.$disconnect();
      process.exit(1);
    });

    // Graceful shutdown (Ctrl + C)
    process.on("SIGINT", async () => {
      console.log("\nShutting down server...");
      await prisma.$disconnect();
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });

    // Graceful shutdown (Docker, Render, Railway, etc.)
    process.on("SIGTERM", async () => {
      console.log("\nSIGTERM received. Shutting down...");
      await prisma.$disconnect();
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
