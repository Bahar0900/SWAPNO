import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { initDatabase, db } from './db.js';
import { verifyFirebaseToken } from './middleware/verifyFirebaseToken.js';
import { stripe } from './config/stripe.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Stripe webhook needs the RAW body to verify its signature, so it must be
// registered BEFORE express.json() runs globally.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object;
            await db.run("UPDATE ORDERS SET payment_status = 'Paid' WHERE stripe_payment_intent_id = ?", [intent.id]);
        }
        if (event.type === 'payment_intent.payment_failed') {
            const intent = event.data.object;
            await db.run("UPDATE ORDERS SET payment_status = 'Failed' WHERE stripe_payment_intent_id = ?", [intent.id]);
        }
        res.json({ received: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use(cors());
app.use(express.json());

// POST: Verifies the Google/Firebase ID token, then finds or creates the matching
// CUSTOMERS row. SQLite stays the source of truth for profile + order data —
// Firebase only proves who the user is.
app.post('/api/auth/firebase-login', verifyFirebaseToken, async (req, res) => {
    const { uid, email, name } = req.firebaseUser;

    if (!email) {
        return res.status(400).json({ error: 'Google account has no email on file.' });
    }

    try {
        let customer = await db.get("SELECT * FROM CUSTOMERS WHERE firebase_uid = ?", [uid]);

        if (!customer) {
            // Might already exist from before Firebase was added — link by email
            customer = await db.get("SELECT * FROM CUSTOMERS WHERE email = ?", [email.toLowerCase()]);

            if (customer) {
                await db.run("UPDATE CUSTOMERS SET firebase_uid = ? WHERE customer_id = ?", [uid, customer.customer_id]);
                customer.firebase_uid = uid;
            } else {
                const result = await db.run(
                    `INSERT INTO CUSTOMERS (name, email, firebase_uid) VALUES (?, ?, ?)`,
                    [name || email.split('@')[0], email.toLowerCase(), uid]
                );
                customer = await db.get("SELECT * FROM CUSTOMERS WHERE customer_id = ?", [result.lastID]);
            }
        }

        res.json({ message: 'Signed in successfully.', user: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Product Catalog Retrieval (unchanged)
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all("SELECT * FROM PRODUCTS");
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Creates a Stripe PaymentIntent. Total is recalculated server-side from
// PRODUCTS so a tampered client-side price/quantity can never be charged.
app.post('/api/payments/create-intent', verifyFirebaseToken, async (req, res) => {
    const { items } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Cart items are required.' });
    }

    try {
        let total = 0;
        for (const item of items) {
            const product = await db.get("SELECT current_price, stock_quantity FROM PRODUCTS WHERE product_id = ?", [item.product_id]);
            if (!product) throw new Error(`Unknown product ID ${item.product_id}`);
            if (product.stock_quantity < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id}`);
            total += product.current_price * item.quantity;
        }

        // Test-mode Stripe here uses USD (not BDT — see note in chat). Amount is
        // in the smallest currency unit, so cents.
        const amountInCents = Math.round(total * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: { firebase_uid: req.firebaseUser.uid },
            automatic_payment_methods: { enabled: true }
        });

        res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, amount: total });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST: Order Processing — only commits after Stripe confirms the PaymentIntent succeeded
app.post('/api/orders', verifyFirebaseToken, async (req, res) => {
    const { items, paymentIntentId } = req.body;

    if (!items || items.length === 0 || !paymentIntentId) {
        return res.status(400).json({ error: 'Missing items or paymentIntentId.' });
    }

    try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
            return res.status(402).json({ error: `Payment not completed (status: ${intent.status}).` });
        }

        const customer = await db.get("SELECT * FROM CUSTOMERS WHERE firebase_uid = ?", [req.firebaseUser.uid]);
        if (!customer) return res.status(404).json({ error: 'Customer profile not found. Call /api/auth/firebase-login first.' });

        await db.run("BEGIN TRANSACTION");
        let calculatedTotal = 0;
        const validationManifest = [];

        for (const item of items) {
            const product = await db.get("SELECT current_price, stock_quantity FROM PRODUCTS WHERE product_id = ?", [item.product_id]);
            if (!product) throw new Error(`Product mapping failed for ID ${item.product_id}`);
            if (product.stock_quantity < item.quantity) throw new Error(`Insufficient stock inventory allocation.`);

            calculatedTotal += product.current_price * item.quantity;
            validationManifest.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price_per_unit: product.current_price
            });
        }

        const timestamp = new Date().toISOString();
        const orderInsertion = await db.run(
            `INSERT INTO ORDERS (customer_id, total_amount, payment_status, stripe_payment_intent_id, order_date) VALUES (?, ?, 'Paid', ?, ?)`,
            [customer.customer_id, calculatedTotal, paymentIntentId, timestamp]
        );
        const generatedOrderId = orderInsertion.lastID;

        for (const target of validationManifest) {
            await db.run(
                `INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)`,
                [generatedOrderId, target.product_id, target.quantity, target.price_per_unit]
            );
            await db.run(
                `UPDATE PRODUCTS SET stock_quantity = stock_quantity - ? WHERE product_id = ?`,
                [target.quantity, target.product_id]
            );
        }

        await db.run("COMMIT");
        res.status(201).json({ success: true, order_id: generatedOrderId, total_amount: calculatedTotal });
    } catch (error) {
        await db.run("ROLLBACK");
        res.status(400).json({ error: error.message });
    }
});

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server execution initialized on target port http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Database connection bootstrap failure:", err);
});
