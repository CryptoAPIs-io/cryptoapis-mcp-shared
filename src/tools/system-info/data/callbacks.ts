export const callbacksData = {
    description: "Callbacks (webhooks) are POST requests sent from CryptoAPIs to your URL when a subscribed blockchain event occurs.",
    eventTypes: [
        "address-coins-transactions-confirmed",
        "address-coins-transactions-confirmed-each-confirmation",
        "address-coins-transactions-unconfirmed",
        "address-internal-transactions-confirmed",
        "address-internal-transactions-confirmed-each-confirmation",
        "address-tokens-transactions-confirmed",
        "address-tokens-transactions-confirmed-each-confirmation",
        "block-mined",
    ],
    urlRequirements: {
        httpsOnly: true,
        domainVerification: "Domain must be verified in Dashboard before use. Callback URL must match verified domain.",
    },
    retryStrategy: {
        responseTimeout: "5 seconds",
        maxRetries: 5,
        initialDelay: "5 minutes (300 seconds)",
        backoffMultiplier: 2,
        randomFactor: 0.2,
        retryTimeline: ["~5 min", "~10 min", "~20 min", "~40 min", "~80 min"],
        onFinalFailure: "All subscriptions sharing the same event type and callback URL are marked 'disabled'.",
    },
    security: {
        method: "HMAC_SHA256",
        header: "x-signature",
        description: "Optional callbackSecretKey generates x-signature header. Verify by computing HMAC_SHA256(secretKey, callbackBody) and comparing to header.",
    },
    structure: {
        method: "POST",
        contentType: "application/json",
        fields: {
            referenceId: "Unique subscription reference",
            idempotencyKey: "Prevents duplicate processing — use this to deduplicate callbacks",
        },
    },
    utxoNotes: "UTXO callbacks report direction (incoming/outgoing) based on input/output address matching.",
};
