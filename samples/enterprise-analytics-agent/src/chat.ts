import { answerQuestion } from "./agent";

export async function submitChat(message: string) {
  return answerQuestion(message);
}
