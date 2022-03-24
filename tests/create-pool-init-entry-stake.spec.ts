// import type * as splToken from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import {
  withCreateEntry,
  withCreatePool,
  withStake,
  // withStake,
} from "../src/programs/stakePool/transaction";
import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";

import { createMint } from "./utils";
import { expect } from "chai";
import { getProvider } from "./workspace";
import {
  getStakeEntry,
  getStakePool,
} from "../src/programs/stakePool/accounts";
import {
  findStakeEntryId,
  // findStakeEntryId,
  findStakePoolId,
} from "../src/programs/stakePool/pda";

describe("Create stake pool", () => {
  const poolIdentifier = new BN(getRandomInt(1000));
  const entryName = "name";
  const symbol = "symbol";
  const textOverlay = "staking";
  let originalMint: splToken.Token;
  const mint = web3.Keypair.generate();
  const originalMintAuthority = web3.Keypair.generate();

  before(async () => {
    const provider = getProvider();
    // original mint
    [, originalMint] = await createMint(
      provider.connection,
      originalMintAuthority,
      provider.wallet.publicKey
    );
  });

  it("Create Pool", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();
    await withCreatePool(transaction, provider.connection, provider.wallet, {
      identifier: poolIdentifier,
    });
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );

    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    let [stakePoolId] = await findStakePoolId(poolIdentifier);
    const stakePoolData = await getStakePool(provider.connection, stakePoolId);

    expect(stakePoolData.parsed.identifier.toNumber()).to.eq(
      poolIdentifier.toNumber()
    );
  });

  it("Init stake entry for pool", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();

    await withCreateEntry(transaction, provider.connection, provider.wallet, {
      mint: mint,
      stakePoolIdentifier: poolIdentifier,
      originalMint: originalMint.publicKey,
      name: entryName,
      symbol: symbol,
      textOverlay: textOverlay,
    });

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [mint]
    );

    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const [[stakePoolId], [stakeEntryId]] = await Promise.all([
      findStakePoolId(poolIdentifier),
      findStakeEntryId(poolIdentifier, originalMint.publicKey),
    ]);

    const stakeEntryData = await getStakeEntry(
      provider.connection,
      stakeEntryId
    );

    expect(stakeEntryData.parsed.originalMint.toString()).to.eq(
      originalMint.publicKey.toString()
    );
    expect(stakeEntryData.parsed.pool.toString()).to.eq(stakePoolId.toString());
    expect(stakeEntryData.parsed.mint.toString()).to.eq(
      mint.publicKey.toString()
    );
  });

  it("Stake", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();

    await withStake(transaction, provider.connection, provider.wallet, {
      stakePoolIdentifier: poolIdentifier,
      originalMint: originalMint.publicKey,
      mint: mint.publicKey,
    });

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    let [stakeEntryId] = await findStakeEntryId(
      poolIdentifier,
      originalMint.publicKey
    );
    const stakeEntryData = await getStakeEntry(
      provider.connection,
      stakeEntryId
    );

    console.log(stakeEntryData);
  });
});

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}
