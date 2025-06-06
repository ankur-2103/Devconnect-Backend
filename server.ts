import express, { Express } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
import mongoose from "mongoose";
import { Role as RoleModel } from "./app/models/role.model";
import db from "./app/models";
import authRoutes from "./app/routes/auth.routes";
import userRoutes from "./app/routes/user.routes";
import { RoleEnum } from "./app/enums/role.enum";
import postRoutes from "./app/routes/post.routes";
import uploadRoutes from "./app/routes/upload.routes";
import commentRoutes from "./app/routes/comment.routes";

dotenv.config();

const app: Express = express();

app.use(
  cors({
    origin: true, // Allow all origins in developmentAdd commentMore actions
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "x-access-token",
      "Authorization",
      "Origin",
      "Content-Type",
      "Accept",
    ],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI setup
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "DevConnect API Documentation",
  })
);

// Database connection
mongoose
  .connect(
    `mongodb+srv://ankurvasta123:${process.env.PASSWORD}@cluster0.1f6xg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
  )
  .then(() => {
    console.log("Successfully connect to MongoDB.");
    initial();
  })
  .catch((err: Error) => {
    console.error("Connection error", err);
    process.exit();
  });

async function initial(): Promise<void> {
  try {
    const count = await RoleModel.estimatedDocumentCount();

    if (count === 0) {
      await new RoleModel({
        name: RoleEnum.user.name,
        enum: RoleEnum.user.enum,
      }).save();
      console.log(`added '${RoleEnum.user.name}' to roles collection`);

      await new RoleModel({
        name: RoleEnum.moderator.name,
        enum: RoleEnum.moderator.enum,
      }).save();
      console.log(`added '${RoleEnum.moderator.name}' to roles collection`);

      await new RoleModel({
        name: RoleEnum.admin.name,
        enum: RoleEnum.admin.enum,
      }).save();
      console.log(`added '${RoleEnum.admin.name}' to roles collection`);
    }
  } catch (err) {
    console.error("Error initializing roles:", err);
  }
}

// Initialize routes
authRoutes(app);
userRoutes(app);
postRoutes(app);
commentRoutes(app);
uploadRoutes(app);

const PORT: number = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(
    `API Documentation available at http://localhost:${PORT}/api-docs`
  );
});
