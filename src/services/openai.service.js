import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { openaiConfig } from "../config/openai.config.js";
import { createWavBuffer } from "../utils/wav.utils.js";

const openai = new OpenAI(openaiConfig);

export const translatePCMBuffer = async (pcmBuffer) => {
  const wavBuffer = createWavBuffer(pcmBuffer);

  const tempPath = path.join("./temp", `segment-${Date.now()}.wav`);
  fs.writeFileSync(tempPath, wavBuffer);

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempPath),
    model: "gpt-4o-transcribe",
    translate: true,
  });

  fs.unlinkSync(tempPath);

  return response.text;
};

export const translateText = async (text, targetLanguage) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Translate the following text to ${targetLanguage}. 
Return ONLY the translated text.`,
      },
      {
        role: "user",
        content: text,
      },
    ],
  });

  return response.choices[0].message.content.trim();
};

export async function transcribeAndAnswer(wavBuffer, socket, randomUid) {
  const file = new File([wavBuffer], "audio.wav", { type: "audio/wav" });

  const transcription = await openai.audio.transcriptions.create({
    model: "gpt-4o-transcribe",
    file,
  });
  console.log({ translate: transcription.text });
  const completionStream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      {
        role: "user",
        content: transcription.text,
      },
    ],
  });
  let partialText = "";
  for await (const chunk of completionStream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      partialText += delta;
      if (partialText.length >= 5) {
        socket.emit("partial-answer", {
          id: randomUid,
          role: "model",
          text: delta,
          partial: true,
        });
        partialText = "";
      }
    }
  }
  socket.emit("partial-complete");
}
