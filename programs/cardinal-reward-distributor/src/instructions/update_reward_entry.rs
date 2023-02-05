use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateRewardEntryIx {
    pub multiplier: u64,
}

#[derive(Accounts)]
#[instruction(ix: UpdateRewardEntryIx)]
pub struct UpdateRewardEntryCtx<'info> {
    #[account(mut, constraint = reward_entry.reward_distributor == reward_distributor.key() @ ErrorCode::InvalidRewardDistributor)]
    reward_entry: Box<Account<'info, RewardEntry>>,
    reward_distributor: Box<Account<'info, RewardDistributor>>,
    #[account(constraint = reward_authority.key() == reward_distributor.reward_authority @ ErrorCode::InvalidRewardDistributorAuthority)]
    reward_authority: Box<Account<'info, RewardAuthority>>,
    #[account(constraint = authority.key() == reward_authority.authority.unwrap() @ ErrorCode::InvalidRewardDistributorAuthority)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateRewardEntryCtx>, ix: UpdateRewardEntryIx) -> Result<()> {
    let reward_entry = &mut ctx.accounts.reward_entry;
    reward_entry.multiplier = ix.multiplier;
    Ok(())
}
