console.log("Script app.js chargé");

let todos = [];

// Charger toutes les tâches
async function loadTodos() {
    console.log("Chargement des tâches...");
    try {
        showLoading(true);
        const response = await fetch("/api/todos");

        if (response.ok) {
            todos = await response.json();
            console.log("Tâches chargées:", todos);
            renderTodos();
            updateStats();
            hideError();
        } else {
            const error = await response.json();
            console.error("Erreur:", error);
            showError("Erreur lors du chargement: " + error.error);
        }
    } catch (error) {
        console.error("Erreur:", error);
        showError("Erreur de connexion au serveur");
    } finally {
        showLoading(false);
    }
}

// Ajouter une nouvelle tâche
async function addTodo(event) {
    event.preventDefault();
    console.log("Ajout d'une tâche...");

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title) return;

    try {
        const response = await fetch("/api/todos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ title, description }),
        });

        if (response.ok) {
            const newTodo = await response.json();
            console.log("Tâche ajoutée:", newTodo);
            todos.unshift(newTodo);
            renderTodos();
            updateStats();

            // Réinitialiser le formulaire
            document.getElementById("title").value = "";
            document.getElementById("description").value = "";
            hideError();
        } else {
            const error = await response.json();
            console.error("Erreur:", error);
            showError("Erreur lors de l'ajout: " + error.error);
        }
    } catch (error) {
        console.error("Erreur:", error);
        showError("Erreur de connexion au serveur");
    }
}

// Basculer l'état d'une tâche
async function toggleTodo(id) {
    console.log("Basculer la tâche:", id);
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ completed: !todo.completed }),
        });

        if (response.ok) {
            const updatedTodo = await response.json();
            console.log("Tâche mise à jour:", updatedTodo);
            const index = todos.findIndex((t) => t.id === id);
            todos[index] = updatedTodo;
            renderTodos();
            updateStats();
            hideError();
        } else {
            const error = await response.json();
            console.error("Erreur:", error);
            showError("Erreur lors de la modification: " + error.error);
        }
    } catch (error) {
        console.error("Erreur:", error);
        showError("Erreur de connexion au serveur");
    }
}

// Supprimer une tâche
async function deleteTodo(id) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) return;

    console.log("Suppression de la tâche:", id);
    try {
        const response = await fetch(`/api/todos/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            console.log("Tâche supprimée");
            todos = todos.filter((t) => t.id !== id);
            renderTodos();
            updateStats();
            hideError();
        } else {
            const error = await response.json();
            console.error("Erreur:", error);
            showError("Erreur lors de la suppression: " + error.error);
        }
    } catch (error) {
        console.error("Erreur:", error);
        showError("Erreur de connexion au serveur");
    }
}

// Afficher les tâches
function renderTodos() {
    console.log("Rendu des tâches...");
    const container = document.getElementById("todos-container");

    if (todos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Aucune tâche pour le moment</h3>
                <p>Commencez par ajouter votre première tâche !</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todos
        .map((todo) => {
            const todoElement = document.createElement("div");
            todoElement.className = `todo-item ${
                todo.completed ? "completed" : ""
            }`;
            todoElement.innerHTML = `
            <div class="todo-header">
                <div class="todo-title">${escapeHtml(todo.title)}</div>
                <div class="todo-actions">
                    <button class="btn btn-sm ${
                        todo.completed ? "btn-success" : ""
                    }" 
                            data-todo-id="${todo.id}" data-action="toggle">
                        ${todo.completed ? "✅" : "✓"}
                    </button>
                    <button class="btn btn-sm btn-danger" 
                            data-todo-id="${todo.id}" data-action="delete">
                        🗑️
                    </button>
                </div>
            </div>
            ${
                todo.description
                    ? `<div class="todo-description">${escapeHtml(
                          todo.description
                      )}</div>`
                    : ""
            }
            <div class="todo-meta">
                <span>Créé le: ${new Date(todo.created_at).toLocaleDateString(
                    "fr-FR"
                )}</span>
                ${
                    todo.updated_at !== todo.created_at
                        ? `<span>Modifié le: ${new Date(
                              todo.updated_at
                          ).toLocaleDateString("fr-FR")}</span>`
                        : ""
                }
            </div>
        `;
            return todoElement.outerHTML;
        })
        .join("");

    // Ajouter les event listeners après le rendu
    addTodoEventListeners();
}

// Ajouter les event listeners pour les boutons des todos
function addTodoEventListeners() {
    const todoButtons = document.querySelectorAll("[data-action]");
    todoButtons.forEach((button) => {
        button.addEventListener("click", function () {
            const todoId = parseInt(this.getAttribute("data-todo-id"));
            const action = this.getAttribute("data-action");

            if (action === "toggle") {
                toggleTodo(todoId);
            } else if (action === "delete") {
                deleteTodo(todoId);
            }
        });
    });
}

// Mettre à jour les statistiques
function updateStats() {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;

    document.getElementById("total-count").textContent = total;
    document.getElementById("completed-count").textContent = completed;
    document.getElementById("pending-count").textContent = pending;
}

// Fonctions utilitaires
function showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
}

function showError(message) {
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
}

function hideError() {
    document.getElementById("error-message").style.display = "none";
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation quand le DOM est chargé
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM chargé, initialisation...");

    // Event listeners
    const initBtn = document.getElementById("init-db-btn");
    const todoForm = document.getElementById("todo-form");

    if (initBtn) {
        initBtn.addEventListener("click", initDatabase);
        console.log("Event listener ajouté pour le bouton d'initialisation");
    }

    if (todoForm) {
        todoForm.addEventListener("submit", addTodo);
        console.log("Event listener ajouté pour le formulaire");
    }

    // Charger les tâches au démarrage
    loadTodos();
});
