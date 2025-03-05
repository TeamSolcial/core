use anchor_lang::prelude::*;

declare_id!("71WNuqD9qFJbo8ZyjkSg7GHL866PAfxFZNAEW3uisZEX");

#[program]
pub mod sola_table {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
pub struct Meetup {
    pub organizer: Pubkey,
    pub title: String,
    pub description: String,
    pub max_participants: u8,
    pub current_participants: u8,
    pub country: String,
    pub city: String,
    pub location: String,
    pub price: u64,
    pub date: i64,
    pub category: String,
    pub image_url: String,
}

impl Meetup {
    const LEN: usize = 8 + // discriminator
        32 + // organizer pubkey
        4 + 50 + // title (string prefix + max chars)
        4 + 200 + // description
        1 + // max_participants
        1 + // current_participants
        4 + 50 + // country
        4 + 50 + // city
        4 + 100 + // location
        8 + // price
        8 + // date
        4 + 30 + // category
        4 + 200; // image_url
}
