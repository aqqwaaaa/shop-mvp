🏪 Shop MVP

A Simple Walk-In Store Experience System
Date: October 2025

Overview

Shop MVP is a lightweight, full-stack simulation of a walk-in retail store experience, aimed at improving shopping efficiency and customer engagement.

The system provides:

- Live product and stock display
- A digital cart system with auto total updates
- Smart product recommendations based on transaction patterns
- QR checkout simulation (scan to pay)
- A modern UI with dark/light theme and animations

 Complete Toolchain & Dependencies

Here’s everything installed and used throughout the project, both global tools and project dependencies:

Core Tools Installed Locally

  Tool	                  Purpose	                        How to Install
  Git	                   Version control	                Download or via terminal: winget install Git.Git
  
  Node.js (includes npm)	Backend runtime environment	     Download LTS
  
  SQLite	                Lightweight database	            Download or via terminal: Extract sqlite-tools-win-x64-*.zip → add to PATH
  
  VS Code (optional)	    Code editor	                     Download
  
  PowerShell / CMD	      Terminal interface	              Included on Windows
  
  GitHub	                Cloud repo hosting	              Create repo on GitHub

 Project Dependencies (via npm)

These are the Node.js packages installed for the project:
  Package          	Description
  express	          Web framework for handling routes and API endpoints
  sqlite3	          Database driver for SQLite
  cors	          Middleware for cross-origin requests
  body-parser	          Middleware for parsing JSON request bodies
  
Install all at once:
npm i express sqlite3 cors body-parser

Project Structure
shop-mvp/
│
├── backend/
│   └── server.js            # Express backend API + routes
│
├── database/
│   ├── shop.db              # SQLite database
│   └── seed.sql             # Database schema + sample data
│
├── frontend/
│   ├── index.html           # Main page
│   ├── app.js               # App logic & UI interactions
│   └── style.css            # Styling & animations
│
├── .gitignore
└── README.md

⚙️ Setup & Installation (All Steps from Start)
    Step 1 — Create Project Folder
      mkdir shop-mvp
      cd shop-mvp
    Step 2 — Initialize Git Repository
      git init
      echo "# Shop MVP" > README.md
    Step 3 — Initialize Node Project
      npm init -y
    Step 4 — Install Dependencies  
      npm i express sqlite3 cors body-parser
    Step 5 — Create Folder Structure
      backend/
      database/
      frontend/
    Step 6 — Create and Seed Database
    Inside the /database folder:
      sqlite3 shop.db < seed.sql
    Check:
      sqlite3 shop.db
      .tables
    You should see:
      categories  order_items  orders  products
    Step 7 — Run Server
      From the project root:
      node backend/server.js
        Server starts on:
       http://localhost:3000

Features Summary:
Category                Feature	                    Description
Store                Product listing + search	    Displays all available items and categories
Cart                 Add, remove, and clear	      Auto-calculates totals and updates UI instantly
Recommendations      Based on sales data	        Uses co-occurrence & lift/confidence metrics
QR Checkout          Simulated payment	          Generates QR + fake checkout link
Theme	               Dark/Light mode toggle	      Saves user preference (localStorage)
Toasts	             Feedback messages	          e.g., “Cart cleared”, “Dark mode enabled”
Animations	         Smooth transitions	          Product shimmer, cart bounce, confetti, etc.
Purchase Flow	       “Purchase Complete” screen	  Auto-clears cart and plays confetti animation
Shimmer UI	         Loading placeholder	        Animated skeletons while fetching data

Recommendation Engine Logic

- Based on frequent co-occurrence of products in previous transactions.
- Uses support, confidence, and lift values to rank related products.
- SQL-powered — no external ML library required.
- Draws from your orders and order_items tables.

Testing the API

Example Endpoints
Method	Endpoint	                                          Description
GET	    /api/items	                                        Fetch all store items
GET	    /api/categories	                                    Fetch all unique categories
GET	    /api/recommendations/top?category=Sport%20Parts&n=5	Get top N products in a category
POST	  /api/recommendations/cart	                          Get recommended products from current cart
POST	  /api/checkout	                                      Create simulated checkout QR

Example test (PowerShell / CMD):

curl -X POST http://localhost:3000/api/recommendations/cart ^
-H "Content-Type: application/json" ^
-d "{ \"cart\": [1, 2] }"

Frontend Features

Main Components
  Product Grid — shows items, images, and prices
  Cart Panel — lists items, quantity, and total
  Checkout QR Modal — simulates payment screen
  Recommendation Panel — personalized product suggestions
  Search + Filter — dynamic client-side filtering

Visual Add-ons
- Dark/Light theme toggle
- Toast notifications
- Confetti on purchase completion
- Live cart count bubble beside 🏪 title
- Animated shimmer while loading

Tech Stack Summary
Type	            Technology
Language	        JavaScript (Node.js / ES6)
Frontend	        HTML, CSS, JS
Backend	          Node.js (Express)
Database	        SQLite
Version Control	  Git + GitHub
Image Provider	  Picsum Photos / Unsplash
Editor	          VS Code
Platform	        Localhost (optional: deployable to Heroku / Render)

📦 Third-Party Tools & Resources
Tool / Library	          Purpose	                        URL
Express.js	              Backend web framework	          https://expressjs.com/
SQLite	                  Lightweight relational database	https://sqlite.org/
CORS	                    Middleware for API access	      https://www.npmjs.com/package/cors
Body-Parser	              JSON body parsing middleware	  https://www.npmjs.com/package/body-parser
Git	                      Version control	                https://git-scm.com/
Node.js	                  JS runtime environment	        https://nodejs.org/
Picsum Photos / Unsplash	Product image placeholders	    https://picsum.photos/
VS Code	                  Development IDE	                https://code.visualstudio.com/

Example Workflow
  1.  Start server → node backend/server.js
  2.  Open browser → http://localhost:3000
  3.  Browse items and add to cart
  4.  Watch 🛒 counter and total update live
  5.  Click Checkout (QR) → shows simulated payment screen
  6.  Close modal →  Purchase Complete + confetti
  7.  Cart clears automatically and resets totals

Future Improvements
-  Store completed transactions in DB
-  Add product scanning (barcode/QR support)
-  Convert to mobile PWA
-  Add AI assistant for personalized recommendations

Author Notes
This project demonstrates:
-  Modeling and simulating store behavior
-  Using data-driven recommendations
-  Applying software engineering fundamentals
-  Building an interactive, user-friendly web interface
  “From simulation to satisfaction — bridging physical and digital retail.”

License

Developed for educational use under the Introduction to Modeling and Simulation course.
Feel free to modify and reuse for non-commercial, academic purposes.
