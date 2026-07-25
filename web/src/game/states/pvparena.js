// pvparena.js
// PvP Arena - create/accept bouts via Soroban smart contract

import Renderer from './renderer';
import Globals from '../globals';
import Controls from '../controls';
import Audio from '../audio';
import { EventHub, GameEvents } from '../../events/EventHub';

const PvpArenaConsts = {
  options: [
    'CREATE BOUT (1 XLM)',
    'JOIN OPEN BOUT',
    'BACK',
  ],
};

class PvpArena extends Renderer {

  create() {
    super.create();

    const screenCenter = this.game.world.centerX;

    // Title
    const title = this.game.add.bitmapText(screenCenter, 12,
      Globals.bitmapFont, 'PvP ARENA', 14);
    title.anchor.setTo(0.5);
    title.tint = 0xffff00;

    const subtitle = this.game.add.bitmapText(screenCenter, 28,
      Globals.bitmapFont, 'BET XLM  FIGHT  WIN', 7);
    subtitle.anchor.setTo(0.5);
    subtitle.tint = 0xaaaaaa;

    // Wallet status
    this._walletText = this.game.add.bitmapText(screenCenter, 40,
      Globals.bitmapFont, '', 7);
    this._walletText.anchor.setTo(0.5);
    this._walletText.tint = 0x00ff88;

    // Menu options
    this.selectedOption = 0;
    this.optionTexts = [];
    const startY = 56;
    const spacing = 18;
    for (const [i, option] of PvpArenaConsts.options.entries()) {
      const text = this.game.add.bitmapText(screenCenter, startY + i * spacing, Globals.bitmapFont, option, 9);
      text.anchor.setTo(0.5);
      this.optionTexts.push(text);
    }

    // Status text (bottom area)
    this.statusText = this.game.add.bitmapText(screenCenter, 120,
      Globals.bitmapFont, '', 7);
    this.statusText.anchor.setTo(0.5);
    this.statusText.tint = 0x888888;

    this._busy = false;
    this._openBouts = [];

    this.audio = new Audio(this.game);
    this.audio.stop();
    this.controls = new Controls(this.game, true);

    this._checkWallet();
  }

  _checkWallet() {
    // Dynamically import to avoid circular deps
    import('../../blockchain/WalletConnector').then(({ walletConnector }) => {
      const ws = walletConnector.getState();
      if (ws.isConnected && ws.publicKey) {
        const short = ws.publicKey.substring(0, 8) + '...' + ws.publicKey.substring(ws.publicKey.length - 4);
        this._walletText.setText('WALLET: ' + short);
        this._walletText.tint = 0x00ff88;
      } else {
        this._walletText.setText('WALLET NOT CONNECTED');
        this._walletText.tint = 0xff4444;
      }
    }).catch(() => {
      this._walletText.setText('WALLET: UNAVAILABLE');
      this._walletText.tint = 0xff4444;
    });
  }

  update() {
    super.update();

    for (const [i, option] of this.optionTexts.entries()) {
      if (i === this.selectedOption)
        option.tint = 0x000000;
      else
        option.tint = 0xffffff;
    }

    this.handleInput();
  }

  handleInput() {
    if (this._busy) return;

    if (this.controls.up) {
      this.selectedOption--;
      this.audio.play(this.audio.sfx.hero.punch, 2);
    }
    else if (this.controls.down) {
      this.selectedOption++;
      this.audio.play(this.audio.sfx.hero.punch, 1);
    }
    else if (this.controls.punch || this.controls.jump || this.controls.kick) {
      // This starts wallet/network work off-tick. Never allow a rejected
      // promise to bubble out of a Phaser input/update frame.
      void this.chooseOption().catch((error) => {
        console.error('[PvpArena] option request failed', error);
      });
    }

    if (this.selectedOption < 0)
      this.selectedOption = 0;
    if (this.selectedOption >= PvpArenaConsts.options.length)
      this.selectedOption = PvpArenaConsts.options.length - 1;
  }

  async chooseOption() {
    // Create Bout
    if (this.selectedOption === 0) {
      await this._createBout();
    }

    // Join Open Bout
    if (this.selectedOption === 1) {
      await this._joinBout();
    }

    // Back
    if (this.selectedOption === 2) {
      this.audio.play(this.audio.sfx.hero.punch, 2);
      this.state.start('mainmenu');
    }
  }

  async _createBout() {
    this._busy = true;
    this.statusText.setText('Connecting to contract...');
    this.statusText.tint = 0xffaa00;

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timed out after 90s')), 90000)
    );

    try {
      const { createBoutWithFreighter, getContractId } = await import('../../blockchain/PvPEscrow');
      const contractId = getContractId();

      if (!contractId) {
        this.statusText.setText('CONTRACT NOT DEPLOYED');
        this.statusText.tint = 0xff4444;
        this._busy = false;
        return;
      }

      const txHash = await Promise.race([
        createBoutWithFreighter(1),
        timeout,
      ]);
      this.statusText.setText('BOUT CREATED! TX: ' + txHash.substring(0, 10) + '...');
      this.statusText.tint = 0x00ff88;

      EventHub.emit(GameEvents.TX_CONFIRMED, {
        action: 'create_bout',
        txHash: txHash,
        ledger: 0,
      });
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes('not deployed')) {
        this.statusText.setText('DEPLOY CONTRACT FIRST');
      } else if (msg.includes('User declined') || msg.includes('rejected')) {
        this.statusText.setText('TRANSACTION CANCELLED');
      } else if (msg.includes('timed out')) {
        this.statusText.setText('TIMEOUT - CHECK WALLET & RETRY');
      } else {
        this.statusText.setText('ERROR: ' + msg.substring(0, 30));
      }
      this.statusText.tint = 0xff4444;
    }

    this._busy = false;
  }

  async _joinBout() {
    this._busy = true;
    this.statusText.setText('Fetching open bouts...');
    this.statusText.tint = 0xffaa00;

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transaction timed out after 90s')), 90000)
    );

    try {
      const { getOpenBouts, acceptBoutWithFreighter, getContractId } = await import('../../blockchain/PvPEscrow');
      const contractId = getContractId();

      if (!contractId) {
        this.statusText.setText('CONTRACT NOT DEPLOYED');
        this.statusText.tint = 0xff4444;
        this._busy = false;
        return;
      }

      const bouts = await getOpenBouts();

      if (!bouts || bouts.length === 0) {
        this.statusText.setText('NO OPEN BOUTS - CREATE ONE');
        this.statusText.tint = 0xffaa00;
        this._busy = false;
        return;
      }

      const bout = bouts[0];
      this.statusText.setText('JOINING BOUT #' + bout.id + '...');
      this.statusText.tint = 0xffaa00;

      const txHash = await Promise.race([
        acceptBoutWithFreighter(bout.id),
        timeout,
      ]);
      this.statusText.setText('JOINED! FIGHT! TX: ' + txHash.substring(0, 10) + '...');
      this.statusText.tint = 0x00ff88;

      EventHub.emit(GameEvents.TX_CONFIRMED, {
        action: 'accept_bout',
        txHash: txHash,
        ledger: 0,
      });
    } catch (err) {
      const msg = String(err.message || err);
      if (msg.includes('not deployed')) {
        this.statusText.setText('DEPLOY CONTRACT FIRST');
      } else if (msg.includes('User declined') || msg.includes('rejected')) {
        this.statusText.setText('TRANSACTION CANCELLED');
      } else if (msg.includes('timed out')) {
        this.statusText.setText('TIMEOUT - CHECK WALLET & RETRY');
      } else {
        this.statusText.setText('ERROR: ' + msg.substring(0, 30));
      }
      this.statusText.tint = 0xff4444;
    }

    this._busy = false;
  }
}

export { PvpArena };
