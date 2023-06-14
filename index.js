import { process } from "/env";
import { Configuration, OpenAIApi } from "openai";

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openAi = new OpenAIApi(config);

const chatbotConversation = document.getElementById('chatbot-conversation')

const conversation = [
  {
    role: "system",
    content:
      "You are a highly knowledgeable assistant that is always happy to help.",
  },
];

document.addEventListener("sumbit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");

  conversation.push({ role: "user", content: userInput });
});

async function fetchOpenAI({ prompt, maxTokens, temperature }) {
  const res = await openAi.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    ...(temperature ? { temperature } : {}),
  });

  return res.data.choices[0].text.trim();
}

function renderTypewriterText(text) {
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
  }, 50);
}
