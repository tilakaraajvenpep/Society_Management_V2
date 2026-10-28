import express from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../utils/cloudinary";

const router = express.Router();

const getFileUrl = (req: any, file: Express.Multer.File) => {
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
};

router.post("/member-docs", authenticate, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idProof', maxCount: 1 }
]), async (req: any, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: any = {};

    if (files.photo) {
      result.photoUrl = getFileUrl(req, files.photo[0]);
    }
    if (files.idProof) {
      result.idProofUrl = getFileUrl(req, files.idProof[0]);
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
    const imageUrl = getFileUrl(req, req.file);
    res.json({ imageUrl, url: imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading image", error });
  }
});

// Generic single file upload (supports field names 'file', 'image', 'proof', 'qrCode', 'banner')
router.post("/file", authenticate, upload.any(), async (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileUrl = getFileUrl(req, files[0]);
    res.json({ 
      url: fileUrl, 
      fileUrl, 
      imageUrl: fileUrl, 
      proofUrl: fileUrl, 
      qrCodeUrl: fileUrl 
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Error uploading file", error });
  }
});

export default router;
