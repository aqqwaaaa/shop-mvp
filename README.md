# 🛒 Shop MVP — Smart Shopping System


**Date:** *October 2025*  

---

##  Project Overview

This system improves customer experience and efficiency in walk-in stores by providing a **digital shopping assistant** that shows available stock, allows customers to manage a **shopping cart**, and gives **product recommendations**.

---

##  Features

 **View available products** and stock levels  
 **Add/remove items** in a digital shopping cart  
 **Auto-calculates total cost**  
 **Category-based recommendations** (e.g., Sport Parts, Dirt Parts, etc.)  
 **Cart-based recommendations** (suggests items that are commonly bought together)

---

##  System Architecture

**Backend:** Node.js (Express + SQLite3)  
**Frontend:** HTML, CSS, JavaScript (using `fetch()` API)  
**Database:** SQLite — stores



##  Project Structure

shop-mvp/
│
├── backend/
│ └── server.js # Express API
│
├── database/
│ ├── seed.sql # Schema and seed data
│ └── shop.db # SQLite database file
│
├── frontend/
│ ├── index.html # Main page
│ └── app.js # Handles UI + fetch calls
│
├── package.json
└── README.md



---

##  How to Run Locally

### 1 Clone the repository
```bash
git clone https://github.com/aqqwaaaa/shop-mvp.git
cd shop-mvp

npm install
node backend/server.js
http://localhost:3000
