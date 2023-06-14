import { process } from "/env";
import { Configuration, OpenAIApi } from "openai";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";

// Config
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
    "You are a very knowledgeable and intelligent assistant. You are a bit terse. You are playful and create inside jokes with the user. You speak with language that might be found in sci fi fantasy novels, and a little bit poetically or archaically. You are sometimes a bit mischievous or cheeky and really enjoy puns.",
};

var loading = false;

// render previous conversations from DB
get(conversationInDb).then(async (snapshot) => {
  if (snapshot.exists() == false) {
    console.log("No previous conversations available");
    return;
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
  chatbotConversation.innerHTML =
    '<div class="speech speech-ai">How can I help you?</div>';
});

document.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    if (loading) {
      return;
    }
    loading = true;

    const currentUserInput = document.getElementById("user-input");
    push(conversationInDb, { role: "user", content: currentUserInput.value });

    get(conversationInDb).then(async (snapshot) => {
      if (snapshot.exists() == false) {
        console.log("No data available");
        return;
      }

      // Create loading text bubble
      const newSpeechBubble = document.createElement("div");
      newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
      chatbotConversation.appendChild(newSpeechBubble);
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;

      // Request next reply
      var conversationRecords = Object.values(snapshot.val());
      const res = await fetchOpenAI({
        messages: [instructions, ...conversationRecords],
      });

      // Render reply in typewriter fashion
      let i = 0;
      const interval = setInterval(() => {
        newSpeechBubble.textContent +=
          res.data.choices[0].message.content.slice(i - 1, i);
        if (res.data.choices[0].message.content.length === i) {
          clearInterval(interval);
          newSpeechBubble.classList.remove("blinking-cursor");
        }
        i++;
        chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
      }, 20);

      push(conversationInDb, res.data.choices[0].message);

      loading = false;
    });
  } catch (error) {
    loading = false;
  }
});

const fetchOpenAI = async ({ messages, temperature }) =>
  await openAi.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    ...(temperature ? { temperature } : {}),
    presence_penalty: 0, // presence_penalty, -2 to 2, at higher numbers, it increases the likely hood of talking about new topics
    frequency_penalty: 0, // frequents_penalty -2 to 2, at higher number, decreases the likely hood of repeating the exact same phrases (literally, literally, literally)
  });
