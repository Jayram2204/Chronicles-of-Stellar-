import {
  Horizon,
  TransactionBuilder,
  Operation,
  Keypair,
  Networks,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { EventHub, GameEvents } from '../events/EventHub';
import { walletConnector } from './WalletConnector';
import { sorobanClient } from './SorobanClient';

const NETWORK_PASSPHRASE =
  import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
    ? Networks.PUBLIC
    : Networks.TESTNET;

const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ||
  (import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org');

export class StellarClient {
  private server = new Horizon.Server(HORIZON_URL);

  public async mutateGameState(action: string, details: any): Promise<boolean> {
    const walletState = walletConnector.getState();
    if (!walletState.isConnected || !walletState.publicKey) {
      console.error('[StellarClient] Cannot submit transaction: Wallet disconnected.');
      return false;
    }

    EventHub.emit(GameEvents.TX_SUBMITTED, { action, details });

    try {
      const publicKey = walletState.publicKey;

      if (sorobanClient.isDeployed) {
        console.log(`[StellarClient] Delegating to SorobanClient.approveAction('${action}')`);
        const updatedPlayerState = await sorobanClient.approveAction(action);
        if (updatedPlayerState) {
          await walletConnector.updateBalance(publicKey);
          EventHub.emit(GameEvents.TX_CONFIRMED, {
            action,
            txHash: 'SOROBAN_ON_CHAIN',
            ledger: updatedPlayerState.total_transactions,
            playerState: updatedPlayerState,
          });
          return true;
        } else {
          throw new Error('Soroban contract execution returned null state.');
        }
      }

      if (import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC') {
        throw new Error('ManageData fallback is disabled on Mainnet. Ensure Soroban contract is deployed.');
      }

      console.log(`[StellarClient] Submitting Horizon ManageData for account: ${publicKey}, action: ${action}`);
      const account = await this.server.loadAccount(publicKey);

      const transaction = new TransactionBuilder(account, {
        fee: '10000',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.manageData({
            name: action.substring(0, 64),
            value: details?.npcId || 'active',
          })
        )
        .setTimeout(30)
        .build();

      let txHash = '';
      let ledger = 0;

      if (walletState.secretKey) {
        const keypair = Keypair.fromSecret(walletState.secretKey);
        transaction.sign(keypair);
        const response = await this.server.submitTransaction(transaction);
        txHash = response.hash;
        ledger = response.ledger || 0;
      } else {
        const freighterRes = await signTransaction(transaction.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
        });
        if ((freighterRes as any).error) {
          throw new Error(`Freighter signing error: ${(freighterRes as any).error}`);
        }
        const signedTxXdr = (freighterRes as any).signedTxXdr || (freighterRes as unknown as string);
        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
        const response = await this.server.submitTransaction(signedTx);
        txHash = response.hash;
        ledger = response.ledger || 0;
      }

      await walletConnector.updateBalance(publicKey);

      EventHub.emit(GameEvents.TX_CONFIRMED, {
        action,
        txHash,
        ledger,
      });

      return true;
    } catch (error) {
      console.error('[StellarClient] Transaction failed:', error);
      EventHub.emit(GameEvents.TX_FAILED, { action, error: String(error) });
      return false;
    }
  }
}

export const stellarClient = new StellarClient();
