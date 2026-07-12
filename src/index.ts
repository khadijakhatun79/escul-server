import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// MongoDB Client
const client = new MongoClient(process.env.MONGODB_URI as string);

// Collections
let usersCollection: any;
let coursesCollection: any;
let reviewsCollection: any;

async function run() {
  try {
    await client.connect();

    const db = client.db("escul");

    usersCollection = db.collection("users");
    coursesCollection = db.collection("courses");
    reviewsCollection = db.collection("reviews");

    console.log("✅ MongoDB Connected");

    // Root Route
    app.get("/", (req, res) => {
      res.send("Escul API Running...");
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

run();

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});