import { Express } from 'express';
import { authJwt } from "../middlewares";
import controller from "../controller/user.controller";

export default function(app: Express): void {

  app.get("/api/user", [authJwt.verifyToken], controller.userBoard);

 
} 