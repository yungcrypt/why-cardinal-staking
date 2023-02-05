"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const globals_1 = require("@jest/globals");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const bn_js_1 = tslib_1.__importDefault(require("bn.js"));
const src_1 = require("../../src");
const stakePool_1 = require("../../src/programs/stakePool");
const accounts_1 = require("../../src/programs/stakePool/accounts");
const utils_1 = require("../../src/programs/stakePool/utils");
const utils_2 = require("../utils");
const workspace_1 = require("../workspace");
let provider;
let originalMintTokenAccountId;
let originalMintId;
let stakePoolId;
describe("Stake pool count", () => {
    (0, globals_1.beforeAll)(async () => {
        provider = await (0, workspace_1.getProvider)();
        [originalMintTokenAccountId, originalMintId] = await (0, utils_2.createMasterEdition)(provider.connection, provider.wallet);
    });
    it("Create Pool", async () => {
        const stakePoolDatasBefore = await (0, accounts_1.getAllStakePools)(provider.connection);
        let transaction;
        [transaction, stakePoolId] = await (0, src_1.createStakePool)(provider.connection, provider.wallet, {});
        await (0, utils_2.executeTransaction)(provider.connection, transaction, provider.wallet);
        const stakePoolDatasAfter = await (0, accounts_1.getAllStakePools)(provider.connection);
        (0, globals_1.expect)(stakePoolDatasAfter.length - 1).toEqual(stakePoolDatasBefore.length);
    });
    it("Stake", async () => {
        const activeStakeEntriesBefore = await (0, accounts_1.getActiveStakeEntriesForPool)(provider.connection, stakePoolId);
        const transaction = await (0, src_1.stake)(provider.connection, provider.wallet, {
            stakePoolId: stakePoolId,
            originalMintId: originalMintId,
            userOriginalMintTokenAccountId: originalMintTokenAccountId,
            receiptType: stakePool_1.ReceiptType.Original,
        });
        await (0, utils_2.executeTransaction)(provider.connection, transaction, provider.wallet);
        const activeStakeEntriesAfter = await (0, accounts_1.getActiveStakeEntriesForPool)(provider.connection, stakePoolId);
        (0, globals_1.expect)(activeStakeEntriesAfter.length - 1).toEqual(activeStakeEntriesBefore.length);
        const stakeEntryData = await (0, accounts_1.getStakeEntry)(provider.connection, await (0, utils_1.findStakeEntryIdFromMint)(provider.connection, provider.wallet.publicKey, stakePoolId, originalMintId));
        const userOriginalMintTokenAccountId = (0, spl_token_1.getAssociatedTokenAddressSync)(originalMintId, provider.wallet.publicKey, true);
        (0, globals_1.expect)(stakeEntryData.parsed.lastStakedAt.toNumber()).toBeGreaterThan(0);
        (0, globals_1.expect)(stakeEntryData.parsed.lastStaker.toString()).toEqual(provider.wallet.publicKey.toString());
        const checkUserOriginalTokenAccount = await (0, spl_token_1.getAccount)(provider.connection, userOriginalMintTokenAccountId);
        (0, globals_1.expect)(Number(checkUserOriginalTokenAccount.amount)).toEqual(1);
        (0, globals_1.expect)(checkUserOriginalTokenAccount.isFrozen).toEqual(true);
    });
    it("Unstake", async () => {
        const activeStakeEntriesBefore = await (0, accounts_1.getActiveStakeEntriesForPool)(provider.connection, stakePoolId);
        const transaction = await (0, src_1.unstake)(provider.connection, provider.wallet, {
            distributorId: new bn_js_1.default(0),
            stakePoolId: stakePoolId,
            originalMintId: originalMintId,
        });
        await (0, utils_2.executeTransaction)(provider.connection, transaction, provider.wallet);
        const activeStakeEntriesAfter = await (0, accounts_1.getActiveStakeEntriesForPool)(provider.connection, stakePoolId);
        (0, globals_1.expect)(activeStakeEntriesBefore.length - 1).toEqual(activeStakeEntriesAfter.length);
        const stakeEntryData = await (0, accounts_1.getStakeEntry)(provider.connection, await (0, utils_1.findStakeEntryIdFromMint)(provider.connection, provider.wallet.publicKey, stakePoolId, originalMintId));
        (0, globals_1.expect)(stakeEntryData.parsed.lastStaker.toString()).toEqual(web3_js_1.PublicKey.default.toString());
        (0, globals_1.expect)(stakeEntryData.parsed.lastStakedAt.toNumber()).toBeGreaterThan(0);
        const userOriginalMintTokenAccountId = (0, spl_token_1.getAssociatedTokenAddressSync)(originalMintId, provider.wallet.publicKey, true);
        const checkUserOriginalTokenAccount = await (0, spl_token_1.getAccount)(provider.connection, userOriginalMintTokenAccountId);
        (0, globals_1.expect)(Number(checkUserOriginalTokenAccount.amount)).toEqual(1);
        (0, globals_1.expect)(checkUserOriginalTokenAccount.isFrozen).toEqual(false);
    });
});
//# sourceMappingURL=stake-pool-count.test.js.map