import { Express } from 'express';
import { authJwt } from "../middlewares";
import controller from "../controller/admin.controller";

export default function(app: Express): void {
  app.get(
    "/api/admin/dashboard",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getDashboardStats
  );
  
  
  app.get(
    "/api/admin/history",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getHistoricalData
  );
} 