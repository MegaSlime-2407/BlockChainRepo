const { expect } = require("chai");
const { ethers } = require("hardhat");

const one = ethers.parseEther("1");
const five = ethers.parseEther("5");

describe("Re-entrancy: BEFORE fix (Vulnerable.sol)", function () {
  it("Exploit drains the vault; attacker receives more than their deposit", async function () {
    const [deployer] = await ethers.getSigners();

    const Vulnerable = await ethers.getContractFactory("Vulnerable");
    const vault = await Vulnerable.deploy();
    await vault.waitForDeployment();

    await vault.deposit({ value: five });
    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(vault.target);
    await attacker.waitForDeployment();

    const vaultBefore = await ethers.provider.getBalance(vault.target);
    expect(vaultBefore).to.equal(five);

    await attacker.attack({ value: one });

    const vaultAfter = await ethers.provider.getBalance(vault.target);
    const attackerAfter = await ethers.provider.getBalance(attacker.target);

    expect(vaultAfter).to.equal(0n);
    expect(attackerAfter).to.be.gt(one);
    expect(attackerAfter).to.equal(five + one); // stole 5 (others) + 1 (own)
  });
});

describe("Re-entrancy: AFTER fix (VulnerableFixed.sol)", function () {
  it("Exploit does not drain the vault; attacker only gets their deposit back", async function () {
    const [deployer] = await ethers.getSigners();

    const VulnerableFixed = await ethers.getContractFactory("VulnerableFixed");
    const vault = await VulnerableFixed.deploy();
    await vault.waitForDeployment();

    await vault.deposit({ value: five });

    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(vault.target);
    await attacker.waitForDeployment();

    await attacker.attack({ value: one });

    const vaultAfter = await ethers.provider.getBalance(vault.target);
    const attackerAfter = await ethers.provider.getBalance(attacker.target);

    expect(vaultAfter).to.equal(five);
    expect(attackerAfter).to.equal(one);
  });
});
