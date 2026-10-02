/* Product 139 correction: American Buffalo 2025 One Ounce Gold Proof Coin.
 * The authoritative catalog previously mapped ID 139 to the bullion version.
 * Keep the stable product ID/URL, but correct the record to the U.S. Mint proof issue.
 */
(() => {
    const proof = {
        id: 139,
        name: "2025 American Buffalo One Ounce Gold Proof Coin",
        category: "artandcollectibles",
        "retail price": 5340.00,
        "sale price": 5340.00,
        "new price": 5340.00,
        "pre-owned price": 4806.00,
        condition: "New",
        condition_options: ["New", "Pre-owned"],
        default_condition: "New",
        image: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2025/American-Buffalo-Gold-Proof-Obverse.jpg",
        images: [
            "https://www.usmint.gov/content/dam/usmint/image-library/coins/2025/American-Buffalo-Gold-Proof-Obverse.jpg",
            "https://www.usmint.gov/content/dam/usmint/image-library/coins/2025/American-Buffalo-Gold-Proof-Reverse.jpg"
        ],
        image_views: {
            front_main: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2025/American-Buffalo-Gold-Proof-Obverse.jpg",
            back: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2025/American-Buffalo-Gold-Proof-Reverse.jpg"
        },
        photo_source: "U.S. Mint official 2025 American Buffalo One Ounce Gold Proof Coin product listing.",
        photo_year: 2025,
        photo_is_representative: false,
        source: "https://www.usmint.gov/american-buffalo-2025-one-ounce-gold-proof-coin-25EL.html",
        official_issue: true,
        description: "The 2025 American Buffalo One Ounce Gold Proof Coin is the collector version of the official U.S. Mint American Buffalo Gold Bullion Coin. It contains one troy ounce of .9999 fine 24-karat gold and carries the 2025 Buffalo design based on James Earle Fraser's 1913 Type I Buffalo nickel.",
        specifications: {
            brand: "US Mint",
            material: "24-karat gold (99.99% gold)",
            weight: "1.000 troy oz fine gold",
            diameter: "1.287 inches (32.70 mm)",
            face_value: "$50",
            mint: "West Point",
            mint_mark: "W",
            finish: "Proof",
            year: "2025",
            edge: "Reeded",
            privy_mark: "None",
            item_number: "25EL",
            reverse_design: "American bison based on James Earle Fraser's Buffalo Nickel"
        },
        productType: "Coin",
        inventory: 1,
        age_group: "Adult",
        gender: "Unisex",
        brand: "US Mint",
        brand_display_name: "US Mint",
        brand_tier: "luxury",
        luxury_brand: true,
        authenticityGuaranteed: true,
        authenticity_badge: "Authenticity Guaranteed",
        authenticity: "Official U.S. Mint product listing; authenticity information is based on U.S. Mint source material.",
        brand_source: "U.S. Mint"
    };

    function replace(records) {
        if (!Array.isArray(records)) return;
        const i = records.findIndex(p => Number(p && p.id) === 139);
        if (i >= 0) records[i] = { ...records[i], ...proof, specifications: proof.specifications };
    }

    replace(window.products);
    if (window.BondsmallCatalogAuthority && Array.isArray(window.BondsmallCatalogAuthority.records)) {
        replace(window.BondsmallCatalogAuthority.records);
    }

    // Expose the corrected record so the exact-ID resolver can use it even if
    // a lazy catalog chunk later replaces window.products.
    window.BondsmallProduct139Proof = proof;
})();