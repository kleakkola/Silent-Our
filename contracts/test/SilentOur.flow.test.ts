import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import hre from "hardhat";

import type { SilentOur } from "../types/contracts/SilentOur";

describe("SilentOur FHE flow: add record -> query All Time -> decrypt", function () {
  let silentOur: SilentOur;
  let contractAddress: string;

  beforeEach(async function () {
    const [user] = await hre.ethers.getSigners();

    const factory = await hre.ethers.getContractFactory("SilentOur");
    silentOur = (await factory.connect(user).deploy()) as SilentOur;
    await silentOur.waitForDeployment();
    contractAddress = await silentOur.getAddress();

    // Ensure FHEVM Coprocessor is initialized (local mock environment)
    await hre.fhevm.assertCoprocessorInitialized(silentOur, "SilentOur");
  });

  it("user submits record -> query All Time records -> decrypt All Time records", async function () {
    const [user] = await hre.ethers.getSigners();

    // 1. User submits an offline time record (e.g. 120 minutes)
    const minutes = 120;

    // Use FHEVM mock environment to encrypt the input locally
    const input = hre.fhevm.createEncryptedInput(contractAddress, user.address);
    input.add32(minutes);
    const encryptedInput = await input.encrypt();

    const encryptedMinutes = encryptedInput.handles[0];
    const inputProof = encryptedInput.inputProof;

    // Call addOfflineRecord to store the encrypted record on-chain
    const tx = await silentOur
      .connect(user)
      .addOfflineRecord(encryptedMinutes, inputProof);
    await tx.wait();

    // Verify that the record count is 1
    const recordCount = await silentOur.getRecordCount(user.address);
    expect(recordCount).to.equal(1n);

    // 2. User queries All Time records (read all stored encrypted records)
    const firstRecord = await silentOur.dailyOfflineRecords(user.address, 0n);
    const encryptedMinutesHandle = firstRecord.encryptedMinutes;

    // 3. User decrypts the All Time records (here: the first and only record)
    const minutesClear = await hre.fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedMinutesHandle,
      contractAddress,
      user
    );

    // With a single 120-minute record, the decrypted value should equal 120
    const expected = BigInt(minutes);
    expect(minutesClear).to.equal(expected);
  });
});


