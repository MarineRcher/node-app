const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de la base de données PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
});

// Test de connexion à la base de données
pool.connect((err, client, release) => {
    if (err) {
        console.error("❌ Erreur de connexion à PostgreSQL:", err);
    } else {
        console.log("✅ Connexion PostgreSQL établie");
        release();
    }
});

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

// Route API health check
app.get("/api/health", async (req, res) => {
    try {
        // Test de la connexion DB
        const result = await pool.query("SELECT NOW()");
        res.json({
            status: "OK",
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            environment: process.env.NODE_ENV || "development",
            database: "Connected",
            db_time: result.rows[0].now,
        });
    } catch (error) {
        res.status(500).json({
            status: "ERROR",
            timestamp: new Date().toISOString(),
            database: "Disconnected",
            error: error.message,
        });
    }
});

// Routes API pour la todo list

// Récupérer toutes les tâches
app.get("/api/todos", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM todos ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Erreur lors de la récupération des todos:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Créer une nouvelle tâche
app.post("/api/todos", async (req, res) => {
    const { title, description = "" } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Le titre est requis" });
    }

    try {
        const result = await pool.query(
            "INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *",
            [title.trim(), description.trim()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erreur lors de la création du todo:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Modifier une tâche
app.put("/api/todos/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    try {
        const result = await pool.query(
            `UPDATE todos 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description), 
                 completed = COALESCE($3, completed),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 
             RETURNING *`,
            [title, description, completed, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Tâche non trouvée" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erreur lors de la modification du todo:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Supprimer une tâche
app.delete("/api/todos/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM todos WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Tâche non trouvée" });
        }

        res.json({ message: "Tâche supprimée avec succès" });
    } catch (error) {
        console.error("Erreur lors de la suppression du todo:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// Route pour initialiser la base de données
app.post("/api/init-db", async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS todos (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        res.json({ message: "Base de données initialisée avec succès" });
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la DB:", error);
        res.status(500).json({
            error: "Erreur lors de l'initialisation de la base de données",
        });
    }
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
    pool.end();
    process.exit(0);
});

module.exports = app;
