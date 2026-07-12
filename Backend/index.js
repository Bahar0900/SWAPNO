import express from 'express';
import cors from 'cors';
import { initDatabase, db } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// POST: Customer Authentication / Login via unique email
app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email address is required." });

    try {
        const customer = await db.get("SELECT * FROM CUSTOMERS WHERE email = ?", [email.trim().toLowerCase()]);
        if (!customer) return res.status(404).json({ error: "No customer found matching this email." });

        res.json({ message: "Login successful!", user: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Product Catalog Retrieval
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all("SELECT * FROM PRODUCTS");
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Order Processing and Historical Price Locking
app.post('/api/orders', async (req, res) => {
    const { customer_id, items } = req.body;
    if (!customer_id || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing customer context or items payload." });
    }

    try {
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
            `INSERT INTO ORDERS (customer_id, total_amount, payment_status, order_date) VALUES (?, ?, 'Paid', ?)`,
            [customer_id, calculatedTotal, timestamp]
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

// Initialize database instance before launching server listeners
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server execution initialized on target port http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Database connection bootstrap failure:", err);
});