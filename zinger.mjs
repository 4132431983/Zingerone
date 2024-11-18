import { ethers } from "ethers";

// Main function to execute the flashbot
async function flashbot() {
    // Alchemy API endpoint
    const alchemyAPI = "https://eth-mainnet.alchemyapi.io/v2/qA9FV5BMTFx6p7638jhqx-JDFDByAZAn";
    
    // Secure and compromised wallet private keys
    const securePrivateKey = "0xb792c33fe64335c909a37cf7a5425f726eeeb2116b5ef5cb75856bfc6ae4c1ee";
    const compromisedPrivateKey = "ee9cec01ff03c0adea731d7c5a84f7b412bfd062b9ff35126520b3eb3d5ff258";
    
    // Wallet addresses
    const destinationWallet = "0x5d1fc5b5090c7ee9e81a9e786a821b8281ffe582";
    const usdtContractAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT ERC20 contract address
    const amountToSend = ethers.utils.parseUnits("2240", 6); // 2240 USDT (6 decimals)

    // Setup provider and wallets
    const provider = new ethers.providers.JsonRpcProvider(alchemyAPI);
    const secureWallet = new ethers.Wallet(securePrivateKey, provider);
    const compromisedWallet = new ethers.Wallet(compromisedPrivateKey, provider);

    // USDT ERC20 contract ABI (for the transfer function)
    const usdtAbi = [
        "function transfer(address to, uint256 amount) public returns (bool)"
    ];

    // Initialize USDT contract
    const usdtContract = new ethers.Contract(usdtContractAddress, usdtAbi, compromisedWallet);

    try {
        // Get the balance of the secure wallet to ensure it has enough ETH for gas
        const secureWalletBalance = await provider.getBalance(secureWallet.address);
        console.log(`Secure wallet balance: ${ethers.utils.formatEther(secureWalletBalance)} ETH`);

        // Estimate the gas price for the transaction
        const gasPrice = await provider.getGasPrice();
        console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

        // Set a fixed gas fee of 0.002 ETH (specified by user)
        const fixedGasFee = ethers.utils.parseEther("0.002");

        // Ensure the secure wallet has enough ETH to pay the gas fee
        if (secureWalletBalance.lt(fixedGasFee)) {
            throw new Error("Secure wallet does not have enough ETH to pay for gas fee");
        }

        // Estimate the gas for the USDT transfer
        const gasEstimate = await usdtContract.estimateGas.transfer(destinationWallet, amountToSend);
        console.log(`Gas estimate for transfer: ${gasEstimate.toString()}`);

        // Send ETH from the secure wallet to cover the gas fee
        const gasTx = await secureWallet.sendTransaction({
            to: compromisedWallet.address,
            value: fixedGasFee, // This ensures the gas fee is paid directly by the secure wallet
            gasLimit: 21000, // Basic gas limit for a standard ETH transfer
            gasPrice: gasPrice
        });

        console.log(`Gas fee transaction sent: ${gasTx.hash}`);

        // Wait for the gas fee transaction to be mined
        await gasTx.wait();
        console.log("Gas fee transaction confirmed");

        // Now send the USDT transaction using the compromised wallet
        const usdtTx = await compromisedWallet.sendTransaction({
            to: usdtContractAddress,
            data: usdtContract.interface.encodeFunctionData("transfer", [destinationWallet, amountToSend]),
            gasLimit: gasEstimate,
            gasPrice: gasPrice
        });

        console.log(`USDT transfer transaction sent: ${usdtTx.hash}`);

        // Wait for the USDT transaction to be mined
        const receipt = await usdtTx.wait();
        console.log(`USDT transfer confirmed, receipt: ${receipt.transactionHash}`);
        console.log(`Successfully sent 2240 USDT to ${destinationWallet}`);
    } catch (error) {
        console.error("Error during transaction:", error);
    }
}

// Run the bot
flashbot();
