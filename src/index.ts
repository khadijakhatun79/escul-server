import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { Collection } from "mongodb";
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
let usersCollection: Collection;
let coursesCollection: Collection;
let reviewsCollection: Collection;

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

app.get("/users/:email", async (req: Request, res: Response) => {
  try {
    const email = req.params.email;

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    res.send(user);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

app.get(
  "/me",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    const user = await usersCollection.findOne({
      email: (req.user as UserPayload).email,
    });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    res.send(user);
  }
);

app.post("/users", async (req: Request, res: Response) => {
  try {
    const user: User = req.body;

    const exists = await usersCollection.findOne({
      email: user.email,
    });

    if (exists) {
      return res.status(400).send({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = {
      ...user,
      role: user.role || "student",
      status: "active",
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch {
    res.status(500).send({
      success: false,
      message: "Failed to create user",
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

app.get("/courses", async (req: Request, res: Response) => {
  try {
    const courses = await coursesCollection.find().toArray();

    res.send(courses);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch courses",
    });
  }
});


app.get("/courses/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const course = await coursesCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!course) {
      return res.status(404).send({
        success: false,
        message: "Course not found",
      });
    }

    res.send(course);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch course",
    });
  }
});

app.post(
  "/courses",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const course = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await coursesCollection.insertOne(course);

      res.status(201).send({
        success: true,
        insertedId: result.insertedId,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to create course",
      });
    }
  }
);

app.put(
  "/courses/:id",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id;

      const result = await coursesCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: req.body,
        }
      );

      res.send(result);
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to update course",
      });
    }
  }
);

app.delete(
  "/courses/:id",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id;

      const result = await coursesCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.send(result);
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to delete course",
      });
    }
  }
);

app.post(
  "/reviews",
  verifyToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const review = {
        ...req.body,
        createdAt: new Date(),
      };

      const result = await reviewsCollection.insertOne(review);

      res.send({
        success: true,
        insertedId: result.insertedId,
      });
    } catch (error) {
      res.status(500).send({
        success: false,
        message: "Failed to add review",
      });
    }
  }
);

app.get("/reviews", async (req: Request, res: Response) => {
  try {
    const reviews = await reviewsCollection.find().toArray();

    res.send(reviews);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
});

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

    await client.db("admin").command({ ping: 1 });
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

app.use((req: Request, res: Response) => {
  res.status(404).send({
    success: false,
    message: "Route Not Found",
  });
});

app.use(
  (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error(err);

    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
);

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});