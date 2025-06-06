import { Express } from "express";
import { authJwt } from "../middlewares";
import controller from "../controller/comment.controller";

export default function (app: Express): void {
  // Create a new comment
  app.post("/api/comment", [authJwt.verifyToken], controller.createComment);

  // Get all comments for a specific post
  app.get(
    "/api/comments/post/:postId",
    [authJwt.verifyToken],
    controller.getCommentsByPostId
  );

  // Get a single comment by ID
  app.get("/api/comment/:id", [authJwt.verifyToken], controller.getCommentById);

  // Update a comment (by comment owner, post owner, or admin)
  app.put("/api/comment/:id", [authJwt.verifyToken], controller.updateComment);

  // Delete a comment (by comment owner, post owner, or admin)
  app.delete(
    "/api/comment/:id",
    [authJwt.verifyToken],
    controller.deleteComment
  );
}
