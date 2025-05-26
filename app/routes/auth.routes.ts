import { Express } from 'express';
import { verifySignUp } from "../middlewares";
import controller from "../controller/auth.controller";

export default function(app: Express): void {
  app.post(
    "/api/auth/signup",
    [
      verifySignUp.checkDuplicateUsernameOrEmail,
      verifySignUp.checkRolesExisted
    ],
    controller.signup
  );

  app.post("/api/auth/signin", controller.signin);
} 