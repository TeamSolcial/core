use anchor_lang::prelude::*;

// contract 모듈 선언
pub mod contract;

// 필요한 타입 재내보내기
pub use crate::contract::table::*;

declare_id!("8pWTbsckvHvvRN71PZ4rV2y3kexmdgRgoxgPbWYRVxsi");

#[program]
pub mod sola_table {
    use super::*;

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
        contract::table::create_table(
            ctx, title, description, max_participants,
            country, city, location, price, date, category, image_url
        )
    }

    pub fn join_table(ctx: Context<JoinTable>) -> Result<()> {
        contract::table::join_table(ctx)
    }
}