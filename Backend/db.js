import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

let db;

export async function initDatabase() {
    db = await open({
        filename: dbPath,
        driver: sqlite3.verbose().Database
    });

    await db.get("PRAGMA foreign_keys = ON");

    await db.exec(`
        CREATE TABLE IF NOT EXISTS CUSTOMERS (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            firebase_uid TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS PRODUCTS (
            product_id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            current_price REAL NOT NULL,
            stock_quantity INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ORDERS (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            total_amount REAL NOT NULL,
            payment_status TEXT DEFAULT 'Pending',
            stripe_payment_intent_id TEXT,
            order_date TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES CUSTOMERS(customer_id)
        );

        CREATE TABLE IF NOT EXISTS ORDER_ITEMS (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            quantity INTEGER NOT NULL,
            price_per_unit REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        );
    `);

    // Migration safety net — adds the new columns if you already have an existing
    // database.sqlite from before Firebase/Stripe were added.
    const customerCols = await db.all("PRAGMA table_info(CUSTOMERS)");
    if (!customerCols.some(c => c.name === 'firebase_uid')) {
        await db.run("ALTER TABLE CUSTOMERS ADD COLUMN firebase_uid TEXT UNIQUE");
    }

    const orderCols = await db.all("PRAGMA table_info(ORDERS)");
    if (!orderCols.some(c => c.name === 'stripe_payment_intent_id')) {
        await db.run("ALTER TABLE ORDERS ADD COLUMN stripe_payment_intent_id TEXT");
    }

    // Seed product catalog only — customers now come from Firebase login, not seed data
    const checkProducts = await db.get("SELECT COUNT(*) as count FROM PRODUCTS");
    if (checkProducts.count === 0) {
        await db.run(`INSERT INTO PRODUCTS (product_name, current_price, stock_quantity) VALUES 
            ('Aroong Liquid Milk 1L', 90.00, 100),
            ('Pran Premium Ghee 900g', 1100.00, 50),
            ('Chashi Chinigura Rice 1kg', 160.00, 200),
            ('ACI Pure Salt 1kg', 42.00, 500)
        `);
        console.log("Database initialized and mock product catalog seeded.");
    }

    return db;
}

export { db };
