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
  let tableKeypair: anchor.web3.Keypair;

  // Create a new wallet for participant tests
  const participantKeypair = anchor.web3.Keypair.generate();

  it("Create a new table", async () => {
    // Generate a new keypair for the table account
    tableKeypair = anchor.web3.Keypair.generate();

    // Table data
    const title = "Solana Developer Table";
    const description = "Join us for an exciting Solana development workshop!";
    const maxParticipants = 20;
    const country = "South Korea";
    const city = "Seoul";
    const location = "Gangnam District";
    const price = new anchor.BN(10_000_000); // 10 STT (10 * 10^6)
    const date = new anchor.BN(Date.now() / 1000 + 86400); // 내일 (24시간 후)
    const category = "Technology";
    const imageUrl = "https://example.com/table-image.jpg";

    // Create the table
    await program.methods
        .createTable(
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
          table: tableKeypair.publicKey,
          organizer: provider.publicKey
        })
        .signers([tableKeypair])
        .rpc();

    // Fetch the table account
    const tableAccount = await program.account.table.fetch(tableKeypair.publicKey);

    // Verify all fields
    expect(tableAccount.organizer.toString()).to.equal(provider.publicKey.toString());
    expect(tableAccount.title).to.equal(title);
    expect(tableAccount.description).to.equal(description);
    expect(tableAccount.maxParticipants).to.equal(maxParticipants);
    expect(tableAccount.participants.length).to.equal(0);
    expect(tableAccount.country).to.equal(country);
    expect(tableAccount.city).to.equal(city);
    expect(tableAccount.location).to.equal(location);
    expect(tableAccount.price.toString()).to.equal(price.toString());
    expect(tableAccount.date.toString()).to.equal(date.toString());
    expect(tableAccount.category).to.equal(category);
    expect(tableAccount.imageUrl).to.equal(imageUrl);
  });

  it("Join an existing table", async () => {
    await program.methods
        .joinTable()
        .accounts({
          table: tableKeypair.publicKey,
          participant: participantKeypair.publicKey, // Use different wallet
        })
        .signers([participantKeypair])
        .rpc();

    const tableAccount = await program.account.table.fetch(tableKeypair.publicKey);
    expect(tableAccount.participants.length).to.equal(1);
    expect(tableAccount.participants[0].toString()).to.equal(participantKeypair.publicKey.toString());
  });

  it("Fails to join a full table", async () => {
    const fullTableKeypair = anchor.web3.Keypair.generate();
    const participant1 = anchor.web3.Keypair.generate();
    const participant2 = anchor.web3.Keypair.generate();

    await program.methods
        .createTable(
            "Small Table",
            "A very small table with limited capacity",
            1,
            "South Korea",
            "Seoul",
            "Gangnam",
            new anchor.BN(10_000_000),
            new anchor.BN(Date.now() / 1000 + 86400),
            "Technology",
            "https://example.com/small-table.jpg"
        )
        .accounts({
          table: fullTableKeypair.publicKey,
          organizer: provider.publicKey
        })
        .signers([fullTableKeypair])
        .rpc();

    // First participant joins
    await program.methods
        .joinTable()
        .accounts({
          table: fullTableKeypair.publicKey,
          participant: participant1.publicKey,
        })
        .signers([participant1])
        .rpc();

    // Second participant tries to join
    try {
      await program.methods
          .joinTable()
          .accounts({
            table: fullTableKeypair.publicKey,
            participant: participant2.publicKey,
          })
          .signers([participant2])
          .rpc();
      assert.fail("Expected to throw TableFull error");
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal("TableFull");
    }
  });

  it("Fails to join an expired table", async () => {
    const expiredTableKeypair = anchor.web3.Keypair.generate();
    const participant = anchor.web3.Keypair.generate();
    const pastDate = new anchor.BN(Date.now() / 1000 - 86400);

    await program.methods
        .createTable(
            "Past Table",
            "This table already happened",
            10,
            "South Korea",
            "Seoul",
            "Gangnam",
            new anchor.BN(10_000_000),
            pastDate,
            "Technology",
            "https://example.com/past-table.jpg"
        )
        .accounts({
          table: expiredTableKeypair.publicKey,
          organizer: provider.publicKey
        })
        .signers([expiredTableKeypair])
        .rpc();

    try {
      await program.methods
          .joinTable()
          .accounts({
            table: expiredTableKeypair.publicKey,
            participant: participant.publicKey,
          })
          .signers([participant])
          .rpc();
      assert.fail("Expected to throw TableExpired error");
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal("TableExpired");
    }
  });

  it("Prevents organizer from joining their own table", async () => {
    const table = anchor.web3.Keypair.generate();
    
    await program.methods
      .createTable(
        "Test Table",
        "Description",
        5,
        "Korea",
        "Seoul",
        "Location",
        new anchor.BN(1000),
        new anchor.BN(Date.now() / 1000 + 86400),
        "Study",
        "image.url"
      )
      .accounts({
        table: table.publicKey,
        organizer: provider.publicKey
      })
      .signers([table])
      .rpc();

    try {
      await program.methods
        .joinTable()
        .accounts({
          table: table.publicKey,
          participant: provider.publicKey,
        })
        .rpc();
      assert.fail("Expected to throw OrganizerCannotJoin error");
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal("OrganizerCannotJoin");
    }
  });

  it("Prevents duplicate joins", async () => {
    const table = anchor.web3.Keypair.generate();
    const participant = anchor.web3.Keypair.generate();
    
    await program.methods
      .createTable(
        "Test Table",
        "Description",
        5,
        "Korea",
        "Seoul",
        "Location",
        new anchor.BN(1000),
        new anchor.BN(Date.now() / 1000 + 86400),
        "Study",
        "image.url"
      )
      .accounts({
        table: table.publicKey,
        organizer: provider.publicKey
      })
      .signers([table])
      .rpc();

    // First join
    await program.methods
      .joinTable()
      .accounts({
        table: table.publicKey,
        participant: participant.publicKey,
      })
      .signers([participant])
      .rpc();

    // Try to join again
    try {
      await program.methods
        .joinTable()
        .accounts({
          table: table.publicKey,
          participant: participant.publicKey,
        })
        .signers([participant])
        .rpc();
      assert.fail("Expected to throw AlreadyJoined error");
    } catch (error: any) {
      expect(error.error.errorCode.code).to.equal("AlreadyJoined");
    }
  });
});