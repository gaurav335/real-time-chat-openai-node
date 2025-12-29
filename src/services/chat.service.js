import OpenAI from "openai";
import { openaiConfig } from "../config/openai.config.js";

const openai = new OpenAI(openaiConfig);

export const getAnswerFromText = async (question) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: question },
    ],
  });

  return response.choices[0].message.content.trim();
};

export const getAnswerFromTextFromStrem = async (
  question,
  socket,
  randomUid,
  isAudio = false
) => {
  const completionStream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      { role: "system", content: "You are a helpful assistant. answer in English only." },
      { role: "user", content: question },
    ],
  });
  let partialText = "";
  for await (const chunk of completionStream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      partialText += delta;
      if (partialText.length >= 10) {
        if (isAudio){
          await sendAudio(partialText, socket, randomUid);
        }else{
          socket.emit("partial-answer", {
            id: randomUid,
            role: "model",
            text: partialText,
            partial: true,
          });
        }
        partialText = "";
      }
    }
  }
  if(isAudio){
    if (partialText.length > 0) {
      await sendAudio(partialText, socket, randomUid);
    }
    socket.emit("ai-audio-complete");
  }else{
    socket.emit("partial-complete");
  }
};

export const getAnswerFromTextToAudio = async (question, socket, randomUid) => {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [{ role: "user", content: question }],
  });

  let textBuffer = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;

    textBuffer += delta;

    // Convert to audio every ~40 chars (tunable)
    if (textBuffer.length >= 40) {
      await sendAudio(textBuffer, socket, randomUid);
      textBuffer = "";
    }
  }
  if (textBuffer.length > 0) {
    await sendAudio(textBuffer, socket, randomUid);
  }
  socket.emit("ai-audio-complete");
};

async function sendAudio(text, socket, id) {
  const audio = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const audioBuffer = Buffer.from(await audio.arrayBuffer());

  socket.emit("ai-audio-chunk", {
    id,
    text,
    role: "model",
    base64Audio: audioBuffer.toString("base64"),
    partial: true,
  });
}
