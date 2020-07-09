const algosdk = require('algosdk');
const fs = require('fs');
const templates = require('algosdk/src/logicTemplates/templates');


function recoverUserAccount() {
	// FEEYFVY7T4M742U3PUJ2JOMCGOABZOENTEDFFWTK6XIG3WJHWMY3Y543LA
	const passphrase = "prison decade action cancel accuse dinosaur shell flip onion guess pause edit dutch improve shoulder loud violin either leisure globe vehicle train aerobic able until";
	let myAccount = algosdk.mnemonicToSecretKey(passphrase);
	return myAccount;
}

function recoverSubmitterAccount() {
	// FPW4ZTTXZQ4KEATXWZC2LOQZ4UHCGRJD76A6W23ZMQUGAOGPVKRYLHXKPE
	const passphrase = "chef jaguar symptom dilemma letter puppy dismiss evolve ship marine female repair differ dash popular fortune sock slogan ramp course excite grit work abandon relief";
	let myAccount = algosdk.mnemonicToSecretKey(passphrase);
	return myAccount;
}

function recoverExchangeAccount() {
	// EFSJ7TD2N4EIJXZG7ZSFI3QSEYJ7GNKRYLJZEDEKWGP53BOYK2BKVMOMRY
	const passphrase = "wine disease picnic provide veteran regular desk sustain eagle impose cave unusual satisfy surround prize calm hedgehog chaos crash sea female gain rookie about group";
	let myAccount = algosdk.mnemonicToSecretKey(passphrase);
	return myAccount;
}

function recoverOracleAccount() {
	// ZA2Z7WK2YZXM37J475CNOMA452ATJTPZQR35TXBDH7KDGTVZUGMHEW4HDE
	const passphrase = "cherry gap field hope prevent orange worth embrace require bench shallow credit end ill arch rule upset soldier defense artist corn rack embark abstract pulp";
	let myAccount = algosdk.mnemonicToSecretKey(passphrase);
	return myAccount;
}

// Global
var client = null;
var algodClient;
let price = 1154;
let priceExpiration = 20;
let priceDecimals = 10000;
let assetAmount = 5954000;

// Betanet
// let assetId = 2654334;
// Testnet
let assetId = 10295717;

let oracleAccount = recoverOracleAccount();
let submitterAccount = recoverSubmitterAccount();

// Betanet
//let exchangeProgram = new Uint8Array(Buffer.from("ASAGBAIBCP6AogGQTiYCICFkn8x6bwiE3yb+ZFRuEiYT8zVRwtOSDIqxn92F2FaCIMg1n9laxm7N/Tz/RNcwHO6BNM35hHfZ3CM/1DNOuaGYMgQiEjEWIxIQMRAiEhAzAxAkEhAxATIAEhAzAwcoEhAxCTIDEhAzAQApEhAzAQUVJRIQMREhBBIQMwMIIQULMwEFFwoxEg8Q", "base64"));
// Testnet
let exchangeProgram = new Uint8Array(Buffer.from("ASAGBAIBCKWz9ASQTiYCICFkn8x6bwiE3yb+ZFRuEiYT8zVRwtOSDIqxn92F2FaCIMg1n9laxm7N/Tz/RNcwHO6BNM35hHfZ3CM/1DNOuaGYMgQiEjEWIxIQMRAiEhAzAxAkEhAxATIAEhAzAwcoEhAxCTIDEhAzAQApEhAzAQUVJRIQMREhBBIQMwMIIQULMwEFFwoxEg8Q", "base64"));

async function setupClient() {
	if (client == null) {
		const token = {
		}

		const server = "https://api.testnet.algoexplorer.io";
		const port = "";
		algodClient = new algosdk.Algod(token, server, port);
		client = algodClient;

	} else {
		return client;
	}

	return client;
}

function getInt64Bytes( x, len ){
	if (!len) {
		len = 8;
	}
	var bytes = new Uint8Array(len);
	do {
		bytes[--len] = x & (255);
		x = x>>8;
	} while ( len )
    return bytes;
}

var lastPriceRound;
async function priceSubmitter () {
	try {

		await setupClient();

		let params = await algodClient.getTransactionParams();
		
		let suggestedParams = {
			"genesisHash": params.genesishashb64,
			"genesisID": params.genesisID,
			"firstRound": params.lastRound,
			"lastRound": params.lastRound + 10,
			"fee": params.minFee,
			"flatFee": true
		};

		if (suggestedParams.lastRound !== lastPriceRound) {

			let oracleProgramReferenceProgramBytesReplace = Buffer.from("ASAEAZChDwUGJgEgK+3MznfMOKICd7ZFpboZ5Q4jRSP/getreWQoYDjPqqMxECISMQEyABIQMQgjDxAxBygSEDEJMgMSEDEFFyQSEDEEJQ4Q", 'base64');

			let referenceOffsets = [ /*Price*/ 7, /*LastValid*/ 8];
			let injectionVector =  [price, params.lastRound + priceExpiration];
			let injectionTypes = [templates.valTypes.INT, templates.valTypes.INT];

			var buff = templates.inject(oracleProgramReferenceProgramBytesReplace, referenceOffsets, injectionVector, injectionTypes);
			let oracleProgram = new Uint8Array(buff);			
			let lsigOracle = algosdk.makeLogicSig(oracleProgram);
			lsigOracle.sign(oracleAccount.sk);
	
			let priceObj = {
				signature: lsigOracle.get_obj_for_encoding(),
				price: price,
				decimals: 4
			}
	
			let oraclePriceSubmitterTx = algosdk.makePaymentTxnWithSuggestedParams(submitterAccount.addr,
				submitterAccount.addr, 0, undefined,
				algosdk.encodeObj(priceObj), suggestedParams);
			let oraclePriceSubmitterTxSigned = oraclePriceSubmitterTx.signTxn(submitterAccount.sk);
			let oraclePriceTx = await algodClient.sendRawTransaction(oraclePriceSubmitterTxSigned);
			lastPriceRound = suggestedParams.lastRound;
			console.log("Price Transaction Submitted: " + oraclePriceTx.txId);
			price++;
		}
	} catch (err) {
		console.log("err", err);
	}
	setTimeout(priceSubmitter, 4300);
}

async function submitOracleTransactions() {

	try {
		await setupClient();

		let userAccount = recoverUserAccount();
		let exchangeAccount = recoverExchangeAccount();

		let oracleFee = 250000;

		// get network suggested parameters
		let params = await algodClient.getTransactionParams();
		
		let suggestedParams = {
			"genesisHash": params.genesishashb64,
			"genesisID": params.genesisID,
			"firstRound": params.lastRound,
			"lastRound": params.lastRound + 8,
			"fee": params.minFee,
			"flatFee": true
		};

		let lsigExchange = algosdk.makeLogicSig(exchangeProgram);
		lsigExchange.sign(exchangeAccount.sk);

		let oracleRetrieveTx;

		// get the last price submitted
		// filter the txs that are not from the submitter because it can be in the to field as part of the Oracle fee payment
		do {
			let apiRes = await algodClient.transactionByAddress(submitterAccount.addr, undefined, undefined, 1);
			if (apiRes.transactions.length !== 1) {
				console.log ("Error: Cannot find Oracle transactions.")
				return;
			}
			oracleRetrieveTx = apiRes.transactions[0];
		} while (oracleRetrieveTx.from !== submitterAccount.addr);

		console.log("Transaction: " + oracleRetrieveTx.tx)
		let priceMessagePackDecoded = algosdk.decodeObj(oracleRetrieveTx.note);

		let decodedLsig = priceMessagePackDecoded.signature;
		lsigOracle = algosdk.makeLogicSig(decodedLsig.l, decodedLsig.arg);
        lsigOracle.sig = decodedLsig.sig;
        lsigOracle.msig = decodedLsig.msig;

		// Feed tx
		// let oracleFeedTx = algosdk.makePaymentTxnWithSuggestedParams(userAccount.addr,
		// 	oracleAccount.addr, 200000, undefined,
		// 	new Uint8Array(0), suggestedParams);
		// let oracleFeedTxSigned = oracleFeedTx.signTxn(userAccount.sk);
		// let feedTx = (await algodClient.sendRawTransaction(oracleFeedTxSigned));

		// created Betanet: 2654204
		// created Testanet: 10295717
		// let createAssetTx = algosdk.makeAssetCreateTxnWithSuggestedParams(userAccount.addr, new Uint8Array(Buffer.from("Lecop Asset", "utf8")), 1000000000000, 6,
		//  	false, userAccount.addr, userAccount.addr, userAccount.addr, userAccount.addr, "LEC", "Lecop", "https://randlabs.io", undefined,
		//  	suggestedParams);
		// let createAssetTxSigned = createAssetTx.signTxn(userAccount.sk);
		// let createAssetTxMined = (await algodClient.sendRawTransaction(createAssetTxSigned));

		// let assetDestroy = algosdk.makeAssetDestroyTxnWithSuggestedParams(userAccount.addr, new Uint8Array(0), 2654202, suggestedParams);
		// let assetDestroySigned = assetDestroy.signTxn(userAccount.sk);
		// let assetDestroyMined = (await algodClient.sendRawTransaction(assetDestroySigned));
		
		// Transaction 0
		// pay Oracle fee 
		let oracleFeeTx = algosdk.makePaymentTxnWithSuggestedParams(userAccount.addr,
			oracleAccount.addr, oracleFee + 1000, undefined,
			new Uint8Array(0), suggestedParams);

		let note = getInt64Bytes(priceMessagePackDecoded.price);
		// Transaction 1
		// insert price from the oracle account and send the fee to the submitter
		let oracleTx = algosdk.makePaymentTxnWithSuggestedParams(oracleAccount.addr, 
		    submitterAccount.addr, oracleFee, undefined, 
		    note, suggestedParams);

		// Transaction 2
		// send assets from Exchange to User 
		let exchangeTx = algosdk.makeAssetTransferTxnWithSuggestedParams(exchangeAccount.addr,
			userAccount.addr, undefined, undefined, 
			assetAmount, new Uint8Array(Buffer.from("Price: " + priceMessagePackDecoded.price, "utf8")), assetId, suggestedParams);
		
		// Transaction 3 
		// send algos needed to buy assetAmount assets based on price
		let algosTx = algosdk.makePaymentTxnWithSuggestedParams(userAccount.addr, 
			exchangeAccount.addr, Math.ceil(assetAmount*priceMessagePackDecoded.price/priceDecimals), undefined, 
			new Uint8Array(Buffer.from("Price: " + priceMessagePackDecoded.price, "utf8")), suggestedParams);
		
		// Store all transactions
		let txns = [oracleFeeTx, oracleTx, exchangeTx, algosTx];

		// Group all transactions
		let txgroup = algosdk.assignGroupID(txns);

		// Sign each transaction in the group with correct key or LogicSig
		let signed = []
		let oracleFeeTxSigned = oracleFeeTx.signTxn(userAccount.sk);
		let oracleTxSigned = algosdk.signLogicSigTransactionObject(oracleTx, lsigOracle);
		let exchangeTxSigned = algosdk.signLogicSigTransactionObject(exchangeTx, lsigExchange);
		let algosTxSigned = algosTx.signTxn(userAccount.sk);

		signed.push(oracleFeeTxSigned);
		signed.push(oracleTxSigned.blob);
		signed.push(exchangeTxSigned.blob);
		signed.push(algosTxSigned);

		let tx = (await algodClient.sendRawTransactions(signed));
		console.log("Transaction : " + tx.txId);
		console.log("Success!");
	} catch (err) {
		console.log("err", err);
	}
}

setInterval(submitOracleTransactions, 15000);
setTimeout(priceSubmitter);

