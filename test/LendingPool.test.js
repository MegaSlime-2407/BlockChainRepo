const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
  let token, pool;
  let owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestToken");
    token = await Token.deploy();

    const Pool = await ethers.getContractFactory("LendingPool");
    pool = await Pool.deploy(token.target);

    await token.transfer(user.address, ethers.parseEther("100"));
  });

  it("User can deposit tokens", async function () {
    await token.connect(user).approve(pool.target, ethers.parseEther("10"));
    await pool.connect(user).deposit(ethers.parseEther("10"));

    expect(await pool.deposits(user.address))
      .to.equal(ethers.parseEther("10"));
  });

  it("Total deposited increases", async function () {
    await token.connect(user).approve(pool.target, ethers.parseEther("5"));
    await pool.connect(user).deposit(ethers.parseEther("5"));

    expect(await pool.totalDeposited())
      .to.equal(ethers.parseEther("5"));
  });

  it("User can withdraw tokens", async function () {
    await token.connect(user).approve(pool.target, ethers.parseEther("20"));
    await pool.connect(user).deposit(ethers.parseEther("20"));

    await pool.connect(user).withdraw(ethers.parseEther("5"));

    expect(await pool.deposits(user.address))
      .to.equal(ethers.parseEther("15"));
  });

  it("Cannot withdraw more than deposited", async function () {
    await token.connect(user).approve(pool.target, ethers.parseEther("5"));
    await pool.connect(user).deposit(ethers.parseEther("5"));

    await expect(
      pool.connect(user).withdraw(ethers.parseEther("10"))
    ).to.be.reverted;
  });

  it("Deposit zero should fail", async function () {
    await expect(
      pool.connect(user).deposit(0)
    ).to.be.reverted;
  });

  it("Withdraw zero should fail", async function () {
    await expect(
      pool.connect(user).withdraw(0)
    ).to.be.reverted;
  });
});
