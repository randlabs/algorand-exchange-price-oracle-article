# Algorand Exchange Price Oracle

## Files

This code allows to exchange algos for tokens based on the price given by an Oracle all happening in a transaction group atomically.

**oracle-delegated.teal:** verifies that the oracle gets the oracle fee, the integrity of the price located on the Node field and that the price is valid
**asset-exchange.teal:**	verifies that the 2 exchange transactions amounts corresponds to the Oracle price set in the Oracle transaction
**asset-exchange.js:** implements priceSubmitter (submits the ASA price in every block) and all atomic exchange logic (swap algos for an ASA based on the price submitted by the Oracle).

## Transactions

**Transaction 0:** from user to TMPL_ORACLE to pay Oracle fee.

**Transaction 1:** from TMPL_ORACLE to TMPL_ORACLE_FEE_COLLECTOR sending the fee. The Note field contains the price and it is also verified in the TEAL. The TEAL code also verifies the expiration round of the price. The signed object submitted by the price submitter is only valid before this round so the LastValid of this transaction must be less or equal to this value.

**Transaction 2:** from TMPL_EXCHANGE to user sending the amount of asset TMPL_ASA_ID that corresponds to the algos sent in Transaction 3 based on the price submitted by the Oracle. This transaction uses LogicSig signed by the exchange account. Using this method anyone can submit transactions from the exchange account if the signed TEAL code verifies the transaction group.

**Transaction 3:** from user to TMPL_EXCHANGE sending the algos to pay for the assets TMPL_ASA_ID.
