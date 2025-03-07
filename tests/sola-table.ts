import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolaTable } from "../target/types/sola_table";
import { expect } from "chai";
import * as assert from "node:assert";

describe("sola-table", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolaTable as Program<SolaTable>;
  const provider = anchor.getProvider();
  let meetupKeypair: anchor.web3.Keypair;

  it("Create a new meetup", async () => {
    // Generate a new keypair for the meetup account
    meetupKeypair = anchor.web3.Keypair.generate();

    // Meetup data
    const title = "Solana Developer Meetup";
    const description = "Join us for an exciting Solana development workshop!";
    const maxParticipants = 20;
    const country = "South Korea";
    const city = "Seoul";
    const location = "Gangnam District";
    const price = new anchor.BN(10_000_000); // 10 STT (10 * 10^6)
    const date = new anchor.BN(Date.now() / 1000 + 86400); // 내일 (24시간 후)
    const category = "Technology";
    const imageUrl = "https://example.com/meetup-image.jpg";

    // Create the meetup
    await program.methods
        .createMeetup(
            title,
            description,
            maxParticipants,
            country,
            city,
            location,
            price,
            date,
            category,
            imageUrl
        )
        .accounts({
          meetup: meetupKeypair.publicKey,
          organizer: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([meetupKeypair])
        .rpc();

    // Fetch the meetup account
    const meetupAccount = await program.account.meetup.fetch(meetupKeypair.publicKey);

    // Verify all fields
    expect(meetupAccount.organizer.toString()).to.equal(provider.publicKey.toString());
    expect(meetupAccount.title).to.equal(title);
    expect(meetupAccount.description).to.equal(description);
    expect(meetupAccount.maxParticipants).to.equal(maxParticipants);
    expect(meetupAccount.currentParticipants).to.equal(0);
    expect(meetupAccount.country).to.equal(country);
    expect(meetupAccount.city).to.equal(city);
    expect(meetupAccount.location).to.equal(location);
    expect(meetupAccount.price.toString()).to.equal(price.toString());
    expect(meetupAccount.date.toString()).to.equal(date.toString());
    expect(meetupAccount.category).to.equal(category);
    expect(meetupAccount.imageUrl).to.equal(imageUrl);
  });

  it("Join an existing meetup", async () => {
    // 미팅이 생성되어 있어야 함 (이전 테스트에서 생성됨)
    // 참가 요청
    await program.methods
        .joinMeetup()
        .accounts({
          meetup: meetupKeypair.publicKey,
          participant: provider.publicKey,
        })
        .rpc();

    // 미팅 계정 가져오기
    const meetupAccount = await program.account.meetup.fetch(meetupKeypair.publicKey);

    // 참가자 수가 1 증가했는지 확인
    expect(meetupAccount.currentParticipants).to.equal(1);
  });

  it("Fails to join a full meetup", async () => {
    // 가득 찬 미팅을 위한 새 키페어 생성
    const fullMeetupKeypair = anchor.web3.Keypair.generate();

    // 참가자 최대 수가 1인 미팅 생성
    await program.methods
        .createMeetup(
            "Small Meetup",
            "A very small meetup with limited capacity",
            1, // maxParticipants = 1
            "South Korea",
            "Seoul",
            "Gangnam",
            new anchor.BN(10_000_000),
            new anchor.BN(Date.now() / 1000 + 86400),
            "Technology",
            "https://example.com/small-meetup.jpg"
        )
        .accounts({
          meetup: fullMeetupKeypair.publicKey,
          organizer: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([fullMeetupKeypair])
        .rpc();

    // 첫 번째 참가자 등록 (성공해야 함)
    await program.methods
        .joinMeetup()
        .accounts({
          meetup: fullMeetupKeypair.publicKey,
          participant: provider.publicKey,
        })
        .rpc();

    // 두 번째 참가자 등록 시도 (실패해야 함)
    try {
      await program.methods
          .joinMeetup()
          .accounts({
            meetup: fullMeetupKeypair.publicKey,
            participant: provider.publicKey,
          })
          .rpc();

      // 여기까지 실행되면 테스트 실패
      assert.fail("Expected to throw an error when joining a full meetup");
    } catch (error) {
      // 에러가 MeetupFull 인지 확인
      expect(error.message).to.include("The meetup is full");
    }
  });

  it("Fails to join an expired meetup", async () => {
    // 만료된 미팅을 위한 새 키페어 생성
    const expiredMeetupKeypair = anchor.web3.Keypair.generate();

    // 과거 날짜로 미팅 생성
    const pastDate = new anchor.BN(Date.now() / 1000 - 86400); // 하루 전

    await program.methods
        .createMeetup(
            "Past Meetup",
            "This meetup already happened",
            10,
            "South Korea",
            "Seoul",
            "Gangnam",
            new anchor.BN(10_000_000),
            pastDate,
            "Technology",
            "https://example.com/past-meetup.jpg"
        )
        .accounts({
          meetup: expiredMeetupKeypair.publicKey,
          organizer: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([expiredMeetupKeypair])
        .rpc();

    // 만료된 미팅 참가 시도 (실패해야 함)
    try {
      await program.methods
          .joinMeetup()
          .accounts({
            meetup: expiredMeetupKeypair.publicKey,
            participant: provider.publicKey,
          })
          .rpc();

      // 여기까지 실행되면 테스트 실패
      assert.fail("Expected to throw an error when joining an expired meetup");
    } catch (error) {
      // 에러가 MeetupExpired 인지 확인
      expect(error.message).to.include("The meetup date has passed");
    }
  });
});