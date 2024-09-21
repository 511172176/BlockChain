const { HDNode } = require("@ethersproject/hdnode");

async function main() {
  const mnemonic = 'peace letter wealth foam drip custom rose outside tragic cheese express cluster';  // 在這裡輸入您的助記詞
  const hdNode = HDNode.fromMnemonic(mnemonic);

  console.log("Address:", hdNode.address);
  console.log("Private Key:", hdNode.privateKey);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
