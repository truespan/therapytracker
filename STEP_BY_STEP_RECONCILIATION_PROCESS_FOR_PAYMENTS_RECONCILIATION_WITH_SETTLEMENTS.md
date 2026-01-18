
# Here is the step-by-step process for reconciliation between payments captured and settlements using webhooks:

1. **Data Capture (The Setup)**
    ## payment.captured: You receive this webhook when a customer successfully pays. The payload contains the payment_id and the amount.

    ## settlement.processed: You receive this webhook when Razorpay transfers the funds (minus fees) to your bank account. 
       This payload includes the settlement_id, utr (Unique Transaction Reference), and the total amount. 

2. **Reconciliation Process**
    ## Match by Settlement ID: When the settlement.processed event arrives, identify which payments (a single settlement ID may consists more than one payment IDs details) are included in that batch.
    ## Use API to Fetch Details: Use the Settlement ID from the webhook to call the Fetch Settlement Recon Details API. This API provides a detailed list of all payment IDs, refunds, and adjustments that constitute that specific settlement.
        
        Fetch Settlement Recon Details: (visit : https://razorpay.com/docs/api/settlements/fetch-recon/ for more details)
        ==============================================================================================
        GET         https://api.razorpay.com/v1/settlements/recon/combined?year=yyyy&month=mm
        ==============================================================================================
        Use this endpoint to return a list of all transactions such as payments, refunds, transfers and adjustments settled to your account on a particular day or month. In the example request and response, we are fetching the settlement report for a particular day, that is 11/06/2022.
        
        Query Parameters:
        year* integer
        The year the settlement was received in the YYYY format. For example, 2022.

        month* integer
        The month the settlement was received in the MM format. For example, 06.

        day integer
        The date on which the settlement was received in the DD format. For example, 11.

        count integer
        Specifies the number of available settlements to be fetched. Possible values: 1 to 1000.

        skip integer
        Specifies the number of available settlements to be skipped when fetching a count.

        Response Parameters:
        entity_id string
        The unique identifier of the transaction that has been settled.

        type string
        Indicates the type of transaction. Possible values:
        payment
        refund
        transfer
        adjustment

        debit integer
        The amount, in currency subunits, that has been debited from your account.

        credit integer
        The amount, in currency subunits, that has been credited to your account.

        amount integer
        The total amount, in currency subunits, debited or credited from your account.

        currency string
        The 3-letter ISO currency code for the transaction.

        fee integer
        The fees, in currency subunits, charged to process the transaction.

        tax integer
        The tax on the fee, in currency subunits, charged to process the transaction.

        on_hold boolean
        Indicates whether the account settlement for transfer is on hold. Possible values:
        true: The settlement for transfer is on hold.
        false: The settlement for transfer is released.

        settled boolean
        Indicates whether the transaction has been settled or not. Possible values:
        true
        false

        created_at integer
        Unix timestamp at which the transaction was created.

        settled_at integer
        Unix timestamp when the transaction was settled.

        settlement_id string
        The unique identifier of the settlement transaction.

        description string
        Brief description about the transaction.

        notes object
        Notes for the transaction. For example, Beam me up Scotty.

        payment_id string
        The unique identifier of the payment linked to refund or transfer that has been settled. For example, pay_DEApNNTR6xmqJy. It is null for payments.

        settlement_utr string
        The unique reference number linked to the settlement. For example, KKBKH14156891582.

        order_id string
        Order id linked to the payment made by the customer that has been settled. For example, order_DEXrnRiR3SNDHA.

        order_receipt string
        Receipt number entered while creating the Order.

        method string
        The payment method used to complete the payment. Possible values:
        card
        netbanking
        wallet
        upi
        emi

        card_network string
        The card network used to process the payment. Possible values:
        American Express
        Diners Club
        Maestro
        MasterCard
        RuPay
        Visa
        unknown

        card_issuer string
        This is a 4-character code denoting the issuing bank. For example, KARB.
        This attribute will not be set for international cards, that is, for cards issued by foreign banks.


        card_type string
        The card type used to process the payment. Possible values:
        credit
        debit

        dispute_id string
        The unique identifier of any dispute, if any, for this transaction.

        Errors
        The API {key/secret} provided is invalid.

        Error Status: 4xx
        The API credentials passed in the API call differ from the ones generated on the Dashboard.
        Solution: The year must be 4 digits.

        Error Status: 400
        An invalid year is entered.
        Solution: Ensure that the year has exactly 4 digits.
        The month is not a valid month.

        Error Status: 400
        An invalid month is entered.
        Solution: Enter a valid month between 01 and 12.
        The day must be between 1 and 2 digits.

        Error Status: 400
        An invalid day is entered.
        Solution: Ensure that the day has only 1 or 2 digits. Possible values: 1 to 31.
        The count must be at least 1.

        Error Status: 400
        The count passed is 0.
        Solution: Ensure that count is at least 1.

    ## Verify Amount: Compare the net settlement amount in the webhook/API with the sum of (captured payments - fees - refunds) for that settlement period.
    ## Verify via UTR: Use the UTR (Unique Transaction Reference) provided in the settlement.processed webhook payload to match against your bank statement. 

3. **Key Data Points for Mapping**
    ## settlement.id: The primary key in the settlement.processed event.
    ## payment.id: Found in the payment.captured event.
    ## settlement_id in Payments: You can also look up the settlement_id by visiting Transactions -> Payments on the Razorpay Dashboard and   clicking on specific payments. 

**Summary Table**
    Event 	                    Purpose	                        Key Data
    ==============================================================================================
    payment.captured	        Confirms customer paid.	        payment_id, amount
    ----------------------------------------------------------------------------------------------
    settlement.processed	    Confirms funds sent to bank.	settlement_id, utr, amount
    ----------------------------------------------------------------------------------------------
    Recon API	                Links payments to settlement.	settlement_id, payment_id
    ----------------------------------------------------------------------------------------------

    For automated reconciliation, it is recommended to store the payment_id in your database when it is captured and map it against the settlement_id when the settlement.processed webhook is received. 