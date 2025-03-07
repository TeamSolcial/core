use anchor_lang::prelude::*;

// Meetup 구조체 정의
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
    pub const LEN: usize = 8 + // discriminator
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

// CreateMeetup 컨텍스트 정의
#[derive(Accounts)]
pub struct CreateMeetup<'info> {
    #[account(init, payer = organizer, space = Meetup::LEN)]
    pub meetup: Account<'info, Meetup>,
    #[account(mut)]
    pub organizer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// create_meetup 함수 구현
pub fn create_meetup(
    ctx: Context<CreateMeetup>,
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
    let meetup = &mut ctx.accounts.meetup;
    let organizer = &ctx.accounts.organizer;

    meetup.organizer = organizer.key();
    meetup.title = title;
    meetup.description = description;
    meetup.max_participants = max_participants;
    meetup.country = country;
    meetup.city = city;
    meetup.location = location;
    meetup.price = price;
    meetup.date = date;
    meetup.category = category;
    meetup.image_url = image_url;
    meetup.current_participants = 0;

    Ok(())
}