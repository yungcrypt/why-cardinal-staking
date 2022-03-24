import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import * as web3 from "@solana/web3.js";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";

import { initStakeEntry, initStakePool, stake } from "./instruction";
import { findStakeEntryId, findStakePoolId } from "./pda";
import {
  findAta,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import { withIssueToken } from "@cardinal/token-manager";

export const withCreatePool = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    identifier: BN;
  }
): Promise<[web3.Transaction, web3.PublicKey]> => {
  const [stakePoolId] = await findStakePoolId(params.identifier);
  transaction.add(
    initStakePool(connection, wallet, {
      identifier: params.identifier,
      stakePoolId: stakePoolId,
    })
  );
  return [transaction, stakePoolId];
};

export const withCreateEntry = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    mint: web3.Keypair;
    stakePoolIdentifier: BN;
    originalMint: web3.PublicKey;
    name: String;
    symbol: String;
    textOverlay: string;
  }
): Promise<[web3.Transaction, web3.PublicKey, web3.Keypair]> => {
  const [[stakePoolId], [stakeEntryId]] = await Promise.all([
    findStakePoolId(params.stakePoolIdentifier),
    findStakeEntryId(params.stakePoolIdentifier, params.originalMint),
  ]);

  const mintTokenAccount = await findAta(
    params.mint.publicKey,
    stakeEntryId,
    true
  );

  const [mintMetadataId] = await web3.PublicKey.findProgramAddress(
    [
      Buffer.from(metaplex.MetadataProgram.PREFIX),
      metaplex.MetadataProgram.PUBKEY.toBuffer(),
      params.mint.publicKey.toBuffer(),
    ],
    metaplex.MetadataProgram.PUBKEY
  );

  transaction.add(
    initStakeEntry(connection, wallet, {
      stakePoolId: stakePoolId,
      stakeEntryId: stakeEntryId,
      originalMint: params.originalMint,
      mintTokenAccount: mintTokenAccount,
      mintMetadata: mintMetadataId,
      mint: params.mint.publicKey,
      name: params.name,
      symbol: params.symbol,
      textOverlay: params.textOverlay,
    })
  );
  return [transaction, stakeEntryId, params.mint];
};

export const withStake = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    stakePoolIdentifier: BN;
    originalMint: web3.PublicKey;
    mint: web3.PublicKey;
  }
): Promise<[web3.Transaction, web3.PublicKey]> => {
  const [stakeEntryId] = await findStakeEntryId(
    params.stakePoolIdentifier,
    params.originalMint
  );

  const userOriginalMintTokenAccount =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      params.originalMint,
      wallet.publicKey,
      wallet.publicKey
    );

  const userMintTokenAccount = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    params.mint,
    wallet.publicKey,
    wallet.publicKey
  );

  const stakeEntryOriginalMintTokenAccount =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      params.originalMint,
      stakeEntryId,
      wallet.publicKey,
      true
    );

  const stakeEntryMintTokenAccount = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    params.mint,
    stakeEntryId,
    wallet.publicKey,
    true
  );

  const issueTokenParameters = {
    paymentAmount: new BN(0),
    mint: params.originalMint,
    issuerTokenAccountId: userOriginalMintTokenAccount,
  };
  let [_, tokenManagerId] = await withIssueToken(
    transaction,
    connection,
    wallet,
    issueTokenParameters
  );

  const tokenManagerMintAccount = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    params.mint,
    tokenManagerId,
    wallet.publicKey,
    true
  );

  transaction.add(
    stake(connection, wallet, {
      stakeEntryId: stakeEntryId,
      tokenManagerId: tokenManagerId,
      stakePoolIdentifier: params.stakePoolIdentifier,
      originalMint: params.originalMint,
      mint: params.mint,
      stakeEntryOriginalMintTokenAccount: stakeEntryOriginalMintTokenAccount,
      stakeEntryMintTokenAccount: stakeEntryMintTokenAccount,
      user: wallet.publicKey,
      userMintTokenAccount: userMintTokenAccount,
      tokenManagerMintAccount: tokenManagerMintAccount,
    })
  );

  return [transaction, tokenManagerId];
};
