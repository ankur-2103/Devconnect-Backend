import { Express } from "express";
import { authJwt, verifySignUp } from "../middlewares";
import controller from "../controller/auth.controller";

export default function (app: Express): void {
  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted,
    ],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);

  // Password reset routes
  app.post("/api/auth/forgotPassword", controller.forgotPassword);
  app.post("/api/auth/resetPassword", controller.resetPassword);
  app.post(
    "/api/auth/updateRoles",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.updateUserRoles
  );
}
