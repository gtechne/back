require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// CORS setup
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://zoestore.vercel.app",
  "http://localhost:4243",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the Zoestore website.");
});

// Payment routes
app.use("/api", paymentRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "build", "index.html"));
  });
}

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
