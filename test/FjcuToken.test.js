const chai = require('chai');
const { expect } = chai;

describe("FjcuToken", function () {
  let FjcuToken, fjcuToken, owner, addr1, addr2;

  beforeEach(async function () {
    FjcuToken = await ethers.getContractFactory("FjcuToken");
    [owner, addr1, addr2, _] = await ethers.getSigners();
    fjcuToken = await FjcuToken.deploy(21000000);
    await fjcuToken.deployed();
  });

  it("應該設置正確的名稱和符號", async function () {
    expect(await fjcuToken.name()).to.equal("fjcu");
    expect(await fjcuToken.symbol()).to.equal("FJCU");
  });

  it("應該為部署者分配初始供應量", async function () {
    const ownerBalance = await fjcuToken.balanceOf(owner.address);
    expect(await fjcuToken.totalSupply()).to.equal(ownerBalance);
  });

  it("應該能夠轉帳代幣", async function () {
    await fjcuToken.transfer(addr1.address, 1000);
    const addr1Balance = await fjcuToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(1000);
  });

  it("應該拒絕超出餘額的轉帳", async function () {
    const initialOwnerBalance = await fjcuToken.balanceOf(owner.address);
    await expect(
      fjcuToken.transfer(addr1.address, initialOwnerBalance + 1)
    ).to.be.revertedWith("ERC20InsufficientBalance");
  });  
});
