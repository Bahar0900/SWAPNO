# Shwapno Clone: Grocery E-Commerce Web Application

A modern web-based clone of Bangladesh's leading grocery retail platform, Shwapno. The application is built using **React.js** for the frontend, **Express.js** for the backend, and **SQLite** as the relational database. It provides a responsive online grocery shopping experience while serving as a foundation for future AI-powered features.

---

## Database Architecture & ER Diagram

The system uses a lightweight relational database consisting of four core tables to manage customers, products, orders, and order items while preserving transaction history.

### ER Diagram

![Shwapno Clone ER Diagram](./assests/ecommerce_erd_horizontal.png)

### Schema Overview

- **CUSTOMERS:** Stores customer information and authentication details.
- **PRODUCTS:** Maintains product catalog, pricing, and inventory.
- **ORDERS:** Records customer orders, payment status, and order history.
- **ORDER_ITEMS:** Stores purchased products, quantities, and historical purchase prices for each order.

---

# Backend API (Express.js)

The backend is developed using **Express.js** and exposes RESTful APIs for handling business logic and database operations.

### Features

- Customer Registration
- Customer Login
- Product Catalog Retrieval
- Order Management
- SQLite Database Integration
- REST API Architecture
- CORS Support for Frontend Communication

### Technology Stack

- Express.js
- SQLite
- Node.js

---

# Frontend (React.js)

The frontend is developed using **React.js** and provides a responsive and user-friendly shopping interface.

### Features

- Responsive Grocery Store Interface
- Product Browsing
- Product Search
- Shopping Cart
- Customer Authentication
- Order Placement
- Category Navigation

### Technology Stack

- React.js
- HTML5
- CSS3
- JavaScript

---

# Future AI Features (Planned)

The following AI-powered functionalities are planned for future versions of the application but are **not yet implemented**.

## 1. Semantic Product Search

Instead of relying solely on keyword matching, semantic search will allow customers to search using natural language queries such as:

> "Healthy breakfast items"

The planned implementation will utilize multilingual sentence embeddings (e.g., **all-MiniLM-L6-v2**) together with cosine similarity to retrieve products based on meaning rather than exact keywords.

---

## 2. Reverse Image Product Search

A future enhancement will allow users to upload an image of a grocery product.

The backend will extract visual features using a pretrained computer vision model (such as **ResNet** or **Vision Transformer (ViT)**) and compare them against product image embeddings to identify matching products.

---

## 3. Market Basket Analysis Dashboard

A merchant analytics dashboard is planned to analyze customer purchasing patterns using association rule mining algorithms such as:

- Apriori
- FP-Growth

The dashboard will help identify products that are frequently purchased together by computing metrics such as:

- Support
- Confidence
- Lift

These insights can assist merchants in improving product placement and promotional strategies.

---

# Project Structure

```
SWAPNO/
│
├── Frontend/        # React.js Application
├── Backend/         # Express.js REST API
├── assests/         # Images and ER Diagram
└── README.md
```

---

# Technology Stack

### Frontend

- React.js
- HTML
- CSS
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- SQLite

---

# Future Improvements

- Semantic Search using Sentence Embeddings
- Reverse Image Product Search
- Market Basket Analysis Dashboard
- Recommendation System
- Cloud Database Migration (PostgreSQL)
- JWT Authentication
- Payment Gateway Integration
- Admin Dashboard

---

# License

This project is licensed under the GPL-3.0 License.
