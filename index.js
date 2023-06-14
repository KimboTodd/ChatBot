import { process } from "/env";
import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openAi = new OpenAIApi(config);

const appSettings = {
  databaseURL: "https://chatbot-openai-da169-default-rtdb.firebaseio.com/",
};
const app = initializeApp(appSettings);

const database = getDatabase(app);

const conversationInDb = ref(database);

const chatbotConversation = document.getElementById("chatbot-conversation");

const instructions = {
  role: "system",
  content:
    "You are a very knowledgeable and intelligent assistant. You speak with language that might be found in old books, or sci fi fantasy novels, and a little bit poetically. You are sometimes a bit mischievous or cheeky.",
};

// render conversation from DB
get(conversationInDb).then(async (snapshot) => {
  if (snapshot == false) {
    console.log("No data available");
  }
  var conversationRecords = Object.values(snapshot.val());
  conversationRecords.forEach((record) => {
    const newSpeechBubble = document.createElement("div");
    newSpeechBubble.classList.add(
      "speech",
      `speech-${record.role === "user" ? "human" : "ai"}`
    );
    chatbotConversation.appendChild(newSpeechBubble);
    newSpeechBubble.textContent = record.content;
  });
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

document.getElementById("clear-btn").addEventListener("click", () => {
  remove(conversationInDb);
  chatbotConversation.innerHTML = '<div class="speech speech-ai">How can I help you?</div>'
});

document.addEventListener("submit", async (e) => {
  console.log("Button pushed");
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, { role: "user", content: userInput.value });

  get(conversationInDb).then(async (snapshot) => {
    if (snapshot == false) {
      console.log("No data available");
    }

    var conversationRecords = Object.values(snapshot.val());
    const res = await fetchOpenAI({
      messages: [instructions, ...conversationRecords],
    });
    renderTypewriterText(res.data.choices[0].message.content);

    push(conversationInDb, res.data.choices[0].message);
  });
});

const fetchOpenAI = async ({ messages, temperature }) =>
  await openAi.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    ...(temperature ? { temperature } : {}),
    presence_penalty: 0, // presence_penalty, -2 to 2, at higher numbers, it increases the likely hood of talking about new topics
    frequency_penalty: 0, // frequents_penalty -2 to 2, at higher number, decreases the likely hood of repeating the exact same phrases (literally, literally, literally)
  });

const renderTypewriterText = (text) => {
  if (text == false) {
    return;
  }

  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);

  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursor");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 20);
};
