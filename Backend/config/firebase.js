import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Downloaded from Firebase Console -> Project settings -> Service accounts -> Generate new private key
const serviceAccount = JSON.parse(
    readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const firebaseAuth = admin.auth();
