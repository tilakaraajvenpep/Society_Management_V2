import express from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../utils/cloudinary";

const router = express.Router();

router.post("/member-docs", authenticate, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idProof', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: any = {};

    const getFileUrl = (file: Express.Multer.File) => {
      if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
        return file.path;
      }
      return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    };

    if (files.photo) {
      result.photoUrl = getFileUrl(files.photo[0]);
    }
    if (files.idProof) {
      result.idProofUrl = getFileUrl(files.idProof[0]);
    }

    res.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading files", error });
  }
});

router.post("/ticket", authenticate, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }
    const file = req.file as Express.Multer.File;
    const imageUrl = file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))
      ? file.path
      : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    
    res.json({ imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading image", error });
  }
});

export default router;
