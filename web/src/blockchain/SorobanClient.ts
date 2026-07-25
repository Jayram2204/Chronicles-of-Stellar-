import {
  rpc,
  Keypair,
  Networks,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  xdr,
  Operation,
  TransactionBuilder,
  Account,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { walletConnector } from './WalletConnector';

export interface PlayerState {
  address: string;
  reputation: number;
  level: number;
  has_keycard: boolean;
  has_firewall_pass: boolean;
  total_transactions: number;
}

export interface GameState {
  total_players: number;
  total_transactions: number;
  contract_version: number;
}

const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
    ? Networks.PUBLIC
    : Networks.TESTNET;

const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL ||
  (import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
    ? 'https://mainnet.sorobanrpc.com'
    : 'https://soroban-testnet.stellar.org');

const CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

class SorobanClient {
  private server: rpc.Server;
  private contractId: string;

  constructor() {
    this.server = new rpc.Server(SOROBAN_RPC_URL);
    this.contractId = CONTRACT_ID;
  }

  get isDeployed(): boolean {
    return this.contractId.trim().length > 0;
  }

  get contractAddress(): string {
    return this.contractId;
  }

  async getPlayer(publicKey: string): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract ID not configured in VITE_SOROBAN_CONTRACT_ID.');
      return null;
    }
    try {
      const result = await this.simulateQuery('get_player', [
        nativeToScVal(publicKey, { type: 'address' }),
      ]);
      return this.parsePlayerState(result);
    } catch (error) {
      console.warn('[SorobanClient] get_player failed:', error);
      return null;
    }
  }

  async canAccessLevel(publicKey: string, requiredLevel: number): Promise<boolean> {
    if (!this.isDeployed) return true;
    try {
      const result = await this.simulateQuery('can_access_level', [
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(requiredLevel, { type: 'u32' }),
      ]);
      return Boolean(result);
    } catch (error) {
      console.warn('[SorobanClient] can_access_level failed:', error);
      return true;
    }
  }

  async getGameState(): Promise<GameState | null> {
    if (!this.isDeployed) return null;
    try {
      const result = await this.simulateQuery('get_game_state', []);
      return {
        total_players: Number((result as any)?.total_players || 0),
        total_transactions: Number((result as any)?.total_transactions || 0),
        contract_version: Number((result as any)?.contract_version || 1),
      };
    } catch (error) {
      console.warn('[SorobanClient] get_game_state failed:', error);
      return null;
    }
  }

  async initPlayer(): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract ID not configured.');
      return null;
    }
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('[SorobanClient] Wallet not connected.');
      return null;
    }
    try {
      const result = await this.invokeContract('init_player', [
        nativeToScVal(walletState.publicKey, { type: 'address' }),
      ]);
      return this.parsePlayerState(result);
    } catch (error) {
      console.error('[SorobanClient] init_player failed:', error);
      return null;
    }
  }

  async approveAction(action: string): Promise<PlayerState | null> {
    if (!this.isDeployed) {
      console.warn('[SorobanClient] Contract ID not configured.');
      return null;
    }
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('[SorobanClient] Wallet not connected.');
      return null;
    }
    try {
      const result = await this.invokeContract('approve_action', [
        nativeToScVal(walletState.publicKey, { type: 'address' }),
        nativeToScVal(action, { type: 'string' }),
      ]);
      return this.parsePlayerState(result);
    } catch (error) {
      console.error('[SorobanClient] approve_action failed:', error);
      return null;
    }
  }

  private async simulateQuery(method: string, args: xdr.ScVal[]): Promise<any> {
    const dummySource = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    const transaction = new TransactionBuilder(dummySource, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: this.contractId,
          function: method,
          args,
        })
      )
      .setTimeout(180)
      .build();

    const simulated = await this.server.simulateTransaction(transaction);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    if (simulated.result) {
      return scValToNative(simulated.result.retval);
    }
    return null;
  }

  private async invokeContract(
    method: string,
    args: xdr.ScVal[]
  ): Promise<any> {
    const walletState = walletConnector.getState();
    if (!walletState.publicKey) {
      throw new Error('Wallet not connected');
    }
    const accountResponse = await this.server.getAccount(walletState.publicKey);

    const txBuilding = new TransactionBuilder(accountResponse, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.invokeContractFunction({
          contract: this.contractId,
          function: method,
          args,
        })
      )
      .setTimeout(180)
      .build();

    const simulated = await this.server.simulateTransaction(txBuilding);
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const assembledTx = rpc.assembleTransaction(txBuilding, simulated).build();
    let signedTxXdr: string;

    if (walletState.secretKey) {
      const keypair = Keypair.fromSecret(walletState.secretKey);
      assembledTx.sign(keypair);
      signedTxXdr = assembledTx.toXDR();
    } else {
      const freighterRes = await signTransaction(assembledTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if ((freighterRes as any).error) {
        throw new Error(`Freighter signing error: ${(freighterRes as any).error}`);
      }
      signedTxXdr = (freighterRes as any).signedTxXdr || (freighterRes as unknown as string);
    }

    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const response = await this.server.sendTransaction(signedTx);
    if (response.status === 'ERROR') {
      throw new Error(`Transaction failed: ${JSON.stringify(response.errorResult)}`);
    }

    const txHash = response.hash;
    let attempts = 0;
    while (attempts < 30) {
      const txResponse = await this.server.getTransaction(txHash);
      if (txResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        const successful = txResponse as rpc.Api.GetSuccessfulTransactionResponse;
        const resultMeta = successful.resultMetaXdr;
        return this.extractContractResult(resultMeta);
      }
      if (txResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error('Transaction failed on-chain');
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error('Transaction timed out');
  }

  private parsePlayerState(result: any): PlayerState | null {
    if (!result) return null;
    return {
      address: result.address?.toString() || '',
      reputation: Number(result.reputation) || 0,
      level: Number(result.level) || 1,
      has_keycard: Boolean(result.has_keycard),
      has_firewall_pass: Boolean(result.has_firewall_pass),
      total_transactions: Number(result.total_transactions) || 0,
    };
  }

  private extractContractResult(meta: xdr.TransactionMeta): any {
    try {
      const v3 = meta.v3();
      if (v3) {
        const sorobanMeta = v3.sorobanMeta();
        if (sorobanMeta) {
          const returnValue = sorobanMeta.returnValue();
          if (returnValue) {
            return scValToNative(returnValue);
          }
        }
      }
    } catch (error) {
      console.warn('[SorobanClient] Failed to extract result:', error);
    }
    return null;
  }
}

export const sorobanClient = new SorobanClient();
