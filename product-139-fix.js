/* Product 139 correction: American Buffalo 2024 One Ounce Gold Proof Coin.
 * ID 139 was originally one of the early American Buffalo catalog slots that
 * needed to be converted because the requested 2002-2005 Buffalo issues were
 * never produced by the U.S. Mint. The U.S. Mint launched the Buffalo program
 * in 2006, so this stable URL now represents the 2024 proof issue instead.
 */ 
(() => {
    const proof = {
        id: 139,
        name: "2024 American Buffalo One Ounce Gold Proof Coin",
        category: "artandcollectibles",
        "retail price": 5390.00,
        "sale price": 5390.00,
        "new price": 5390.00,
        "pre-owned price": 4851.00,
        condition: "New",
        condition_options: ["New", "Pre-owned"],
        default_condition: "New",
        image: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2024/American-Buffalo-Gold-Proof-Obverse.jpg",
        images: [
            "https://www.usmint.gov/content/dam/usmint/image-library/coins/2024/American-Buffalo-Gold-Proof-Obverse.jpg",
            "https://www.usmint.gov/content/dam/usmint/image-library/coins/2024/American-Buffalo-Gold-Proof-Reverse.jpg"
        ],
        image_views: {
            front_main: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2024/American-Buffalo-Gold-Proof-Obverse.jpg",
            back: "https://www.usmint.gov/content/dam/usmint/image-library/coins/2024/American-Buffalo-Gold-Proof-Reverse.jpg"
        },
        photo_source: "U.S. Mint official 2024 American Buffalo One Ounce Gold Proof Coin listing.",
        photo_year: 2024,
        photo_is_representative: false,
        source: "https://www.usmint.gov/american-buffalo-2024-one-ounce-gold-proof-coin-24EL.html",
        official_issue: true,
        description: "The 2024 American Buffalo One Ounce Gold Proof Coin is the collector version of the official U.S. Mint American Buffalo Gold Bullion Coin. It contains one troy ounce of .9999 fine 24-karat gold and features the 2024 Buffalo design based on James Earle Fraser's 1913 Type I Buffalo nickel.",
        specifications: {
            brand: "US Mint",
            material: "24-karat gold (99.99% gold)",
            weight: "1.000 troy oz fine gold",
            diameter: "1.287 inches (32.70 mm)",
            face_value: "$50",
            mint: "West Point",
            mint_mark: "W",
            finish: "Proof",
            year: "2024",
            edge: "Reeded",
            privy_mark: "None",
            item_number: "24EL",
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

    window.BondsmallProduct139Proof = proof;
})();