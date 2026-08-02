import multer from 'multer';
import path from 'path';
import fs from 'fs';

const MATERIALES_DIR = process.env.MATERIALES_DIR || './uploads/materiales';

// Crear el directorio de materiales si no existe
if (!fs.existsSync(MATERIALES_DIR)) {
    fs.mkdirSync(MATERIALES_DIR, { recursive: true });
}

// Extensiones permitidas por tipo de recurso
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
    imagen: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'],
    video: ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.avi'],
    documento: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'],
};

export function detectarTipoRecurso(ext: string): string {
    for (const [tipo, exts] of Object.entries(ALLOWED_EXTENSIONS)) {
        if (exts.includes(ext)) return tipo;
    }
    return 'documento';
}

const fileFilter = (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const permitidas = Object.values(ALLOWED_EXTENSIONS).flat();

    if (permitidas.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Extensión no permitida: ${ext}. Solo se aceptan: ${permitidas.join(', ')}`));
    }
};

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, MATERIALES_DIR);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `material-${uniqueSuffix}${ext}`);
    },
});

// Límites: 50MB para permitir videos de clase
export const uploadMaterial = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

export default uploadMaterial;
