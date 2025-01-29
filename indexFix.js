import dotenv from "dotenv";
import { ethers } from "ethers";
import fetch from "node-fetch";
import cfonts from "cfonts";
import chalk from "chalk";

// Load environment variables
dotenv.config();

// Helper function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// RPC URL & API
const RPC_URL = process.env.RPC_URL;
const API_URL = process.env.API_URL;
const PRIVATE_KEYS =
  process.env.PRIVATE_KEYS?.split(",").map((pk) => pk.trim()) || [];

const HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
};

// Validasi
if (!RPC_URL || !API_URL || PRIVATE_KEYS.length === 0) {
  console.error(
    "❌ PRIVATE_KEYS, RPC_URL, atau API_URL tidak ditemukan di .env!"
  );
  process.exit(1);
}

// Konfigurasi Provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Kontrak WMATIC
const wmaticAbi = ["function deposit() public payable"];
const wmaticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

// Jumlah transaksi yang ingin dilakukan
const LOOPS = 100000;
const AMOUNT_TO_WRAP = ethers.parseEther("0.00015");

// Tampilkan banner
cfonts.say("NT Exhaust", {
  font: "block",
  align: "center",
  colors: ["cyan", "magenta"],
  background: "black",
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: "0",
});
console.log(
  chalk.green("=== Telegram Channel : NT Exhaust ( @NTExhaust ) ===")
);

// Fungsi utama untuk setiap wallet
async function processWallet(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`\n🚀 Memulai transaksi untuk Wallet: ${wallet.address}`);

    // Cek saldo awal
    let balance = await provider.getBalance(wallet.address);
    console.log(`💰 Saldo awal: ${ethers.formatUnits(balance, "ether")} MATIC`);

    if (balance < AMOUNT_TO_WRAP) {
      console.error(
        `❌ Saldo tidak cukup untuk transaksi di ${wallet.address}`
      );
      return;
    }

    const contract = new ethers.Contract(wmaticAddress, wmaticAbi, wallet);

    for (let i = 1; i <= LOOPS; i++) {
      console.log(`\n🔁 [${wallet.address}] Loop ${i} dari ${LOOPS}`);

      let retry = true;
      while (retry) {
        try {
          console.log(`🔄 [${wallet.address}] Wrapping MATIC to WMATIC...`);
          const txResponse = await contract.deposit({ value: AMOUNT_TO_WRAP });
          console.log(`✅ [${wallet.address}] TX Hash: ${txResponse.hash}`);

          const receipt = await txResponse.wait();
          console.log(
            `✅ [${wallet.address}] Transaksi sukses: ${receipt.transactionHash}`
          );

          // Kirim ke API
          const payload = {
            blockchainId: 137,
            type: 2,
            walletAddress: wallet.address,
            hash: txResponse.hash,
            fromTokenAddress: "0x0000000000000000000000000000000000000000",
            toTokenAddress: wmaticAddress,
            fromTokenSymbol: "POL",
            toTokenSymbol: "WPOL",
            fromAmount: AMOUNT_TO_WRAP.toString(),
            toAmount: AMOUNT_TO_WRAP.toString(),
            gasFeeTokenAddress: "0x0000000000000000000000000000000000000000",
            gasFeeTokenSymbol: "POL",
            gasFeeAmount: "8055000012888000",
          };

          const response = await fetch(API_URL, {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.error(
              `❌ [${wallet.address}] API Error: ${response.status}`
            );
            retry = false;
          } else {
            const result = await response.json();
            console.log(`✅ [${wallet.address}] API Response:`, result);
            retry = false;
          }
        } catch (error) {
          console.error(`❌ [${wallet.address}] Error:`, error.message);
          if (error.message.includes("Too many requests")) {
            console.log(`⏳ Rate limit! Retry dalam 1 menit...`);
            await delay(60000);
          } else {
            retry = false;
          }
        }
      }
      console.log(
        `🕐 [${wallet.address}] Menunggu 1 menit sebelum transaksi berikutnya...`
      );
      await delay(2000);
    }
  } catch (error) {
    console.error(`❌ [ERROR Wallet]`, error.message);
  }
}

// Jalankan semua wallet secara paralel
async function main() {
  console.log(
    `🛠 Menjalankan transaksi untuk ${PRIVATE_KEYS.length} wallet...\n`
  );
  await Promise.all(PRIVATE_KEYS.map((pk) => processWallet(pk)));
  console.log("\n✅ Semua transaksi selesai!");
}

main();
