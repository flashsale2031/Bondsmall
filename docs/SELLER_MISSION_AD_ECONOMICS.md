# Bonds Mall Seller — Mission Ad Economics

## Purpose

The seller mission now uses an explicit planning model to estimate the advertisement volume required to reach the financial mission **per product** and **in aggregate**, including the estimated number of ads that must be represented in each city/town.

## Mission baseline

- Financial goal: **$500,000,000,000 annual net yield**.
- Location objective: **19,500 locations by September 1, 2027**.
- Planning conversion: **200 advertisements per sale**.
- City/town distribution baseline: **19,500 locations** unless the seller enters a different number of target cities/towns.

## Core formulas

For each product:

```text
Sales needed = Product financial target / Net yield per sale

Ads needed = Sales needed × 200 ads per sale

Ads per city/town = Ads needed / Number of target cities/towns
```

For the aggregate portfolio:

```text
Aggregate target = Sum of product financial targets
Aggregate sales needed = Sum of product sales needed
Aggregate ads needed = Sum of product ads needed
Aggregate ads per city/town = Aggregate ads needed / Number of target cities/towns
```

The UI rounds displayed operational counts upward because an advertising plan cannot execute a fraction of an advertisement or sale.

## Product-level interpretation

The seller dashboard reads product names and prices from the current product catalog when available. Each product receives its own target, sales estimate, total ad requirement, and ads-per-city/town estimate.

The product target is deliberately editable. This supports two planning modes:

1. **Full-goal sensitivity:** enter the full $500B goal against one product to see how many ads that product alone would require.
2. **Portfolio allocation:** assign portions of the $500B goal to individual products and use the aggregate result to plan the complete portfolio.

## Example

If a product produces **$100 per sale** and its assigned financial target is **$1,000,000**:

```text
$1,000,000 / $100 = 10,000 sales
10,000 × 200 = 2,000,000 ads
2,000,000 / 19,500 ≈ 102.57 ads per city/town
```

The operational plan would therefore round the last value upward to **103 ads per city/town**.

## Important assumption

The 200-ad ratio is a planning assumption, not a guarantee of conversion. The calculator assumes that the entered product price represents the net yield attributed to a sale. Actual conversion, refunds, inventory, platform limits, ad duplication rules, geography, and operating costs can materially change results.

## Runtime integration

`seller-mission-ad-planner.js` provides the client-side calculation module and UI. It does not submit advertisements, log into third-party accounts, or perform external actions. The module is intended to be loaded by the seller page and uses the existing product catalog when it is exposed to the page.
