import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
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

/* ================= AUTH ================= */

interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized - No Token",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Invalid Token",
    });
  }
};

/* ================= ROLE ================= */

interface UserPayload {
  email: string;
  role: string;
}

const verifyRole = (role: string) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    const user = req.user as UserPayload;

    if (!user || user.role !== role) {
      return res.status(403).send({
        success: false,
        message: "Forbidden",
      });
    }

    next();
  };
};

interface User {
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  photo?: string;
  role?: string;
  status?: string;
  createdAt?: Date;
}

/* ================= USERS ================= */

app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await usersCollection.find().toArray();

    res.send(users);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

app.get(
  "/admin/users",
  verifyToken,
  verifyRole("admin"),
  async (req: AuthRequest, res: Response) => {
    const users = await usersCollection.find().toArray();

    res.send(users);
  }
);


/* ================= LOGIN ================= */

app.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // localhost
      sameSite: "lax",
    });

    res.send({
      success: true,
      token,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Login failed",
    });
  }
});

/* ================= LOGOUT ================= */

app.post("/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("token");

  res.send({
    success: true,
    message: "Logout successful",
  });
});

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