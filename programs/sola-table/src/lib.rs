use anchor_lang::prelude::*;

// contract 모듈 선언
pub mod contract;

// 필요한 타입 재내보내기
pub use crate::contract::meetup::*;

declare_id!("GdFRCmL2NYrB42712pU45t8C9Uj1nKLYKzg8NjkrsPoK");

#[program]
pub mod sola_table {
    use super::*;

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
        contract::meetup::create_meetup(
            ctx, title, description, max_participants,
            country, city, location, price, date, category, image_url
        )
    }

    pub fn join_meetup(ctx: Context<JoinMeetup>) -> Result<()> {
        contract::meetup::join_meetup(ctx)
    }
}