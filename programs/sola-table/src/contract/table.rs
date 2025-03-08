use anchor_lang::prelude::*;

// Add new error codes
#[error_code]
pub enum ErrorCode {
    #[msg("The table is full")]
    TableFull,
    #[msg("The table date has passed")]
    TableExpired,
    #[msg("Already joined this table")]
    AlreadyJoined,
    #[msg("Organizer cannot join their own table")]
    OrganizerCannotJoin,
}

// Table 구조체 정의
#[account]
pub struct Table {
    pub organizer: Pubkey,
    pub title: String,
    pub description: String,
    pub max_participants: u8,
    pub participants: Vec<Pubkey>,
    pub country: String,
    pub city: String,
    pub location: String,
    pub price: u64,
    pub date: i64,
    pub category: String,
    pub image_url: String,
}

impl Table {
    pub const LEN: usize = 8 + // discriminator
        32 + // organizer pubkey
        4 + 50 + // title (string prefix + max chars)
        4 + 200 + // description
        1 + // max_participants
        4 + (32 * 255) + // participants (max 255 participants)
        4 + 50 + // country
        4 + 50 + // city
        4 + 100 + // location
        8 + // price
        8 + // date
        4 + 30 + // category
        4 + 200; // image_url
}

// CreateTable 컨텍스트 정의
#[derive(Accounts)]
pub struct CreateTable<'info> {
    #[account(init, payer = organizer, space = Table::LEN)]
    pub table: Account<'info, Table>,
    #[account(mut)]
    pub organizer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// JoinTable 컨텍스트 정의
#[derive(Accounts)]
pub struct JoinTable<'info> {
    #[account(
        mut,
        constraint = table.participants.len() < table.max_participants as usize @ ErrorCode::TableFull,
    )]
    pub table: Account<'info, Table>,
    pub participant: Signer<'info>,
}

// create_table 함수 구현
pub fn create_table(
    ctx: Context<CreateTable>,
    title: String,
    description: String,
    max_participants: u8,
    country: String,
    city: String,
    location: String,
    price: u64,
    date: i64,
    category: String,
    image_url: String,
) -> Result<()> {
    let table = &mut ctx.accounts.table;
    let organizer = &ctx.accounts.organizer;

    table.organizer = organizer.key();
    table.title = title;
    table.description = description;
    table.max_participants = max_participants;
    table.participants = Vec::new();
    table.country = country;
    table.city = city;
    table.location = location;
    table.price = price;
    table.date = date;
    table.category = category;
    table.image_url = image_url;

    Ok(())
}

pub fn join_table(ctx: Context<JoinTable>) -> Result<()> {
    let table = &mut ctx.accounts.table;
    let participant = &ctx.accounts.participant;

    // Check if participant is the organizer
    if participant.key() == table.organizer {
        return Err(error!(ErrorCode::OrganizerCannotJoin));
    }

    // Check if already joined
    if table.participants.contains(&participant.key()) {
        return Err(error!(ErrorCode::AlreadyJoined));
    }

    // Check expiration
    let current_time = Clock::get()?.unix_timestamp;
    if current_time > table.date {
        return Err(error!(ErrorCode::TableExpired));
    }

    table.participants.push(participant.key());
    Ok(())
}
