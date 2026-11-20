// script.js - TaskFlow task manager logic
// Beginner-friendly: plain functions, simple loops, LocalStorage.

// ===================================================
// TASK DATA
// Each task is an object:
//   id        -> unique number (Date.now())
//   text      -> the task title (string)
//   completed -> true if done, false if not done
//   priority  -> "High", "Medium", or "Low"
//   category  -> "College", "Personal", "Work", or "Other"
//   dueDate   -> "YYYY-MM-DD" string, or "" if no due date
// ===================================================
var tasks = [];

// Current status filter: "all", "pending", or "completed"
var currentFilter = "all";

// Which task is currently being edited (null = none)
var editingId = null;

// ---- Get the HTML elements we need ----
var taskInput = document.getElementById("taskInput");
var priorityInput = document.getElementById("priorityInput");
var categoryInput = document.getElementById("categoryInput");
var dueDateInput = document.getElementById("dueDateInput");
var addBtn = document.getElementById("addBtn");
var taskList = document.getElementById("taskList");
var emptyMsg = document.getElementById("emptyMsg");

// Dashboard elements
var totalCount = document.getElementById("totalCount");
var pendingCount = document.getElementById("pendingCount");
var completedCount = document.getElementById("completedCount");
var overdueCount = document.getElementById("overdueCount");
var progressFill = document.getElementById("progressFill");
var progressPercent = document.getElementById("progressPercent");

// Filter elements
var searchInput = document.getElementById("searchInput");
var categoryFilter = document.getElementById("categoryFilter");
var priorityFilter = document.getElementById("priorityFilter");
var allBtn = document.getElementById("allBtn");
var pendingBtn = document.getElementById("pendingBtn");
var completedBtn = document.getElementById("completedBtn");

// Theme (dark mode) elements
var themeToggle = document.getElementById("themeToggle");
var themeIcon = document.getElementById("themeIcon");
var themeLabel = document.getElementById("themeLabel");

// Header date element
var todayDateEl = document.getElementById("todayDate");

// ---- Helper: pad a single digit to two digits (5 -> "05") ----
function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}

// ---- Helper: today's date as "YYYY-MM-DD" ----
function getTodayStr() {
  var today = new Date();
  return today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
}

// ---- Helper: turn "YYYY-MM-DD" into "DD Mon YYYY" ----
function formatDate(dateStr) {
  if (dateStr === "") return "";
  var parts = dateStr.split("-"); // [YYYY, MM, DD]
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return parts[2] + " " + months[Number(parts[1]) - 1] + " " + parts[0];
}

// ---- Is a task overdue? (not completed, has a due date, due date is before today) ----
function isOverdue(task) {
  if (task.completed || task.dueDate === "") return false;
  return task.dueDate < getTodayStr(); // string compare works because dates are YYYY-MM-DD
}

// ===================================================
// LOCAL STORAGE: load and save
// ===================================================
function loadTasks() {
  var saved = localStorage.getItem("tasks");
  if (saved !== null) {
    tasks = JSON.parse(saved);
    // Fill in missing fields for older tasks saved before the upgrade
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].priority === undefined) tasks[i].priority = "Medium";
      if (tasks[i].category === undefined) tasks[i].category = "Other";
      if (tasks[i].dueDate === undefined) tasks[i].dueDate = "";
    }
  }
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// ===================================================
// TASK ACTIONS
// ===================================================

// Add a new task from the form
function addTask() {
  var text = taskInput.value.trim(); // remove extra spaces
  if (text === "") {
    alert("Please enter a task.");
    return;
  }

  var newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    priority: priorityInput.value,
    category: categoryInput.value,
    dueDate: dueDateInput.value
  };

  tasks.push(newTask);

  // Reset the form fields
  taskInput.value = "";
  dueDateInput.value = "";
  priorityInput.value = "Medium";
  categoryInput.value = "College";

  saveTasks();
  renderTasks();
}

// Delete a task by id
function deleteTask(id) {
  tasks = tasks.filter(function (task) {
    return task.id !== id; // keep all tasks except the one we delete
  });
  saveTasks();
  renderTasks();
}

// Toggle a task between completed and not completed
function toggleComplete(id) {
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) {
      tasks[i].completed = !tasks[i].completed; // flip true/false
      break;
    }
  }
  saveTasks();
  renderTasks();
}

// Start editing a task (shows the edit form)
function startEdit(id) {
  editingId = id;
  renderTasks();
}

// Cancel editing (go back to normal cards)
function cancelEdit() {
  editingId = null;
  renderTasks();
}

// Save the edited task from the edit form
function saveEdit(id, newText, newPriority, newCategory, newDueDate) {
  var trimmed = newText.trim();
  if (trimmed === "") {
    alert("Task title cannot be empty.");
    return;
  }
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) {
      tasks[i].text = trimmed;
      tasks[i].priority = newPriority;
      tasks[i].category = newCategory;
      tasks[i].dueDate = newDueDate;
      break;
    }
  }
  editingId = null;
  saveTasks();
  renderTasks();
}

// ===================================================
// FILTERS
// ===================================================

// Set the status filter (All / Pending / Completed) and re-draw
function setFilter(filter) {
  currentFilter = filter;

  // Highlight the active status button
  allBtn.classList.remove("active");
  pendingBtn.classList.remove("active");
  completedBtn.classList.remove("active");
  if (filter === "all") allBtn.classList.add("active");
  else if (filter === "pending") pendingBtn.classList.add("active");
  else if (filter === "completed") completedBtn.classList.add("active");

  renderTasks();
}

// ===================================================
// MAIN RENDER FUNCTION
// Re-draws the task list using ALL filters: status, category, priority, search.
// ===================================================
function renderTasks() {
  taskList.innerHTML = ""; // clear the list

  var search = searchInput.value.toLowerCase();
  var catF = categoryFilter.value;
  var priF = priorityFilter.value;

  // Keep only the tasks that match every active filter
  var tasksToShow = tasks.filter(function (task) {
    // Status filter
    if (currentFilter === "pending" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;
    // Category filter
    if (catF !== "all" && task.category !== catF) return false;
    // Priority filter
    if (priF !== "all" && task.priority !== priF) return false;
    // Search filter (match task title)
    if (search !== "" && task.text.toLowerCase().indexOf(search) === -1) return false;
    return true;
  });

  // Show or hide the "no tasks" message
  if (tasksToShow.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  // Build a card for each task to show
  for (var i = 0; i < tasksToShow.length; i++) {
    var task = tasksToShow[i];

    // If this task is being edited, show the edit form instead of a normal card
    if (task.id === editingId) {
      taskList.appendChild(buildEditForm(task));
      continue;
    }

    var card = document.createElement("li");
    card.className = "task-card priority-" + task.priority; // colored left border
    if (task.completed) card.classList.add("completed");

    // Checkbox to mark complete
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.dataset.id = task.id;
    checkbox.addEventListener("change", function (e) {
      toggleComplete(Number(e.target.dataset.id));
    });
    card.appendChild(checkbox);

    // Info: title + meta badges
    var info = document.createElement("div");
    info.className = "task-info";

    var title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.text;
    info.appendChild(title);

    // Meta row: category badge, priority badge, due date
    var meta = document.createElement("div");
    meta.className = "task-meta";

    var catBadge = document.createElement("span");
    catBadge.className = "badge cat-" + task.category;
    catBadge.textContent = task.category;
    meta.appendChild(catBadge);

    var priBadge = document.createElement("span");
    priBadge.className = "badge priority-" + task.priority;
    priBadge.textContent = task.priority;
    meta.appendChild(priBadge);

    if (task.dueDate !== "") {
      var due = document.createElement("span");
      due.className = "due-date";
      if (isOverdue(task)) due.classList.add("overdue"); // red if overdue
      due.textContent = "📅 " + formatDate(task.dueDate);
      meta.appendChild(due);
    }

    info.appendChild(meta);
    card.appendChild(info);

    // Actions: Edit + Delete
    var actions = document.createElement("div");
    actions.className = "task-actions";

    var editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.dataset.id = task.id;
    editBtn.addEventListener("click", function (e) {
      startEdit(Number(e.target.dataset.id));
    });
    actions.appendChild(editBtn);

    var deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.id = task.id;
    deleteBtn.addEventListener("click", function (e) {
      deleteTask(Number(e.target.dataset.id));
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    taskList.appendChild(card);
  }

  updateDashboard(); // update stats + progress bar after drawing
}

// ===================================================
// INLINE EDIT FORM
// Builds a form that replaces the card while editing a task.
// ===================================================
function buildEditForm(task) {
  var li = document.createElement("li");
  li.className = "task-card editing";

  var form = document.createElement("div");
  form.className = "edit-form";

  // Title input (filled with current text)
  var titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = task.text;

  // Row: priority select + category select + date input
  var row = document.createElement("div");
  row.className = "edit-form-row";

  var priSelect = document.createElement("select");
  priSelect.innerHTML = "<option>High</option><option>Medium</option><option>Low</option>";
  priSelect.value = task.priority; // pre-select the current priority
  row.appendChild(priSelect);

  var catSelect = document.createElement("select");
  catSelect.innerHTML = "<option>College</option><option>Personal</option><option>Work</option><option>Other</option>";
  catSelect.value = task.category;
  row.appendChild(catSelect);

  var dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = task.dueDate;
  row.appendChild(dateInput);

  // Save + Cancel buttons
  var actions = document.createElement("div");
  actions.className = "edit-form-actions";

  var saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn";
  saveBtn.addEventListener("click", function () {
    saveEdit(task.id, titleInput.value, priSelect.value, catSelect.value, dateInput.value);
  });
  actions.appendChild(saveBtn);

  var cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "cancel-btn";
  cancelBtn.addEventListener("click", cancelEdit);
  actions.appendChild(cancelBtn);

  // Put everything together
  form.appendChild(titleInput);
  form.appendChild(row);
  form.appendChild(actions);
  li.appendChild(form);
  return li;
}

// ===================================================
// DASHBOARD: stats + progress bar
// ===================================================
function updateDashboard() {
  var total = tasks.length;
  var completed = 0;
  var overdue = 0;

  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].completed) {
      completed++;
    } else if (isOverdue(tasks[i])) {
      overdue++;
    }
  }

  var pending = total - completed;

  totalCount.textContent = total;
  completedCount.textContent = completed;
  pendingCount.textContent = pending;
  overdueCount.textContent = overdue;

  // Progress bar percentage (completed out of total)
  var percent = 0;
  if (total > 0) {
    percent = Math.round((completed / total) * 100);
  }
  progressFill.style.width = percent + "%";
  progressPercent.textContent = percent + "%";
}

// ===================================================
// DARK MODE
// Saves the choice in LocalStorage so it stays after refresh.
// ===================================================
function loadTheme() {
  var theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light Mode";
  }
}

function toggleTheme() {
  var isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    // Switch to light
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark Mode";
  } else {
    // Switch to dark
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light Mode";
  }
}

// ===================================================
// EVENT LISTENERS
// ===================================================
addBtn.addEventListener("click", addTask);

// Pressing Enter in the title box also adds a task
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") addTask();
});

// Status filter buttons
allBtn.addEventListener("click", function () { setFilter("all"); });
pendingBtn.addEventListener("click", function () { setFilter("pending"); });
completedBtn.addEventListener("click", function () { setFilter("completed"); });

// Search + category/priority filters just re-draw the list
searchInput.addEventListener("input", renderTasks);
categoryFilter.addEventListener("change", renderTasks);
priorityFilter.addEventListener("change", renderTasks);

// Dark mode toggle
themeToggle.addEventListener("click", toggleTheme);

// ===================================================
// START THE APP
// ===================================================
loadTheme();      // apply saved theme
loadTasks();      // load saved tasks (fills missing fields for old tasks)
setFilter("all"); // draws the list and updates the dashboard

// Show today's date in the header
todayDateEl.textContent = "Today is " + formatDate(getTodayStr());
