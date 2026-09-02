import { firebaseAuth } from '../config/firebase.js';

// Expects header: Authorization: Bearer <idToken>
export async function verifyFirebaseToken(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    const idToken = header.split(' ')[1];

    try {
        const decoded = await firebaseAuth.verifyIdToken(idToken);
        req.firebaseUser = decoded; // { uid, email, name, picture, ... }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
}
