const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(compression());

// Middleware pour parser JSON
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// Route principale
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route API exemple
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
    });
});

// Gestion des erreurs 404
app.use("*", (req, res) => {
    res.status(404).json({
        error: "Route non trouvée",
        path: req.originalUrl,
        method: req.method,
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error("Erreur serveur:", err);
    res.status(500).json({
        error: "Erreur interne du serveur",
        message:
            process.env.NODE_ENV === "development"
                ? err.message
                : "Une erreur est survenue",
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 Environnement: ${process.env.NODE_ENV || "development"}`);
    console.log(`📅 Démarré le: ${new Date().toISOString()}`);
});

// Gestion propre de l'arrêt
process.on("SIGTERM", () => {
    console.log("🛑 Arrêt du serveur...");
    process.exit(0);
});

module.exports = app;
