import {
  rpc,
  Contract,
  TransactionBuilder,
  Address,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  xdr,
} from '@stellar/stellar-sdk';
import { getAddress, signTransaction } from '@stellar/freighter-api';

const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';
const RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ||
  (import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
    ? 'https://mainnet.sorobanrpc.com'
    : 'https://soroban-testnet.stellar.org');

let CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

export function setContractId(id: string) {
  CONTRACT_ID = id;
}

export function getContractId() {
  return CONTRACT_ID;
}

function toScAddress(addr: string): xdr.ScVal {
  return new Address(addr).toScVal();
}

function toU32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: 'u32' });
}

function toU64(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: 'u64' });
}

export interface BoutResult {
  id: number;
  challenger: string;
  opponent: string | null;
  bet_amount: number;
  status: string;
  challenger_score: number;
  opponent_score: number;
  winner: string | null;
  created_at: number;
}

export interface BotBoutResult {
  id: number;
  player: string;
  bet_amount: number;
  time_limit: number;
  status: string;
  player_score: number;
  completion_time: number;
  payout: number;
  created_at: number;
}

let server: rpc.Server | null = null;
function getServer() {
  if (!server) {
    server = new rpc.Server(RPC_URL);
  }
  return server;
}

export async function signAndSubmitWithFreighter(
  method: string,
  args: xdr.ScVal[],
  preloadedAddress?: string
): Promise<string> {
  if (!CONTRACT_ID) throw new Error('Contract not deployed. Set VITE_SOROBAN_CONTRACT_ID.');

  const sorobanRpc = getServer();
  const contract = new Contract(CONTRACT_ID);
  const publicKey = preloadedAddress || (await getAddress()).address;
  const account = await sorobanRpc.getAccount(publicKey);

  const txBuilder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simulated = await sorobanRpc.simulateTransaction(txBuilder);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simulated.error)}`);
  }

  const assembledTx = rpc.assembleTransaction(txBuilder, simulated).build();

  const freighterResult = await signTransaction(assembledTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (freighterResult.error) {
    throw new Error(`Freighter signing error: ${JSON.stringify(freighterResult.error)}`);
  }

  const signedTx = TransactionBuilder.fromXDR(freighterResult.signedTxXdr, NETWORK_PASSPHRASE);
  const result = await sorobanRpc.sendTransaction(signedTx);

  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${JSON.stringify(result.errorResult)}`);
  }

  const txHash = result.hash;
  let attempts = 0;
  while (attempts < 30) {
    const txResponse = await sorobanRpc.getTransaction(txHash);
    if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return txHash;
    }
    if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain');
    }
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Transaction timed out waiting for confirmation');
}

export async function simulateContract(
  method: string,
  args: xdr.ScVal[]
): Promise<any> {
  if (!CONTRACT_ID) throw new Error('Contract not deployed. Set VITE_SOROBAN_CONTRACT_ID.');

  const sorobanRpc = getServer();
  const contract = new Contract(CONTRACT_ID);
  const source = await sorobanRpc.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');

  const txBuilder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simResult = await sorobanRpc.simulateTransaction(txBuilder);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${JSON.stringify(simResult.error)}`);
  }

  if (simResult.result) {
    return scValToNative(simResult.result.retval);
  }
  return null;
}

// ── PvP Player-vs-Player ────────────────────────────────────────────────────
export async function createBoutWithFreighter(betAmountXlm: number): Promise<string> {
  const addressResult = await getAddress();
  if (addressResult.error) throw new Error(`Freighter error: ${JSON.stringify(addressResult.error)}`);

  return signAndSubmitWithFreighter(
    'create_bout',
    [toScAddress(addressResult.address), toU64(betAmountXlm)],
    addressResult.address
  );
}

export async function acceptBoutWithFreighter(boutId: number): Promise<string> {
  const addressResult = await getAddress();
  if (addressResult.error) throw new Error(`Freighter error: ${JSON.stringify(addressResult.error)}`);

  return signAndSubmitWithFreighter(
    'accept_bout',
    [toScAddress(addressResult.address), toU32(boutId)],
    addressResult.address
  );
}

export async function submitScoreWithFreighter(boutId: number, score: number): Promise<string> {
  const addressResult = await getAddress();
  if (addressResult.error) throw new Error(`Freighter error: ${JSON.stringify(addressResult.error)}`);

  return signAndSubmitWithFreighter(
    'submit_score',
    [toScAddress(addressResult.address), toU32(boutId), toU32(score)],
    addressResult.address
  );
}

export async function getBout(boutId: number): Promise<BoutResult | null> {
  try {
    const result = await simulateContract('get_bout', [toU32(boutId)]);
    if (!result) return null;
    return {
      id: Number(result.id || 0),
      challenger: result.challenger?.toString() || '',
      opponent: result.opponent?.toString() || null,
      bet_amount: Number(result.bet_amount || 0),
      status: String(result.status || ''),
      challenger_score: Number(result.challenger_score || 0),
      opponent_score: Number(result.opponent_score || 0),
      winner: result.winner?.toString() || null,
      created_at: Number(result.created_at || 0),
    };
  } catch (err) {
    console.error('[PvPEscrow] getBout failed:', err);
    return null;
  }
}

export async function getOpenBouts(): Promise<BoutResult[]> {
  try {
    const result = await simulateContract('get_open_bouts', []);
    if (!result || !Array.isArray(result)) return [];
    return result.map((bout: any) => ({
      id: Number(bout.id || 0),
      challenger: bout.challenger?.toString() || '',
      opponent: bout.opponent?.toString() || null,
      bet_amount: Number(bout.bet_amount || 0),
      status: String(bout.status || ''),
      challenger_score: Number(bout.challenger_score || 0),
      opponent_score: Number(bout.opponent_score || 0),
      winner: bout.winner?.toString() || null,
      created_at: Number(bout.created_at || 0),
    }));
  } catch (err) {
    console.error('[PvPEscrow] getOpenBouts failed:', err);
    return [];
  }
}

// ── Bot Betting ─────────────────────────────────────────────────────────────
export async function createBotBoutWithFreighter(betAmountXlm: number, timeLimit: number): Promise<string> {
  const addressResult = await getAddress();
  if (addressResult.error) throw new Error(`Freighter error: ${JSON.stringify(addressResult.error)}`);

  return signAndSubmitWithFreighter(
    'create_bot_bout',
    [toScAddress(addressResult.address), toU64(betAmountXlm), toU64(timeLimit)],
    addressResult.address
  );
}

export async function resolveBotBoutWithFreighter(boutId: number, score: number, completionTime: number): Promise<string> {
  const addressResult = await getAddress();
  if (addressResult.error) throw new Error(`Freighter error: ${JSON.stringify(addressResult.error)}`);

  return signAndSubmitWithFreighter(
    'resolve_bot_bout',
    [toScAddress(addressResult.address), toU32(boutId), toU32(score), toU64(completionTime)],
    addressResult.address
  );
}

export async function getBotBout(boutId: number): Promise<BotBoutResult | null> {
  try {
    const result = await simulateContract('get_bot_bout', [toU32(boutId)]);
    if (!result) return null;
    return {
      id: Number(result.id || 0),
      player: result.player?.toString() || '',
      bet_amount: Number(result.bet_amount || 0),
      time_limit: Number(result.time_limit || 0),
      status: String(result.status || ''),
      player_score: Number(result.player_score || 0),
      completion_time: Number(result.completion_time || 0),
      payout: Number(result.payout || 0),
      created_at: Number(result.created_at || 0),
    };
  } catch (err) {
    console.error('[PvPEscrow] getBotBout failed:', err);
    return null;
  }
}

// ── Treasury / Admin ────────────────────────────────────────────────────────
export async function getTreasury(): Promise<number> {
  try {
    const result = await simulateContract('get_treasury', []);
    return Number(result || 0);
  } catch (err) {
    console.error('[PvPEscrow] getTreasury failed:', err);
    return 0;
  }
}
