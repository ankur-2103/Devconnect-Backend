import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { config } from "dotenv";
import { Role, IRole } from "./app/models/role.model"
import { Auth } from "./app/models/auth.model";
import { User } from "./app/models/user.model";
import { RoleEnum } from "./app/enums/role.enum";
import { authJwt } from "./app/middlewares";
import { RequestHandler } from "express";

interface RoleData {
  name: string;
  enum: number;
}

config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from "./app/routes/auth.routes";
import userRoutes from "./app/routes/user.routes";
import postRoutes from "./app/routes/post.routes";

// Apply routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/devconnect";
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    try {
      const count = await Role.estimatedDocumentCount();
      if (count === 0) {
        const initialRoles: RoleData[] = [
          { name: RoleEnum.user.name, enum: RoleEnum.user.enum },
          { name: RoleEnum.moderator.name, enum: RoleEnum.moderator.enum },
          { name: RoleEnum.admin.name, enum: RoleEnum.admin.enum }
        ];

        await Promise.all(
          initialRoles.map(async (role: RoleData) => {
            const newRole = new Role(role);
            await newRole.save();
          })
        );
        console.log("Roles initialized successfully");

        // Create admin user if not exists
        const adminExists = await Auth.findOne({ username: "admin" });
        if (!adminExists) {
          const adminAuth = new Auth({
            username: "admin",
            email: "admin@devconnect.com",
            password: "admin123", // In production, use a secure password
            roles: [RoleEnum.admin.enum],
          });
          await adminAuth.save();

          const adminUser = new User({
            _id: adminAuth._id,
            name: "Admin",
            bio: "System Administrator",
            skills: ["Administration", "System Management"],
            social: {
              github: "https://github.com/admin",
              linkedin: "https://linkedin.com/in/admin",
            },
            avatar: "https://via.placeholder.com/150",
          });
          await adminUser.save();
          console.log("Admin user created successfully");
        }
      }
    } catch (err) {
      console.error("Error initializing roles:", err);
    }
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});