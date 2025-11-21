// Simplified chat-only client
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Cloudflare Worker endpoint (replace if needed)
const API_URL = "https://lorealchatbot.mknoor.workers.dev/";

// Render a combined conversation block: user label + assistant reply
function appendConversation(userText) {
  const conv = document.createElement("div");
  conv.className = "conv";

  const userLine = document.createElement("div");
  userLine.className = "conv-user";
  const strong = document.createElement("strong");
  strong.textContent = "You: ";
  userLine.appendChild(strong);
  userLine.appendChild(document.createTextNode(userText));

  const assistantLine = document.createElement("div");
  assistantLine.className = "conv-assistant";
  assistantLine.style.whiteSpace = "pre-wrap";
  assistantLine.textContent = "";

  conv.appendChild(userLine);
  conv.appendChild(assistantLine);
  chatWindow.appendChild(conv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return assistantLine;
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // append conversation block (user + assistant placeholder)
  userInput.value = "";
  const assistantNode = appendConversation(text);
  assistantNode.textContent = "Thinking...";

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are a L'Oréal assistant who talks like you are Stephen A. Smith on First Take helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations. Only answer questions related to L’Oréal products, routines, and recommendations. Politely refuse to answer questions unrelated to L’Oréal products, routines, recommendations, or beauty-related topics. Respond in an upbeat, friendly tone as if : energetic, complimentary, and direct, but not offensive. Keep answers concise.",
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!resp.ok) {
      const errTxt = await resp.text();
      assistantNode.textContent = `Error: ${resp.status} ${errTxt}`;
      return;
    }
    const data = await resp.json();
    const assistantText =
      data?.choices?.[0]?.message?.content ?? "No response from API.";
    assistantNode.textContent = assistantText;
  } catch (err) {
    console.error(err);
    assistantNode.textContent =
      "Sorry — there was an error communicating with the assistant.";
  }
});

// Add initial example conversation to match the screenshot
document.addEventListener("DOMContentLoaded", () => {
  const exampleUser =
    "What's the difference between a serum and a treatment product?";
  const assistantNode = appendConversation(exampleUser);
  const exampleAssistant = `Great question! 😊 A serum is a lightweight, fast-absorbing liquid applied after cleansing and before moisturizing. It's packed with active ingredients targeting specific skin concerns like hydration, fine lines, or brightening.

A treatment product, on the other hand, can come in various forms like creams, masks, or spot treatments. It's designed to address particular issues, often with a more intense or targeted approach, such as acne or hyperpigmentation.

Think of serums as daily boosters 💧 and treatment products as intensive care when your skin needs extra attention. Let me know if you need recommendations for either! ✨`;
  assistantNode.textContent = exampleAssistant;
});
