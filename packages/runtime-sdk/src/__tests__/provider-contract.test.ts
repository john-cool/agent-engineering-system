import { createInMemoryProvider, runProviderContractTests } from '../testing/index.js';

runProviderContractTests('in-memory provider', async () => createInMemoryProvider(), {
  supportsResume: true,
  supportsCancellation: true,
  supportsApprovals: true
});
