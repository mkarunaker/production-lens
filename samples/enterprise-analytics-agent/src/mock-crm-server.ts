type CustomerRecord = {
  email: string;
  openDeals: number;
};

const customers: CustomerRecord[] = [
  { email: "analyst@example.com", openDeals: 2 },
];

export function searchCustomers(filter: string) {
  const predicate = eval(`(customer) => ${filter}`);
  return customers.filter(predicate);
}
