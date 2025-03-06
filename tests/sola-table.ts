import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolaTable } from "../target/types/sola_table";
import { expect } from "chai";

describe("sola-table", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolaTable as Program<SolaTable>;
  const provider = anchor.getProvider();

  it("Create a new meetup", async () => {
    // Generate a new keypair for the meetup account
    const meetupKeypair = anchor.web3.Keypair.generate();

    // Meetup data
    const title = "Solana Developer Meetup";
    const description = "Join us for an exciting Solana development workshop!";
    const maxParticipants = 20;
    const country = "South Korea";
    const city = "Seoul";
    const location = "Gangnam District";
    const price = new anchor.BN(10_000_000); // 10 STT (10 * 10^6)
    const date = new anchor.BN(Date.now() / 1000);
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
});
