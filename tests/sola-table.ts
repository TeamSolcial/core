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
    // 테이블이 생성되어 있어야 함 (이전 테스트에서 생성됨)
    // 참가 요청
    await program.methods
        .joinTable()
        .accounts({
          table: tableKeypair.publicKey,
          participant: provider.publicKey,
        })
        .rpc();

    // 테이블 계정 가져오기
    const tableAccount = await program.account.table.fetch(tableKeypair.publicKey);

    // 참가자가 추가되었는지 확인
    expect(tableAccount.participants.length).to.equal(1);
    expect(tableAccount.participants[0].toString()).to.equal(provider.publicKey.toString());
  });

  it("Fails to join a full table", async () => {
    // 가득 찬 테이블을 위한 새 키페어 생성
    const fullTableKeypair = anchor.web3.Keypair.generate();

    // 참가자 최대 수가 1인 테이블 생성
    await program.methods
        .createTable(
            "Small Table",
            "A very small table with limited capacity",
            1, // maxParticipants = 1
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

    // 첫 번째 참가자 등록 (성공해야 함)
    await program.methods
        .joinTable()
        .accounts({
          table: fullTableKeypair.publicKey,
          participant: provider.publicKey,
        })
        .rpc();

    // 두 번째 참가자 등록 시도 (실패해야 함)
    try {
      await program.methods
          .joinTable()
          .accounts({
            table: fullTableKeypair.publicKey,
            participant: provider.publicKey,
          })
          .rpc();

      // 여기까지 실행되면 테스트 실패
      assert.fail("Expected to throw an error when joining a full table");
    } catch (error) {
      // 에러가 TableFull 인지 확인
      expect(error.message).to.include("The table is full");
    }
  });

  it("Fails to join an expired table", async () => {
    // 만료된 테이블을 위한 새 키페어 생성
    const expiredTableKeypair = anchor.web3.Keypair.generate();

    // 과거 날짜로 테이블 생성
    const pastDate = new anchor.BN(Date.now() / 1000 - 86400); // 하루 전

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

    // 만료된 테이블 참가 시도 (실패해야 함)
    try {
      await program.methods
          .joinTable()
          .accounts({
            table: expiredTableKeypair.publicKey,
            participant: provider.publicKey,
          })
          .rpc();

      // 여기까지 실행되면 테스트 실패
      assert.fail("Expected to throw an error when joining an expired table");
    } catch (error) {
      // 에러가 TableExpired 인지 확인
      expect(error.message).to.include("The table date has passed");
    }
  });
});