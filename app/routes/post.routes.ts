import { Express } from "express";
import { authJwt } from "../middlewares";
import controller from "../controller/post.controller";

export default function(app: Express): void {
  // Public routes
  app.get("/api/posts", controller.getAllPosts);
  
  // Protected routes with specific paths first
  app.get("/api/posts/feed", [authJwt.verifyToken], controller.getFeed);
  app.get("/api/posts/user/me", [authJwt.verifyToken], controller.getUserPosts);
  app.get("/api/posts/user/:userId", [authJwt.verifyToken], controller.getUserPosts);
  
  // Protected routes with parameters
  app.post("/api/posts", [authJwt.verifyToken], controller.createPost);
  app.get("/api/posts/:id", [authJwt.verifyToken], controller.getPostById);
  app.put("/api/posts/:id", [authJwt.verifyToken], controller.updatePost);
  app.delete("/api/posts/:id", [authJwt.verifyToken], controller.deletePost);
  app.post("/api/posts/:id/like", [authJwt.verifyToken], controller.toggleLike);
}
