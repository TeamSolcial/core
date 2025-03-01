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
