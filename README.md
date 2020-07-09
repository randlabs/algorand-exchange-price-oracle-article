# Algorand Exchange Price Oracle

## Files

This code allows to exchange algos for tokens based on the price given by an Oracle all happening in a transaction group atomically.

**oracle-delegated.teal:** verifies that the oracle gets the oracle fee, the integrity of the price located on the Node field and that the price is valid

**asset-exchange.teal:**	verifies that the 2 exchange transactions amounts corresponds to the Oracle price set in the Oracle transaction

**asset-exchange.js:** implements priceSubmitter (submits the ASA price in every block) and all atomic exchange logic (swap algos for an ASA based on the price submitted by the Oracle).

## Transactions

**Transaction 0:** from the user to TMPL_ORACLE to pay Oracle fee.

**Transaction 1:** from TMPL_ORACLE to TMPL_ORACLE_FEE_COLLECTOR sending the fee. If the Oracle does not have enough funds, the transaction is not completed, that is why Transaction 0 must be before Transaction 1. The Note field contains the price and the TEAL code in oracle-delegated.teal verifies that it is correct and it is not expired.

**Transaction 2:** from TMPL_EXCHANGE to the user where the amount of assets TMPL_ASA_ID corresponds to the value of the algos sent in Transaction 3 based on the price submitted by the Oracle. This transaction uses asset-exchange.teal signed exchange account. Using delegated TEAL anyone can submit transactions from the exchange account if the transaction group validates the signed TEAL code.

**Transaction 3:** from user to TMPL_EXCHANGE sending the algos to pay for the assets TMPL_ASA_ID.
