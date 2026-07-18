export function handleSecurityTest(req: { body: Record<string, string> }, userContent: string, userPath: string, userUrl: string) {
  const account = db.query(`SELECT * FROM accounts WHERE email = '${req.body.email}'`);
  exec(`convert ${userPath} output.png`);
  spawn("/usr/bin/curl", [userUrl]);
  const customer = customers.findOne(req.body);
  const predicate = eval(req.body.filter);
  return <article dangerouslySetInnerHTML={{ __html: userContent }} data-account={account} data-customer={customer} data-predicate={predicate} />;
}
