import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { requireApiAuth } from '../middleware/auth';
import { logAuditEvent } from '../lib/audit';

const router = express.Router();

// Configuration for secure uploads (Audit Point 13)
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const auth = (req as any).auth;
    const companyId = auth?.companyId || 'public';
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', companyId);
    
    // Ensure tenant directory exists for isolation
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // 1. MIME Validation
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Tipo de arquivo não permitido (apenas imagens JPG, PNG e WEBP).'));
    }
    // 2. Extension Validation (Anti-Path Traversal / Shell Injection)
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      return cb(new Error('Extensão de arquivo não permitida.'));
    }
    cb(null, true);
  }
});

// Endpoint: Secure Upload
router.post('/api/upload', requireApiAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'O arquivo excedeu o limite de 2MB.' });
      }
      return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const auth = (req as any).auth;
    const companyId = auth?.companyId || 'public';
    
    // Construct public URL
    // In production, this should point to the actual storage service or CDN
    const fileUrl = `/uploads/${companyId}/${req.file.filename}`;

    logAuditEvent(companyId, auth.uid, 'FILE_UPLOADED', `Upload de arquivo realizado: ${req.file.filename}`, req);

    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

export default router;
