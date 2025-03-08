import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolaTable } from "../target/types/sola_table";
import { expect } from "chai";

describe("table", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolaTable as Program<SolaTable>;

  it("Creates a new table", async () => {
    const table = anchor.web3.Keypair.generate();
    const title = "Test Table";
    
    await program.methods
      .createTable(
        title,
        "Description",
        5,
        "Korea",
        "Seoul",
        "Location",
        new anchor.BN(1000),
        new anchor.BN(Date.now() / 1000 + 86400), // tomorrow
        "Study",
        "image.url"
      )
      .accounts({
        table: table.publicKey,
        organizer: provider.wallet.publicKey
      })
      .signers([table])
      .rpc();

    const tableAccount = await program.account.table.fetch(table.publicKey);
    expect(tableAccount.title).to.equal(title);
  });

  it("Allows a user to join a table", async () => {
    const table = anchor.web3.Keypair.generate();
    const participant = anchor.web3.Keypair.generate();
    
    // Create table first
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
        organizer: provider.wallet.publicKey
      })
      .signers([table])
      .rpc();

    // Join table
    await program.methods
      .joinTable()
      .accounts({
        table: table.publicKey,
        participant: participant.publicKey,
      })
      .signers([participant])
      .rpc();

    const tableAccount = await program.account.table.fetch(table.publicKey);
    expect(tableAccount.participants).to.include(participant.publicKey);
  });

  it("Prevents organizer from joining their own table", async () => {
    const table = anchor.web3.Keypair.generate();
    
    // Create table
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
        organizer: provider.wallet.publicKey
      })
      .signers([table])
      .rpc();

    // Try to join as organizer
    try {
      await program.methods
        .joinTable()
        .accounts({
          table: table.publicKey,
          participant: provider.wallet.publicKey,
        })
        .rpc();
      expect.fail("Should not allow organizer to join");
    } catch (err) {
      expect(err.error.code).to.equal("OrganizerCannotJoin");
    }
  });

  it("Prevents duplicate joins", async () => {
    const table = anchor.web3.Keypair.generate();
    const participant = anchor.web3.Keypair.generate();
    
    // Create and join table first
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
        organizer: provider.wallet.publicKey
      })
      .signers([table])
      .rpc();

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
      expect.fail("Should not allow duplicate joins");
    } catch (err) {
      expect(err.error.code).to.equal("AlreadyJoined");
    }
  });
});