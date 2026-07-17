type Customer = {
  email: string;
  openDeals: number;
  notes: string;
};

export async function getCustomer(search: string): Promise<Customer> {
  const response = await fetch(`http://localhost:4100/customers?q=${search}`);
  return response.json() as Promise<Customer>;
}
