# Seller.html integration

The repository now contains `seller-mission-ad-planner.js`, which provides the mission economics UI and calculations.

Add this script immediately before the closing `</body>` tag in `seller.html`:

```html
<script src="seller-mission-ad-planner.js"></script>
```

The existing Seller page already loads its product catalog scripts before its main application logic, so the planner can read `window.allProducts` when that array is available. The planner mounts its own mission-economics section and calculates:

- financial target per product;
- sales required per product;
- ads required per product at 200 ads/sale;
- ads per city/town per product;
- aggregate portfolio target, sales, ads, and ads per city/town.

Default mission inputs:

- `$500,000,000,000` financial goal;
- `200` ads per sale;
- `19,500` target cities/towns.

The financial target is editable at the product level so the seller can model either a full-goal single-product scenario or a distributed portfolio goal.
