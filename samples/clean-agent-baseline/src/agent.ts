export function answerQuestion(message: string): string {
  const prompt = message.trim();
  return prompt.length > 0 ? "I can help with that." : "Please ask a question.";
}
