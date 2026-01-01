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
const MAX_CHARS = 45; // ~3 seconds speech
const HARD_LIMIT = 70; // safety cap
const SENTENCE_END = /[.!?\n]$/;
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
      {
        role: "system",
        content: "You are a helpful assistant. answer in English only.",
      },
      { role: "user", content: question },
    ],
  });
  // let partialText = "";
  // for await (const chunk of completionStream) {
  //   const delta = chunk.choices[0]?.delta?.content;
  //   if (delta) {
  //     partialText += delta;
  //     if (partialText.length >= 10) {
  //       if (isAudio) {
  //         await sendAudio(partialText, socket, randomUid);
  //       } else {
  //         socket.emit("partial-answer", {
  //           id: randomUid,
  //           role: "model",
  //           text: partialText,
  //           partial: true,
  //         });
  //       }
  //       partialText = "";
  //     }
  //   }
  // }
  // if (isAudio) {
  //   if (partialText.length > 0) {
  //     await sendAudio(partialText, socket, randomUid);
  //   }
  //   socket.emit("ai-audio-complete");
  // } else {
  //   socket.emit("partial-complete");
  // }
  let buffer = "";
  for await (const chunk of completionStream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;

    buffer += delta;
    const flushText = shouldFlush(buffer);
    if (flushText) {
      buffer = buffer.slice(flushText.length);
      flush(flushText, socket, randomUid, isAudio);
      buffer = "";
    }
  }
  if (buffer.trim()) {
    flush(buffer, socket, randomUid, isAudio);
  }
  socket.emit("ai-audio-complete", { id: randomUid });
  socket.session.responses.delete(randomUid);
};

function shouldFlush(text) {
  const sentenceMatch = text.match(/^(.+?[.!?\n])\s*/);
  if (sentenceMatch && sentenceMatch[1].length >= MAX_CHARS) {
    return sentenceMatch[1];
  }
  if (text.length >= MAX_CHARS) {
    const safeLength = Math.min(text.length, HARD_LIMIT);
    const slice = text.slice(0, safeLength);

    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 0) {
      return slice.slice(0, lastSpace);
    }
  }
  return null;
}

async function flush(text, socket, id, isAudio) {
  const clean = text.trim();
  if (!clean) return;

  if (!isAudio) {
    socket.emit("partial-answer", {
      id,
      role: "model",
      text: clean,
      partial: true,
    });
    return;
  }

  sendAudio(clean, socket, id);
}

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
  // const seq = socket.session.audioSeq++;
  const responseSession = socket.session.responses.get(id);
  const seq = responseSession.audioSeq++;

  const audio = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text,
  });

  const audioBuffer = Buffer.from(await audio.arrayBuffer());

  socket.emit("ai-audio-chunk", {
    id,
    seq,
    text,
    role: "model",
    base64Audio: audioBuffer.toString("base64"),
    partial: true,
  });
}
