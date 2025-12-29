import dotenv from "dotenv";

dotenv.config();

export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY
};
