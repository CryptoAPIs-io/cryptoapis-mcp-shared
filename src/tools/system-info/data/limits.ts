export const limitsData = {
    throughput: {
        description: "Throughput is measured in credits/second. Exceeding the soft limit applies a 2.1x cost multiplier. Exceeding the hard limit returns HTTP 429.",
        plans: [
            { plan: "Starter", softLimit: 700, hardLimit: 5000 },
            { plan: "Scale", softLimit: 2100, hardLimit: 15000 },
            { plan: "Pro", softLimit: 6300, hardLimit: 45000 },
        ],
        penaltyMultiplier: 2.1,
        behavior: {
            belowSoft: "Charged at base credit rate",
            betweenSoftAndHard: "Charged at base rate x 2.1 multiplier",
            aboveHard: "Request rejected with HTTP 429 (request_limit_reached)",
        },
    },
    monthlyCredits: "Each plan includes a monthly credit allowance. Credits reset at billing cycle. Additional credits available via pay-as-you-go.",
};
