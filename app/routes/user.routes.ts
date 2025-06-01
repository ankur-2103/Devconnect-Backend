import { Express } from 'express';
import { authJwt } from "../middlewares";
import controller from "../controller/user.controller";

export default function(app: Express): void {

  app.get("/api/user/me", [authJwt.verifyToken], controller.userMe);

  app.put("/api/user/me", [authJwt.verifyToken], controller.updateMe);

  app.put("/api/user", [authJwt.verifyToken, authJwt.isAdmin], controller.updateUser)

  app.get("/api/user/search", [authJwt.verifyToken], controller.searchUsers);

  app.get("/api/user/:id", [authJwt.verifyToken], controller.getUserById);
} 