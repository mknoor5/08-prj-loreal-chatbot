/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const userNameInput = document.getElementById("userNameInput");
const latestQuestionEl = document.getElementById("latestQuestion");

// Default WORKER_URL may be provided in `secrets.js` (leave blank there for security)
const DEFAULT_WORKER_URL = typeof WORKER_URL !== "undefined" ? WORKER_URL : "";

// Input element where the user can paste their Worker URL (optional)
const workerUrlInput = document.getElementById("workerUrlInput");
if (workerUrlInput && DEFAULT_WORKER_URL) {
  workerUrlInput.value = DEFAULT_WORKER_URL;
}

// Read optional PROMPT_ID from secrets.js (non-secret value used to reference server-side prompts)
const DEFAULT_PROMPT_ID = typeof PROMPT_ID !== "undefined" ? PROMPT_ID : "";

// Conversation state (array of messages compatible with OpenAI Chat API)
let conversation = [];

// Load history if available
function loadHistory() {
  try {
    const saved = localStorage.getItem("chat_history");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) conversation = parsed;
    }
  } catch (e) {
    console.warn("Failed to load history", e);
  }
}

function saveHistory() {
  try {
    localStorage.setItem("chat_history", JSON.stringify(conversation));
  } catch (e) {
    console.warn("Failed to save history", e);
  }
}

function renderChat() {
  chatWindow.innerHTML = "";
  // Render messages as bubbles
  for (const msg of conversation) {
    const row = document.createElement("div");
    row.className = `msg-row ${msg.role}`;
    const bubble = document.createElement("div");
    bubble.className = `bubble ${msg.role}`;
    bubble.textContent = msg.content;
    row.appendChild(bubble);
    chatWindow.appendChild(row);
  }
  // scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initial load and render
loadHistory();
renderChat();

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  // Update latest question UI and conversation context
  latestQuestionEl.textContent = text;

  // If user provided a name, include a system message at the start describing the user
  const userName =
    userNameInput && userNameInput.value ? userNameInput.value.trim() : "";
  if (userName) {
    // ensure a system message about the user exists at first position
    if (
      !conversation.length ||
      conversation[0].role !== "system" ||
      !conversation[0].content.startsWith("User:")
    ) {
      conversation.unshift({ role: "system", content: `User: ${userName}` });
    } else {
      conversation[0].content = `User: ${userName}`;
    }
  }

  // Append user's latest message to conversation
  const userMessage = { role: "user", content: text };
  conversation.push(userMessage);
  saveHistory();
  renderChat();

  // Show loading state near the chat
  latestQuestionEl.textContent = text;

  const body = { messages: conversation.slice() };

  // Include prompt id if available (UI value not provided; secrets.js default used)
  if (DEFAULT_PROMPT_ID) {
    body.prompt_id = DEFAULT_PROMPT_ID;
  }

  // Determine final worker URL: prefer UI input, then secrets.js default
  const targetUrl =
    workerUrlInput && workerUrlInput.value && workerUrlInput.value.trim()
      ? workerUrlInput.value.trim()
      : DEFAULT_WORKER_URL;

  if (!targetUrl) {
    chatWindow.textContent =
      "Please enter your Cloudflare Worker URL above (or set WORKER_URL in secrets.js).";
    return;
  }

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      chatWindow.textContent = `Error ${res.status}: ${errText}`;
      return;
    }

    const data = await res.json();
    // OpenAI responses use data.choices[0].message.content
    const reply = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
    // Append assistant response to conversation and render
    conversation.push({ role: "assistant", content: reply });
    saveHistory();
    renderChat();
    // After response, clear latest question (per requirements it resets with each new question)
    latestQuestionEl.textContent = "";
  } catch (err) {
    // show error in UI as assistant message
    const errMsg = `Network error: ${err.message}`;
    conversation.push({ role: "assistant", content: errMsg });
    saveHistory();
    renderChat();
  } finally {
    userInput.value = "";
  }
});
