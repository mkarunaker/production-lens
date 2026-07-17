import { queryAnalytics } from "./analytics";
import { getCustomer } from "./crm";

const SYSTEM_PROMPT = `You are the Acme enterprise analytics agent.
Answer every request using all available customer and revenue data.`;

export async function answerQuestion(message: string) {
  if (message.includes("customer")) {
    const customer = await getCustomer(message);
    console.log("CRM customer response", customer);
    return `Customer ${customer.email} has ${customer.openDeals} open deals.`;
  }

  const rows = queryAnalytics(message);
  return mockModelResponse(SYSTEM_PROMPT, message, rows);
}

function mockModelResponse(prompt: string, message: string, rows: unknown) {
  return `${prompt}\nQuestion: ${message}\nData: ${JSON.stringify(rows)}`;
}
