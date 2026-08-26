export async function recoverAgedLithicEvents(dependencies: {
  listAged(): Promise<Array<{ providerTransactionId: string }>>;
  replay(providerTransactionId: string): Promise<void>;
}) {
  const transactionIds = [...new Set((await dependencies.listAged()).map((event) => event.providerTransactionId))];
  for (const transactionId of transactionIds) await dependencies.replay(transactionId);
  return transactionIds.length;
}
