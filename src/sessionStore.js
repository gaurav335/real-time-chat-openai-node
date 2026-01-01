export const sessions = new Map();

export function getResponseSession(socketId, responseId) {
  const socketSession = sessions.get(socketId);

  if (!socketSession.responses.has(responseId)) {
    socketSession.responses.set(responseId, {
      pcmChunks: [],
      chunkCounter: 0,
      lastTranscript: "",
      audioSeq: 0,
    });
  }
  return socketSession.responses.get(responseId);
}

/*
sessions = {
  socketId: {
    responses: Map {
      responseId: {
        pcmChunks: Buffer[],
        chunkCounter: number,
        lastTranscript: string,
        audioSeq: number
      }
    }
  }
}
*/
