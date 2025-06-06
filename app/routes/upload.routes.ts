import multer from "multer";
import { Express } from "express";
import { uploadImageToSupabase } from "../controller/upload.controller";
import { authJwt } from "../middlewares";

const upload = multer({ storage: multer.memoryStorage() });

export default function (app: Express): void {
  app.post(
    "/upload",
    [authJwt.verifyToken],
    upload.single("image"),
    uploadImageToSupabase
  );
}
